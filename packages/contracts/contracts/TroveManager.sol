// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './Interfaces/ITroveManager.sol';
import './Interfaces/IStabilityPool.sol';
import './Interfaces/IDebtToken.sol';
import './Interfaces/ISortedTroves.sol';
import './Interfaces/IDebtTokenManager.sol';
import './Dependencies/LiquityBase.sol';
import './Interfaces/IPriceFeed.sol';
import './Dependencies/Ownable.sol';
import './Dependencies/CheckContract.sol';
import './Dependencies/console.sol';
import './Interfaces/IStoragePool.sol';
import './Interfaces/IStabilityPoolManager.sol';
import './Interfaces/IBBase.sol';

contract TroveManager is LiquityBase, Ownable, CheckContract, ITroveManager {
  using SafeMath for uint256;
  string public constant NAME = 'TroveManager';

  // --- Connected contract declarations ---

  IDebtTokenManager public debtTokenManager;
  address public borrowerOperationsAddress;
  IStabilityPoolManager public stabilityPoolManager;
  ISortedTroves public sortedTroves; // A doubly linked list of Troves, sorted by their sorted by their collateral ratios
  IStoragePool public storagePool;
  IPriceFeed public priceFeed;

  // todo gov
  //    ILQTYToken public override lqtyToken;
  //    ILQTYStaking public override lqtyStaking;

  // --- Data structures ---

  /*
   * Half-life of 12h. 12h = 720 min
   * (1/2) = d^720 => d = (1/2)^(1/720)
   */
  uint public constant SECONDS_IN_ONE_MINUTE = 60;
  uint public constant MINUTE_DECAY_FACTOR = 999037758833783000;
  uint public constant REDEMPTION_FEE_FLOOR = (DECIMAL_PRECISION / 1000) * 5; // 0.5%
  uint public constant MAX_BORROWING_FEE = (DECIMAL_PRECISION / 100) * 5; // 5%

  // During bootsrap period redemptions are not allowed
  uint public constant BOOTSTRAP_PERIOD = 14 days;

  /*
   * BETA: 18 digit decimal. Parameter by which to divide the redeemed fraction, in order to calc the new base rate from a redemption.
   * Corresponds to (1 / ALPHA) in the white paper.
   */
  uint public constant BETA = 2;
  uint public baseRate;

  // The timestamp of the latest fee operation (redemption or new dToken issuance)
  uint public lastFeeOperationTime;

  enum Status {
    nonExistent,
    active,
    closedByOwner,
    closedByLiquidation,
    closedByRedemption
  }

  // Store the necessary data for a trove
  struct Trove {
    Status status;
    uint128 arrayIndex;
    //
    IDebtToken[] debtTokens;
    mapping(IDebtToken => uint) debts;
    //
    address[] collTokens;
    mapping(address => uint) colls;
    mapping(address => uint) stakes; // his (troves) stake of the entire system, relative to coll token, total trove stake need to be calculated on runtime using token prices
  }
  mapping(address => Trove) public Troves;

  address[] public collTokenAddresses; // todo need to be manged
  address[] public tokenAddresses; // for tracking used tokens in the maps (coll and debts) // todo need to be manged

  // stakes gets stored relative to the coll token, total stake needs to be calculated on runtime using token prices
  mapping(address => uint) public totalStakes; // [collTokenAddress] => total system stake, relative to the coll token
  mapping(address => uint) public totalStakesSnapshot; // [collTokenAddress] => stake, taken immediately after the latest liquidation
  mapping(address => uint) public totalCollateralSnapshots; // [collTokenAddress] => Snapshot of the total collateral across the ActivePool and DefaultPool, immediately after the latest liquidation.

  /*
   * L_Tokens track the sums of accumulated liquidation rewards per unit staked. During its lifetime, each stake earns:
   *
   * A gain of ( stake * [L_TOKEN[T] - L_TOKEN[T](0)] )
   * Where L_TOKEN[T](0) are snapshots of token T for the active Trove taken at the instant the stake was made
   */
  mapping(address => uint) public liquidatedTokens; // token address -> liquidated/redistributed amount
  mapping(address => mapping(address => uint)) public rewardSnapshots; // [user][tokenAddress] value, snapshots
  mapping(address => uint) public lastErrorRedistribution; // [tokenAddress] value, Error trackers for the trove redistribution calculation

  // Array of all active trove addresses - used to to compute an approximate hint off-chain, for the sorted list insertion
  address[] public TroveOwners;

  /*
   * --- Variable container structs for liquidations ---
   *
   * These structs are used to hold, return and assign variables inside the liquidation functions,
   * in order to avoid the error: "CompilerError: Stack too deep".
   **/

  struct LocalVariables_OuterLiquidationFunction {
    IStoragePool storagePoolCached;
    IPriceFeed priceFeedCached;
    IStabilityPoolManager stabilityPoolManagerCached;
    ISortedTroves sortedTrovesCached;
    PriceCache priceCache;
    //
    RemainingStability[] remainingStabilities;
    CAmount[] tokensToRedistribute;
    uint totalStableCoinGasCompensation;
    bool recoveryModeAtStart;
    uint entireSystemCollInStable;
    uint entireSystemDebtInStable;
  }

  struct LocalVariables_LiquidationSequence {
    CAmount[] tokensToRedistribute;
    uint gasCompensationInStable;
    //
    uint i;
    uint ib;
    uint ic;
    //
    bool added;
    uint ICR;
    address user;
    //
    RAmount[] troveAmountsIncludingRewards;
    uint troveDebtInStable;
    uint troveCollInStable;
    //
    bool backToNormalMode;
  }

  struct ContractsCache {
    IStoragePool activePool;
    IDebtTokenManager dTokenManager;
    ISortedTroves sortedTroves;
    address gasPoolAddress;
  }

  struct RedemptionTotals {
    uint remainingLUSD;
    uint totalLUSDToRedeem;
    uint totalETHDrawn;
    uint ETHFee;
    uint ETHToSendToRedeemer;
    uint decayedBaseRate;
    uint price;
    uint totalLUSDSupplyAtStart;
  }

  struct SingleRedemptionValues {
    uint LUSDLot;
    uint ETHLot;
    bool cancelledPartial;
  }

  // --- Dependency setter ---

  function setAddresses(
    address _borrowerOperationsAddress,
    address _storagePoolAddress,
    address _stabilityPoolManagerAddress,
    address _priceFeedAddress,
    address _debtTokenManagerAddress,
    address _sortedTrovesAddress
  ) external onlyOwner {
    checkContract(_borrowerOperationsAddress);
    checkContract(_storagePoolAddress);
    checkContract(_stabilityPoolManagerAddress);
    checkContract(_priceFeedAddress);
    checkContract(_debtTokenManagerAddress);
    checkContract(_sortedTrovesAddress);

    borrowerOperationsAddress = _borrowerOperationsAddress;
    emit BorrowerOperationsAddressChanged(_borrowerOperationsAddress);

    storagePool = IStoragePool(_storagePoolAddress);
    emit StoragePoolAddressChanged(_storagePoolAddress);

    stabilityPoolManager = IStabilityPoolManager(_stabilityPoolManagerAddress);
    emit StabilityPoolManagerAddressChanged(_stabilityPoolManagerAddress);

    priceFeed = IPriceFeed(_priceFeedAddress);
    emit PriceFeedAddressChanged(_priceFeedAddress);

    debtTokenManager = IDebtTokenManager(_debtTokenManagerAddress);
    emit DebtTokenManagerAddressChanged(_debtTokenManagerAddress);

    sortedTroves = ISortedTroves(_sortedTrovesAddress);
    emit SortedTrovesAddressChanged(_sortedTrovesAddress);

    _renounceOwnership();
  }

  // --- Getters ---

  function getTroveOwnersCount() external view override returns (uint) {
    return TroveOwners.length;
  }

  function getTroveFromTroveOwnersArray(uint _index) external view override returns (address) {
    return TroveOwners[_index];
  }

  // --- Trove Liquidation functions ---

  // Single liquidation function. Closes the trove if its ICR is lower than the minimum collateral ratio.
  function liquidate(address _borrower) external override {
    _requireTroveIsActive(_borrower);

    address[] memory borrowers = new address[](1);
    borrowers[0] = _borrower;
    batchLiquidateTroves(borrowers);
  }

  /*
   * Attempt to liquidate a custom list of troves provided by the caller.
   */
  function batchLiquidateTroves(address[] memory _troveArray) public override {
    require(_troveArray.length != 0, 'TroveManager: Calldata address array must not be empty');

    LocalVariables_OuterLiquidationFunction memory vars;
    vars.storagePoolCached = storagePool;
    vars.priceFeedCached = priceFeed;
    vars.stabilityPoolManagerCached = stabilityPoolManager;

    (vars.recoveryModeAtStart, , vars.entireSystemCollInStable, vars.entireSystemDebtInStable) = vars
      .storagePoolCached
      .checkRecoveryMode(vars.priceCache);
    vars.remainingStabilities = vars.stabilityPoolManagerCached.getRemainingStability(collTokenAddresses);

    bool atLeastOneTroveLiquidated;
    if (vars.recoveryModeAtStart)
      (
        vars.tokensToRedistribute,
        vars.totalStableCoinGasCompensation,
        atLeastOneTroveLiquidated
      ) = _getTotalFromBatchLiquidate_RecoveryMode(vars, _troveArray);
    else
      (
        vars.tokensToRedistribute,
        vars.totalStableCoinGasCompensation,
        atLeastOneTroveLiquidated
      ) = _getTotalsFromBatchLiquidate_NormalMode(vars, _troveArray);

    _postSystemLiquidation(atLeastOneTroveLiquidated, vars);
  }

  // --- Inner recovery mode liquidation functions ---

  /*
   * This function is used when the batch liquidation sequence starts during Recovery Mode. However, it
   * handle the case where the system *leaves* Recovery Mode, part way through the liquidation sequence
   */
  function _getTotalFromBatchLiquidate_RecoveryMode(
    LocalVariables_OuterLiquidationFunction memory outerVars,
    address[] memory _troveArray
  )
    internal
    returns (CAmount[] memory tokensToRedistribute, uint gasCompensationInStable, bool atLeastOneTroveLiquidated)
  {
    LocalVariables_LiquidationSequence memory vars;
    vars.gasCompensationInStable = 0;
    vars.tokensToRedistribute = _initializeEmptyTokensToRedistribute(); // all set to 0 (nothing to redistribute)
    vars.backToNormalMode = false; // rechecked after every liquidated trove, to adapt strategy

    for (vars.i = 0; vars.i < _troveArray.length; vars.i++) {
      vars.user = _troveArray[vars.i];
      if (Troves[vars.user].status != Status.active) continue; // Skip non-active troves

      bool liquidated = _executeTroveLiquidation_RecoveryMode(outerVars, vars);
      if (!liquidated) continue;
      if (!atLeastOneTroveLiquidated) atLeastOneTroveLiquidated = true;
    }

    return (vars.tokensToRedistribute, vars.gasCompensationInStable, atLeastOneTroveLiquidated);
  }

  // Liquidate one trove, in Recovery Mode.
  function _liquidateRecoveryMode(
    IStoragePool _storagePool,
    RemainingStability[] memory _remainingStabilities,
    address _borrower,
    uint _ICR,
    uint _troveCollInStable,
    uint _troveDebtInStable,
    uint _TCR,
    RAmount[] memory troveAmountsIncludingRewards
  ) internal {
    // If ICR <= 100%, purely redistribute the Trove across all active Troves
    if (_ICR <= _100pct) {
      _movePendingTroveRewardsToActivePool(_storagePool, troveAmountsIncludingRewards);
      _removeStake(_borrower);
      for (uint i = 0; i < troveAmountsIncludingRewards.length; i++) {
        RAmount memory rAmount = troveAmountsIncludingRewards[i];
        rAmount.toRedistribute = rAmount.toLiquidate;
      }
      _closeTrove(_borrower, Status.closedByLiquidation);
      // todo no coll gas comb in that case?

      // todo
      //      emit TroveLiquidated(
      //        _borrower,
      //        singleLiquidation.entireTroveDebt,
      //        singleLiquidation.entireTroveColl,
      //        TroveManagerOperation.liquidateInRecoveryMode
      //      );
      //      emit TroveUpdated(_borrower, 0, 0, 0, TroveManagerOperation.liquidateInRecoveryMode
      //      );

      // If 100% < ICR < MCR, offset as much as possible, and redistribute the remainder
    } else if ((_ICR > _100pct) && (_ICR < MCR)) {
      _movePendingTroveRewardsToActivePool(_storagePool, troveAmountsIncludingRewards);
      _removeStake(_borrower);
      _getOffsetAndRedistributionVals(_troveDebtInStable, troveAmountsIncludingRewards, _remainingStabilities);
      _closeTrove(_borrower, Status.closedByLiquidation);

      // todo
      //      emit TroveLiquidated(
      //        _borrower,
      //        singleLiquidation.entireTroveDebt,
      //        singleLiquidation.entireTroveColl,
      //        TroveManagerOperation.liquidateInRecoveryMode
      //      );
      //      emit TroveUpdated(_borrower, 0, 0, 0, TroveManagerOperation.liquidateInRecoveryMode);

      /*
       * If 110% <= ICR < current TCR (accounting for the preceding liquidations in the current sequence)
       * and there is enough debt in the Stability Pool (checked already before), only offset, with no redistribution,
       * but at a capped rate of 1.1 and only if the whole debt can be liquidated.
       * The remaining collateral, due to the capped rate, will remain in the trove.
       */
    } else if ((_ICR >= MCR) && (_ICR < _TCR)) {
      _movePendingTroveRewardsToActivePool(_storagePool, troveAmountsIncludingRewards);
      _removeStake(_borrower);
      _getCappedOffsetVals(_troveCollInStable, _troveDebtInStable, troveAmountsIncludingRewards, _remainingStabilities);
      _closeTrove(_borrower, Status.closedByLiquidation);

      // todo
      //      emit TroveLiquidated(
      //        _borrower,
      //        singleLiquidation.entireTroveDebt,
      //        singleLiquidation.collToSendToSP,
      //        TroveManagerOperation.liquidateInRecoveryMode
      //      );
      //      emit TroveUpdated(_borrower, 0, 0, 0, TroveManagerOperation.liquidateInRecoveryMode);
    } else {
      // if (_ICR >= MCR && ( _ICR >= _TCR || singleLiquidation.entireTroveDebt > debtInStabPool))
    }
  }

  // --- Inner normal mode liquidation functions ---

  function _getTotalsFromBatchLiquidate_NormalMode(
    LocalVariables_OuterLiquidationFunction memory outerVars,
    address[] memory _troveArray
  )
    internal
    returns (CAmount[] memory tokensToRedistribute, uint gasCompensationInStable, bool atLeastOneTroveLiquidated)
  {
    LocalVariables_LiquidationSequence memory vars;
    vars.gasCompensationInStable = 0;
    vars.tokensToRedistribute = _initializeEmptyTokensToRedistribute(); // all 0

    for (vars.i = 0; vars.i < _troveArray.length; vars.i++) {
      vars.user = _troveArray[vars.i];
      if (Troves[vars.user].status != Status.active) continue; // Skip non-active troves

      _executeTroveLiquidation_NormalMode(outerVars, vars);
      if (!atLeastOneTroveLiquidated) atLeastOneTroveLiquidated = true;
    }

    return (vars.tokensToRedistribute, vars.gasCompensationInStable, atLeastOneTroveLiquidated);
  }

  // Liquidate one trove, in Normal Mode.
  function _liquidateNormalMode(
    IStoragePool _storagePool,
    address _borrower,
    uint troveDebtInStable,
    RemainingStability[] memory remainingStabilities,
    RAmount[] memory troveAmountsIncludingRewards
  ) internal {
    _movePendingTroveRewardsToActivePool(_storagePool, troveAmountsIncludingRewards);
    _removeStake(_borrower);
    _getOffsetAndRedistributionVals(troveDebtInStable, troveAmountsIncludingRewards, remainingStabilities);
    _closeTrove(_borrower, Status.closedByLiquidation);

    // todo
    //        emit TroveLiquidated(_borrower, singleLiquidation.entireTroveDebt, singleLiquidation.entireTroveColl, TroveManagerOperation.liquidateInNormalMode);
    //        emit TroveUpdated(_borrower, 0, 0, 0, TroveManagerOperation.liquidateInNormalMode);
  }

  /* In a full liquidation, returns the values for a trove's coll and debt to be offset, and coll and debt to be
   * redistributed to active troves.
   */
  function _getOffsetAndRedistributionVals(
    uint troveDebtInStable,
    RAmount[] memory troveAmountsIncludingRewards,
    RemainingStability[] memory remainingStabilities
  ) internal {
    /*
     * Offset as much debt & collateral as possible against the Stability Pool, and redistribute the remainder
     * between all active troves.
     *
     *  If the trove's debt is larger than the deposited LUSD in the Stability Pool:
     *
     *  - Offset an amount of the trove's debt equal to the LUSD in the Stability Pool
     *  - Send a fraction of the trove's collateral to the Stability Pool, equal to the fraction of its offset debt
     *
     */

    for (uint i = 0; i < troveAmountsIncludingRewards.length; i++) {
      RAmount memory rAmount = troveAmountsIncludingRewards[i];
      if (!rAmount.isColl) continue; // debt will be handled later in the debts loop
      rAmount.toRedistribute = rAmount.toLiquidate; // by default the entire debt amount needs to be redistributed
    }

    _innerOffset(troveDebtInStable, troveAmountsIncludingRewards, remainingStabilities);
  }

  /*
   *  Get its offset coll/debt and gas comp.
   */
  function _getCappedOffsetVals(
    uint troveCollInStable,
    uint troveDebtInStable,
    RAmount[] memory troveAmountsIncludingRewards,
    RemainingStability[] memory remainingStabilities
  ) internal {
    // capping the to be liquidated collateral to 1.1 * the total debts value
    uint cappedLimit = troveDebtInStable.mul(MCR); // total debt * 1.1
    for (uint i = 0; i < troveAmountsIncludingRewards.length; i++) {
      RAmount memory rAmount = troveAmountsIncludingRewards[i];
      if (!rAmount.isColl) continue; // coll will be handled later in the debts loop

      uint collPercentage = rAmount.toLiquidate.mul(rAmount.price).div(troveCollInStable);
      uint cappedColl = cappedLimit.mul(collPercentage).div(rAmount.price);
      rAmount.toLiquidate = LiquityMath._min(cappedColl, rAmount.toLiquidate);
    }

    _innerOffset(troveDebtInStable, troveAmountsIncludingRewards, remainingStabilities);
  }

  function _innerOffset(
    uint troveDebtInStable,
    RAmount[] memory troveAmountsIncludingRewards,
    RemainingStability[] memory remainingStabilities
  ) internal {
    // checking if some debt can be offset by the matching stability pool
    for (uint i = 0; i < troveAmountsIncludingRewards.length; i++) {
      RAmount memory rAmountDebt = troveAmountsIncludingRewards[i];
      if (rAmountDebt.isColl) continue; // coll will be handled by the debts loop

      RemainingStability memory remainingStability;
      for (uint ii = 0; ii < remainingStabilities.length; ii++) {
        if (remainingStabilities[ii].tokenAddress == rAmountDebt.tokenAddress) {
          remainingStability = remainingStabilities[ii];
          break;
        }
      }

      // trying to hand the debt over to the stability pool
      if (remainingStability.remaining > 0) {
        rAmountDebt.toOffset = LiquityMath._min(rAmountDebt.toLiquidate, remainingStability.remaining);
        remainingStability.debtToOffset.add(rAmountDebt.toOffset);
        remainingStability.remaining = remainingStability.remaining.sub(rAmountDebt.toOffset);

        uint offsetPercentage = rAmountDebt.toOffset.mul(rAmountDebt.price).div(troveDebtInStable); // relative to the troves total debt

        // moving the offsetPercentage of each coll into the stable pool
        for (uint ii = 0; ii < troveAmountsIncludingRewards.length; ii++) {
          RAmount memory rAmountColl = troveAmountsIncludingRewards[ii];
          if (!rAmountColl.isColl) continue; // debt already handled one step above

          rAmountColl.toOffset = rAmountColl.toLiquidate.mul(offsetPercentage);
          rAmountColl.toRedistribute = rAmountColl.toRedistribute.sub(rAmountColl.toOffset);

          // find the right collGained entry and add the value
          for (uint iii = 0; iii < remainingStability.collGained.length; iii++) {
            if (remainingStability.collGained[iii].tokenAddress != rAmountColl.tokenAddress) continue;

            remainingStability.collGained[iii].amount.add(rAmountColl.toOffset);
            break;
          }
        }
      }

      // remaining debt needs to be redistributed
      rAmountDebt.toRedistribute = rAmountDebt.toLiquidate.sub(rAmountDebt.toOffset);
    }
  }

  /*
   * Liquidate a sequence of troves. Closes a maximum number of n under-collateralized Troves,
   * starting from the one with the lowest collateral ratio in the system, and moving upwards
   */
  function liquidateTroves(uint _n) external override {
    LocalVariables_OuterLiquidationFunction memory vars;
    vars.storagePoolCached = storagePool;
    vars.priceFeedCached = priceFeed;
    vars.stabilityPoolManagerCached = stabilityPoolManager;
    vars.sortedTrovesCached = sortedTroves;

    (vars.recoveryModeAtStart, , vars.entireSystemCollInStable, vars.entireSystemDebtInStable) = vars
      .storagePoolCached
      .checkRecoveryMode(vars.priceCache);
    vars.remainingStabilities = vars.stabilityPoolManagerCached.getRemainingStability(collTokenAddresses);

    // Perform the appropriate liquidation sequence - tally the values, and obtain their totals
    bool atLeastOneTroveLiquidated;
    if (vars.recoveryModeAtStart)
      (
        vars.tokensToRedistribute,
        vars.totalStableCoinGasCompensation,
        atLeastOneTroveLiquidated
      ) = _getTotalsFromLiquidateTrovesSequence_RecoveryMode(vars, _n);
    else
      (
        vars.tokensToRedistribute,
        vars.totalStableCoinGasCompensation,
        atLeastOneTroveLiquidated
      ) = _getTotalsFromLiquidateTrovesSequence_NormalMode(vars, _n);

    _postSystemLiquidation(atLeastOneTroveLiquidated, vars);
  }

  /*
   * This function is used when the liquidateTroves sequence starts during Recovery Mode. However, it
   * handle the case where the system *leaves* Recovery Mode, part way through the liquidation sequence
   */
  function _getTotalsFromLiquidateTrovesSequence_RecoveryMode(
    LocalVariables_OuterLiquidationFunction memory outerVars,
    uint _n
  )
    internal
    returns (CAmount[] memory tokensToRedistribute, uint gasCompensationInStable, bool atLeastOneTroveLiquidated)
  {
    LocalVariables_LiquidationSequence memory vars;
    vars.gasCompensationInStable = 0;
    vars.tokensToRedistribute = _initializeEmptyTokensToRedistribute(); // all set to 0 (nothing to redistribute)
    vars.backToNormalMode = false; // rechecked after every liquidated trove, to adapt strategy

    vars.user = outerVars.sortedTrovesCached.getLast();
    address firstUser = outerVars.sortedTrovesCached.getFirst();
    for (vars.i = 0; vars.i < _n && vars.user != firstUser; vars.i++) {
      // we need to cache it, because current user is likely going to be deleted
      address nextUser = outerVars.sortedTrovesCached.getPrev(vars.user);

      bool liquidated = _executeTroveLiquidation_RecoveryMode(outerVars, vars);
      if (!liquidated) break;

      vars.user = nextUser;
      if (!atLeastOneTroveLiquidated) atLeastOneTroveLiquidated = true;
    }

    return (vars.tokensToRedistribute, vars.gasCompensationInStable, atLeastOneTroveLiquidated);
  }

  function _getTotalsFromLiquidateTrovesSequence_NormalMode(
    LocalVariables_OuterLiquidationFunction memory outerVars,
    uint _n
  )
    internal
    returns (CAmount[] memory tokensToRedistribute, uint gasCompensationInStable, bool atLeastOneTroveLiquidated)
  {
    LocalVariables_LiquidationSequence memory vars;
    vars.gasCompensationInStable = 0;
    vars.tokensToRedistribute = _initializeEmptyTokensToRedistribute(); // all 0

    for (vars.i = 0; vars.i < _n; vars.i++) {
      vars.user = outerVars.sortedTrovesCached.getLast();

      bool liquidated = _executeTroveLiquidation_NormalMode(outerVars, vars);
      if (!liquidated) break;
      if (!atLeastOneTroveLiquidated) atLeastOneTroveLiquidated = true;
    }

    return (vars.tokensToRedistribute, vars.gasCompensationInStable, atLeastOneTroveLiquidated);
  }

  // --- Liquidation helper functions ---

  function _executeTroveLiquidation_RecoveryMode(
    LocalVariables_OuterLiquidationFunction memory outerVars,
    LocalVariables_LiquidationSequence memory vars
  ) internal returns (bool liquidated) {
    (vars.troveAmountsIncludingRewards, vars.troveCollInStable, vars.troveDebtInStable) = this.getEntireDebtAndColl(
      outerVars.priceFeedCached,
      outerVars.priceCache,
      vars.user
    );
    vars.ICR = LiquityMath._computeCR(vars.troveCollInStable, vars.troveDebtInStable);

    if (!vars.backToNormalMode) {
      if (TroveOwners.length <= 1) return false; // don't liquidate if last trove

      // Break the loop if ICR is greater than MCR and Stability Pool is empty
      // todo check if that makes sense, why do we not redistribute that trove?!
      // todo we are checking now if there is enough stability for every debt token, if one is not covered, we skip the hole trove liquidation, is that correct?!
      if (
        vars.ICR >= MCR &&
        _existsEnoughRemainingStabilities(outerVars.remainingStabilities, vars.troveAmountsIncludingRewards)
      ) return false;

      uint TCR = LiquityMath._computeCR(outerVars.entireSystemCollInStable, outerVars.entireSystemDebtInStable);
      _liquidateRecoveryMode(
        outerVars.storagePoolCached,
        outerVars.remainingStabilities,
        vars.user,
        vars.ICR,
        vars.troveCollInStable,
        vars.troveDebtInStable,
        TCR,
        vars.troveAmountsIncludingRewards
      );

      // updating total system debt and collateral
      for (uint a = 0; a < vars.troveAmountsIncludingRewards.length; a++) {
        RAmount memory rAmount = vars.troveAmountsIncludingRewards[a];
        outerVars.entireSystemCollInStable = outerVars.entireSystemCollInStable.sub(
          rAmount.gasCompensation.mul(rAmount.price)
        );
        if (rAmount.isColl)
          outerVars.entireSystemCollInStable = outerVars.entireSystemCollInStable.sub(
            rAmount.toOffset.mul(rAmount.price)
          );
        else
          outerVars.entireSystemDebtInStable = outerVars.entireSystemDebtInStable.sub(
            rAmount.toOffset.mul(rAmount.price)
          );
      }

      vars.backToNormalMode = !_checkPotentialRecoveryMode(
        outerVars.entireSystemCollInStable,
        outerVars.entireSystemDebtInStable
      );
    } else if (vars.backToNormalMode && vars.ICR < MCR) {
      _liquidateNormalMode(
        outerVars.storagePoolCached,
        vars.user,
        vars.troveDebtInStable,
        outerVars.remainingStabilities,
        vars.troveAmountsIncludingRewards
      );
    } else return false; // break if the loop reaches a Trove with ICR >= MCR

    // not liquidated
    if (vars.troveAmountsIncludingRewards.length == 0) return false;

    _mergeTokensToRedistribute(vars.troveAmountsIncludingRewards, vars.tokensToRedistribute);
    vars.gasCompensationInStable = vars.gasCompensationInStable.add(STABLE_COIN_GAS_COMPENSATION);
    return true;
  }

  function _executeTroveLiquidation_NormalMode(
    LocalVariables_OuterLiquidationFunction memory outerVars,
    LocalVariables_LiquidationSequence memory vars
  ) internal returns (bool liquidated) {
    (vars.troveAmountsIncludingRewards, vars.troveCollInStable, vars.troveDebtInStable) = this.getEntireDebtAndColl(
      outerVars.priceFeedCached,
      outerVars.priceCache,
      vars.user
    );

    vars.ICR = LiquityMath._computeCR(vars.troveCollInStable, vars.troveDebtInStable);
    if (vars.ICR >= MCR) return false; // trove is collatoralized enough, skip the liquidation

    _liquidateNormalMode(
      outerVars.storagePoolCached,
      vars.user,
      vars.troveDebtInStable,
      outerVars.remainingStabilities,
      vars.troveAmountsIncludingRewards
    );

    _mergeTokensToRedistribute(vars.troveAmountsIncludingRewards, vars.tokensToRedistribute);
    vars.gasCompensationInStable = vars.gasCompensationInStable.add(STABLE_COIN_GAS_COMPENSATION);
    return true;
  }

  function _existsEnoughRemainingStabilities(
    RemainingStability[] memory _remainingStabilities,
    RAmount[] memory troveAmounts
  ) internal pure returns (bool) {
    for (uint a = 0; a < troveAmounts.length; a++) {
      RAmount memory troveAmount = troveAmounts[a];
      if (troveAmount.isColl) continue;

      bool tokenChecked = false;
      for (uint b = 0; b < _remainingStabilities.length; b++) {
        if (_remainingStabilities[b].tokenAddress != troveAmount.tokenAddress) continue;
        if (_remainingStabilities[b].remaining < troveAmount.toLiquidate) return false;
        tokenChecked = true;
        break;
      }
      if (!tokenChecked) return false;
    }

    return true;
  }

  function _initializeEmptyTokensToRedistribute() internal returns (CAmount[] memory tokensToRedistribute) {
    tokensToRedistribute = new CAmount[](tokenAddresses.length + collTokenAddresses.length);
    for (uint i = 0; i < tokenAddresses.length; i++) tokensToRedistribute[i] = CAmount(tokenAddresses[i], false, 0);
    for (uint i = 0; i < collTokenAddresses.length; i++)
      tokensToRedistribute[tokenAddresses.length + i] = CAmount(collTokenAddresses[i], true, 0);

    return tokensToRedistribute;
  }

  // adding up the token to redistribute
  function _mergeTokensToRedistribute(
    RAmount[] memory troveAmountsIncludingRewards,
    CAmount[] memory tokensToRedistribute
  ) internal {
    for (uint i = 0; i < troveAmountsIncludingRewards.length; i++) {
      RAmount memory rAmount = troveAmountsIncludingRewards[i];
      if (rAmount.toRedistribute == 0) continue;

      for (uint ib = 0; ib < tokensToRedistribute.length; ib++) {
        if (tokensToRedistribute[ib].tokenAddress != rAmount.tokenAddress) continue;

        tokensToRedistribute[ib].amount = tokensToRedistribute[ib].amount.add(rAmount.toRedistribute);
        break;
      }
    }
  }

  function _postSystemLiquidation(
    bool atLeastOneTroveLiquidated,
    LocalVariables_OuterLiquidationFunction memory vars
  ) internal {
    require(!atLeastOneTroveLiquidated, 'TroveManager: nothing to liquidate');

    // move tokens into the stability pools
    for (uint i = 0; i < vars.remainingStabilities.length; i++) {
      RemainingStability memory remainingStability = vars.remainingStabilities[i];
      remainingStability.stabilityPool.offset(remainingStability.debtToOffset, remainingStability.collGained);
    }

    // and redistribute the rest (which could not be handled by the stability pool)
    _redistributeDebtAndColl(vars.storagePoolCached, vars.priceCache, vars.tokensToRedistribute);

    // Update system snapshots
    _updateSystemSnapshots_excludeCollRemainder(vars.storagePoolCached);

    // todo
    // emit Liquidation(vars.liquidatedDebt, vars.liquidatedColl, totals.totalCollGasCompensation, totals.totalLUSDGasCompensation);

    // Send gas compensation to caller
    // todo what about the coll gas comp? where does that go?
    _sendGasCompensation(vars.storagePoolCached, msg.sender, vars.totalStableCoinGasCompensation);
  }

  function _sendGasCompensation(
    IStoragePool _storagePool,
    address _liquidator,
    uint _stableCoinGasCompensation
  ) internal {
    if (_stableCoinGasCompensation == 0) return;

    IDebtToken stableCoin = debtTokenManager.getStableCoin();
    _storagePool.subtractValue(address(stableCoin), false, PoolType.GasCompensation, _stableCoinGasCompensation);
    stableCoin.transferFrom(address(_storagePool), _liquidator, _stableCoinGasCompensation);
  }

  // Move a Trove's pending debt and collateral rewards from distributions, from the Default Pool to the Active Pool
  function _movePendingTroveRewardsToActivePool(
    IStoragePool _storagePool,
    RAmount[] memory _troveAmountsIncludingRewards
  ) internal {
    for (uint i = 0; i < _troveAmountsIncludingRewards.length; i++) {
      RAmount memory rAmount = _troveAmountsIncludingRewards[i];
      _storagePool.transferBetweenTypes(
        rAmount.tokenAddress,
        rAmount.isColl,
        PoolType.Default,
        PoolType.Active,
        rAmount.amount
      );
    }
  }

  // --- Redemption functions ---

  //    // Redeem as much collateral as possible from _borrower's Trove in exchange for LUSD up to _maxLUSDamount
  //    function _redeemCollateralFromTrove(
  //        ContractsCache memory _contractsCache,
  //        address _borrower,
  //        uint _maxLUSDamount,
  //        uint _price,
  //        address _upperPartialRedemptionHint,
  //        address _lowerPartialRedemptionHint,
  //        uint _partialRedemptionHintNICR
  //    )
  //        internal returns (SingleRedemptionValues memory singleRedemption)
  //    {
  //        // Determine the remaining amount (lot) to be redeemed, capped by the entire debt of the Trove minus the liquidation reserve
  //        singleRedemption.LUSDLot = LiquityMath._min(_maxLUSDamount, Troves[_borrower].debt.sub(STABLE_COIN_GAS_COMPENSATION));
  //
  //        // Get the ETHLot of equivalent value in USD
  //        singleRedemption.ETHLot = singleRedemption.LUSDLot.mul(DECIMAL_PRECISION).div(_price);
  //
  //        // Decrease the debt and collateral of the current Trove according to the LUSD lot and corresponding ETH to send
  //        uint newDebt = (Troves[_borrower].debt).sub(singleRedemption.LUSDLot);
  //        uint newColl = (Troves[_borrower].coll).sub(singleRedemption.ETHLot);
  //
  //        if (newDebt == STABLE_COIN_GAS_COMPENSATION) {
  //            // No debt left in the Trove (except for the liquidation reserve), therefore the trove gets closed
  //            _removeStake(_borrower);
  //            _closeTrove(_borrower, Status.closedByRedemption);
  //            _redeemCloseTrove(_contractsCache, _borrower, STABLE_COIN_GAS_COMPENSATION, newColl);
  //            emit TroveUpdated(_borrower, 0, 0, 0, TroveManagerOperation.redeemCollateral);
  //
  //        } else {
  //            uint newNICR = LiquityMath._computeNominalCR(newColl, newDebt);
  //
  //            /*
  //            * If the provided hint is out of date, we bail since trying to reinsert without a good hint will almost
  //            * certainly result in running out of gas.
  //            *
  //            * If the resultant net debt of the partial is less than the minimum, net debt we bail.
  //            */
  //            if (newNICR != _partialRedemptionHintNICR || _getNetDebt(newDebt) < MIN_NET_DEBT) {
  //                singleRedemption.cancelledPartial = true;
  //                return singleRedemption;
  //            }
  //
  //            _contractsCache.sortedTroves.reInsert(_borrower, newNICR, _upperPartialRedemptionHint, _lowerPartialRedemptionHint);
  //
  //            Troves[_borrower].debt = newDebt;
  //            Troves[_borrower].coll = newColl;
  //            _updateStakeAndTotalStakes(_borrower);
  //
  //            emit TroveUpdated(
  //                _borrower,
  //                newDebt, newColl,
  //                Troves[_borrower].stake,
  //                TroveManagerOperation.redeemCollateral
  //            );
  //        }
  //
  //        return singleRedemption;
  //    }

  //    /*
  //    * Called when a full redemption occurs, and closes the trove.
  //    * The redeemer swaps (debt - liquidation reserve) LUSD for (debt - liquidation reserve) worth of ETH, so the LUSD liquidation reserve left corresponds to the remaining debt.
  //    * In order to close the trove, the LUSD liquidation reserve is burned, and the corresponding debt is removed from the active pool.
  //    * The debt recorded on the trove's struct is zero'd elswhere, in _closeTrove.
  //    * Any surplus ETH left in the trove, is sent to the Coll surplus pool, and can be later claimed by the borrower.
  //    */
  //    function _redeemCloseTrove(ContractsCache memory _contractsCache, address _borrower, uint _LUSD, uint _ETH) internal {
  //        _contractsCache.lusdToken.burn(gasPoolAddress, _LUSD);
  //        // Update Active Pool LUSD, and send ETH to account
  //        _contractsCache.activePool.decreaseLUSDDebt(_LUSD);
  //
  //        // send ETH from Active Pool to CollSurplus Pool
  //        _contractsCache.collSurplusPool.accountSurplus(_borrower, _ETH);
  //        _contractsCache.activePool.sendETH(address(_contractsCache.collSurplusPool), _ETH);
  //    }
  //
  //    function _isValidFirstRedemptionHint(ISortedTroves _sortedTroves, address _firstRedemptionHint, uint _price) internal view returns (bool) {
  //        if (_firstRedemptionHint == address(0) ||
  //            !_sortedTroves.contains(_firstRedemptionHint) ||
  //            getCurrentICR(_firstRedemptionHint, _price) < MCR
  //        ) {
  //            return false;
  //        }
  //
  //        address nextTrove = _sortedTroves.getNext(_firstRedemptionHint);
  //        return nextTrove == address(0) || getCurrentICR(nextTrove, _price) < MCR;
  //    }

  //    /* Send _LUSDamount LUSD to the system and redeem the corresponding amount of collateral from as many Troves as are needed to fill the redemption
  //    * request.  Applies pending rewards to a Trove before reducing its debt and coll.
  //    *
  //    * Note that if _amount is very large, this function can run out of gas, specially if traversed troves are small. This can be easily avoided by
  //    * splitting the total _amount in appropriate chunks and calling the function multiple times.
  //    *
  //    * Param `_maxIterations` can also be provided, so the loop through Troves is capped (if it’s zero, it will be ignored).This makes it easier to
  //    * avoid OOG for the frontend, as only knowing approximately the average cost of an iteration is enough, without needing to know the “topology”
  //    * of the trove list. It also avoids the need to set the cap in stone in the contract, nor doing gas calculations, as both gas price and opcode
  //    * costs can vary.
  //    *
  //    * All Troves that are redeemed from -- with the likely exception of the last one -- will end up with no debt left, therefore they will be closed.
  //    * If the last Trove does have some remaining debt, it has a finite ICR, and the reinsertion could be anywhere in the list, therefore it requires a hint.
  //    * A frontend should use getRedemptionHints() to calculate what the ICR of this Trove will be after redemption, and pass a hint for its position
  //    * in the sortedTroves list along with the ICR value that the hint was found for.
  //    *
  //    * If another transaction modifies the list between calling getRedemptionHints() and passing the hints to redeemCollateral(), it
  //    * is very likely that the last (partially) redeemed Trove would end up with a different ICR than what the hint is for. In this case the
  //    * redemption will stop after the last completely redeemed Trove and the sender will keep the remaining LUSD amount, which they can attempt
  //    * to redeem later.
  //    */
  //    function redeemCollateral(
  //        uint _LUSDamount,
  //        address _firstRedemptionHint,
  //        address _upperPartialRedemptionHint,
  //        address _lowerPartialRedemptionHint,
  //        uint _partialRedemptionHintNICR,
  //        uint _maxIterations,
  //        uint _maxFeePercentage
  //    )
  //        external
  //        override
  //    {
  //        ContractsCache memory contractsCache = ContractsCache(
  //        storagePool,
  //            activePool,
  //            defaultPool,
  //            lusdToken,
  //            lqtyStaking,
  //            sortedTroves,
  //            collSurplusPool,
  //            gasPoolAddress
  //        );
  //        RedemptionTotals memory totals;
  //
  //        _requireValidMaxFeePercentage(_maxFeePercentage);
  //        _requireAfterBootstrapPeriod();
  //        totals.price = priceFeed.fetchPrice();
  //        _requireTCRoverMCR(totals.price);
  //        _requireAmountGreaterThanZero(_LUSDamount);
  //        _requireDebtTokenBalanceCoversRedemption(contractsCache.lusdToken, msg.sender, _LUSDamount);
  //
  //        totals.totalLUSDSupplyAtStart = contractsCache.storagePool.getEntireSystemDebt();
  //        // Confirm redeemer's balance is less than total LUSD supply
  //        assert(contractsCache.lusdToken.balanceOf(msg.sender) <= totals.totalLUSDSupplyAtStart);
  //
  //        totals.remainingLUSD = _LUSDamount;
  //        address currentBorrower;
  //
  //        if (_isValidFirstRedemptionHint(contractsCache.sortedTroves, _firstRedemptionHint, totals.price)) {
  //            currentBorrower = _firstRedemptionHint;
  //        } else {
  //            currentBorrower = contractsCache.sortedTroves.getLast();
  //            // Find the first trove with ICR >= MCR
  //            while (currentBorrower != address(0) && getCurrentICR(currentBorrower, totals.price) < MCR) {
  //                currentBorrower = contractsCache.sortedTroves.getPrev(currentBorrower);
  //            }
  //        }
  //
  //        // Loop through the Troves starting from the one with lowest collateral ratio until _amount of LUSD is exchanged for collateral
  //        if (_maxIterations == 0) { _maxIterations = uint(-1); }
  //        while (currentBorrower != address(0) && totals.remainingLUSD > 0 && _maxIterations > 0) {
  //            _maxIterations--;
  //            // Save the address of the Trove preceding the current one, before potentially modifying the list
  //            address nextUserToCheck = contractsCache.sortedTroves.getPrev(currentBorrower);
  //
  //            _applyPendingRewards(contractsCache.activePool, contractsCache.defaultPool, currentBorrower);
  //
  //            SingleRedemptionValues memory singleRedemption = _redeemCollateralFromTrove(
  //                contractsCache,
  //                currentBorrower,
  //                totals.remainingLUSD,
  //                totals.price,
  //                _upperPartialRedemptionHint,
  //                _lowerPartialRedemptionHint,
  //                _partialRedemptionHintNICR
  //            );
  //
  //            if (singleRedemption.cancelledPartial) break; // Partial redemption was cancelled (out-of-date hint, or new net debt < minimum), therefore we could not redeem from the last Trove
  //
  //            totals.totalLUSDToRedeem  = totals.totalLUSDToRedeem.add(singleRedemption.LUSDLot);
  //            totals.totalETHDrawn = totals.totalETHDrawn.add(singleRedemption.ETHLot);
  //
  //            totals.remainingLUSD = totals.remainingLUSD.sub(singleRedemption.LUSDLot);
  //            currentBorrower = nextUserToCheck;
  //        }
  //        require(totals.totalETHDrawn > 0, "TroveManager: Unable to redeem any amount");
  //
  //        // Decay the baseRate due to time passed, and then increase it according to the size of this redemption.
  //        // Use the saved total LUSD supply value, from before it was reduced by the redemption.
  //        _updateBaseRateFromRedemption(totals.totalETHDrawn, totals.price, totals.totalLUSDSupplyAtStart);
  //
  //        // Calculate the ETH fee
  //        totals.ETHFee = _getRedemptionFee(totals.totalETHDrawn);
  //
  //        _requireUserAcceptsFee(totals.ETHFee, totals.totalETHDrawn, _maxFeePercentage);
  //
  //        // Send the ETH fee to the LQTY staking contract
  //        contractsCache.activePool.sendETH(address(contractsCache.lqtyStaking), totals.ETHFee);
  //        contractsCache.lqtyStaking.increaseF_ETH(totals.ETHFee);
  //
  //        totals.ETHToSendToRedeemer = totals.totalETHDrawn.sub(totals.ETHFee);
  //
  //        emit Redemption(_LUSDamount, totals.totalLUSDToRedeem, totals.totalETHDrawn, totals.ETHFee);
  //
  //        // Burn the total LUSD that is cancelled with debt, and send the redeemed ETH to msg.sender
  //        contractsCache.lusdToken.burn(msg.sender, totals.totalLUSDToRedeem);
  //        // Update Active Pool LUSD, and send ETH to account
  //        contractsCache.activePool.decreaseLUSDDebt(totals.totalLUSDToRedeem);
  //        contractsCache.activePool.sendETH(msg.sender, totals.ETHToSendToRedeemer);
  //    }

  // --- Helper functions ---

  // Return the nominal collateral ratio (ICR) of a given Trove, without the price. Takes a trove's pending coll and debt rewards from redistributions into account.
  function getNominalICR(address _borrower, PriceCache memory _priceCache) public override returns (uint) {
    (uint currentCollInStable, uint currentDebtInStable) = _getCurrentTroveAmounts(_borrower, _priceCache);
    uint NICR = LiquityMath._computeNominalCR(currentCollInStable, currentDebtInStable);
    return NICR;
  }

  // Return the current collateral ratio (ICR) of a given Trove. Takes a trove's pending coll and debt rewards from redistributions into account.
  function getCurrentICR(
    address _borrower,
    PriceCache memory _priceCache
  ) external override returns (uint ICR, uint currentDebtInStable) {
    uint currentCollInStable;
    (currentCollInStable, currentDebtInStable) = _getCurrentTroveAmounts(_borrower, _priceCache);
    ICR = LiquityMath._computeCR(currentCollInStable, currentDebtInStable);
    return (ICR, currentDebtInStable);
  }

  // todo try to remove this function
  function _getCurrentTroveAmounts(
    address _borrower,
    PriceCache memory _priceCache
  ) internal returns (uint currentCollInStable, uint currentDebtInStable) {
    Trove storage _trove = Troves[_borrower];

    for (uint i = 0; i < _trove.collTokens.length; i++) {
      uint tokenPrice = priceFeed.getPrice(_priceCache, _trove.collTokens[i]);
      //            currentCollInStable = currentCollInStable.add(
      //                _trove.colls[_trove.collTokens[i]].add(
      //            uint pendingETHReward = getPendingETHReward(_borrower); // todo...
      //                ).mul(tokenPrice)
      //            );
    }

    for (uint i = 0; i < _trove.debtTokens.length; i++) {
      uint tokenPrice = _trove.debtTokens[i].getPrice(_priceCache);
      //            currentDebtInStable = currentDebtInStable.add(
      //                _trove.debts[_trove.debtTokens[i]].add(
      //            uint pendingLUSDDebtReward = getPendingLUSDDebtReward(_borrower); // todo...
      //                ).mul(tokenPrice)
      //            );
    }

    return (currentCollInStable, currentDebtInStable);
  }

  function applyPendingRewards(address _borrower) external override {
    _requireCallerIsBorrowerOperations();
    return _applyPendingRewards(storagePool, _borrower);
  }

  //todo...
  // Add the borrowers's coll and debt rewards earned from redistributions, to their Trove
  function _applyPendingRewards(IStoragePool _storagePool, address _borrower) internal {
    //        if (hasPendingRewards(_borrower)) {
    //            _requireTroveIsActive(_borrower);
    //
    //            // Compute pending rewards
    //            uint pendingETHReward = getPendingETHReward(_borrower);
    //            uint pendingLUSDDebtReward = getPendingLUSDDebtReward(_borrower);
    //
    //            // Apply pending rewards to trove's state
    //            Troves[_borrower].coll = Troves[_borrower].coll.add(pendingETHReward);
    //            Troves[_borrower].debt = Troves[_borrower].debt.add(pendingLUSDDebtReward);
    //
    //            _updateTroveRewardSnapshots(_borrower);
    //
    //            // Transfer from DefaultPool to ActivePool
    //            _movePendingTroveRewardsToActivePool(_storagePool, pendingLUSDDebtReward, pendingETHReward);
    //
    //            emit TroveUpdated(
    //                _borrower,
    //                Troves[_borrower].debt,
    //                Troves[_borrower].coll,
    //                Troves[_borrower].stake,
    //                TroveManagerOperation.applyPendingRewards
    //            );
    //        }
  }

  // Update borrower's snapshots of L_ETH and L_LUSDDebt to reflect the current values
  function updateTroveRewardSnapshots(address _borrower) external override {
    _requireCallerIsBorrowerOperations();
    return _updateTroveRewardSnapshots(_borrower);
  }

  // todo...
  function _updateTroveRewardSnapshots(address _borrower) internal {
    //        for (uint i = 0; i < _TokensArray.length; i++) {
    //            rewardSnapshots[_borrower][L_TokensArray[i]] = L_Tokens[L_TokensArray[i]];
    //        }
    //        emit TroveSnapshotsUpdated(L_ETH, L_LUSDDebt);
  }

  // Get the borrower's pending accumulated rewards, earned by their stake through their redistribution
  function getPendingReward(address _borrower, address _tokenAddress) public view returns (uint pendingReward) {
    uint snapshotValue = rewardSnapshots[_borrower][_tokenAddress];
    uint rewardPerUnitStaked = liquidatedTokens[_tokenAddress].sub(snapshotValue);
    if (rewardPerUnitStaked == 0 || Troves[_borrower].status != Status.active) {
      return 0;
    }

    uint stake = Troves[_borrower].stakes[_tokenAddress];
    pendingReward = stake.mul(rewardPerUnitStaked).div(DECIMAL_PRECISION);
  }

  // todo
  function hasPendingRewards(address _borrower) external view override returns (bool) {
    //        /*
    //        * A Trove has pending rewards if its snapshot is less than the current rewards per-unit-staked sum:
    //        * this indicates that rewards have occured since the snapshot was made, and the user therefore has
    //        * pending rewards
    //        */
    //        if (Troves[_borrower].status != Status.active) return false;
    //        return (rewardSnapshots[_borrower].ETH < L_ETH);
    return false;
  }

  // Return the Troves entire debt and coll, including pending rewards from redistributions.
  function getEntireDebtAndColl(
    IPriceFeed _priceFeed,
    PriceCache memory _priceCache,
    address _borrower
  ) external view override returns (RAmount[] memory amounts, uint troveCollInStable, uint troveDebtInStable) {
    Trove storage trove = Troves[_borrower];
    amounts = new RAmount[](trove.collTokens.length + trove.debtTokens.length);

    for (uint i = 0; i < trove.debtTokens.length; i++) {
      address tokenAddress = address(trove.debtTokens[i]);
      amounts[i] = RAmount(
        tokenAddress,
        trove.debtTokens[i].getPrice(_priceCache),
        false,
        trove.debts[trove.debtTokens[i]],
        getPendingReward(_borrower, tokenAddress),
        0,
        0,
        0,
        0
      );
    }
    for (uint i = 0; i < trove.collTokens.length; i++) {
      address tokenAddress = address(trove.collTokens[i]);
      amounts[i + trove.debtTokens.length] = RAmount(
        tokenAddress,
        _priceFeed.getPrice(_priceCache, tokenAddress),
        true,
        trove.colls[trove.collTokens[i]],
        getPendingReward(_borrower, tokenAddress),
        0,
        0,
        0,
        0
      );
    }

    // adding gas compensation + toLiquidate
    for (uint i = 0; i < amounts.length; i++) {
      // todo do we miss the stableCoinGasComp at this point? should it be subtracted?

      uint totalAmount = amounts[i].amount.add(amounts[i].pendingReward);
      amounts[i].gasCompensation = _getCollGasCompensation(totalAmount);
      amounts[i].toLiquidate = totalAmount.sub(amounts[i].gasCompensation);

      uint inStable = totalAmount.mul(amounts[i].price);
      if (amounts[i].isColl) troveCollInStable = troveCollInStable.add(inStable);
      else troveDebtInStable = troveDebtInStable.add(inStable);
    }

    return (amounts, troveCollInStable, troveDebtInStable);
  }

  function removeStake(address _borrower) external override {
    _requireCallerIsBorrowerOperations();
    return _removeStake(_borrower);
  }

  // Remove borrower's stake from the totalStakes sum, and set their stake to 0
  function _removeStake(address _borrower) internal {
    for (uint i = 0; i < tokenAddresses.length; i++) {
      address tokenAddress = tokenAddresses[i];
      uint oldStake = Troves[_borrower].stakes[tokenAddress];
      totalStakes[tokenAddress] = totalStakes[tokenAddress].sub(oldStake);
      Troves[_borrower].stakes[tokenAddress] = 0;
    }
  }

  function updateStakeAndTotalStakes(address _borrower) external override {
    _requireCallerIsBorrowerOperations();
    _updateStakeAndTotalStakes(_borrower);
  }

  // Update borrower's stake based on their latest collateral value
  function _updateStakeAndTotalStakes(address _borrower) internal {
    for (uint i = 0; i < tokenAddresses.length; i++) {
      address tokenAddress = tokenAddresses[i];
      uint newStake = _computeNewStake(tokenAddress, Troves[_borrower].colls[tokenAddress]);
      uint oldStake = Troves[_borrower].stakes[tokenAddress];
      Troves[_borrower].stakes[tokenAddress] = newStake;

      totalStakes[tokenAddress] = totalStakes[tokenAddress].sub(oldStake).add(newStake);
      // todo emit TotalStakesUpdated(tokenAddress, totalStakes);
    }
  }

  // Calculate a new stake based on the snapshots of the totalStakes and totalCollateral taken at the last liquidation
  function _computeNewStake(address _collAddress, uint _amount) internal view returns (uint stake) {
    uint totalCollateralSnapshot = totalCollateralSnapshots[_collAddress];
    if (totalCollateralSnapshot == 0) {
      stake = _amount;
    } else {
      /*
       * The following assert() holds true because:
       * - The system always contains >= 1 trove
       * - When we close or liquidate a trove, we redistribute the pending rewards, so if all troves were closed/liquidated,
       * rewards would’ve been emptied and totalCollateralSnapshot would be zero too.
       */
      uint stakedSnapshot = totalStakesSnapshot[_collAddress];
      assert(stakedSnapshot > 0);
      stake = _amount.mul(stakedSnapshot).div(totalCollateralSnapshot);
    }
    return stake;
  }

  function _redistributeDebtAndColl(
    IStoragePool _storagePool,
    PriceCache memory _priceCache,
    CAmount[] memory toRedistribute
  ) internal {
    /*
     * Add distributed coll and debt rewards-per-unit-staked to the running totals. Division uses a "feedback"
     * error correction, to keep the cumulative error low in the running totals:
     *
     * 1) Form numerators which compensate for the floor division errors that occurred the last time this
     * function was called.
     * 2) Calculate "per-unit-staked" ratios.
     * 3) Multiply each ratio back by its denominator, to reveal the current floor division error.
     * 4) Store these errors for use in the next correction when this function is called.
     * 5) Note: static analysis tools complain about this "division before multiplication", however, it is intended.
     */

    uint totalStake = _calculateTotalStakeSum(_priceCache);
    for (uint i = 0; i < toRedistribute.length; i++) {
      if (toRedistribute[i].amount == 0) continue;
      address tokenAddress = toRedistribute[i].tokenAddress;

      // Get the per-unit-staked terms
      uint numerator = toRedistribute[i].amount.mul(DECIMAL_PRECISION).add(lastErrorRedistribution[tokenAddress]);
      uint rewardPerUnitStaked = numerator.div(totalStake);
      lastErrorRedistribution[tokenAddress] = numerator.sub(rewardPerUnitStaked.mul(totalStake));

      // Add per-unit-staked terms to the running totals
      liquidatedTokens[tokenAddress] = liquidatedTokens[tokenAddress].add(rewardPerUnitStaked);
      //            emit LTermsUpdated(tokenAddress, liquidatedTokens[tokenAddress]); todo

      _storagePool.transferBetweenTypes(
        tokenAddress,
        toRedistribute[i].isColl,
        PoolType.Active,
        PoolType.Default,
        toRedistribute[i].amount
      );
    }
  }

  function _calculateTrovesStakeSum(PriceCache memory _priceCache, address _borrower) internal returns (uint stakeSum) {
    Trove storage trove = Troves[_borrower];
    for (uint i = 0; i < tokenAddresses.length; i++) {
      stakeSum = stakeSum.add(trove.stakes[tokenAddresses[i]].mul(priceFeed.getPrice(_priceCache, tokenAddresses[i])));
    }
    return stakeSum;
  }

  function _calculateTotalStakeSum(PriceCache memory _priceCache) internal returns (uint stakeSum) {
    for (uint i = 0; i < tokenAddresses.length; i++) {
      stakeSum = stakeSum.add(totalStakes[tokenAddresses[i]].mul(priceFeed.getPrice(_priceCache, tokenAddresses[i])));
    }
    return stakeSum;
  }

  function closeTrove(address _borrower) external override {
    _requireCallerIsBorrowerOperations();
    return _closeTrove(_borrower, Status.closedByOwner);
  }

  function _closeTrove(address _borrower, Status closedStatus) internal {
    assert(closedStatus != Status.nonExistent && closedStatus != Status.active);

    uint TroveOwnersArrayLength = TroveOwners.length;
    _requireMoreThanOneTroveInSystem(TroveOwnersArrayLength);

    Trove storage trove = Troves[_borrower];
    trove.status = closedStatus;
    for (uint i = 0; i < trove.debtTokens.length; i++) {
      trove.debts[trove.debtTokens[i]] = 0;
    }
    for (uint i = 0; i < trove.collTokens.length; i++) {
      trove.colls[trove.collTokens[i]] = 0;
    }
    for (uint i = 0; i < tokenAddresses.length; i++) {
      trove.stakes[trove.collTokens[i]] = 0;
    }

    _removeTroveOwner(_borrower, TroveOwnersArrayLength);
    sortedTroves.remove(_borrower);
  }

  /*
   * Updates snapshots of system total stakes and total collateral, excluding a given collateral remainder from the calculation.
   * Used in a liquidation sequence.
   */
  function _updateSystemSnapshots_excludeCollRemainder(IStoragePool _storagePool) internal {
    for (uint i = 0; i < tokenAddresses.length; i++) {
      address tokenAddress = tokenAddresses[i];

      totalStakesSnapshot[tokenAddress] = totalStakes[tokenAddress];

      uint activeAmount = _storagePool.getValue(tokenAddress, true, PoolType.Active);
      uint defaultAmount = _storagePool.getValue(tokenAddress, true, PoolType.Default);
      totalCollateralSnapshots[tokenAddress] = activeAmount.add(defaultAmount);

      //            emit SystemSnapshotsUpdated(tokenAddress, totalStakesSnapshot[tokenAddress], totalCollateralSnapshots[tokenAddress]); todo
    }
  }

  // Push the owner's address to the Trove owners list, and record the corresponding array index on the Trove struct
  function addTroveOwnerToArray(address _borrower) external override returns (uint index) {
    _requireCallerIsBorrowerOperations();
    return _addTroveOwnerToArray(_borrower);
  }

  function _addTroveOwnerToArray(address _borrower) internal returns (uint128 index) {
    /* Max array size is 2**128 - 1, i.e. ~3e30 troves. No risk of overflow, since troves have minimum LUSD
        debt of liquidation reserve plus MIN_NET_DEBT. 3e30 LUSD dwarfs the value of all wealth in the world ( which is < 1e15 USD). */

    // Push the Troveowner to the array
    TroveOwners.push(_borrower);

    // Record the index of the new Troveowner on their Trove struct
    index = uint128(TroveOwners.length.sub(1));
    Troves[_borrower].arrayIndex = index;

    return index;
  }

  /*
   * Remove a Trove owner from the TroveOwners array, not preserving array order. Removing owner 'B' does the following:
   * [A B C D E] => [A E C D], and updates E's Trove struct to point to its new array index.
   */
  function _removeTroveOwner(address _borrower, uint TroveOwnersArrayLength) internal {
    Status troveStatus = Troves[_borrower].status;
    // It’s set in caller function `_closeTrove`
    assert(troveStatus != Status.nonExistent && troveStatus != Status.active);

    uint128 index = Troves[_borrower].arrayIndex;
    uint length = TroveOwnersArrayLength;
    uint idxLast = length.sub(1);

    assert(index <= idxLast);

    address addressToMove = TroveOwners[idxLast];

    TroveOwners[index] = addressToMove;
    Troves[addressToMove].arrayIndex = index;
    emit TroveIndexUpdated(addressToMove, index);

    TroveOwners.pop();
  }

  // --- Recovery Mode and TCR functions ---

  // Check whether or not the system *would be* in Recovery Mode, given an ETH:USD price, and the entire system coll and debt.
  function _checkPotentialRecoveryMode(uint _entireSystemColl, uint _entireSystemDebt) internal pure returns (bool) {
    uint TCR = LiquityMath._computeCR(_entireSystemColl, _entireSystemDebt);
    return TCR < CCR;
  }

  // --- Redemption fee functions ---

  /*
   * This function has two impacts on the baseRate state variable:
   * 1) decays the baseRate based on time passed since last redemption or LUSD borrowing operation.
   * then,
   * 2) increases the baseRate based on the amount redeemed, as a proportion of total supply
   */
  function _updateBaseRateFromRedemption(uint _ETHDrawn, uint _price, uint _totalLUSDSupply) internal returns (uint) {
    uint decayedBaseRate = _calcDecayedBaseRate();

    /* Convert the drawn ETH back to LUSD at face value rate (1 LUSD:1 USD), in order to get
     * the fraction of total supply that was redeemed at face value. */
    uint redeemedLUSDFraction = _ETHDrawn.mul(_price).div(_totalLUSDSupply);

    uint newBaseRate = decayedBaseRate.add(redeemedLUSDFraction.div(BETA));
    newBaseRate = LiquityMath._min(newBaseRate, DECIMAL_PRECISION); // cap baseRate at a maximum of 100%
    //assert(newBaseRate <= DECIMAL_PRECISION); // This is already enforced in the line above
    assert(newBaseRate > 0); // Base rate is always non-zero after redemption

    // Update the baseRate state variable
    baseRate = newBaseRate;
    emit BaseRateUpdated(newBaseRate);

    _updateLastFeeOpTime();

    return newBaseRate;
  }

  function getRedemptionRate() public view override returns (uint) {
    return _calcRedemptionRate(baseRate);
  }

  function getRedemptionRateWithDecay() public view override returns (uint) {
    return _calcRedemptionRate(_calcDecayedBaseRate());
  }

  function _calcRedemptionRate(uint _baseRate) internal pure returns (uint) {
    return
      LiquityMath._min(
        REDEMPTION_FEE_FLOOR.add(_baseRate),
        DECIMAL_PRECISION // cap at a maximum of 100%
      );
  }

  function _getRedemptionFee(uint _ETHDrawn) internal view returns (uint) {
    return _calcRedemptionFee(getRedemptionRate(), _ETHDrawn);
  }

  function getRedemptionFeeWithDecay(uint _ETHDrawn) external view override returns (uint) {
    return _calcRedemptionFee(getRedemptionRateWithDecay(), _ETHDrawn);
  }

  function _calcRedemptionFee(uint _redemptionRate, uint _ETHDrawn) internal pure returns (uint) {
    uint redemptionFee = _redemptionRate.mul(_ETHDrawn).div(DECIMAL_PRECISION);
    require(redemptionFee < _ETHDrawn, 'TroveManager: Fee would eat up all returned collateral');
    return redemptionFee;
  }

  // --- Borrowing fee functions ---

  function getBorrowingRate() public view override returns (uint) {
    return _calcBorrowingRate(baseRate);
  }

  function getBorrowingRateWithDecay() public view override returns (uint) {
    return _calcBorrowingRate(_calcDecayedBaseRate());
  }

  function _calcBorrowingRate(uint _baseRate) internal pure returns (uint) {
    return LiquityMath._min(BORROWING_FEE_FLOOR.add(_baseRate), MAX_BORROWING_FEE);
  }

  function getBorrowingFee(uint _debtValue) external view override returns (uint) {
    return _calcBorrowingFee(getBorrowingRate(), _debtValue);
  }

  function getBorrowingFeeWithDecay(uint _debtValue) external view override returns (uint) {
    return _calcBorrowingFee(getBorrowingRateWithDecay(), _debtValue);
  }

  function _calcBorrowingFee(uint _borrowingRate, uint _debtValue) internal pure returns (uint) {
    return _borrowingRate.mul(_debtValue).div(DECIMAL_PRECISION);
  }

  // Updates the baseRate state variable based on time elapsed since the last redemption or LUSD borrowing operation.
  function decayBaseRateFromBorrowing() external override {
    _requireCallerIsBorrowerOperations();

    uint decayedBaseRate = _calcDecayedBaseRate();
    assert(decayedBaseRate <= DECIMAL_PRECISION); // The baseRate can decay to 0

    baseRate = decayedBaseRate;
    emit BaseRateUpdated(decayedBaseRate);

    _updateLastFeeOpTime();
  }

  // --- Internal fee functions ---

  // Update the last fee operation time only if time passed >= decay interval. This prevents base rate griefing.
  function _updateLastFeeOpTime() internal {
    uint timePassed = block.timestamp.sub(lastFeeOperationTime);

    if (timePassed >= SECONDS_IN_ONE_MINUTE) {
      lastFeeOperationTime = block.timestamp;
      emit LastFeeOpTimeUpdated(block.timestamp);
    }
  }

  function _calcDecayedBaseRate() internal view returns (uint) {
    uint minutesPassed = _minutesPassedSinceLastFeeOp();
    uint decayFactor = LiquityMath._decPow(MINUTE_DECAY_FACTOR, minutesPassed);

    return baseRate.mul(decayFactor).div(DECIMAL_PRECISION);
  }

  function _minutesPassedSinceLastFeeOp() internal view returns (uint) {
    return (block.timestamp.sub(lastFeeOperationTime)).div(SECONDS_IN_ONE_MINUTE);
  }

  // --- 'require' wrapper functions ---

  function _requireCallerIsBorrowerOperations() internal view {
    require(msg.sender == borrowerOperationsAddress, 'TroveManager: Caller is not the BorrowerOperations contract');
  }

  function _requireTroveIsActive(address _borrower) internal view {
    require(Troves[_borrower].status == Status.active, 'TroveManager: Trove does not exist or is closed');
  }

  function _requireDebtTokenBalanceCoversRedemption(
    IDebtToken _debtToken,
    address _redeemer,
    uint _amount
  ) internal view {
    require(
      _debtToken.balanceOf(_redeemer) >= _amount,
      "TroveManager: Requested redemption amount must be <= user's debt token balance"
    );
  }

  function _requireMoreThanOneTroveInSystem(uint TroveOwnersArrayLength) internal view {
    require(TroveOwnersArrayLength > 1 && sortedTroves.getSize() > 1, 'TroveManager: Only one trove in the system');
  }

  function _requireAmountGreaterThanZero(uint _amount) internal pure {
    require(_amount > 0, 'TroveManager: Amount must be greater than zero');
  }

  //    function _requireTCRoverMCR(uint _price) internal view {
  //        require(storagePool.getTCR(_price) >= MCR, "TroveManager: Cannot redeem when TCR < MCR");
  //    }

  //    function _requireAfterBootstrapPeriod() internal view {
  //        uint systemDeploymentTime = lqtyToken.getDeploymentStartTime();
  //        require(block.timestamp >= systemDeploymentTime.add(BOOTSTRAP_PERIOD), "TroveManager: Redemptions are not allowed during bootstrap phase");
  //    }

  function _requireValidMaxFeePercentage(uint _maxFeePercentage) internal pure {
    require(
      _maxFeePercentage >= REDEMPTION_FEE_FLOOR && _maxFeePercentage <= DECIMAL_PRECISION,
      'Max fee percentage must be between 0.5% and 100%'
    );
  }

  // --- Trove property getters ---

  function getTroveStatus(address _borrower) external view override returns (uint) {
    return uint(Troves[_borrower].status);
  }

  function getTroveStake(address _borrower) external view override returns (uint) {
    // todo
    return 1;
    //        return Troves[_borrower].stake;
  }

  function getTroveDebt(address _borrower) external view override returns (TokenAmount[] memory) {
    Trove storage trove = Troves[_borrower];
    if (trove.status != Status.active) return new TokenAmount[](0);

    TokenAmount[] memory debts = new TokenAmount[](trove.debtTokens.length);
    for (uint i = 0; i < debts.length; i++)
      debts[i] = TokenAmount(address(trove.debtTokens[i]), trove.debts[trove.debtTokens[i]]);

    return debts;
  }

  function getTroveColl(address _borrower) external view override returns (TokenAmount[] memory) {
    Trove storage trove = Troves[_borrower];
    if (trove.status != Status.active) return new TokenAmount[](0);

    TokenAmount[] memory colls = new TokenAmount[](trove.collTokens.length);
    for (uint i = 0; i < colls.length; i++)
      colls[i] = TokenAmount(trove.collTokens[i], trove.colls[trove.collTokens[i]]);

    return colls;
  }

  // --- Trove property setters, called by BorrowerOperations ---

  function setTroveStatus(address _borrower, uint _num) external override {
    _requireCallerIsBorrowerOperations();
    Troves[_borrower].status = Status(_num);
  }

  function increaseTroveColl(address _borrower, PriceTokenAmount[] memory _collTokenAmounts) external override {
    _requireCallerIsBorrowerOperations();

    Trove storage trove = Troves[_borrower];
    for (uint i = 0; i < _collTokenAmounts.length; i++) {
      uint newColl = trove.colls[_collTokenAmounts[i].tokenAddress].add(_collTokenAmounts[i].coll);
      trove.colls[_collTokenAmounts[i].tokenAddress] = newColl;
    }
  }

  function decreaseTroveColl(address _borrower, PriceTokenAmount[] memory _collTokenAmounts) external override {
    _requireCallerIsBorrowerOperations();

    Trove storage trove = Troves[_borrower];
    for (uint i = 0; i < _collTokenAmounts.length; i++) {
      uint newColl = trove.colls[_collTokenAmounts[i].tokenAddress].sub(_collTokenAmounts[i].coll);
      trove.colls[_collTokenAmounts[i].tokenAddress] = newColl;
    }
  }

  function increaseTroveDebt(address _borrower, DebtTokenAmount[] memory _debtTokenAmounts) external override {
    _requireCallerIsBorrowerOperations();

    Trove storage trove = Troves[_borrower];
    for (uint i = 0; i < _debtTokenAmounts.length; i++) {
      uint newDebt = trove.debts[_debtTokenAmounts[i].debtToken].add(_debtTokenAmounts[i].netDebt);
      trove.debts[_debtTokenAmounts[i].debtToken] = newDebt;
    }
  }

  function decreaseTroveDebt(address _borrower, DebtTokenAmount[] memory _debtTokenAmounts) external override {
    _requireCallerIsBorrowerOperations();

    Trove storage trove = Troves[_borrower];
    for (uint i = 0; i < _debtTokenAmounts.length; i++) {
      uint newDebt = trove.debts[_debtTokenAmounts[i].debtToken].sub(_debtTokenAmounts[i].netDebt);
      trove.debts[_debtTokenAmounts[i].debtToken] = newDebt;
    }
  }

  function _getNetDebt(DebtTokenAmount[] memory _newDebts) internal pure returns (uint) {
    uint debtInStable = 0;
    for (uint i = 0; i < _newDebts.length; i++) {
      DebtTokenAmount memory debtTokenAmount = _newDebts[i];
      debtInStable.add(debtTokenAmount.netDebt.mul(debtTokenAmount.price));
    }
    return debtInStable.sub(STABLE_COIN_GAS_COMPENSATION);
  }
}
