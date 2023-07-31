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
    IStabilityPoolManager stabilityPoolManagerCached;
    PriceCache priceCache;
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

  function getTroveFromTroveOwnersArray(
    uint _index
  ) external view override returns (address) {
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
    require(
      _troveArray.length != 0,
      'TroveManager: Calldata address array must not be empty'
    );

    LocalVariables_OuterLiquidationFunction memory vars;
    vars.storagePoolCached = storagePool;
    vars.stabilityPoolManagerCached = stabilityPoolManager;
    (
      vars.recoveryModeAtStart,
      ,
      vars.entireSystemCollInStable,
      vars.entireSystemDebtInStable
    ) = vars.storagePoolCached.checkRecoveryMode(vars.priceCache);
    vars.remainingStabilities = vars
      .stabilityPoolManagerCached
      .getRemainingStability(collTokenAddresses);

    if (vars.recoveryModeAtStart)
      (
        vars.tokensToRedistribute,
        vars.totalStableCoinGasCompensation
      ) = _getTotalFromBatchLiquidate_RecoveryMode(
        vars.storagePoolCached,
        vars.remainingStabilities,
        vars.priceCache,
        vars.entireSystemCollInStable,
        vars.entireSystemDebtInStable,
        _troveArray
      );
    else
      (
        vars.tokensToRedistribute,
        vars.totalStableCoinGasCompensation
      ) = _getTotalsFromBatchLiquidate_NormalMode(
        vars.storagePoolCached,
        vars.remainingStabilities,
        vars.priceCache,
        _troveArray
      );

    // move tokens into the stability pools
    for (uint i = 0; i < vars.remainingStabilities.length; i++) {
      RemainingStability memory remainingStability = vars.remainingStabilities[
        i
      ];
      remainingStability.stabilityPool.offset(
        remainingStability.debtToOffset,
        remainingStability.collGained
      );
    }

    // and redistribute the rest (which could not be handled by the stability pool)
    _redistributeDebtAndColl(
      vars.storagePoolCached,
      vars.priceCache,
      vars.tokensToRedistribute
    );

    // and move surplus amounts todo...
    // activePoolCached.sendETH(address(collSurplusPool), totals.totalCollSurplus);

    // Update system snapshots
    _updateSystemSnapshots_excludeCollRemainder(vars.storagePoolCached);

    // todo
    // emit Liquidation(vars.liquidatedDebt, vars.liquidatedColl, totals.totalCollGasCompensation, totals.totalLUSDGasCompensation);

    // Send gas compensation to caller
    _sendGasCompensation(
      vars.storagePoolCached,
      msg.sender,
      vars.totalStableCoinGasCompensation
    );
  }

  // --- Inner recovery mode liquidation functions ---

  /*
   * This function is used when the batch liquidation sequence starts during Recovery Mode. However, it
   * handle the case where the system *leaves* Recovery Mode, part way through the liquidation sequence
   */
  function _getTotalFromBatchLiquidate_RecoveryMode(
    IStoragePool _storagePool,
    RemainingStability[] memory _remainingStabilities,
    PriceCache memory _priceCache,
    uint _entireSystemCollInStable,
    uint _entireSystemDebtInStable,
    address[] memory _troveArray
  )
    internal
    returns (
      CAmount[] memory tokensToRedistribute,
      uint gasCompensationInStable
    )
  {
    LocalVariables_LiquidationSequence memory vars;
    vars.gasCompensationInStable = 0;
    vars.backToNormalMode = false;
    vars.tokensToRedistribute = _initializeEmptyTokensToRedistribute(); // all 0

    for (vars.i = 0; vars.i < _troveArray.length; vars.i++) {
      vars.user = _troveArray[vars.i];

      // Skip non-active troves
      if (Troves[vars.user].status != Status.active) continue;

      (vars.ICR, vars.troveDebtInStable) = this.getCurrentICR(
        vars.user,
        _priceCache
      );

      // todo liqudity schließt einen trove, sobald als debt nur noch die gas comp drin liegt
      // zb. bei einer redemption, das coll was dafür vom borrower damals hinterlegt wurde, geht in den surplus pool und kann später angeholt werden
      // braucen wir nicht?! weil der vault offen bleibt

      if (!vars.backToNormalMode) {
        // Skip this trove if ICR is greater than MCR and Stability Pool is empty
        if (
          vars.ICR >= MCR
          //          && vars.remainingLUSDInStabPool == 0 // todo replaced by remainingStabilites -> not only one asset...
        ) continue;

        uint TCR = LiquityMath._computeCR(
          _entireSystemCollInStable,
          _entireSystemDebtInStable
        );
        vars.troveAmountsIncludingRewards = _liquidateRecoveryMode(
          _storagePool,
          _remainingStabilities,
          _priceCache,
          vars.user,
          vars.ICR,
          vars.troveDebtInStable,
          TCR
        );

        // check if we are back to normal mode
        // todo we do not know how much will be offset at this point, already accumuliated in the _remainingStabilities
        // todo the troveAmountsIncludingRewards has the information about how many token will be offset, with that the tcr diff should be calcable
        //        _entireSystemDebtInStable = _entireSystemDebtInStable.sub(
        //          singleLiquidation.debtToOffset
        //        );
        //        _entireSystemCollInStable = _entireSystemCollInStable
        //          .sub(singleLiquidation.collToSendToSP)
        //          .sub(singleLiquidation.collGasCompensation)
        //          .sub(singleLiquidation.collSurplus);
        vars.backToNormalMode = !_checkPotentialRecoveryMode(
          _entireSystemCollInStable,
          _entireSystemDebtInStable
        );
      } else if (vars.backToNormalMode && vars.ICR < MCR) {
        vars.troveAmountsIncludingRewards = _liquidateNormalMode(
          _storagePool,
          _priceCache,
          vars.user,
          vars.troveDebtInStable,
          _remainingStabilities
        );
      } else continue; // In Normal Mode skip troves with ICR >= MCR

      _mergeTokensToRedistribute(
        vars.troveAmountsIncludingRewards,
        vars.tokensToRedistribute
      );
      vars.gasCompensationInStable = vars.gasCompensationInStable.add(
        STABLE_COIN_GAS_COMPENSATION
      );
    }

    return (vars.tokensToRedistribute, vars.gasCompensationInStable);
  }

  // Liquidate one trove, in Recovery Mode.
  function _liquidateRecoveryMode(
    IStoragePool _storagePool,
    RemainingStability[] memory _remainingStabilities,
    PriceCache memory _priceCache,
    address _borrower,
    uint _ICR,
    uint _troveDebtInStable,
    uint _TCR
  ) internal returns (RAmount[] memory troveAmountsIncludingRewards) {
    if (TroveOwners.length <= 1) new RAmount[](0); // don't liquidate if last trove

    troveAmountsIncludingRewards = this.getEntireDebtAndColl(_borrower);

    // If ICR <= 100%, purely redistribute the Trove across all active Troves
    if (_ICR <= _100pct) {
      _movePendingTroveRewardsToActivePool(
        _storagePool,
        troveAmountsIncludingRewards
      );
      _removeStake(_borrower);
      for (uint i = 0; i < troveAmountsIncludingRewards.length; i++) {
        RAmount memory rAmount = troveAmountsIncludingRewards[i];
        rAmount.toRedistribute = rAmount.toLiquidate;
      }
      _closeTrove(_borrower, Status.closedByLiquidation);

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
      _movePendingTroveRewardsToActivePool(
        _storagePool,
        troveAmountsIncludingRewards
      );
      _removeStake(_borrower);
      _getOffsetAndRedistributionVals(
        _priceCache,
        _troveDebtInStable,
        troveAmountsIncludingRewards,
        _remainingStabilities
      );
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
       * and there is debt in the Stability Pool, only offset, with no redistribution,
       * but at a capped rate of 1.1 and only if the whole debt can be liquidated.
       * The remainder due to the capped rate will be claimable as collateral surplus.
       */
    } else if (
      (_ICR >= MCR) && (_ICR < _TCR)
      //      && (singleLiquidation.entireTroveDebt <= _LUSDInStabPool) // todo...
    ) {
      _movePendingTroveRewardsToActivePool(
        _storagePool,
        troveAmountsIncludingRewards
      );

      //      // todo why is this here? whats the equivilant for the multi debt stab pool?
      //      assert(_LUSDInStabPool != 0);
      //
      //      _removeStake(_borrower);
      //      _getCappedOffsetVals(_priceCache, troveAmountsIncludingRewards);
      //      _closeTrove(_borrower, Status.closedByLiquidation);
      //
      //      if (singleLiquidation.collSurplus > 0)
      //        collSurplusPool.accountSurplus(
      //          _borrower,
      //          singleLiquidation.collSurplus
      //        );

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
      return new RAmount[](0);
    }

    return troveAmountsIncludingRewards;
  }

  // --- Inner normal mode liquidation functions ---

  function _getTotalsFromBatchLiquidate_NormalMode(
    IStoragePool _storagePool,
    RemainingStability[] memory _remainingStabilities,
    PriceCache memory _priceCache,
    address[] memory _troveArray
  )
    internal
    returns (
      CAmount[] memory tokensToRedistribute,
      uint gasCompensationInStable
    )
  {
    LocalVariables_LiquidationSequence memory vars;
    vars.gasCompensationInStable = 0;
    vars.tokensToRedistribute = _initializeEmptyTokensToRedistribute(); // all 0

    for (vars.i = 0; vars.i < _troveArray.length; vars.i++) {
      vars.user = _troveArray[vars.i];

      // todo why do we not skip non active troves here? like in the recovery mode

      (vars.ICR, vars.troveDebtInStable) = this.getCurrentICR(
        vars.user,
        _priceCache
      );
      if (vars.ICR >= MCR) continue; // trove is collatoralized enough, skip the liquidation

      vars.troveAmountsIncludingRewards = _liquidateNormalMode(
        _storagePool,
        _priceCache,
        vars.user,
        vars.troveDebtInStable,
        _remainingStabilities
      );
      _mergeTokensToRedistribute(
        vars.troveAmountsIncludingRewards,
        vars.tokensToRedistribute
      );
      vars.gasCompensationInStable = vars.gasCompensationInStable.add(
        STABLE_COIN_GAS_COMPENSATION
      );
    }

    return (vars.tokensToRedistribute, vars.gasCompensationInStable);
  }

  // Liquidate one trove, in Normal Mode.
  function _liquidateNormalMode(
    IStoragePool _storagePool,
    PriceCache memory _priceCache,
    address _borrower,
    uint troveDebtInStable,
    RemainingStability[] memory remainingStabilities
  ) internal returns (RAmount[] memory troveAmountsIncludingRewards) {
    troveAmountsIncludingRewards = this.getEntireDebtAndColl(_borrower);
    _movePendingTroveRewardsToActivePool(
      _storagePool,
      troveAmountsIncludingRewards
    );

    _removeStake(_borrower);
    _getOffsetAndRedistributionVals(
      _priceCache,
      troveDebtInStable,
      troveAmountsIncludingRewards,
      remainingStabilities
    );
    _closeTrove(_borrower, Status.closedByLiquidation);

    // todo
    //        emit TroveLiquidated(_borrower, singleLiquidation.entireTroveDebt, singleLiquidation.entireTroveColl, TroveManagerOperation.liquidateInNormalMode);
    //        emit TroveUpdated(_borrower, 0, 0, 0, TroveManagerOperation.liquidateInNormalMode);

    return troveAmountsIncludingRewards;
  }

  /* In a full liquidation, returns the values for a trove's coll and debt to be offset, and coll and debt to be
   * redistributed to active troves.
   */
  function _getOffsetAndRedistributionVals(
    PriceCache memory _priceCache,
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
      if (!rAmount.isColl) continue; // coll will be handled later in the debts loop
      rAmount.toRedistribute = rAmount.toLiquidate; // by default the entire debt amount needs to be redistributed
    }

    // checking if some debt can be offset by the matching stability pool
    for (uint i = 0; i < troveAmountsIncludingRewards.length; i++) {
      RAmount memory rAmount = troveAmountsIncludingRewards[i];
      if (rAmount.isColl) continue; // coll will be handled by the debts loop

      RemainingStability memory remainingStability;
      for (uint ii = 0; ii < remainingStabilities.length; ii++) {
        if (remainingStabilities[ii].tokenAddress == rAmount.tokenAddress) {
          remainingStability = remainingStabilities[ii];
          break;
        }
      }

      uint debtToOffset;
      // trying to hand the debt over to the stability pool
      if (remainingStability.remaining > 0) {
        debtToOffset = LiquityMath._min(
          rAmount.toLiquidate,
          remainingStability.remaining
        );
        remainingStability.debtToOffset.add(debtToOffset);
        remainingStability.remaining = remainingStability.remaining.sub(
          debtToOffset
        );

        uint offsetPercentage = debtToOffset
          .mul(
            remainingStability.stabilityPool.getDepositToken().getPrice(
              _priceCache
            )
          )
          .div(troveDebtInStable);

        // moving the offsetPercentage of each coll into the stable pool
        for (uint ii = 0; ii < troveAmountsIncludingRewards.length; ii++) {
          RAmount memory rAmountB = troveAmountsIncludingRewards[ii];
          if (!rAmountB.isColl) continue; // debt already handled one step above

          uint collToSendToSP = rAmountB.toLiquidate.mul(offsetPercentage);
          rAmountB.toRedistribute = rAmountB.toRedistribute.sub(collToSendToSP);

          // find the right collGained entry and add the value
          for (
            uint iii = 0;
            iii < remainingStability.collGained.length;
            iii++
          ) {
            if (
              remainingStability.collGained[iii].tokenAddress !=
              rAmountB.tokenAddress
            ) continue;

            remainingStability.collGained[iii].amount.add(collToSendToSP);
            break;
          }
        }
      }

      // remaining debt needs to be redistributed
      rAmount.toRedistribute = rAmount.toLiquidate.sub(debtToOffset);
    }
  }

  /*
   *  Get its offset coll/debt and gas comp.
   */
  //  function _getCappedOffsetVals(
  //    PriceCache memory _priceCache,
  //    RAmount[] memory troveAmountsIncludingRewards
  //  ) internal pure returns (LiquidationValues memory singleLiquidation) {
  //    // big todo, no idea what happens here!
  //
  //    singleLiquidation.entireTroveDebt = _entireTroveDebt;
  //    singleLiquidation.entireTroveColl = _entireTroveColl;
  //    uint cappedCollPortion = _entireTroveDebt.mul(MCR).div(_price);
  //
  //    singleLiquidation.collGasCompensation = _getCollGasCompensation(
  //      cappedCollPortion
  //    );
  //    singleLiquidation.LUSDGasCompensation = STABLE_COIN_GAS_COMPENSATION;
  //
  //    singleLiquidation.debtToOffset = _entireTroveDebt;
  //    singleLiquidation.collToSendToSP = cappedCollPortion.sub(
  //      singleLiquidation.collGasCompensation
  //    );
  //    singleLiquidation.collSurplus = _entireTroveColl.sub(cappedCollPortion);
  //    singleLiquidation.debtToRedistribute = 0;
  //    singleLiquidation.collToRedistribute = 0;
  //  }

  //    /*
  //    * Liquidate a sequence of troves. Closes a maximum number of n under-collateralized Troves,
  //    * starting from the one with the lowest collateral ratio in the system, and moving upwards
  //    */
  //    function liquidateTroves(uint _n) external override {
  //        ContractsCache memory contractsCache = ContractsCache(
  //            activePool,
  //            defaultPool,
  //            ILUSDToken(address(0)),
  //            ILQTYStaking(address(0)),
  //            sortedTroves,
  //            ICollSurplusPool(address(0)),
  //            address(0)
  //        );
  //        IStabilityPool stabilityPoolCached = stabilityPool;
  //
  //        LocalVariables_OuterLiquidationFunction memory vars;
  //
  //        LiquidationTotals memory totals;
  //
  //        vars.price = priceFeed.fetchPrice();
  //        vars.LUSDInStabPool = stabilityPoolCached.getTotalLUSDDeposits();
  //        vars.recoveryModeAtStart = contractsCache.storagePool.checkRecoveryMode(vars.price);
  //
  //        // Perform the appropriate liquidation sequence - tally the values, and obtain their totals
  //        if (vars.recoveryModeAtStart) {
  //            totals = _getTotalsFromLiquidateTrovesSequence_RecoveryMode(contractsCache, vars.price, vars.LUSDInStabPool, _n);
  //        } else { // if !vars.recoveryModeAtStart
  //            totals = _getTotalsFromLiquidateTrovesSequence_NormalMode(contractsCache.activePool, contractsCache.defaultPool, vars.price, vars.LUSDInStabPool, _n);
  //        }
  //
  //        require(totals.totalDebtInSequence > 0, "TroveManager: nothing to liquidate");
  //
  //        // Move liquidated ETH and LUSD to the appropriate pools
  //        stabilityPoolCached.offset(totals.totalDebtToOffset, totals.totalCollToSendToSP);
  //        _redistributeDebtAndColl(contractsCache.activePool, contractsCache.defaultPool, totals.totalDebtToRedistribute, totals.totalCollToRedistribute);
  //        if (totals.totalCollSurplus > 0) {
  //            contractsCache.activePool.sendETH(address(collSurplusPool), totals.totalCollSurplus);
  //        }
  //
  //        // Update system snapshots
  //        _updateSystemSnapshots_excludeCollRemainder(contractsCache.activePool, totals.totalCollGasCompensation);
  //
  //        vars.liquidatedDebt = totals.totalDebtInSequence;
  //        vars.liquidatedColl = totals.totalCollInSequence.sub(totals.totalCollGasCompensation).sub(totals.totalCollSurplus);
  //        emit Liquidation(vars.liquidatedDebt, vars.liquidatedColl, totals.totalCollGasCompensation, totals.totalLUSDGasCompensation);
  //
  //        // Send gas compensation to caller
  //        _sendGasCompensation(contractsCache.activePool, msg.sender, totals.totalLUSDGasCompensation, totals.totalCollGasCompensation);
  //    }

  //    /*
  //    * This function is used when the liquidateTroves sequence starts during Recovery Mode. However, it
  //    * handle the case where the system *leaves* Recovery Mode, part way through the liquidation sequence
  //    */
  //    function _getTotalsFromLiquidateTrovesSequence_RecoveryMode
  //    (
  //        ContractsCache memory _contractsCache,
  //        uint _price,
  //        uint _LUSDInStabPool,
  //        uint _n
  //    )
  //        internal
  //        returns(LiquidationTotals memory totals)
  //    {
  //        LocalVariables_LiquidationSequence memory vars;
  //        LiquidationValues memory singleLiquidation;
  //
  //        vars.remainingLUSDInStabPool = _LUSDInStabPool;
  //        vars.backToNormalMode = false;
  //        vars._storagePoolCached = storagePool;
  //        vars.entireSystemDebt = vars._storagePoolCached.getEntireSystemDebt();
  //        vars.entireSystemColl = vars._storagePoolCached.getEntireSystemColl();
  //
  //        vars.user = _contractsCache.sortedTroves.getLast();
  //        address firstUser = _contractsCache.sortedTroves.getFirst();
  //        for (vars.i = 0; vars.i < _n && vars.user != firstUser; vars.i++) {
  //            // we need to cache it, because current user is likely going to be deleted
  //            address nextUser = _contractsCache.sortedTroves.getPrev(vars.user);
  //
  //            vars.ICR = getCurrentICR(vars.user, _price);
  //
  //            if (!vars.backToNormalMode) {
  //                // Break the loop if ICR is greater than MCR and Stability Pool is empty
  //                if (vars.ICR >= MCR && vars.remainingLUSDInStabPool == 0) { break; }
  //
  //                uint TCR = LiquityMath._computeCR(vars.entireSystemColl, vars.entireSystemDebt, _price);
  //
  //                singleLiquidation = _liquidateRecoveryMode(_contractsCache.activePool, _contractsCache.defaultPool, vars.user, vars.ICR, vars.remainingLUSDInStabPool, TCR, _price);
  //
  //                // Update aggregate trackers
  //                vars.remainingLUSDInStabPool = vars.remainingLUSDInStabPool.sub(singleLiquidation.debtToOffset);
  //                vars.entireSystemDebt = vars.entireSystemDebt.sub(singleLiquidation.debtToOffset);
  //                vars.entireSystemColl = vars.entireSystemColl.
  //                    sub(singleLiquidation.collToSendToSP).
  //                    sub(singleLiquidation.collGasCompensation).
  //                    sub(singleLiquidation.collSurplus);
  //
  //                // Add liquidation values to their respective running totals
  //                totals = _addLiquidationValuesToTotals(totals, singleLiquidation);
  //
  //                vars.backToNormalMode = !_checkPotentialRecoveryMode(vars.entireSystemColl, vars.entireSystemDebt, _price);
  //            }
  //            else if (vars.backToNormalMode && vars.ICR < MCR) {
  //                singleLiquidation = _liquidateNormalMode(_contractsCache.activePool, _contractsCache.defaultPool, vars.user, vars.remainingLUSDInStabPool);
  //
  //                vars.remainingLUSDInStabPool = vars.remainingLUSDInStabPool.sub(singleLiquidation.debtToOffset);
  //
  //                // Add liquidation values to their respective running totals
  //                totals = _addLiquidationValuesToTotals(totals, singleLiquidation);
  //
  //            }  else break;  // break if the loop reaches a Trove with ICR >= MCR
  //
  //            vars.user = nextUser;
  //        }
  //    }

  //    function _getTotalsFromLiquidateTrovesSequence_NormalMode
  //    (
  //        IStoragePool _activePool,
  //        IDefaultPool _defaultPool,
  //        uint _price,
  //        uint _LUSDInStabPool,
  //        uint _n
  //    )
  //        internal
  //        returns(LiquidationTotals totals)
  //    {
  //        LocalVariables_LiquidationSequence memory vars;
  //        LiquidationValues memory singleLiquidation;
  //        ISortedTroves sortedTrovesCached = sortedTroves;
  //
  //        vars.remainingLUSDInStabPool = _LUSDInStabPool;
  //
  //        for (vars.i = 0; vars.i < _n; vars.i++) {
  //            vars.user = sortedTrovesCached.getLast();
  //            vars.ICR = getCurrentICR(vars.user, _price);
  //
  //            if (vars.ICR < MCR) {
  //                singleLiquidation = _liquidateNormalMode(_activePool, _defaultPool, vars.user, vars.remainingLUSDInStabPool);
  //
  //                vars.remainingLUSDInStabPool = vars.remainingLUSDInStabPool.sub(singleLiquidation.debtToOffset);
  //
  //                // Add liquidation values to their respective running totals
  //                totals = _addLiquidationValuesToTotals(totals, singleLiquidation);
  //
  //            } else break;  // break if the loop reaches a Trove with ICR >= MCR
  //        }
  //    }

  // --- Liquidation helper functions ---

  function _sendGasCompensation(
    IStoragePool _storagePool,
    address _liquidator,
    uint _stableCoinGasCompensation
  ) internal {
    if (_stableCoinGasCompensation == 0) return;

    IDebtToken stableCoin = debtTokenManager.getStableCoin();
    _storagePool.subtractValue(
      address(stableCoin),
      false,
      PoolType.GasCompensation,
      _stableCoinGasCompensation
    );
    stableCoin.transferFrom(
      address(_storagePool),
      _liquidator,
      _stableCoinGasCompensation
    );
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

  function _initializeEmptyTokensToRedistribute()
    internal
    returns (CAmount[] memory tokensToRedistribute)
  {
    // todo cache tokenAddresses + collTokenAddresses requets... gas savings
    tokensToRedistribute = new CAmount[](
      tokenAddresses.length + collTokenAddresses.length
    );
    for (uint i = 0; i < tokenAddresses.length; i++) {
      tokensToRedistribute[i] = CAmount(tokenAddresses[i], false, 0);
    }
    for (uint i = 0; i < collTokenAddresses.length; i++) {
      tokensToRedistribute[tokenAddresses.length + i] = CAmount(
        collTokenAddresses[i],
        true,
        0
      );
    }

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
        if (tokensToRedistribute[ib].tokenAddress != rAmount.tokenAddress)
          continue;

        tokensToRedistribute[ib].amount = tokensToRedistribute[ib].amount.add(
          rAmount.toRedistribute
        );
        break;
      }
    }
  }

  // Return the nominal collateral ratio (ICR) of a given Trove, without the price. Takes a trove's pending coll and debt rewards from redistributions into account.
  function getNominalICR(
    address _borrower,
    PriceCache memory _priceCache
  ) public override returns (uint) {
    (
      uint currentCollInStable,
      uint currentDebtInStable
    ) = _getCurrentTroveAmounts(_borrower, _priceCache);
    uint NICR = LiquityMath._computeNominalCR(
      currentCollInStable,
      currentDebtInStable
    );
    return NICR;
  }

  // Return the current collateral ratio (ICR) of a given Trove. Takes a trove's pending coll and debt rewards from redistributions into account.
  function getCurrentICR(
    address _borrower,
    PriceCache memory _priceCache
  ) external override returns (uint ICR, uint currentDebtInStable) {
    uint currentCollInStable;
    (currentCollInStable, currentDebtInStable) = _getCurrentTroveAmounts(
      _borrower,
      _priceCache
    );
    ICR = LiquityMath._computeCR(currentCollInStable, currentDebtInStable);
    return (ICR, currentDebtInStable);
  }

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
    //        return _applyPendingRewards(storagePool, _borrower);
  }

  //
  //    // Add the borrowers's coll and debt rewards earned from redistributions, to their Trove
  //    function _applyPendingRewards(IStoragePool _storagePool, address _borrower) internal {
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
  //    }

  // todo...
  // Update borrower's snapshots of L_ETH and L_LUSDDebt to reflect the current values
  function updateTroveRewardSnapshots(address _borrower) external override {
    _requireCallerIsBorrowerOperations();
    return _updateTroveRewardSnapshots(_borrower);
  }

  function _updateTroveRewardSnapshots(address _borrower) internal {
    //        for (uint i = 0; i < _TokensArray.length; i++) {
    //            rewardSnapshots[_borrower][L_TokensArray[i]] = L_Tokens[L_TokensArray[i]];
    //        }
    //        emit TroveSnapshotsUpdated(L_ETH, L_LUSDDebt);
  }

  // Get the borrower's pending accumulated rewards, earned by their stake through their redistribution
  function getPendingReward(
    address _borrower,
    address _tokenAddress
  ) public view returns (uint pendingReward) {
    uint snapshotValue = rewardSnapshots[_borrower][_tokenAddress];
    uint rewardPerUnitStaked = liquidatedTokens[_tokenAddress].sub(
      snapshotValue
    );
    if (rewardPerUnitStaked == 0 || Troves[_borrower].status != Status.active) {
      return 0;
    }

    uint stake = Troves[_borrower].stakes[_tokenAddress];
    pendingReward = stake.mul(rewardPerUnitStaked).div(DECIMAL_PRECISION);
  }

  function hasPendingRewards(
    address _borrower
  ) external view override returns (bool) {
    //        /*
    //        * A Trove has pending rewards if its snapshot is less than the current rewards per-unit-staked sum:
    //        * this indicates that rewards have occured since the snapshot was made, and the user therefore has
    //        * pending rewards
    //        */
    //        if (Troves[_borrower].status != Status.active) return false;
    //        return (rewardSnapshots[_borrower].ETH < L_ETH);
    return false; // todo
  }

  // Return the Troves entire debt and coll, including pending rewards from redistributions.
  function getEntireDebtAndColl(
    address _borrower
  ) external view override returns (RAmount[] memory amounts) {
    Trove storage trove = Troves[_borrower];
    amounts = new RAmount[](trove.collTokens.length + trove.debtTokens.length);

    for (uint i = 0; i < trove.debtTokens.length; i++) {
      address tokenAddress = address(trove.debtTokens[i]);
      amounts[i] = RAmount(
        tokenAddress,
        false,
        trove.debts[trove.debtTokens[i]],
        getPendingReward(_borrower, tokenAddress),
        0,
        0,
        0
      );
    }
    for (uint i = 0; i < trove.collTokens.length; i++) {
      address tokenAddress = address(trove.collTokens[i]);
      amounts[i + trove.debtTokens.length] = RAmount(
        tokenAddress,
        true,
        trove.colls[trove.collTokens[i]],
        getPendingReward(_borrower, tokenAddress),
        0,
        0,
        0
      );
    }

    // adding gas compensation + toLiquidate
    for (uint i = 0; i < amounts.length; i++) {
      amounts[i].gasCompensation = _getCollGasCompensation(
        amounts[i].amount.add(amounts[i].pendingReward)
      );
      amounts[i].toLiquidate = amounts[i]
        .amount
        .add(amounts[i].pendingReward)
        .sub(amounts[i].gasCompensation);
    } // todo do we miss the stableCoinGasComp at this point?
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
      uint newStake = _computeNewStake(
        tokenAddress,
        Troves[_borrower].colls[tokenAddress]
      );
      uint oldStake = Troves[_borrower].stakes[tokenAddress];
      Troves[_borrower].stakes[tokenAddress] = newStake;

      totalStakes[tokenAddress] = totalStakes[tokenAddress].sub(oldStake).add(
        newStake
      );
      // todo emit TotalStakesUpdated(tokenAddress, totalStakes);
    }
  }

  // Calculate a new stake based on the snapshots of the totalStakes and totalCollateral taken at the last liquidation
  function _computeNewStake(
    address _collAddress,
    uint _amount
  ) internal view returns (uint stake) {
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
      uint numerator = toRedistribute[i].amount.mul(DECIMAL_PRECISION).add(
        lastErrorRedistribution[tokenAddress]
      );
      uint rewardPerUnitStaked = numerator.div(totalStake);
      lastErrorRedistribution[tokenAddress] = numerator.sub(
        rewardPerUnitStaked.mul(totalStake)
      );

      // Add per-unit-staked terms to the running totals
      liquidatedTokens[tokenAddress] = liquidatedTokens[tokenAddress].add(
        rewardPerUnitStaked
      );
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

  function _calculateTrovesStakeSum(
    PriceCache memory _priceCache,
    address _borrower
  ) internal returns (uint stakeSum) {
    Trove storage trove = Troves[_borrower];
    for (uint i = 0; i < tokenAddresses.length; i++) {
      stakeSum = stakeSum.add(
        trove.stakes[tokenAddresses[i]].mul(
          priceFeed.getPrice(_priceCache, tokenAddresses[i])
        )
      );
    }
    return stakeSum;
  }

  function _calculateTotalStakeSum(
    PriceCache memory _priceCache
  ) internal returns (uint stakeSum) {
    for (uint i = 0; i < tokenAddresses.length; i++) {
      stakeSum = stakeSum.add(
        totalStakes[tokenAddresses[i]].mul(
          priceFeed.getPrice(_priceCache, tokenAddresses[i])
        )
      );
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
  function _updateSystemSnapshots_excludeCollRemainder(
    IStoragePool _storagePool
  ) internal {
    for (uint i = 0; i < tokenAddresses.length; i++) {
      address tokenAddress = tokenAddresses[i];

      totalStakesSnapshot[tokenAddress] = totalStakes[tokenAddress];

      uint activeAmount = _storagePool.getValue(
        tokenAddress,
        true,
        PoolType.Active
      );
      uint defaultAmount = _storagePool.getValue(
        tokenAddress,
        true,
        PoolType.Default
      );
      totalCollateralSnapshots[tokenAddress] = activeAmount.add(defaultAmount);

      //            emit SystemSnapshotsUpdated(tokenAddress, totalStakesSnapshot[tokenAddress], totalCollateralSnapshots[tokenAddress]); todo
    }
  }

  // Push the owner's address to the Trove owners list, and record the corresponding array index on the Trove struct
  function addTroveOwnerToArray(
    address _borrower
  ) external override returns (uint index) {
    _requireCallerIsBorrowerOperations();
    return _addTroveOwnerToArray(_borrower);
  }

  function _addTroveOwnerToArray(
    address _borrower
  ) internal returns (uint128 index) {
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
  function _removeTroveOwner(
    address _borrower,
    uint TroveOwnersArrayLength
  ) internal {
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
  function _checkPotentialRecoveryMode(
    uint _entireSystemColl,
    uint _entireSystemDebt
  ) internal pure returns (bool) {
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
  function _updateBaseRateFromRedemption(
    uint _ETHDrawn,
    uint _price,
    uint _totalLUSDSupply
  ) internal returns (uint) {
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

  function getRedemptionFeeWithDecay(
    uint _ETHDrawn
  ) external view override returns (uint) {
    return _calcRedemptionFee(getRedemptionRateWithDecay(), _ETHDrawn);
  }

  function _calcRedemptionFee(
    uint _redemptionRate,
    uint _ETHDrawn
  ) internal pure returns (uint) {
    uint redemptionFee = _redemptionRate.mul(_ETHDrawn).div(DECIMAL_PRECISION);
    require(
      redemptionFee < _ETHDrawn,
      'TroveManager: Fee would eat up all returned collateral'
    );
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
    return
      LiquityMath._min(BORROWING_FEE_FLOOR.add(_baseRate), MAX_BORROWING_FEE);
  }

  function getBorrowingFee(
    uint _debtValue
  ) external view override returns (uint) {
    return _calcBorrowingFee(getBorrowingRate(), _debtValue);
  }

  function getBorrowingFeeWithDecay(
    uint _debtValue
  ) external view override returns (uint) {
    return _calcBorrowingFee(getBorrowingRateWithDecay(), _debtValue);
  }

  function _calcBorrowingFee(
    uint _borrowingRate,
    uint _debtValue
  ) internal pure returns (uint) {
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
    return
      (block.timestamp.sub(lastFeeOperationTime)).div(SECONDS_IN_ONE_MINUTE);
  }

  // --- 'require' wrapper functions ---

  function _requireCallerIsBorrowerOperations() internal view {
    require(
      msg.sender == borrowerOperationsAddress,
      'TroveManager: Caller is not the BorrowerOperations contract'
    );
  }

  function _requireTroveIsActive(address _borrower) internal view {
    require(
      Troves[_borrower].status == Status.active,
      'TroveManager: Trove does not exist or is closed'
    );
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

  function _requireMoreThanOneTroveInSystem(
    uint TroveOwnersArrayLength
  ) internal view {
    require(
      TroveOwnersArrayLength > 1 && sortedTroves.getSize() > 1,
      'TroveManager: Only one trove in the system'
    );
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
      _maxFeePercentage >= REDEMPTION_FEE_FLOOR &&
        _maxFeePercentage <= DECIMAL_PRECISION,
      'Max fee percentage must be between 0.5% and 100%'
    );
  }

  // --- Trove property getters ---

  function getTroveStatus(
    address _borrower
  ) external view override returns (uint) {
    return uint(Troves[_borrower].status);
  }

  function getTroveStake(
    address _borrower
  ) external view override returns (uint) {
    // todo
    return 1;
    //        return Troves[_borrower].stake;
  }

  function getTroveDebt(
    address _borrower
  ) external view override returns (TokenAmount[] memory) {
    Trove storage trove = Troves[_borrower];
    if (trove.status != Status.active) return new TokenAmount[](0);

    TokenAmount[] memory debts = new TokenAmount[](trove.debtTokens.length);
    for (uint i = 0; i < debts.length; i++)
      debts[i] = TokenAmount(
        address(trove.debtTokens[i]),
        trove.debts[trove.debtTokens[i]]
      );

    return debts;
  }

  function getTroveColl(
    address _borrower
  ) external view override returns (TokenAmount[] memory) {
    Trove storage trove = Troves[_borrower];
    if (trove.status != Status.active) return new TokenAmount[](0);

    TokenAmount[] memory colls = new TokenAmount[](trove.collTokens.length);
    for (uint i = 0; i < colls.length; i++)
      colls[i] = TokenAmount(
        trove.collTokens[i],
        trove.colls[trove.collTokens[i]]
      );

    return colls;
  }

  // --- Trove property setters, called by BorrowerOperations ---

  function setTroveStatus(address _borrower, uint _num) external override {
    _requireCallerIsBorrowerOperations();
    Troves[_borrower].status = Status(_num);
  }

  function increaseTroveColl(
    address _borrower,
    PriceTokenAmount[] memory _collTokenAmounts
  ) external override {
    _requireCallerIsBorrowerOperations();

    Trove storage trove = Troves[_borrower];
    for (uint i = 0; i < _collTokenAmounts.length; i++) {
      uint newColl = trove.colls[_collTokenAmounts[i].tokenAddress].add(
        _collTokenAmounts[i].coll
      );
      trove.colls[_collTokenAmounts[i].tokenAddress] = newColl;
    }
  }

  function decreaseTroveColl(
    address _borrower,
    PriceTokenAmount[] memory _collTokenAmounts
  ) external override {
    _requireCallerIsBorrowerOperations();

    Trove storage trove = Troves[_borrower];
    for (uint i = 0; i < _collTokenAmounts.length; i++) {
      uint newColl = trove.colls[_collTokenAmounts[i].tokenAddress].sub(
        _collTokenAmounts[i].coll
      );
      trove.colls[_collTokenAmounts[i].tokenAddress] = newColl;
    }
  }

  function increaseTroveDebt(
    address _borrower,
    DebtTokenAmount[] memory _debtTokenAmounts
  ) external override {
    _requireCallerIsBorrowerOperations();

    Trove storage trove = Troves[_borrower];
    for (uint i = 0; i < _debtTokenAmounts.length; i++) {
      uint newDebt = trove.debts[_debtTokenAmounts[i].debtToken].add(
        _debtTokenAmounts[i].netDebt
      );
      trove.debts[_debtTokenAmounts[i].debtToken] = newDebt;
    }
  }

  function decreaseTroveDebt(
    address _borrower,
    DebtTokenAmount[] memory _debtTokenAmounts
  ) external override {
    _requireCallerIsBorrowerOperations();

    Trove storage trove = Troves[_borrower];
    for (uint i = 0; i < _debtTokenAmounts.length; i++) {
      uint newDebt = trove.debts[_debtTokenAmounts[i].debtToken].sub(
        _debtTokenAmounts[i].netDebt
      );
      trove.debts[_debtTokenAmounts[i].debtToken] = newDebt;
    }
  }

  function _getNetDebt(
    DebtTokenAmount[] memory _newDebts
  ) internal pure returns (uint) {
    uint debtInStable = 0;
    for (uint i = 0; i < _newDebts.length; i++) {
      DebtTokenAmount memory debtTokenAmount = _newDebts[i];
      debtInStable.add(debtTokenAmount.netDebt.mul(debtTokenAmount.price));
    }
    return debtInStable.sub(STABLE_COIN_GAS_COMPENSATION);
  }
}
