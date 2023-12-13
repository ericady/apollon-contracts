// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
import './Dependencies/LiquityBase.sol';
import './Dependencies/CheckContract.sol';
import './Interfaces/IDebtToken.sol';
import './Interfaces/IDebtTokenManager.sol';
import './Interfaces/IPriceFeed.sol';
import './Interfaces/IStoragePool.sol';
import './Interfaces/IBBase.sol';
import './Interfaces/ICollTokenManager.sol';
import './Interfaces/IRedemptionOperations.sol';
import './Interfaces/ITroveManager.sol';
import './Interfaces/ILiquidationOperations.sol';
import './Interfaces/IStabilityPoolManager.sol';

contract LiquidationOperations is LiquityBase, Ownable(msg.sender), CheckContract, ILiquidationOperations {
  string public constant NAME = 'LiquidationOperations';

  // --- Connected contract declarations ---

  ITroveManager public troveManager;
  IStoragePool public storagePool;
  IPriceFeed public priceFeed;
  IDebtTokenManager public debtTokenManager;
  ICollTokenManager public collTokenManager;
  IStabilityPoolManager public stabilityPoolManager;

  // --- Data structures ---

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

  // --- Dependency setter ---

  function setAddresses(
    address _troveManagerAddress,
    address _storagePoolAddress,
    address _priceFeedAddress,
    address _debtTokenManagerAddress,
    address _collTokenManagerAddress,
    address _stabilityPoolManagerAddress
  ) external onlyOwner {
    checkContract(_troveManagerAddress);
    checkContract(_storagePoolAddress);
    checkContract(_priceFeedAddress);
    checkContract(_debtTokenManagerAddress);
    checkContract(_collTokenManagerAddress);
    checkContract(_stabilityPoolManagerAddress);

    troveManager = ITroveManager(_troveManagerAddress);
    storagePool = IStoragePool(_storagePoolAddress);
    priceFeed = IPriceFeed(_priceFeedAddress);
    debtTokenManager = IDebtTokenManager(_debtTokenManagerAddress);
    collTokenManager = ICollTokenManager(_collTokenManagerAddress);
    stabilityPoolManager = IStabilityPoolManager(_stabilityPoolManagerAddress);

    emit LiquidationOperationsInitialized(
      _troveManagerAddress,
      _storagePoolAddress,
      _priceFeedAddress,
      _debtTokenManagerAddress,
      _collTokenManagerAddress,
      _stabilityPoolManagerAddress
    );

    renounceOwnership();
  }

  // Single liquidation function. Closes the trove if its ICR is lower than the minimum collateral ratio.
  function liquidate(address _borrower) public override {
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

    if (!atLeastOneTroveLiquidated) revert NoLiquidatableTrove();

    // move tokens into the stability pools
    stabilityPoolManager.offset(vars.remainingStabilities);

    // and redistribute the rest (which could not be handled by the stability pool)
    troveManager.redistributeDebtAndColl(vars.collTokenAddresses, vars.tokensToRedistribute);

    // Update system snapshots
    troveManager.updateSystemSnapshots_excludeCollRemainder(vars.totalCollGasCompensation);

    // Send gas compensation to caller
    _sendGasCompensation(msg.sender, vars.totalStableCoinGasCompensation, vars.totalCollGasCompensation);

    // liquidation event
    _emitLiquidationSummaryEvent(vars);
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
      if (troveManager.isTroveActive(vars.user) == false) continue; // Skip non-active troves

      bool liquidated = _executeTroveLiquidation_RecoveryMode(outerVars, vars);
      if (liquidated) atLeastOneTroveLiquidated = true;
    }

    return atLeastOneTroveLiquidated;
  }

  function _getTotalsFromBatchLiquidate_NormalMode(
    LocalVariables_OuterLiquidationFunction memory outerVars,
    address[] memory _troveArray
  ) internal returns (bool atLeastOneTroveLiquidated) {
    LocalVariables_LiquidationSequence memory vars;

    for (uint i = 0; i < _troveArray.length; i++) {
      vars.user = _troveArray[i];
      if (troveManager.isTroveActive(vars.user) == false) continue; // Skip non-active troves

      bool liquidated = _executeTroveLiquidation_NormalMode(outerVars, vars);
      if (liquidated) atLeastOneTroveLiquidated = true;
    }

    return atLeastOneTroveLiquidated;
  }

  function _executeTroveLiquidation_RecoveryMode(
    LocalVariables_OuterLiquidationFunction memory outerVars,
    LocalVariables_LiquidationSequence memory vars
  ) internal returns (bool liquidated) {
    (
      vars.troveAmountsIncludingRewards,
      vars.troveCollInUSD,
      vars.troveDebtInUSD,
      vars.troveDebtInUSDWithoutGasCompensation
    ) = troveManager.getEntireDebtAndColl(vars.user);
    vars.ICR = LiquityMath._computeCR(vars.troveCollInUSD, vars.troveDebtInUSD);

    if (!vars.backToNormalMode) {
      if (troveManager.getTroveOwnersCount() <= 1) return false; // don't liquidate if last trove

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
      troveManager.removeStake(collTokenAddresses, _borrower);
      for (uint i = 0; i < troveAmountsIncludingRewards.length; i++) {
        RAmount memory rAmount = troveAmountsIncludingRewards[i];
        rAmount.toRedistribute = rAmount.toLiquidate;
        // todo gas comp missing
      }

      troveManager.closeTroveByProtocol(collTokenAddresses, _borrower, Status.closedByLiquidationInRecoveryMode);

      // If 100% < ICR < MCR, offset as much as possible, and redistribute the remainder
    } else if ((_ICR > _100pct) && (_ICR < MCR)) {
      _movePendingTroveRewardsToActivePool(troveAmountsIncludingRewards);
      troveManager.removeStake(collTokenAddresses, _borrower);
      _getOffsetAndRedistributionVals(
        _troveDebtInUSDWithoutGasCompensation,
        troveAmountsIncludingRewards,
        remainingStabilities
      );

      troveManager.closeTroveByProtocol(collTokenAddresses, _borrower, Status.closedByLiquidationInRecoveryMode);

      /*
       * If 110% <= ICR < current TCR (accounting for the preceding liquidations in the current sequence)
       * and there is enough debt in the Stability Pool (checked already before), only offset, with no redistribution,
       * but at a capped rate of 1.1 and only if the whole debt can be liquidated.
       * The remaining collateral, due to the capped rate, will remain in the trove.
       */
    } else if ((_ICR >= MCR) && (_ICR < _TCR)) {
      _movePendingTroveRewardsToActivePool(troveAmountsIncludingRewards);
      troveManager.removeStake(collTokenAddresses, _borrower);
      _getCappedOffsetVals(
        _troveCollInUSD,
        _troveDebtInUSDWithoutGasCompensation,
        troveAmountsIncludingRewards,
        remainingStabilities
      );

      troveManager.closeTroveByProtocol(collTokenAddresses, _borrower, Status.closedByLiquidationInNormalMode);
    } else {
      // if (_ICR >= MCR && ( _ICR >= _TCR || singleLiquidation.entireTroveDebt > debtInStabPool))
    }
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
    ) = troveManager.getEntireDebtAndColl(vars.user);

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

  // Liquidate one trove, in Normal Mode.
  function _liquidateNormalMode(
    LocalVariables_OuterLiquidationFunction memory outerVars,
    address _borrower,
    uint _troveDebtInUSDWithoutGasCompensation,
    RAmount[] memory troveAmountsIncludingRewards
  ) internal {
    _movePendingTroveRewardsToActivePool(troveAmountsIncludingRewards);
    troveManager.removeStake(outerVars.collTokenAddresses, _borrower);
    _getOffsetAndRedistributionVals(
      _troveDebtInUSDWithoutGasCompensation,
      troveAmountsIncludingRewards,
      outerVars.remainingStabilities
    );
    troveManager.closeTroveByProtocol(outerVars.collTokenAddresses, _borrower, Status.closedByLiquidationInNormalMode);
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

  // Check whether or not the system *would be* in Recovery Mode, given an ETH:USD price, and the entire system coll and debt.
  function _checkPotentialRecoveryMode(uint _entireSystemColl, uint _entireSystemDebt) internal pure returns (bool) {
    uint TCR = LiquityMath._computeCR(_entireSystemColl, _entireSystemDebt);
    return TCR < CCR;
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

  // Get its offset coll/debt and gas comp.
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
}
