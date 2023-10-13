// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/access/Ownable.sol';
import './Dependencies/LiquityBase.sol';
import './Dependencies/CheckContract.sol';
import './Interfaces/ITroveManager.sol';
import './Interfaces/IStabilityPool.sol';
import './Interfaces/IDebtToken.sol';
import './Interfaces/IDebtTokenManager.sol';
import './Interfaces/IPriceFeed.sol';
import './Interfaces/IStoragePool.sol';
import './Interfaces/IStabilityPoolManager.sol';
import './Interfaces/IBBase.sol';
import './Interfaces/ICollTokenManager.sol';

contract TroveManager is LiquityBase, Ownable, CheckContract, ITroveManager {
  string public constant NAME = 'TroveManager';

  // --- Connected contract declarations ---

  IDebtTokenManager public debtTokenManager;
  ICollTokenManager public collTokenManager;
  address public borrowerOperationsAddress;
  IStabilityPoolManager public stabilityPoolManager;
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

  // Store the neccessary data for a trove
  struct Trove {
    Status status;
    uint128 arrayIndex;
    //
    IDebtToken[] debtTokens;
    mapping(address => bool) debtsRegistered;
    mapping(IDebtToken => uint) debts;
    //
    address[] collTokens;
    mapping(address => bool) collsRegistered;
    mapping(address => uint) colls;
    //
    // the troves stake is depends on the current collateral token prices
    // therefore the partial stakes relative to the collateral needs to be stored
    mapping(address => uint) stakes; // [collTokenAddress] -> stake
  }
  mapping(address => Trove) public Troves;

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
  mapping(address => mapping(bool => uint)) public liquidatedTokens; // [tokenAddress][isColl] -> liquidated/redistributed amount
  mapping(address => mapping(address => mapping(bool => uint))) public rewardSnapshots; // [user][tokenAddress][isColl] -> value, snapshots
  mapping(address => mapping(bool => uint)) public lastErrorRedistribution; // [tokenAddress][isColl] -> value, Error trackers for the trove redistribution calculation

  // Array of all active trove addresses - used to to compute an approximate hint off-chain, for the sorted list insertion
  address[] public TroveOwners;

  /*
   * --- Variable container structs for liquidations ---
   *
   * These structs are used to hold, return and assign variables inside the liquidation functions,
   * in order to avoid the error: "CompilerError: Stack too deep".
   **/

  struct LocalVariables_OuterLiquidationFunction {
    address[] collTokenAddresses;
    //
    RemainingStability[] remainingStabilities;
    CAmount[] tokensToRedistribute;
    uint totalStableCoinGasCompensation;
    uint entireSystemCollInStable;
    uint entireSystemDebtInStable;
  }

  struct LocalVariables_LiquidationSequence {
    //
    bool backToNormalMode;
    //
    uint ICR;
    address user;
    //
    RAmount[] troveAmountsIncludingRewards;
    uint troveDebtInStable;
    uint troveDebtInStableWithoutGasCompensation;
    uint troveCollInStable;
  }

  struct RedemptionVariables {
    address[] collTokenAddresses;
    //
    uint totalStableSupplyAtStart;
    uint totalRedeemedStable;
    //
    uint totalETHDrawn;
    uint ETHFee;
    uint ETHToSendToRedeemer;
    uint decayedBaseRate;
  }

  struct RedemptionCollAmount {
    uint drawn;
    uint redemptionFee;
    uint sendToRedeemer;
  }

  struct SingleRedemptionVariables {
    uint stableCoinLot;
    TokenAmount[] collLots;
    //
    TokenAmount stableCoinEntry;
    uint troveCollInStable;
    uint troveDebtInStable;
  }

  // --- Dependency setter ---

  function setAddresses(
    address _borrowerOperationsAddress,
    address _storagePoolAddress,
    address _stabilityPoolManagerAddress,
    address _priceFeedAddress,
    address _debtTokenManagerAddress,
    address _collTokenManagerAddress
  ) external onlyOwner {
    checkContract(_borrowerOperationsAddress);
    checkContract(_storagePoolAddress);
    checkContract(_stabilityPoolManagerAddress);
    checkContract(_priceFeedAddress);
    checkContract(_debtTokenManagerAddress);
    checkContract(_collTokenManagerAddress);

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

    collTokenManager = ICollTokenManager(_collTokenManagerAddress);
    emit CollTokenManagerAddressChanged(_collTokenManagerAddress);

    renounceOwnership();
  }

  // --- Getters ---

  function getTroveOwnersCount() external view override returns (uint) {
    return TroveOwners.length;
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
    if (_troveArray.length == 0) revert EmptyArray();

    LocalVariables_OuterLiquidationFunction memory vars;
    vars.collTokenAddresses = collTokenManager.getCollTokenAddresses();

    bool recoveryModeAtStart;
    (recoveryModeAtStart, , vars.entireSystemCollInStable, vars.entireSystemDebtInStable) = storagePool
      .checkRecoveryMode();
    vars.remainingStabilities = stabilityPoolManager.getRemainingStability(vars.collTokenAddresses);
    _initializeEmptyTokensToRedistribute(vars); // all set to 0 (nothing to redistribute)

    bool atLeastOneTroveLiquidated;
    if (recoveryModeAtStart) atLeastOneTroveLiquidated = _getTotalFromBatchLiquidate_RecoveryMode(vars, _troveArray);
    else atLeastOneTroveLiquidated = _getTotalsFromBatchLiquidate_NormalMode(vars, _troveArray);

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
  ) internal returns (bool atLeastOneTroveLiquidated) {
    LocalVariables_LiquidationSequence memory vars;
    vars.backToNormalMode = false; // rechecked after every liquidated trove, to adapt strategy

    for (uint i = 0; i < _troveArray.length; i++) {
      vars.user = _troveArray[i];
      if (Troves[vars.user].status != Status.active) continue; // Skip non-active troves

      bool liquidated = _executeTroveLiquidation_RecoveryMode(outerVars, vars);
      if (liquidated) atLeastOneTroveLiquidated = true;
    }
  }

  // Liquidate one trove, in Recovery Mode.
  function _liquidateRecoveryMode(
    RemainingStability[] memory remainingStabilities,
    address[] memory collTokenAddresses,
    address _borrower,
    uint _ICR,
    uint _troveCollInStable,
    uint _troveDebtInStableWithoutGasCompensation,
    uint _TCR,
    RAmount[] memory troveAmountsIncludingRewards
  ) internal {
    // If ICR <= 100%, purely redistribute the Trove across all active Troves
    if (_ICR <= _100pct) {
      _movePendingTroveRewardsToActivePool(troveAmountsIncludingRewards);
      _removeStake(collTokenAddresses, _borrower);
      for (uint i = 0; i < troveAmountsIncludingRewards.length; i++) {
        RAmount memory rAmount = troveAmountsIncludingRewards[i];
        rAmount.toRedistribute = rAmount.toLiquidate;
      }
      _closeTrove(collTokenAddresses, _borrower, Status.closedByLiquidation);
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
      _movePendingTroveRewardsToActivePool(troveAmountsIncludingRewards);
      _removeStake(collTokenAddresses, _borrower);
      _getOffsetAndRedistributionVals(
        _troveDebtInStableWithoutGasCompensation,
        troveAmountsIncludingRewards,
        remainingStabilities
      );
      _closeTrove(collTokenAddresses, _borrower, Status.closedByLiquidation);

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
      _movePendingTroveRewardsToActivePool(troveAmountsIncludingRewards);
      _removeStake(collTokenAddresses, _borrower);
      _getCappedOffsetVals(
        _troveCollInStable,
        _troveDebtInStableWithoutGasCompensation,
        troveAmountsIncludingRewards,
        remainingStabilities
      );
      _closeTrove(collTokenAddresses, _borrower, Status.closedByLiquidation);

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
  ) internal returns (bool atLeastOneTroveLiquidated) {
    LocalVariables_LiquidationSequence memory vars;

    for (uint i = 0; i < _troveArray.length; i++) {
      vars.user = _troveArray[i];
      if (Troves[vars.user].status != Status.active) continue; // Skip non-active troves

      bool liquidated = _executeTroveLiquidation_NormalMode(outerVars, vars);
      if (liquidated) atLeastOneTroveLiquidated = true;
    }
  }

  // Liquidate one trove, in Normal Mode.
  function _liquidateNormalMode(
    LocalVariables_OuterLiquidationFunction memory outerVars,
    address _borrower,
    uint _troveDebtInStableWithoutGasCompensation,
    RAmount[] memory troveAmountsIncludingRewards
  ) internal {
    _movePendingTroveRewardsToActivePool(troveAmountsIncludingRewards);
    _removeStake(outerVars.collTokenAddresses, _borrower);
    _getOffsetAndRedistributionVals(
      _troveDebtInStableWithoutGasCompensation,
      troveAmountsIncludingRewards,
      outerVars.remainingStabilities
    );
    _closeTrove(outerVars.collTokenAddresses, _borrower, Status.closedByLiquidation);

    // todo
    //        emit TroveLiquidated(_borrower, singleLiquidation.entireTroveDebt, singleLiquidation.entireTroveColl, TroveManagerOperation.liquidateInNormalMode);
    //        emit TroveUpdated(_borrower, 0, 0, 0, TroveManagerOperation.liquidateInNormalMode);
  }

  /* In a full liquidation, returns the values for a trove's coll and debt to be offset, and coll and debt to be
   * redistributed to active troves.
   */
  function _getOffsetAndRedistributionVals(
    uint troveDebtInStableWithoutGasCompensation,
    RAmount[] memory troveAmountsIncludingRewards,
    RemainingStability[] memory remainingStabilities
  ) internal view {
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
      if (rAmount.isColl) rAmount.toRedistribute = rAmount.toLiquidate; // by default the entire debt amount needs to be redistributed
    }

    _debtOffset(troveDebtInStableWithoutGasCompensation, troveAmountsIncludingRewards, remainingStabilities);
  }

  /*
   *  Get its offset coll/debt and gas comp.
   */
  function _getCappedOffsetVals(
    uint troveCollInStable,
    uint troveDebtInStableWithoutGasCompensation,
    RAmount[] memory troveAmountsIncludingRewards,
    RemainingStability[] memory remainingStabilities
  ) internal view {
    // capping the to be liquidated collateral to 1.1 * the total debts value
    uint cappedLimit = troveDebtInStableWithoutGasCompensation * MCR; // total debt * 1.1
    for (uint i = 0; i < troveAmountsIncludingRewards.length; i++) {
      RAmount memory rAmount = troveAmountsIncludingRewards[i];
      if (!rAmount.isColl) continue; // coll will be handled later in the debts loop
      // priceFeed.getUSDValue(rAmount.tokenAddress, rAmount.toLiquidate)
      uint cappedColl = (cappedLimit * rAmount.toLiquidate) / troveCollInStable;
      rAmount.toLiquidate = LiquityMath._min(cappedColl, rAmount.toLiquidate);
    }

    _debtOffset(troveDebtInStableWithoutGasCompensation, troveAmountsIncludingRewards, remainingStabilities);
  }

  function _debtOffset(
    uint troveDebtInStableWithoutGasCompensation,
    RAmount[] memory troveAmountsIncludingRewards,
    RemainingStability[] memory remainingStabilities
  ) internal view {
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
        remainingStability.debtToOffset += rAmountDebt.toOffset;
        remainingStability.remaining -= rAmountDebt.toOffset;

        uint offsetPercentage = (priceFeed.getUSDValue(rAmountDebt.tokenAddress, rAmountDebt.toOffset) *
          DECIMAL_PRECISION) / troveDebtInStableWithoutGasCompensation; // relative to the troves total debt

        // moving the offsetPercentage of each coll into the stable pool
        for (uint ii = 0; ii < troveAmountsIncludingRewards.length; ii++) {
          RAmount memory rAmountColl = troveAmountsIncludingRewards[ii];
          if (!rAmountColl.isColl) continue; // debt already handled one step above

          rAmountColl.toOffset = (rAmountColl.toLiquidate * offsetPercentage) / DECIMAL_PRECISION;
          rAmountColl.toRedistribute -= rAmountColl.toOffset;

          // find the right collGained entry and add the value
          for (uint iii = 0; iii < remainingStability.collGained.length; iii++) {
            if (remainingStability.collGained[iii].tokenAddress != rAmountColl.tokenAddress) continue;

            remainingStability.collGained[iii].amount += rAmountColl.toOffset;
            break;
          }
        }
      }

      // remaining debt needs to be redistributed
      rAmountDebt.toRedistribute = rAmountDebt.toLiquidate - rAmountDebt.toOffset;
    }
  }

  // --- Liquidation helper functions ---

  function _executeTroveLiquidation_RecoveryMode(
    LocalVariables_OuterLiquidationFunction memory outerVars,
    LocalVariables_LiquidationSequence memory vars
  ) internal returns (bool liquidated) {
    (
      vars.troveAmountsIncludingRewards,
      vars.troveCollInStable,
      vars.troveDebtInStable,
      vars.troveDebtInStableWithoutGasCompensation
    ) = this.getEntireDebtAndColl(vars.user);
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
        outerVars.remainingStabilities,
        outerVars.collTokenAddresses,
        vars.user,
        vars.ICR,
        vars.troveCollInStable,
        vars.troveDebtInStableWithoutGasCompensation,
        TCR,
        vars.troveAmountsIncludingRewards
      );

      // updating total system debt and collateral
      for (uint a = 0; a < vars.troveAmountsIncludingRewards.length; a++) {
        RAmount memory rAmount = vars.troveAmountsIncludingRewards[a];
        outerVars.entireSystemCollInStable -= priceFeed.getUSDValue(rAmount.tokenAddress, rAmount.gasCompensation);
        if (rAmount.isColl)
          outerVars.entireSystemCollInStable -= priceFeed.getUSDValue(rAmount.tokenAddress, rAmount.toOffset);
        else outerVars.entireSystemDebtInStable -= priceFeed.getUSDValue(rAmount.tokenAddress, rAmount.toOffset);
      }

      vars.backToNormalMode = !_checkPotentialRecoveryMode(
        outerVars.entireSystemCollInStable,
        outerVars.entireSystemDebtInStable
      );
    } else if (vars.backToNormalMode && vars.ICR < MCR) {
      _liquidateNormalMode(
        outerVars,
        vars.user,
        vars.troveDebtInStableWithoutGasCompensation,
        vars.troveAmountsIncludingRewards
      );
    } else return false; // break if the loop reaches a Trove with ICR >= MCR

    // not liquidated
    if (vars.troveAmountsIncludingRewards.length == 0) return false;

    _mergeTokensToRedistribute(vars.troveAmountsIncludingRewards, outerVars.tokensToRedistribute);
    outerVars.totalStableCoinGasCompensation += STABLE_COIN_GAS_COMPENSATION;
    return true;
  }

  function _executeTroveLiquidation_NormalMode(
    LocalVariables_OuterLiquidationFunction memory outerVars,
    LocalVariables_LiquidationSequence memory vars
  ) internal returns (bool liquidated) {
    (
      vars.troveAmountsIncludingRewards,
      vars.troveCollInStable,
      vars.troveDebtInStable,
      vars.troveDebtInStableWithoutGasCompensation
    ) = this.getEntireDebtAndColl(vars.user);

    vars.ICR = LiquityMath._computeCR(vars.troveCollInStable, vars.troveDebtInStable);
    if (vars.ICR >= MCR) return false; // trove is collatoralized enough, skip the liquidation

    _liquidateNormalMode(
      outerVars,
      vars.user,
      vars.troveDebtInStableWithoutGasCompensation,
      vars.troveAmountsIncludingRewards
    );

    _mergeTokensToRedistribute(vars.troveAmountsIncludingRewards, outerVars.tokensToRedistribute);
    outerVars.totalStableCoinGasCompensation += STABLE_COIN_GAS_COMPENSATION;
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

  function _initializeEmptyTokensToRedistribute(LocalVariables_OuterLiquidationFunction memory vars) internal view {
    address[] memory debtTokenAddresses = debtTokenManager.getDebtTokenAddresses();

    vars.tokensToRedistribute = new CAmount[](debtTokenAddresses.length + vars.collTokenAddresses.length);
    for (uint i = 0; i < vars.collTokenAddresses.length; i++)
      vars.tokensToRedistribute[i] = CAmount(vars.collTokenAddresses[i], true, 0);
    for (uint i = 0; i < debtTokenAddresses.length; i++)
      vars.tokensToRedistribute[vars.collTokenAddresses.length + i] = CAmount(debtTokenAddresses[i], false, 0);
  }

  // adding up the token to redistribute
  function _mergeTokensToRedistribute(
    RAmount[] memory troveAmountsIncludingRewards,
    CAmount[] memory tokensToRedistribute
  ) internal pure {
    for (uint i = 0; i < troveAmountsIncludingRewards.length; i++) {
      RAmount memory rAmount = troveAmountsIncludingRewards[i];
      if (rAmount.toRedistribute == 0) continue;

      for (uint ib = 0; ib < tokensToRedistribute.length; ib++) {
        if (tokensToRedistribute[ib].tokenAddress != rAmount.tokenAddress) continue;

        tokensToRedistribute[ib].amount += rAmount.toRedistribute;
        break;
      }
    }
  }

  function _postSystemLiquidation(
    bool atLeastOneTroveLiquidated,
    LocalVariables_OuterLiquidationFunction memory vars
  ) internal {
    if (!atLeastOneTroveLiquidated) revert NoLiquidatableTrove();

    // move tokens into the stability pools
    stabilityPoolManager.offset(vars.remainingStabilities);

    // and redistribute the rest (which could not be handled by the stability pool)
    _redistributeDebtAndColl(vars.collTokenAddresses, vars.tokensToRedistribute);

    // Update system snapshots
    _updateSystemSnapshots_excludeCollRemainder(vars.collTokenAddresses);

    // todo
    // emit Liquidation(vars.liquidatedDebt, vars.liquidatedColl, totals.totalCollGasCompensation, totals.totalLUSDGasCompensation);

    // Send gas compensation to caller
    // todo what about the coll gas comp? where does that go?
    _sendGasCompensation(msg.sender, vars.totalStableCoinGasCompensation);
  }

  function _sendGasCompensation(address _liquidator, uint _stableCoinGasCompensation) internal {
    if (_stableCoinGasCompensation == 0) return;

    IDebtToken stableCoin = debtTokenManager.getStableCoin();
    storagePool.withdrawalValue(
      _liquidator,
      address(stableCoin),
      false,
      PoolType.GasCompensation,
      _stableCoinGasCompensation
    );
  }

  // Move a Trove's pending debt and collateral rewards from distributions, from the Default Pool to the Active Pool
  function _movePendingTroveRewardsToActivePool(RAmount[] memory _troveAmountsIncludingRewards) internal {
    for (uint i = 0; i < _troveAmountsIncludingRewards.length; i++) {
      RAmount memory rAmount = _troveAmountsIncludingRewards[i];
      if (rAmount.pendingReward == 0) continue;
      storagePool.transferBetweenTypes(
        rAmount.tokenAddress,
        rAmount.isColl,
        PoolType.Default,
        PoolType.Active,
        rAmount.pendingReward
      );
    }
  }

  // --- Redemption functions ---

  /* Send stable coin to the system and redeem the corresponding amount of collateral from as many Troves as are needed to fill the redemption
   * request.  Applies pending rewards to a Trove before reducing its debt and coll.
   *
   * Note that if _amount is very large, this function can run out of gas, specially if traversed troves are small. This can be easily avoided by
   * splitting the total _amount in appropriate chunks and calling the function multiple times.
   *
   * Param `_maxIterations` can also be provided, so the loop through Troves is capped (if it’s zero, it will be ignored).This makes it easier to
   * avoid OOG for the frontend, as only knowing approximately the average cost of an iteration is enough, without needing to know the “topology”
   * of the trove list. It also avoids the need to set the cap in stone in the contract, nor doing gas calculations, as both gas price and opcode
   * costs can vary.
   *
   * All Troves that are redeemed from, will end up with no stable coin debt left.
   *
   * If another transaction modifies the list between calling getRedemptionHints() and passing the hints to redeemCollateral(), it
   * is very likely that the last (partially) redeemed Trove would end up with a different ICR than what the hint is for. In this case the
   * redemption will stop after the last completely redeemed Trove and the sender will keep the remaining stable amount, which they can attempt
   * to redeem later.
   */
  function redeemCollateral(
    uint _stableCoinAmount,
    uint _maxFeePercentage,
    address[] memory _sourceTroves
  ) external override {
    RedemptionVariables memory vars;
    vars.collTokenAddresses = collTokenManager.getCollTokenAddresses();
    IDebtToken stableCoin = debtTokenManager.getStableCoin();

    if (_stableCoinAmount == 0) revert ZeroAmount();
    if (_maxFeePercentage < REDEMPTION_FEE_FLOOR || _maxFeePercentage > DECIMAL_PRECISION)
      revert InvalidMaxFeePercent();
    if (_stableCoinAmount > stableCoin.balanceOf(msg.sender)) revert ExceedDebtBalance();
    (, uint TCR, , ) = storagePool.checkRecoveryMode();
    if (TCR < MCR) revert LessThanMCR();

    vars.totalStableSupplyAtStart =
      storagePool.getValue(address(stableCoin), false, PoolType.Active) +
      storagePool.getValue(address(stableCoin), false, PoolType.Default);

    // Confirm redeemer's balance is less than total stable coin supply
    assert(stableCoin.balanceOf(msg.sender) <= vars.totalStableSupplyAtStart);

    // seed drawn coll
    RedemptionCollAmount[] memory totalCollDrawn = new RedemptionCollAmount[](vars.collTokenAddresses.length);

    // Loop through the stable coin source troves
    assert(_sourceTroves.length >= 1);
    for (uint i = 0; i < _sourceTroves.length; i++) {
      address currentBorrower = _sourceTroves[i];
      if (currentBorrower == address(0) || _stableCoinAmount == 0) continue;

      SingleRedemptionVariables memory singleRedemption = _redeemCollateralFromTrove(
        vars,
        currentBorrower,
        _stableCoinAmount
      );

      // sum up redeemed stable and drawn collateral
      vars.totalRedeemedStable += singleRedemption.stableCoinLot;
      _stableCoinAmount -= singleRedemption.stableCoinLot;
      for (uint a = 0; a < singleRedemption.collLots.length; a++) {
        for (uint b = 0; b < totalCollDrawn.length; b++) {
          if (singleRedemption.collLots[a].tokenAddress != vars.collTokenAddresses[b]) continue;

          totalCollDrawn[b].drawn += singleRedemption.collLots[a].amount;
          break;
        }
      }
    }

    if (vars.totalRedeemedStable == 0) revert NoRedeems();

    // Decay the baseRate due to time passed, and then increase it according to the size of this redemption.
    // Use the saved total LUSD supply value, from before it was reduced by the redemption.
    _updateBaseRateFromRedemption(vars.totalRedeemedStable, vars.totalStableSupplyAtStart);

    // Calculate the redemption fee
    for (uint i = 0; i < totalCollDrawn.length; i++) {
      RedemptionCollAmount memory collEntry = totalCollDrawn[i];
      collEntry.redemptionFee = _getRedemptionFee(collEntry.drawn);
      collEntry.sendToRedeemer = collEntry.drawn - collEntry.redemptionFee;
      _requireUserAcceptsFee(collEntry.redemptionFee, collEntry.drawn, _maxFeePercentage);
    }

    // todo
    //    emit Redemption(_LUSDamount, vars.totalLUSDToRedeem, vars.totalETHDrawn, vars.ETHFee);

    // Burn the total stable coin that is cancelled with debt, and send the redeemed coll to msg.sender
    storagePool.subtractValue(address(stableCoin), false, PoolType.Active, vars.totalRedeemedStable);
    stableCoin.burn(msg.sender, vars.totalRedeemedStable);

    // transfer the drawn collateral to account
    for (uint i = 0; i < totalCollDrawn.length; i++) {
      RedemptionCollAmount memory collEntry = totalCollDrawn[i];
      if (collEntry.sendToRedeemer == 0) continue;

      storagePool.withdrawalValue(msg.sender, vars.collTokenAddresses[i], true, PoolType.Active, collEntry.drawn);

      // todo jelly handover
      //    // Send the fee to the gov token staking contract
      //    contractsCache.activePool.sendETH(address(contractsCache.lqtyStaking), vars.ETHFee);
    }
  }

  // Redeem as much collateral as possible from _borrower's Trove in exchange for stable coin up to _redeemMaxAmount
  function _redeemCollateralFromTrove(
    RedemptionVariables memory outerVars,
    address _borrower,
    uint _redeemMaxAmount
  ) internal returns (SingleRedemptionVariables memory vars) {
    _applyPendingRewards(_borrower);

    (vars.collLots, vars.stableCoinEntry, vars.troveCollInStable, vars.troveDebtInStable) = _prepareTroveRedemption(
      _borrower
    );

    // todo stable coin only CRs are needed here, all the other debt tokens need to be excluded.
    // also just < TCR is not enough, if the user whats to redeem more then 50% of the stable coin supply...
    uint preCR = LiquityMath._computeCR(vars.troveCollInStable, vars.troveDebtInStable);
    (, uint TCR, , ) = storagePool.checkRecoveryMode();
    // TroveManager: Source troves CR is not under the TCR.
    if (preCR >= TCR) revert GreaterThanTCR();

    // Determine the remaining amount (lot) to be redeemed, capped by the entire debt of the Trove minus the liquidation reserve
    vars.stableCoinLot = LiquityMath._min(_redeemMaxAmount, vars.stableCoinEntry.amount - STABLE_COIN_GAS_COMPENSATION);

    // calculate the coll lot
    uint newCollInStable = vars.troveCollInStable;
    for (uint i = 0; i < vars.collLots.length; i++) {
      TokenAmount memory collEntry = vars.collLots[i];

      uint collPrice = priceFeed.getPrice(collEntry.tokenAddress);
      uint collInStable = priceFeed.getUSDValue(collEntry.tokenAddress, collEntry.amount);
      uint collToRedeemInStable = (vars.stableCoinLot * collInStable) / vars.troveCollInStable;
      collEntry.amount = collToRedeemInStable / collPrice;
      newCollInStable -= collToRedeemInStable;
    }

    /*
     * If the provided hint is out of date, we bail since trying to reinsert without a good hint will almost
     * certainly result in running out of gas.
     *
     * If the resultant net debt of the partial is less than the minimum, net debt we bail.
     */
    // TODO: Disabling cause it is never used, check again later
    // uint newNICR = LiquityMath._computeNominalCR(
    //   newCollInStable,
    //   vars.troveDebtInStable - (vars.stableCoinLot * vars.stableCoinEntry.price)
    // );

    // updating the troves coll and debt
    Troves[_borrower].debts[debtTokenManager.getStableCoin()] -= vars.stableCoinLot;
    for (uint i = 0; i < vars.collLots.length; i++) {
      TokenAmount memory collAmount = vars.collLots[i];
      Troves[_borrower].colls[collAmount.tokenAddress] -= collAmount.amount;
    }

    _updateStakeAndTotalStakes(outerVars.collTokenAddresses, _borrower);

    // todo
    //    emit TroveUpdated(
    //      _borrower,
    //      newStableDebt,
    //      newColl,
    //      Troves[_borrower].stake,
    //      TroveManagerOperation.redeemCollateral
    //    );

    return vars;
  }

  // --- Helper functions ---

  // Return the nominal collateral ratio (ICR) of a given Trove, without the price. Takes a trove's pending coll and debt rewards from redistributions into account.
  function getNominalICR(address _borrower) external view override returns (uint) {
    (uint currentCollInStable, uint currentDebtInStable) = _getCurrentTrovesFaceValues(_borrower);
    uint NICR = LiquityMath._computeNominalCR(currentCollInStable, currentDebtInStable);
    return NICR;
  }

  // Return the current collateral ratio (ICR) of a given Trove. Takes a trove's pending coll and debt rewards from redistributions into account.
  function getCurrentICR(address _borrower) external view override returns (uint ICR, uint currentDebtInStable) {
    uint currentCollInStable;
    (currentCollInStable, currentDebtInStable) = _getCurrentTrovesFaceValues(_borrower);
    ICR = LiquityMath._computeCR(currentCollInStable, currentDebtInStable);
    return (ICR, currentDebtInStable);
  }

  function _getCurrentTrovesFaceValues(
    address _borrower
  ) internal view returns (uint currentCollInStable, uint currentDebtInStable) {
    Trove storage _trove = Troves[_borrower];

    for (uint i = 0; i < _trove.collTokens.length; i++) {
      address token = _trove.collTokens[i];

      uint pendingRewards = _getPendingReward(_borrower, token, true);
      currentCollInStable += priceFeed.getUSDValue(token, _trove.colls[token] + pendingRewards);
    }

    for (uint i = 0; i < _trove.debtTokens.length; i++) {
      IDebtToken token = _trove.debtTokens[i];

      uint pendingRewards = _getPendingReward(_borrower, address(token), true);
      currentDebtInStable += priceFeed.getUSDValue(address(token), _trove.debts[token] + pendingRewards);
    }

    return (currentCollInStable, currentDebtInStable);
  }

  function applyPendingRewards(address _borrower) external override {
    _requireCallerIsBorrowerOperations();
    _applyPendingRewards(_borrower);
  }

  function _applyPendingRewards(address _borrower) internal {
    _requireTroveIsActive(_borrower);

    Trove storage _trove = Troves[_borrower];

    for (uint i = 0; i < _trove.collTokens.length; i++) {
      address token = _trove.collTokens[i];

      uint pendingRewards = _getPendingReward(_borrower, token, true);
      if (pendingRewards == 0) continue;

      _trove.colls[token] += pendingRewards;
      storagePool.transferBetweenTypes(token, true, PoolType.Default, PoolType.Active, pendingRewards);
    }

    for (uint i = 0; i < _trove.debtTokens.length; i++) {
      IDebtToken token = _trove.debtTokens[i];
      address tokenAddress = address(token);

      uint pendingRewards = _getPendingReward(_borrower, tokenAddress, false);
      if (pendingRewards == 0) continue;

      _trove.debts[token] += pendingRewards;
      storagePool.transferBetweenTypes(tokenAddress, true, PoolType.Default, PoolType.Active, pendingRewards);
    }

    // todo
    //    emit TroveUpdated(
    //      _borrower,
    //      Troves[_borrower].debt,
    //      Troves[_borrower].coll,
    //      Troves[_borrower].stake,
    //      TroveManagerOperation.applyPendingRewards
    //    );
  }

  // Update borrower's snapshots to reflect the current values
  function updateTroveRewardSnapshots(address[] memory collTokenAddresses, address _borrower) external override {
    _requireCallerIsBorrowerOperations();
    return _updateTroveRewardSnapshots(collTokenAddresses, _borrower);
  }

  function _updateTroveRewardSnapshots(address[] memory collTokenAddresses, address _borrower) internal {
    address[] memory debtTokenAddresses = debtTokenManager.getDebtTokenAddresses();
    for (uint i = 0; i < debtTokenAddresses.length; i++) {
      address token = debtTokenAddresses[i];
      rewardSnapshots[_borrower][token][false] = liquidatedTokens[token][false];
    }

    for (uint i = 0; i < collTokenAddresses.length; i++) {
      address token = collTokenAddresses[i];
      rewardSnapshots[_borrower][token][true] = liquidatedTokens[token][true];
    }

    //todo
    //   emit TroveSnapshotsUpdated(L_ETH, L_LUSDDebt);
  }

  // Get the borrower's pending accumulated rewards, earned by their stake through their redistribution
  function _getPendingReward(
    address _borrower,
    address _tokenAddress,
    bool _isColl
  ) internal view returns (uint pendingReward) {
    uint snapshotValue = rewardSnapshots[_borrower][_tokenAddress][_isColl];
    uint rewardPerUnitStaked = liquidatedTokens[_tokenAddress][_isColl] - snapshotValue;
    if (rewardPerUnitStaked == 0 || Troves[_borrower].status != Status.active) return 0;

    uint stake = _calculateTrovesStake(_borrower);
    pendingReward = (stake * rewardPerUnitStaked) / DECIMAL_PRECISION;
  }

  // Return the Troves entire debt and coll, including pending rewards from redistributions.
  function getEntireDebtAndColl(
    address _borrower
  )
    external
    view
    override
    returns (
      RAmount[] memory amounts,
      uint troveCollInStable,
      uint troveDebtInStable,
      uint troveDebtInStableWithoutGasCompensation
    )
  {
    Trove storage trove = Troves[_borrower];
    amounts = new RAmount[](trove.collTokens.length + trove.debtTokens.length);

    for (uint i = 0; i < trove.collTokens.length; i++) {
      address token = address(trove.collTokens[i]);
      amounts[i] = RAmount(token, true, trove.colls[trove.collTokens[i]], 0, 0, 0, 0, 0);
    }

    uint stableCoinIndex;
    for (uint i = 0; i < trove.debtTokens.length; i++) {
      if (trove.debtTokens[i].isStableCoin()) stableCoinIndex = i + trove.collTokens.length;

      address token = address(trove.debtTokens[i]);
      amounts[i + trove.collTokens.length] = RAmount(token, false, trove.debts[trove.debtTokens[i]], 0, 0, 0, 0, 0);
    }

    // adding gas compensation + toLiquidate
    for (uint i = 0; i < amounts.length; i++) {
      RAmount memory amountEntry = amounts[i];

      amountEntry.pendingReward = _getPendingReward(_borrower, amountEntry.tokenAddress, amountEntry.isColl);
      uint totalAmount = amountEntry.amount + amountEntry.pendingReward;
      uint inStable = priceFeed.getUSDValue(amountEntry.tokenAddress, totalAmount);

      if (amountEntry.isColl) {
        amountEntry.gasCompensation = _getCollGasCompensation(totalAmount);
        amountEntry.toLiquidate = totalAmount - amountEntry.gasCompensation;
        troveCollInStable += inStable;
      } else {
        if (i == stableCoinIndex) {
          // stable coin gas compensation should not be liquidated, it will be paid out as reward for the liquidator
          amountEntry.toLiquidate = totalAmount - STABLE_COIN_GAS_COMPENSATION;
          troveDebtInStableWithoutGasCompensation += priceFeed.getUSDValue(
            amountEntry.tokenAddress,
            amountEntry.toLiquidate
          );
        } else {
          amountEntry.toLiquidate = totalAmount;
          troveDebtInStableWithoutGasCompensation += inStable;
        }

        troveDebtInStable += inStable;
      }
    }

    return (amounts, troveCollInStable, troveDebtInStable, troveDebtInStableWithoutGasCompensation);
  }

  function _prepareTroveRedemption(
    address _borrower
  )
    internal
    view
    returns (
      TokenAmount[] memory amounts,
      TokenAmount memory stableCoinEntry,
      uint troveCollInStable,
      uint troveDebtInStable
    )
  {
    Trove storage trove = Troves[_borrower];

    // stable coin debt should always exists because of the gas comp
    for (uint i = 0; i < trove.debtTokens.length; i++) {
      IDebtToken debtToken = trove.debtTokens[i];
      uint amount = trove.debts[debtToken];

      if (debtToken.isStableCoin()) stableCoinEntry = TokenAmount(address(debtToken), amount);
      troveDebtInStable += priceFeed.getUSDValue(address(debtToken), amount);
    }

    amounts = new TokenAmount[](trove.collTokens.length);
    for (uint i = 0; i < amounts.length; i++) {
      address tokenAddress = trove.collTokens[i];
      amounts[i] = TokenAmount(tokenAddress, trove.colls[tokenAddress]);
      troveCollInStable += priceFeed.getUSDValue(tokenAddress, amounts[i].amount);
    }

    return (amounts, stableCoinEntry, troveCollInStable, troveDebtInStable);
  }

  function removeStake(address[] memory collTokenAddresses, address _borrower) external override {
    _requireCallerIsBorrowerOperations();
    return _removeStake(collTokenAddresses, _borrower);
  }

  // Remove borrower's stake from the totalStakes sum, and set their stake to 0
  function _removeStake(address[] memory collTokenAddresses, address _borrower) internal {
    for (uint i = 0; i < collTokenAddresses.length; i++) {
      address tokenAddress = collTokenAddresses[i];

      totalStakes[tokenAddress] -= Troves[_borrower].stakes[tokenAddress];
      Troves[_borrower].stakes[tokenAddress] = 0;
    }
  }

  function updateStakeAndTotalStakes(address[] memory collTokenAddresses, address _borrower) external override {
    _requireCallerIsBorrowerOperations();
    _updateStakeAndTotalStakes(collTokenAddresses, _borrower);
  }

  // Update borrower's stake based on their latest collateral value
  function _updateStakeAndTotalStakes(address[] memory collTokenAddresses, address _borrower) internal {
    for (uint i = 0; i < collTokenAddresses.length; i++) {
      address _collAddress = collTokenAddresses[i];

      uint newStake;
      uint totalCollateralSnapshot = totalCollateralSnapshots[_collAddress];
      uint collAmount = Troves[_borrower].colls[_collAddress];
      if (totalCollateralSnapshot == 0) newStake = collAmount;
      else {
        /*
         * The following assert() holds true because:
         * - The system always contains >= 1 trove
         * - When we close or liquidate a trove, we redistribute the pending rewards, so if all troves were closed/liquidated,
         * rewards would’ve been emptied and totalCollateralSnapshot would be zero too.
         */
        uint stakedSnapshot = totalStakesSnapshot[_collAddress];
        assert(stakedSnapshot > 0);
        newStake = (collAmount * stakedSnapshot) / totalCollateralSnapshot;
      }

      uint oldStake = Troves[_borrower].stakes[_collAddress];
      Troves[_borrower].stakes[_collAddress] = newStake;

      totalStakes[_collAddress] = totalStakes[_collAddress] - oldStake + newStake;

      // todo
      // emit TotalStakesUpdated(tokenAddress, totalStakes);
    }
  }

  function _redistributeDebtAndColl(address[] memory collTokenAddresses, CAmount[] memory toRedistribute) internal {
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

    uint totalStake = _calculateTotalStake(collTokenAddresses);
    for (uint i = 0; i < toRedistribute.length; i++) {
      CAmount memory redistributeEntry = toRedistribute[i];
      if (redistributeEntry.amount == 0) continue;

      // Get the per-unit-staked terms
      uint numerator = redistributeEntry.amount *
        DECIMAL_PRECISION +
        lastErrorRedistribution[redistributeEntry.tokenAddress][redistributeEntry.isColl];
      uint rewardPerUnitStaked = numerator / totalStake;
      lastErrorRedistribution[redistributeEntry.tokenAddress][redistributeEntry.isColl] =
        numerator -
        (rewardPerUnitStaked * totalStake);

      // Add per-unit-staked terms to the running totals
      liquidatedTokens[redistributeEntry.tokenAddress][redistributeEntry.isColl] += rewardPerUnitStaked;

      // todo
      // emit LTermsUpdated(tokenAddress, liquidatedTokens[tokenAddress]);

      storagePool.transferBetweenTypes(
        redistributeEntry.tokenAddress,
        redistributeEntry.isColl,
        PoolType.Active,
        PoolType.Default,
        redistributeEntry.amount
      );
    }
  }

  function _calculateTotalStake(address[] memory collTokenAddresses) internal view returns (uint stake) {
    for (uint i = 0; i < collTokenAddresses.length; i++) {
      address tokenAddress = collTokenAddresses[i];
      stake += priceFeed.getUSDValue(tokenAddress, totalStakes[tokenAddress]);
    }
  }

  function closeTrove(address[] memory collTokenAddresses, address _borrower) external override {
    _requireCallerIsBorrowerOperations();
    return _closeTrove(collTokenAddresses, _borrower, Status.closedByOwner);
  }

  function _closeTrove(address[] memory collTokenAddresses, address _borrower, Status closedStatus) internal {
    assert(closedStatus != Status.nonExistent && closedStatus != Status.active);

    uint numOfOwners = TroveOwners.length;
    if (numOfOwners <= 1) revert OnlyOneTrove();

    Trove storage trove = Troves[_borrower];
    trove.status = closedStatus;
    for (uint i = 0; i < trove.debtTokens.length; i++) trove.debts[trove.debtTokens[i]] = 0;
    for (uint i = 0; i < trove.collTokens.length; i++) trove.colls[trove.collTokens[i]] = 0;
    for (uint i = 0; i < collTokenAddresses.length; i++) trove.stakes[collTokenAddresses[i]] = 0;

    _removeTroveOwner(_borrower, numOfOwners);
  }

  /*
   * Updates snapshots of system total stakes and total collateral, excluding a given collateral remainder from the calculation.
   * Used in a liquidation sequence.
   */
  function _updateSystemSnapshots_excludeCollRemainder(address[] memory collTokenAddresses) internal {
    for (uint i = 0; i < collTokenAddresses.length; i++) {
      address tokenAddress = collTokenAddresses[i];

      totalStakesSnapshot[tokenAddress] = totalStakes[tokenAddress];

      totalCollateralSnapshots[tokenAddress] =
        storagePool.getValue(tokenAddress, true, PoolType.Active) *
        storagePool.getValue(tokenAddress, true, PoolType.Default);

      // todo
      // emit SystemSnapshotsUpdated(tokenAddress, totalStakesSnapshot[tokenAddress], totalCollateralSnapshots[tokenAddress]); todo
    }
  }

  // Push the owner's address to the Trove owners list, and record the corresponding array index on the Trove struct
  function addTroveOwnerToArray(address _borrower) external override returns (uint index) {
    _requireCallerIsBorrowerOperations();
    return _addTroveOwnerToArray(_borrower);
  }

  function _addTroveOwnerToArray(address _borrower) internal returns (uint128 index) {
    /* Max array size is 2**128 - 1, i.e. ~3e30 troves. 3e30 LUSD dwarfs the value of all wealth in the world ( which is < 1e15 USD). */

    // Push the Troveowner to the array
    TroveOwners.push(_borrower);

    // Record the index of the new Troveowner on their Trove struct
    index = uint128(TroveOwners.length - 1);
    Troves[_borrower].arrayIndex = index;
  }

  /*
   * Remove a Trove owner from the TroveOwners array, not preserving array order. Removing owner 'B' does the following:
   * [A B C D E] => [A E C D], and updates E's Trove struct to point to its new array index.
   */
  function _removeTroveOwner(address _borrower, uint _length) internal {
    Status troveStatus = Troves[_borrower].status;
    // It’s set in caller function `_closeTrove`
    assert(troveStatus != Status.nonExistent && troveStatus != Status.active);

    uint128 index = Troves[_borrower].arrayIndex;

    assert(index <= _length - 1);

    address addressToMove = TroveOwners[_length - 1];

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
   * 1) decays the baseRate based on time passed since last redemption or stable coin borrowing operation.
   * then,
   * 2) increases the baseRate based on the amount redeemed, as a proportion of total supply
   */
  function _updateBaseRateFromRedemption(
    uint _totalRedeemedStable,
    uint _totalStableCoinSupply
  ) internal returns (uint newBaseRate) {
    uint decayedBaseRate = _calcDecayedBaseRate();

    /* Convert the drawn coll back to LUSD at face value rate, in order to get
     * the fraction of total supply that was redeemed at face value. */
    uint redeemedLUSDFraction = _totalRedeemedStable / _totalStableCoinSupply;

    // cap baseRate at a maximum of 100%
    newBaseRate = LiquityMath._min(decayedBaseRate + redeemedLUSDFraction / BETA, DECIMAL_PRECISION);
    //assert(newBaseRate <= DECIMAL_PRECISION); // This is already enforced in the line above
    assert(newBaseRate > 0); // Base rate is always non-zero after redemption

    // Update the baseRate state variable
    baseRate = newBaseRate;
    emit BaseRateUpdated(newBaseRate);

    _updateLastFeeOpTime();
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
        REDEMPTION_FEE_FLOOR + _baseRate,
        DECIMAL_PRECISION // cap at a maximum of 100%
      );
  }

  function _getRedemptionFee(uint _ETHDrawn) internal view returns (uint) {
    return _calcRedemptionFee(getRedemptionRate(), _ETHDrawn);
  }

  function getRedemptionFeeWithDecay(uint _ETHDrawn) external view override returns (uint) {
    return _calcRedemptionFee(getRedemptionRateWithDecay(), _ETHDrawn);
  }

  function _calcRedemptionFee(uint _redemptionRate, uint _collDrawn) internal pure returns (uint) {
    uint redemptionFee = (_redemptionRate * _collDrawn) / DECIMAL_PRECISION;
    // TroveManager: Fee would eat up all returned collateral
    if (redemptionFee >= _collDrawn) revert TooHighRedeemFee();
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
    return LiquityMath._min(BORROWING_FEE_FLOOR + _baseRate, MAX_BORROWING_FEE);
  }

  function getBorrowingFee(uint _debtValue) external view override returns (uint) {
    return _calcBorrowingFee(getBorrowingRate(), _debtValue);
  }

  function getBorrowingFeeWithDecay(uint _debtValue) external view override returns (uint) {
    return _calcBorrowingFee(getBorrowingRateWithDecay(), _debtValue);
  }

  function _calcBorrowingFee(uint _borrowingRate, uint _debtValue) internal pure returns (uint) {
    return (_borrowingRate * _debtValue) / DECIMAL_PRECISION;
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
    uint timePassed = block.timestamp - lastFeeOperationTime;

    if (timePassed >= SECONDS_IN_ONE_MINUTE) {
      lastFeeOperationTime = block.timestamp;
      emit LastFeeOpTimeUpdated(block.timestamp);
    }
  }

  function _calcDecayedBaseRate() internal view returns (uint) {
    uint minutesPassed = _minutesPassedSinceLastFeeOp();
    uint decayFactor = LiquityMath._decPow(MINUTE_DECAY_FACTOR, minutesPassed);

    return (baseRate * decayFactor) / DECIMAL_PRECISION;
  }

  function _minutesPassedSinceLastFeeOp() internal view returns (uint) {
    return (block.timestamp - lastFeeOperationTime) / SECONDS_IN_ONE_MINUTE;
  }

  // --- 'require' wrapper functions ---

  function _requireCallerIsBorrowerOperations() internal view {
    if (msg.sender != borrowerOperationsAddress) revert NotFromBorrowerOps();
  }

  function _requireTroveIsActive(address _borrower) internal view {
    if (Troves[_borrower].status != Status.active) revert InvalidTrove();
  }

  // --- Trove property getters ---

  function getTroveStatus(address _borrower) external view override returns (uint) {
    return uint(Troves[_borrower].status);
  }

  /**
   * @notice Return borrowers staked value in USD
   * @param _borrower Borrower
   * @return stakedUSDValue
   */
  function getTroveStake(address _borrower) external view override returns (uint) {
    return _calculateTrovesStake(_borrower);
  }

  // the current stake of the trove is depended on the current collateral prices
  function _calculateTrovesStake(address _borrower) internal view returns (uint stake) {
    Trove storage trove = Troves[_borrower];

    for (uint i = 0; i < trove.collTokens.length; i++) {
      address tokenAddress = trove.collTokens[i];
      stake += priceFeed.getUSDValue(tokenAddress, trove.stakes[tokenAddress]);
    }

    return stake;
  }

  function getTroveDebt(address _borrower) external view override returns (TokenAmount[] memory) {
    Trove storage trove = Troves[_borrower];
    if (trove.status != Status.active) return new TokenAmount[](0);

    TokenAmount[] memory debts = new TokenAmount[](trove.debtTokens.length);
    for (uint i = 0; i < debts.length; i++)
      debts[i] = TokenAmount(address(trove.debtTokens[i]), trove.debts[trove.debtTokens[i]]);

    return debts;
  }

  function getTroveColl(address _borrower) external view override returns (TokenAmount[] memory colls) {
    Trove storage trove = Troves[_borrower];
    if (trove.status != Status.active) return new TokenAmount[](0);

    colls = new TokenAmount[](trove.collTokens.length);
    for (uint i = 0; i < colls.length; i++)
      colls[i] = TokenAmount(trove.collTokens[i], trove.colls[trove.collTokens[i]]);
  }

  // --- Trove property setters, called by BorrowerOperations ---

  function setTroveStatus(address _borrower, uint _num) external override {
    _requireCallerIsBorrowerOperations();
    Troves[_borrower].status = Status(_num);
  }

  function increaseTroveColl(address _borrower, TokenAmount[] memory _collTokenAmounts) external override {
    _requireCallerIsBorrowerOperations();

    Trove storage trove = Troves[_borrower];
    for (uint i = 0; i < _collTokenAmounts.length; i++) {
      address tokenAddress = _collTokenAmounts[i].tokenAddress;
      trove.colls[tokenAddress] += _collTokenAmounts[i].amount;

      if (!trove.collsRegistered[tokenAddress]) {
        trove.collsRegistered[tokenAddress] = true;
        trove.collTokens.push(tokenAddress);
      }
    }
  }

  function decreaseTroveColl(address _borrower, TokenAmount[] memory _collTokenAmounts) external override {
    _requireCallerIsBorrowerOperations();

    Trove storage trove = Troves[_borrower];
    for (uint i = 0; i < _collTokenAmounts.length; i++) {
      trove.colls[_collTokenAmounts[i].tokenAddress] -= _collTokenAmounts[i].amount;
    }
  }

  function increaseTroveDebt(address _borrower, DebtTokenAmount[] memory _debtTokenAmounts) external override {
    _requireCallerIsBorrowerOperations();

    Trove storage trove = Troves[_borrower];
    for (uint i = 0; i < _debtTokenAmounts.length; i++) {
      IDebtToken debtToken = _debtTokenAmounts[i].debtToken;
      trove.debts[debtToken] += _debtTokenAmounts[i].netDebt;

      if (!trove.debtsRegistered[address(debtToken)]) {
        trove.debtsRegistered[address(debtToken)] = true;
        trove.debtTokens.push(debtToken);
      }
    }
  }

  function decreaseTroveDebt(address _borrower, DebtTokenAmount[] memory _debtTokenAmounts) external override {
    _requireCallerIsBorrowerOperations();

    Trove storage trove = Troves[_borrower];
    for (uint i = 0; i < _debtTokenAmounts.length; i++) {
      trove.debts[_debtTokenAmounts[i].debtToken] -= _debtTokenAmounts[i].netDebt;
    }
  }
}
