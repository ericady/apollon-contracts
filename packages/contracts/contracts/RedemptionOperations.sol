// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
import './Dependencies/LiquityBase.sol';
import './Dependencies/CheckContract.sol';
import './Interfaces/IStabilityPool.sol';
import './Interfaces/IDebtToken.sol';
import './Interfaces/IDebtTokenManager.sol';
import './Interfaces/IPriceFeed.sol';
import './Interfaces/IStoragePool.sol';
import './Interfaces/IBBase.sol';
import './Interfaces/ICollTokenManager.sol';
import './Interfaces/IRedemptionOperations.sol';
import './Interfaces/ITroveManager.sol';

contract RedemptionOperations is LiquityBase, Ownable, CheckContract, IRedemptionOperations {
  string public constant NAME = 'RedemptionManager';

  uint public constant REDEMPTION_FEE_FLOOR = (DECIMAL_PRECISION / 1000) * 5; // 0.5%

  // --- Connected contract declarations ---

  ITroveManager public troveManager;
  IDebtTokenManager public debtTokenManager;
  ICollTokenManager public collTokenManager;
  IStoragePool public storagePool;
  IPriceFeed public priceFeed;

  // --- Data structures ---

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
    address _troveManagerAddress,
    address _storagePoolAddress,
    address _priceFeedAddress,
    address _debtTokenManagerAddress,
    address _collTokenManagerAddress
  ) external onlyOwner {
    checkContract(_troveManagerAddress);
    checkContract(_storagePoolAddress);
    checkContract(_priceFeedAddress);
    checkContract(_debtTokenManagerAddress);
    checkContract(_collTokenManagerAddress);

    troveManager = ITroveManager(_troveManagerAddress);
    emit TroveManagerAddressChanged(_troveManagerAddress);

    storagePool = IStoragePool(_storagePoolAddress);
    emit StoragePoolAddressChanged(_storagePoolAddress);

    priceFeed = IPriceFeed(_priceFeedAddress);
    emit PriceFeedAddressChanged(_priceFeedAddress);

    debtTokenManager = IDebtTokenManager(_debtTokenManagerAddress);
    emit DebtTokenManagerAddressChanged(_debtTokenManagerAddress);

    collTokenManager = ICollTokenManager(_collTokenManagerAddress);
    emit CollTokenManagerAddressChanged(_collTokenManagerAddress);

    renounceOwnership();
  }

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
    troveManager.updateBaseRateFromRedemption(vars.totalRedeemedStable, vars.totalStableSupplyAtStart);

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
    troveManager.applyPendingRewards(_borrower);

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

    // updating the troves stable debt and coll
    DebtTokenAmount[] memory debtDecrease = new DebtTokenAmount[](1);
    debtDecrease[0] = DebtTokenAmount(debtTokenManager.getStableCoin(), vars.stableCoinLot, 0);
    troveManager.decreaseTroveDebt(_borrower, debtDecrease);
    troveManager.increaseTroveColl(_borrower, vars.collLots);
    troveManager.updateStakeAndTotalStakes(outerVars.collTokenAddresses, _borrower);

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
    address stableCoinAddress = address(debtTokenManager.getStableCoin());

    // stable coin debt should always exists because of the gas comp
    TokenAmount[] memory troveDebt = troveManager.getTroveDebt(_borrower);
    for (uint i = 0; i < troveDebt.length; i++) {
      TokenAmount memory debtEntry = troveDebt[i];

      if (debtEntry.tokenAddress == stableCoinAddress) stableCoinEntry = debtEntry;
      troveDebtInStable += priceFeed.getUSDValue(debtEntry.tokenAddress, debtEntry.amount);
    }

    amounts = troveManager.getTroveColl(_borrower);
    for (uint i = 0; i < amounts.length; i++)
      troveCollInStable += priceFeed.getUSDValue(amounts[i].tokenAddress, amounts[i].amount);

    return (amounts, stableCoinEntry, troveCollInStable, troveDebtInStable);
  }

  function getRedemptionRate() public view override returns (uint) {
    return _calcRedemptionRate(troveManager.getBaseRate());
  }

  function getRedemptionRateWithDecay() public view override returns (uint) {
    return _calcRedemptionRate(troveManager.calcDecayedBaseRate());
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
}
