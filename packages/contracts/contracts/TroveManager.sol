// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
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
  address public redemptionManagerAddress;
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
  uint public constant MINUTE_DECAY_FACTOR = 999037758833783000;

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
  // in token amount (not usd)
  mapping(address => uint) public totalStakes; // [collTokenAddress] => total system stake, relative to the coll token
  mapping(address => uint) public totalStakesSnapshot; // [collTokenAddress] => system stake, taken immediately after the latest liquidation (without default pool / rewards)
  mapping(address => uint) public totalCollateralSnapshots; // [collTokenAddress] => system stake, taken immediately after the latest liquidation (including default pool / rewards)

  // L_Tokens track the sums of accumulated liquidation rewards per unit staked. During its lifetime, each stake earns:
  // A gain of ( stake * [L_TOKEN[T] - L_TOKEN[T](0)] )
  // Where L_TOKEN[T](0) are snapshots of token T for the active Trove taken at the instant the stake was made
  //
  // in token amount (not usd)
  mapping(address => mapping(bool => uint)) public liquidatedTokens; // [tokenAddress][isColl] -> liquidated/redistributed amount, per unit staked
  mapping(address => mapping(address => mapping(bool => uint))) public rewardSnapshots; // [user][tokenAddress][isColl] -> value, snapshot amount, per unit staked
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
    //
    uint totalStableCoinGasCompensation; // paid out to the liquidator
    TokenAmount[] totalCollGasCompensation; // paid out to the liquidator
    //
    uint entireSystemCollInUSD;
    uint entireSystemDebtInUSD;
  }

  struct LocalVariables_LiquidationSequence {
    //
    bool backToNormalMode;
    //
    uint ICR;
    address user;
    //
    RAmount[] troveAmountsIncludingRewards;
    uint troveDebtInUSD;
    uint troveDebtInUSDWithoutGasCompensation;
    uint troveCollInUSD;
  }

  struct SingleRedemptionVariables {
    uint stableCoinLot;
    TokenAmount[] collLots;
    //
    TokenAmount stableCoinEntry;
    uint troveCollInUSD;
    uint troveDebtInUSD;
  }

  // --- Dependency setter ---

  function setAddresses(
    address _borrowerOperationsAddress,
    address _redemptionManagerAddress,
    address _storagePoolAddress,
    address _stabilityPoolManagerAddress,
    address _priceFeedAddress,
    address _debtTokenManagerAddress,
    address _collTokenManagerAddress
  ) external onlyOwner {
    checkContract(_borrowerOperationsAddress);
    checkContract(_redemptionManagerAddress);
    checkContract(_storagePoolAddress);
    checkContract(_stabilityPoolManagerAddress);
    checkContract(_priceFeedAddress);
    checkContract(_debtTokenManagerAddress);
    checkContract(_collTokenManagerAddress);

    borrowerOperationsAddress = _borrowerOperationsAddress;
    redemptionManagerAddress = _redemptionManagerAddress;
    storagePool = IStoragePool(_storagePoolAddress);
    stabilityPoolManager = IStabilityPoolManager(_stabilityPoolManagerAddress);
    priceFeed = IPriceFeed(_priceFeedAddress);
    debtTokenManager = IDebtTokenManager(_debtTokenManagerAddress);
    collTokenManager = ICollTokenManager(_collTokenManagerAddress);

    emit TroveManagerInitialized(
      _borrowerOperationsAddress,
      _redemptionManagerAddress,
      _storagePoolAddress,
      _stabilityPoolManagerAddress,
      _priceFeedAddress,
      _debtTokenManagerAddress,
      _collTokenManagerAddress
    );

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
    (recoveryModeAtStart, , vars.entireSystemCollInUSD, vars.entireSystemDebtInUSD) = storagePool.checkRecoveryMode();
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

    return atLeastOneTroveLiquidated;
  }

  // Liquidate one trove, in Recovery Mode.
  function _liquidateRecoveryMode(
    RemainingStability[] memory remainingStabilities,
    address[] memory collTokenAddresses,
    address _borrower,
    uint _ICR,
    uint _troveCollInUSD,
    uint _troveDebtInUSDWithoutGasCompensation,
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
        // todo gas comp missing
      }

      _closeTrove(collTokenAddresses, _borrower, Status.closedByLiquidationInRecoveryMode);

      // If 100% < ICR < MCR, offset as much as possible, and redistribute the remainder
    } else if ((_ICR > _100pct) && (_ICR < MCR)) {
      _movePendingTroveRewardsToActivePool(troveAmountsIncludingRewards);
      _removeStake(collTokenAddresses, _borrower);
      _getOffsetAndRedistributionVals(
        _troveDebtInUSDWithoutGasCompensation,
        troveAmountsIncludingRewards,
        remainingStabilities
      );

      _closeTrove(collTokenAddresses, _borrower, Status.closedByLiquidationInRecoveryMode);

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
        _troveCollInUSD,
        _troveDebtInUSDWithoutGasCompensation,
        troveAmountsIncludingRewards,
        remainingStabilities
      );

      _closeTrove(collTokenAddresses, _borrower, Status.closedByLiquidationInNormalMode);
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
    uint _troveDebtInUSDWithoutGasCompensation,
    RAmount[] memory troveAmountsIncludingRewards
  ) internal {
    _movePendingTroveRewardsToActivePool(troveAmountsIncludingRewards);
    _removeStake(outerVars.collTokenAddresses, _borrower);
    _getOffsetAndRedistributionVals(
      _troveDebtInUSDWithoutGasCompensation,
      troveAmountsIncludingRewards,
      outerVars.remainingStabilities
    );

    _closeTrove(outerVars.collTokenAddresses, _borrower, Status.closedByLiquidationInNormalMode);
  }

  /* In a full liquidation, returns the values for a trove's coll and debt to be offset, and coll and debt to be
   * redistributed to active troves.
   */
  function _getOffsetAndRedistributionVals(
    uint troveDebtInUSDWithoutGasCompensation,
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

    // by default the entire coll needs to be redistributed
    for (uint i = 0; i < troveAmountsIncludingRewards.length; i++) {
      RAmount memory rAmount = troveAmountsIncludingRewards[i];
      if (rAmount.isColl) rAmount.toRedistribute = rAmount.toLiquidate;
    }

    _debtOffset(troveDebtInUSDWithoutGasCompensation, troveAmountsIncludingRewards, remainingStabilities);
  }

  /*
   *  Get its offset coll/debt and gas comp.
   */
  function _getCappedOffsetVals(
    uint troveCollInUSD,
    uint troveDebtInUSDWithoutGasCompensation,
    RAmount[] memory troveAmountsIncludingRewards,
    RemainingStability[] memory remainingStabilities
  ) internal view {
    // capping the to be liquidated collateral to 1.1 * the total debts value
    uint cappedLimit = troveDebtInUSDWithoutGasCompensation * MCR; // total debt * 1.1
    for (uint i = 0; i < troveAmountsIncludingRewards.length; i++) {
      RAmount memory rAmount = troveAmountsIncludingRewards[i];
      if (!rAmount.isColl) continue; // coll will be handled later in the debts loop
      // priceFeed.getUSDValue(rAmount.tokenAddress, rAmount.toLiquidate)
      uint cappedColl = (cappedLimit * rAmount.toLiquidate) / troveCollInUSD;
      rAmount.toLiquidate = LiquityMath._min(cappedColl, rAmount.toLiquidate);
    }

    _debtOffset(troveDebtInUSDWithoutGasCompensation, troveAmountsIncludingRewards, remainingStabilities);
  }

  function _debtOffset(
    uint troveDebtInUSDWithoutGasCompensation,
    RAmount[] memory troveAmountsIncludingRewards,
    RemainingStability[] memory remainingStabilities
  ) internal view {
    // checking if some debt can be offset by the matching stability pool
    for (uint i = 0; i < troveAmountsIncludingRewards.length; i++) {
      RAmount memory rAmountDebt = troveAmountsIncludingRewards[i];
      if (rAmountDebt.isColl) continue; // coll will be handled by the debts loop

      // find the right remainingStability entry for the current debt token
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
          DECIMAL_PRECISION) / troveDebtInUSDWithoutGasCompensation; // relative to the troves total debt

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
      vars.troveCollInUSD,
      vars.troveDebtInUSD,
      vars.troveDebtInUSDWithoutGasCompensation
    ) = this.getEntireDebtAndColl(vars.user);
    vars.ICR = LiquityMath._computeCR(vars.troveCollInUSD, vars.troveDebtInUSD);

    if (!vars.backToNormalMode) {
      if (TroveOwners.length <= 1) return false; // don't liquidate if last trove

      // Break the loop if ICR is greater than MCR and Stability Pool is empty
      // todo check if that makes sense, why do we not redistribute that trove?!
      // todo we are checking now if there is enough stability for every debt token, if one is not covered, we skip the hole trove liquidation, is that correct?!
      if (
        vars.ICR >= MCR &&
        _existsEnoughRemainingStabilities(outerVars.remainingStabilities, vars.troveAmountsIncludingRewards)
      ) return false;

      uint TCR = LiquityMath._computeCR(outerVars.entireSystemCollInUSD, outerVars.entireSystemDebtInUSD);
      _liquidateRecoveryMode(
        outerVars.remainingStabilities,
        outerVars.collTokenAddresses,
        vars.user,
        vars.ICR,
        vars.troveCollInUSD,
        vars.troveDebtInUSDWithoutGasCompensation,
        TCR,
        vars.troveAmountsIncludingRewards
      );

      // updating total system debt and collateral
      for (uint a = 0; a < vars.troveAmountsIncludingRewards.length; a++) {
        RAmount memory rAmount = vars.troveAmountsIncludingRewards[a];
        outerVars.entireSystemCollInUSD -= priceFeed.getUSDValue(rAmount.tokenAddress, rAmount.gasCompensation);
        if (rAmount.isColl)
          outerVars.entireSystemCollInUSD -= priceFeed.getUSDValue(rAmount.tokenAddress, rAmount.toOffset);
        else outerVars.entireSystemDebtInUSD -= priceFeed.getUSDValue(rAmount.tokenAddress, rAmount.toOffset);
      }

      vars.backToNormalMode = !_checkPotentialRecoveryMode(
        outerVars.entireSystemCollInUSD,
        outerVars.entireSystemDebtInUSD
      );
    } else if (vars.backToNormalMode && vars.ICR < MCR) {
      _liquidateNormalMode(
        outerVars,
        vars.user,
        vars.troveDebtInUSDWithoutGasCompensation,
        vars.troveAmountsIncludingRewards
      );
    } else return false; // break if the loop reaches a Trove with ICR >= MCR

    // not liquidated
    if (vars.troveAmountsIncludingRewards.length == 0) return false;

    _mergeCollGasCompensation(vars.troveAmountsIncludingRewards, outerVars.totalCollGasCompensation);
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
      vars.troveCollInUSD,
      vars.troveDebtInUSD,
      vars.troveDebtInUSDWithoutGasCompensation
    ) = this.getEntireDebtAndColl(vars.user);

    vars.ICR = LiquityMath._computeCR(vars.troveCollInUSD, vars.troveDebtInUSD);
    if (vars.ICR >= MCR) return false; // trove is collatoralized enough, skip the liquidation

    _liquidateNormalMode(
      outerVars,
      vars.user,
      vars.troveDebtInUSDWithoutGasCompensation,
      vars.troveAmountsIncludingRewards
    );

    _mergeCollGasCompensation(vars.troveAmountsIncludingRewards, outerVars.totalCollGasCompensation);
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
    vars.totalCollGasCompensation = new TokenAmount[](vars.collTokenAddresses.length);
    for (uint i = 0; i < vars.collTokenAddresses.length; i++) {
      vars.tokensToRedistribute[i] = CAmount(vars.collTokenAddresses[i], true, 0);
      vars.totalCollGasCompensation[i] = TokenAmount(vars.collTokenAddresses[i], 0);
    }
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
        if (
          tokensToRedistribute[ib].tokenAddress != rAmount.tokenAddress ||
          tokensToRedistribute[ib].isColl != rAmount.isColl
        ) continue;

        tokensToRedistribute[ib].amount += rAmount.toRedistribute;
        break;
      }
    }
  }

  // adding up the coll gas compensation
  function _mergeCollGasCompensation(
    RAmount[] memory troveAmountsIncludingRewards,
    TokenAmount[] memory totalCollGasCompensation
  ) internal pure {
    for (uint i = 0; i < troveAmountsIncludingRewards.length; i++) {
      RAmount memory rAmount = troveAmountsIncludingRewards[i];
      if (rAmount.gasCompensation == 0 || !rAmount.isColl) continue;

      for (uint ib = 0; ib < totalCollGasCompensation.length; ib++) {
        if (totalCollGasCompensation[ib].tokenAddress != rAmount.tokenAddress) continue;

        totalCollGasCompensation[ib].amount += rAmount.gasCompensation;
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
    _updateSystemSnapshots_excludeCollRemainder(vars.totalCollGasCompensation);

    // Send gas compensation to caller
    _sendGasCompensation(msg.sender, vars.totalStableCoinGasCompensation, vars.totalCollGasCompensation);

    // liquidation event
    _emitLiquidationSummaryEvent(vars);
  }

  function _emitLiquidationSummaryEvent(LocalVariables_OuterLiquidationFunction memory vars) internal {
    TokenAmount[] memory liquidatedColl = new TokenAmount[](vars.collTokenAddresses.length);
    for (uint i = 0; i < vars.collTokenAddresses.length; i++) {
      liquidatedColl[i] = TokenAmount(
        vars.collTokenAddresses[i],
        vars.tokensToRedistribute[i].amount // works because of the initialisation of the array (first debts, then colls)
      );
    }

    TokenAmount[] memory liquidatedDebt = new TokenAmount[](vars.remainingStabilities.length);
    for (uint i = 0; i < vars.remainingStabilities.length; i++) {
      RemainingStability memory remainingStability = vars.remainingStabilities[i];

      uint redistributed = vars.tokensToRedistribute[vars.collTokenAddresses.length + i].amount; // has the same token order in the array
      liquidatedDebt[i] = TokenAmount(remainingStability.tokenAddress, remainingStability.debtToOffset + redistributed);

      for (uint ii = 0; ii < vars.collTokenAddresses.length; ii++) {
        liquidatedColl[ii].amount += remainingStability.collGained[ii].amount;
      }
    }

    emit LiquidationSummary(
      liquidatedDebt,
      liquidatedColl,
      vars.totalStableCoinGasCompensation,
      vars.totalCollGasCompensation
    );
  }

  function _sendGasCompensation(
    address _liquidator,
    uint _stableCoinGasCompensation,
    TokenAmount[] memory _collGasCompensation
  ) internal {
    // stable payout
    if (_stableCoinGasCompensation != 0) {
      IDebtToken stableCoin = debtTokenManager.getStableCoin();
      storagePool.withdrawalValue(
        _liquidator,
        address(stableCoin),
        false,
        PoolType.GasCompensation,
        _stableCoinGasCompensation
      );
    }

    // coll payout
    for (uint i = 0; i < _collGasCompensation.length; i++) {
      if (_collGasCompensation[i].amount == 0) continue;
      storagePool.withdrawalValue(
        _liquidator,
        _collGasCompensation[i].tokenAddress,
        true,
        PoolType.Active,
        _collGasCompensation[i].amount
      );
    }
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

  // --- Helper functions ---

  // Return the nominal collateral ratio (ICR) of a given Trove, without the price. Takes a trove's pending coll and debt rewards from redistributions into account.
  function getNominalICR(address _borrower) external view override returns (uint) {
    (uint currentCollInUSD, uint currentDebtInUSD) = _getCurrentTrovesFaceValues(_borrower);
    uint NICR = LiquityMath._computeNominalCR(currentCollInUSD, currentDebtInUSD);
    return NICR;
  }

  // Return the current collateral ratio (ICR) of a given Trove. Takes a trove's pending coll and debt rewards from redistributions into account.
  function getCurrentICR(address _borrower) external view override returns (uint ICR, uint currentDebtInUSD) {
    uint currentCollInUSD;
    (currentCollInUSD, currentDebtInUSD) = _getCurrentTrovesFaceValues(_borrower);
    ICR = LiquityMath._computeCR(currentCollInUSD, currentDebtInUSD);
    return (ICR, currentDebtInUSD);
  }

  function _getCurrentTrovesFaceValues(
    address _borrower
  ) internal view returns (uint currentCollInUSD, uint currentDebtInUSD) {
    Trove storage _trove = Troves[_borrower];

    for (uint i = 0; i < _trove.collTokens.length; i++) {
      address token = _trove.collTokens[i];

      uint pendingRewards = getPendingReward(_borrower, token, true);
      currentCollInUSD += priceFeed.getUSDValue(token, _trove.colls[token] + pendingRewards);
    }

    for (uint i = 0; i < _trove.debtTokens.length; i++) {
      IDebtToken token = _trove.debtTokens[i];

      uint pendingRewards = getPendingReward(_borrower, address(token), true);
      currentDebtInUSD += priceFeed.getUSDValue(address(token), _trove.debts[token] + pendingRewards);
    }

    return (currentCollInUSD, currentDebtInUSD);
  }

  function applyPendingRewards(address _borrower) external override {
    _requireCallerIsBorrowerOrRedemptionOperations();
    _applyPendingRewards(_borrower);
  }

  function _applyPendingRewards(address _borrower) internal {
    _requireTroveIsActive(_borrower);

    Trove storage _trove = Troves[_borrower];
    CAmount[] memory appliedRewards = new CAmount[](_trove.collTokens.length + _trove.debtTokens.length);

    // coll rewards
    for (uint i = 0; i < _trove.collTokens.length; i++) {
      address token = _trove.collTokens[i];

      uint pendingRewards = getPendingReward(_borrower, token, true);
      appliedRewards[i] = CAmount(token, true, pendingRewards);
      if (pendingRewards == 0) continue;

      _trove.colls[token] += pendingRewards;
      storagePool.transferBetweenTypes(token, true, PoolType.Default, PoolType.Active, pendingRewards);
    }

    // debt rewards
    for (uint i = 0; i < _trove.debtTokens.length; i++) {
      IDebtToken token = _trove.debtTokens[i];
      address tokenAddress = address(token);

      uint pendingRewards = getPendingReward(_borrower, tokenAddress, false);
      appliedRewards[_trove.collTokens.length + i] = CAmount(tokenAddress, false, pendingRewards);
      if (pendingRewards == 0) continue;

      _trove.debts[token] += pendingRewards;
      storagePool.transferBetweenTypes(tokenAddress, false, PoolType.Default, PoolType.Active, pendingRewards);
    }

    emit TroveAppliedRewards(_borrower, appliedRewards);
    _updateTroveRewardSnapshots(_borrower);
  }

  // Update borrower's snapshots to reflect the current values
  function updateTroveRewardSnapshots(address _borrower) external override {
    _requireCallerIsBorrowerOrRedemptionOperations();
    return _updateTroveRewardSnapshots(_borrower);
  }

  function _updateTroveRewardSnapshots(address _borrower) internal {
    Trove storage _trove = Troves[_borrower];
    CAmount[] memory _troveSnapshots = new CAmount[](_trove.collTokens.length + _trove.debtTokens.length);

    for (uint i = 0; i < _trove.debtTokens.length; i++) {
      address token = address(_trove.debtTokens[i]);

      uint snapshot = liquidatedTokens[token][false];
      rewardSnapshots[_borrower][token][false] = snapshot;
      _troveSnapshots[i] = CAmount(token, false, snapshot);
    }
    for (uint i = 0; i < _trove.collTokens.length; i++) {
      address token = _trove.collTokens[i];

      uint snapshot = liquidatedTokens[token][true];
      rewardSnapshots[_borrower][token][true] = snapshot;
      _troveSnapshots[_trove.debtTokens.length + i] = CAmount(token, true, snapshot);
    }

    emit TroveSnapshotsUpdated(_troveSnapshots);
  }

  // Get the borrower's pending accumulated rewards, earned by their stake through their redistribution
  function getPendingReward(
    address _borrower,
    address _tokenAddress,
    bool _isColl
  ) public view returns (uint pendingReward) {
    uint snapshotValue = rewardSnapshots[_borrower][_tokenAddress][_isColl];
    uint rewardPerUnitStaked = liquidatedTokens[_tokenAddress][_isColl] - snapshotValue;
    if (rewardPerUnitStaked == 0 || Troves[_borrower].status != Status.active) return 0;

    uint trovesStakeInUSD = _calculateTrovesStake(_borrower);
    pendingReward = (trovesStakeInUSD * rewardPerUnitStaked) / DECIMAL_PRECISION;
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
      uint troveCollInUSD,
      uint troveDebtInUSD,
      uint troveDebtInUSDWithoutGasCompensation
    )
  {
    Trove storage trove = Troves[_borrower];
    amounts = new RAmount[](trove.collTokens.length + trove.debtTokens.length);

    // initialize empty coll tokens
    for (uint i = 0; i < trove.collTokens.length; i++) {
      address token = address(trove.collTokens[i]);
      amounts[i] = RAmount(token, true, trove.colls[trove.collTokens[i]], 0, 0, 0, 0, 0);
    }

    // initialize empty debt tokens and find the stable entry
    uint stableCoinIndex;
    for (uint i = 0; i < trove.debtTokens.length; i++) {
      if (trove.debtTokens[i].isStableCoin()) stableCoinIndex = i + trove.collTokens.length;

      address token = address(trove.debtTokens[i]);
      amounts[i + trove.collTokens.length] = RAmount(token, false, trove.debts[trove.debtTokens[i]], 0, 0, 0, 0, 0);
    }

    // applying rewards (from default pool) + adding gas compensation + toLiquidate
    for (uint i = 0; i < amounts.length; i++) {
      RAmount memory amountEntry = amounts[i];

      amountEntry.pendingReward = getPendingReward(_borrower, amountEntry.tokenAddress, amountEntry.isColl);
      uint totalAmount = amountEntry.amount + amountEntry.pendingReward;
      uint InUSD = priceFeed.getUSDValue(amountEntry.tokenAddress, totalAmount);

      if (amountEntry.isColl) {
        amountEntry.gasCompensation = _getCollGasCompensation(totalAmount);
        amountEntry.toLiquidate = totalAmount - amountEntry.gasCompensation;
        troveCollInUSD += InUSD;
      } else {
        if (i == stableCoinIndex) {
          // stable coin gas compensation should not be liquidated, it will be paid out as reward for the liquidator
          amountEntry.toLiquidate = totalAmount - STABLE_COIN_GAS_COMPENSATION;
          troveDebtInUSDWithoutGasCompensation += priceFeed.getUSDValue(
            amountEntry.tokenAddress,
            amountEntry.toLiquidate
          );
        } else {
          amountEntry.toLiquidate = totalAmount;
          troveDebtInUSDWithoutGasCompensation += InUSD;
        }

        troveDebtInUSD += InUSD;
      }
    }

    return (amounts, troveCollInUSD, troveDebtInUSD, troveDebtInUSDWithoutGasCompensation);
  }

  function removeStake(address[] memory collTokenAddresses, address _borrower) external override {
    _requireCallerIsBorrowerOrRedemptionOperations();
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
    _requireCallerIsBorrowerOrRedemptionOperations();
    _updateStakeAndTotalStakes(collTokenAddresses, _borrower);
  }

  // Update borrower's stake based on their latest collateral value
  function _updateStakeAndTotalStakes(address[] memory collTokenAddresses, address _borrower) internal {
    TokenAmount[] memory totalStakesCopy = new TokenAmount[](collTokenAddresses.length);
    for (uint i = 0; i < collTokenAddresses.length; i++) {
      address _collAddress = collTokenAddresses[i];

      uint newBorrowerCollStake;
      uint borrowersCollAmount = Troves[_borrower].colls[_collAddress];

      uint totalCollateralSnapshot = totalCollateralSnapshots[_collAddress];
      if (totalCollateralSnapshot == 0) newBorrowerCollStake = borrowersCollAmount;
      else {
        /*
         * The following assert() holds true because:
         * - The system always contains >= 1 trove
         * - When we close or liquidate a trove, we redistribute the pending rewards, so if all troves were closed/liquidated,
         * rewards would’ve been emptied and totalCollateralSnapshot would be zero too.
         */
        uint stakedSnapshot = totalStakesSnapshot[_collAddress];
        assert(stakedSnapshot > 0);
        newBorrowerCollStake = (borrowersCollAmount * stakedSnapshot) / totalCollateralSnapshot;
      }

      uint oldBorrowerStake = Troves[_borrower].stakes[_collAddress];
      uint newTotalStake = totalStakes[_collAddress] - oldBorrowerStake + newBorrowerCollStake;
      totalStakes[_collAddress] = newTotalStake;
      totalStakesCopy[i] = TokenAmount(_collAddress, newTotalStake);
      Troves[_borrower].stakes[_collAddress] = newBorrowerCollStake;
    }

    emit TotalStakesUpdated(totalStakesCopy);
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
    CAmount[] memory _liquidatedTokens = new CAmount[](toRedistribute.length);

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
      uint liquidated = liquidatedTokens[redistributeEntry.tokenAddress][redistributeEntry.isColl] +
        rewardPerUnitStaked;

      liquidatedTokens[redistributeEntry.tokenAddress][redistributeEntry.isColl] = liquidated;
      _liquidatedTokens[i] = CAmount(redistributeEntry.tokenAddress, redistributeEntry.isColl, liquidated);

      storagePool.transferBetweenTypes(
        redistributeEntry.tokenAddress,
        redistributeEntry.isColl,
        PoolType.Active,
        PoolType.Default,
        redistributeEntry.amount
      );
    }

    emit LTermsUpdated(_liquidatedTokens);
  }

  function _calculateTotalStake(address[] memory collTokenAddresses) internal view returns (uint stake) {
    for (uint i = 0; i < collTokenAddresses.length; i++) {
      address tokenAddress = collTokenAddresses[i];
      stake += priceFeed.getUSDValue(tokenAddress, totalStakes[tokenAddress]);
    }
  }

  function closeTrove(address[] memory collTokenAddresses, address _borrower) external override {
    _requireCallerIsBorrowerOrRedemptionOperations();
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

    emit TroveClosed(_borrower, closedStatus);
  }

  /*
   * Updates snapshots of system total stakes and total collateral, excluding a given collateral remainder from the calculation.
   * Used in a liquidation sequence.
   */
  function _updateSystemSnapshots_excludeCollRemainder(TokenAmount[] memory totalCollGasCompensation) internal {
    TokenAmount[] memory _totalStakesSnapshot = new TokenAmount[](totalCollGasCompensation.length);
    TokenAmount[] memory _totalCollateralSnapshots = new TokenAmount[](totalCollGasCompensation.length);

    // totalCollGasCompensation array included every available coll in the system, even if there is 0 gas compensation
    for (uint i = 0; i < totalCollGasCompensation.length; i++) {
      address tokenAddress = totalCollGasCompensation[i].tokenAddress;

      uint totalStake = totalStakes[tokenAddress];
      totalStakesSnapshot[tokenAddress] = totalStake;
      _totalStakesSnapshot[i] = TokenAmount(tokenAddress, totalStake);

      uint totalCollateralSnapshot = storagePool.getValue(tokenAddress, true, PoolType.Active) +
        storagePool.getValue(tokenAddress, true, PoolType.Default) -
        totalCollGasCompensation[i].amount;
      totalCollateralSnapshots[tokenAddress] = totalCollateralSnapshot;
      _totalCollateralSnapshots[i] = TokenAmount(tokenAddress, totalCollateralSnapshot);
    }

    emit SystemSnapshotsUpdated(_totalStakesSnapshot, _totalCollateralSnapshots);
  }

  // Push the owner's address to the Trove owners list, and record the corresponding array index on the Trove struct
  function addTroveOwnerToArray(address _borrower) external override returns (uint index) {
    _requireCallerIsBorrowerOrRedemptionOperations();
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

  // --- Borrowing fee functions ---

  function getBaseRate() external view override returns (uint) {
    return baseRate;
  }

  function getBorrowingRate() public view override returns (uint) {
    return _calcBorrowingRate(baseRate);
  }

  function getBorrowingRateWithDecay() public view override returns (uint) {
    return _calcBorrowingRate(this.calcDecayedBaseRate());
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
    _requireCallerIsBorrowerOrRedemptionOperations();

    uint decayedBaseRate = this.calcDecayedBaseRate();
    assert(decayedBaseRate <= DECIMAL_PRECISION); // The baseRate can decay to 0

    baseRate = decayedBaseRate;
    emit BaseRateUpdated(decayedBaseRate);

    _updateLastFeeOpTime();
  }

  /*
   * This function has two impacts on the baseRate state variable:
   * 1) decays the baseRate based on time passed since last redemption or stable coin borrowing operation.
   * then,
   * 2) increases the baseRate based on the amount redeemed, as a proportion of total supply
   */
  function updateBaseRateFromRedemption(uint _totalRedeemedStable, uint _totalStableCoinSupply) external override {
    _requireCallerIsBorrowerOrRedemptionOperations();

    uint decayedBaseRate = this.calcDecayedBaseRate();
    uint redeemedStableFraction = (_totalRedeemedStable * DECIMAL_PRECISION) / _totalStableCoinSupply;

    // cap baseRate at a maximum of 100%
    uint newBaseRate = LiquityMath._min(decayedBaseRate + (redeemedStableFraction / BETA), DECIMAL_PRECISION);
    assert(newBaseRate > 0); // Base rate is always non-zero after redemption

    // Update the baseRate state variable
    baseRate = newBaseRate;
    emit BaseRateUpdated(newBaseRate);

    _updateLastFeeOpTime();
  }

  // --- Internal fee functions ---

  // Update the last fee operation time only if time passed >= decay interval. This prevents base rate griefing.
  function _updateLastFeeOpTime() internal {
    uint timePassed = block.timestamp - lastFeeOperationTime;

    if (timePassed >= 1 minutes) {
      lastFeeOperationTime = block.timestamp;
      emit LastFeeOpTimeUpdated(block.timestamp);
    }
  }

  function calcDecayedBaseRate() external view override returns (uint) {
    uint minutesPassed = _minutesPassedSinceLastFeeOp();
    uint decayFactor = LiquityMath._decPow(MINUTE_DECAY_FACTOR, minutesPassed);

    return (baseRate * decayFactor) / DECIMAL_PRECISION;
  }

  function _minutesPassedSinceLastFeeOp() internal view returns (uint) {
    return (block.timestamp - lastFeeOperationTime) / 1 minutes;
  }

  // --- 'require' wrapper functions ---

  function _requireCallerIsBorrowerOrRedemptionOperations() internal view {
    if (msg.sender != borrowerOperationsAddress && msg.sender != redemptionManagerAddress)
      revert NotFromBorrowerOrRedemptionOps();
  }

  function _requireTroveIsActive(address _borrower) internal view {
    if (Troves[_borrower].status != Status.active) revert InvalidTrove();
  }

  // --- Trove property getters ---

  function getTroveStatus(address _borrower) external view override returns (uint) {
    return uint(Troves[_borrower].status);
  }

  function getTroveStakes(address _borrower, address _token) external view override returns (uint) {
    return Troves[_borrower].stakes[_token];
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
    _requireCallerIsBorrowerOrRedemptionOperations();
    Troves[_borrower].status = Status(_num);
  }

  function increaseTroveColl(address _borrower, TokenAmount[] memory _collTokenAmounts) external override {
    _requireCallerIsBorrowerOrRedemptionOperations();

    Trove storage trove = Troves[_borrower];
    address[] memory collTokenAddresses = new address[](_collTokenAmounts.length);
    for (uint i = 0; i < _collTokenAmounts.length; i++) {
      address tokenAddress = _collTokenAmounts[i].tokenAddress;
      trove.colls[tokenAddress] += _collTokenAmounts[i].amount;

      if (!trove.collsRegistered[tokenAddress]) {
        trove.collsRegistered[tokenAddress] = true;
        trove.collTokens.push(tokenAddress);
      }
      collTokenAddresses[i] = tokenAddress;
    }

    emit TroveCollChanged(_borrower, collTokenAddresses);
  }

  function decreaseTroveColl(address _borrower, TokenAmount[] memory _collTokenAmounts) external override {
    _requireCallerIsBorrowerOrRedemptionOperations();

    Trove storage trove = Troves[_borrower];
    address[] memory collTokenAddresses = new address[](_collTokenAmounts.length);

    for (uint i = 0; i < _collTokenAmounts.length; i++) {
      address tokenAddress = _collTokenAmounts[i].tokenAddress;
      trove.colls[tokenAddress] -= _collTokenAmounts[i].amount;
      collTokenAddresses[i] = tokenAddress;
    }

    emit TroveCollChanged(_borrower, collTokenAddresses);
  }

  function increaseTroveDebt(address _borrower, DebtTokenAmount[] memory _debtTokenAmounts) external override {
    _requireCallerIsBorrowerOrRedemptionOperations();

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
    _requireCallerIsBorrowerOrRedemptionOperations();

    Trove storage trove = Troves[_borrower];
    for (uint i = 0; i < _debtTokenAmounts.length; i++) {
      trove.debts[_debtTokenAmounts[i].debtToken] -= _debtTokenAmounts[i].netDebt;
    }
  }
}
