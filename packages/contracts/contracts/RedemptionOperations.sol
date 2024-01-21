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
import './Interfaces/ISortedTroves.sol';

contract RedemptionOperations is LiquityBase, Ownable(msg.sender), CheckContract, IRedemptionOperations {
  string public constant NAME = 'RedemptionOperations';

  // --- Connected contract declarations ---

  ITroveManager public troveManager;
  IDebtTokenManager public debtTokenManager;
  ICollTokenManager public collTokenManager;
  IStoragePool public storagePool;
  IPriceFeed public priceFeed;
  ISortedTroves public sortedTroves;

  // --- Data structures ---

  struct RedemptionVariables {
    address[] collTokenAddresses;
    RedemptionCollAmount[] totalCollDrawn;
    //
    uint totalStableSupplyAtStart;
    uint totalRedeemedStable;
  }

  struct SingleRedemptionVariables {
    uint stableCoinLot;
    TokenAmount[] collLots;
    //
    TokenAmount stableCoinEntry;
    uint troveCollInUSD;
    uint troveDebtInUSD;
    //
    bool cancelled;
  }

  // --- Dependency setter ---

  function setAddresses(
    address _troveManagerAddress,
    address _storagePoolAddress,
    address _priceFeedAddress,
    address _debtTokenManagerAddress,
    address _collTokenManagerAddress,
    address _sortedTrovesAddress
  ) external onlyOwner {
    checkContract(_troveManagerAddress);
    checkContract(_storagePoolAddress);
    checkContract(_priceFeedAddress);
    checkContract(_debtTokenManagerAddress);
    checkContract(_collTokenManagerAddress);
    checkContract(_sortedTrovesAddress);

    troveManager = ITroveManager(_troveManagerAddress);
    storagePool = IStoragePool(_storagePoolAddress);
    priceFeed = IPriceFeed(_priceFeedAddress);
    debtTokenManager = IDebtTokenManager(_debtTokenManagerAddress);
    collTokenManager = ICollTokenManager(_collTokenManagerAddress);
    sortedTroves = ISortedTroves(_sortedTrovesAddress);

    emit RedemptionOperationsInitialized(
      _troveManagerAddress,
      _storagePoolAddress,
      _priceFeedAddress,
      _debtTokenManagerAddress,
      _collTokenManagerAddress,
      _sortedTrovesAddress
    );

    renounceOwnership();
  }

  function redeemCollateral(
    uint _stableCoinAmount,
    uint _maxFeePercentage,
    RedeemIteration[] memory _iterations
  ) external override {
    IDebtToken stableCoin = debtTokenManager.getStableCoin();
    RedemptionVariables memory vars;
    vars.collTokenAddresses = collTokenManager.getCollTokenAddresses();
    vars.totalStableSupplyAtStart =
      storagePool.getValue(address(stableCoin), false, PoolType.Active) +
      storagePool.getValue(address(stableCoin), false, PoolType.Default);

    if (_stableCoinAmount == 0) revert ZeroAmount();
    if (_maxFeePercentage < REDEMPTION_FEE_FLOOR || _maxFeePercentage > DECIMAL_PRECISION)
      revert InvalidMaxFeePercent();
    if (_stableCoinAmount > stableCoin.balanceOf(msg.sender)) revert ExceedDebtBalance();

    (, uint TCR, , ) = storagePool.checkRecoveryMode();
    if (TCR < MCR) revert LessThanMCR();

    // Confirm redeemer's balance is less than total stable coin supply
    assert(stableCoin.balanceOf(msg.sender) <= vars.totalStableSupplyAtStart);

    // seed drawn coll
    vars.totalCollDrawn = new RedemptionCollAmount[](vars.collTokenAddresses.length);
    for (uint i = 0; i < vars.totalCollDrawn.length; i++) vars.totalCollDrawn[i].collToken = vars.collTokenAddresses[i];

    for (uint i = 0; i < _iterations.length; i++) {
      RedeemIteration memory iteration = _iterations[i];
      if (!_isValidRedemptionHint(iteration.trove)) revert InvalidRedemptionHint();

      SingleRedemptionVariables memory singleRedemption = _redeemCollateralFromTrove(
        vars,
        _stableCoinAmount - vars.totalRedeemedStable,
        iteration
      );

      // Partial redemption was cancelled (out-of-date hint, or new net debt < minimum), therefore we could not redeem from the last Trove
      if (singleRedemption.cancelled) break;

      // sum up redeemed stable and drawn collateral
      vars.totalRedeemedStable += singleRedemption.stableCoinLot;
      for (uint a = 0; a < singleRedemption.collLots.length; a++) {
        for (uint b = 0; b < vars.totalCollDrawn.length; b++) {
          if (singleRedemption.collLots[a].tokenAddress != vars.collTokenAddresses[b]) continue;

          vars.totalCollDrawn[b].drawn += singleRedemption.collLots[a].amount;
          break;
        }
      }

      // we have redeemed enough
      if (_stableCoinAmount - vars.totalRedeemedStable == 0) break;
    }

    if (vars.totalRedeemedStable == 0) revert NoRedeems();

    // Decay the baseRate due to time passed, and then increase it according to the size of this redemption.
    // Use the saved total stable supply value, from before it was reduced by the redemption.
    troveManager.updateBaseRateFromRedemption(vars.totalRedeemedStable, vars.totalStableSupplyAtStart);

    // Calculate the redemption fee
    for (uint i = 0; i < vars.totalCollDrawn.length; i++) {
      RedemptionCollAmount memory collEntry = vars.totalCollDrawn[i];

      collEntry.redemptionFee = _getRedemptionFee(collEntry.drawn);
      collEntry.sendToRedeemer = collEntry.drawn - collEntry.redemptionFee;

      _requireUserAcceptsFee(collEntry.redemptionFee, collEntry.drawn, _maxFeePercentage);
    }

    // Burn the total stable coin that is cancelled with debt, and send the redeemed coll to msg.sender
    storagePool.subtractValue(address(stableCoin), false, PoolType.Active, vars.totalRedeemedStable);
    stableCoin.burn(msg.sender, vars.totalRedeemedStable);

    // transfer the drawn collateral to the redeemer
    for (uint i = 0; i < vars.totalCollDrawn.length; i++) {
      RedemptionCollAmount memory collEntry = vars.totalCollDrawn[i];
      if (collEntry.sendToRedeemer == 0) continue;

      storagePool.withdrawalValue(
        msg.sender,
        vars.collTokenAddresses[i],
        true,
        PoolType.Active,
        collEntry.sendToRedeemer
      );

      // todo jelly handover
      // // Send the fee to the gov token staking contract
      // contractsCache.activePool.sendETH(address(contractsCache.lqtyStaking), vars.ETHFee);
    }

    emit SuccessfulRedemption(_stableCoinAmount, vars.totalRedeemedStable, vars.totalCollDrawn);
  }

  function _isValidRedemptionHint(address _redemptionHint) internal view returns (bool) {
    (uint hintCR, ) = troveManager.getCurrentICR(_redemptionHint);
    if (
      _redemptionHint == address(0) || !sortedTroves.contains(_redemptionHint) || hintCR < MCR // should be liquidated, not redeemed from
    ) return false;

    address nextTrove = sortedTroves.getNext(_redemptionHint);
    (uint nextTroveCR, ) = troveManager.getCurrentICR(nextTrove);
    return nextTrove == address(0) || nextTroveCR < MCR;
  }

  // Redeem as much collateral as possible from _borrower's Trove in exchange for stable coin up to _redeemMaxAmount
  function _redeemCollateralFromTrove(
    RedemptionVariables memory outerVars,
    uint _redeemMaxAmount,
    RedeemIteration memory _iteration
  ) internal returns (SingleRedemptionVariables memory vars) {
    troveManager.applyPendingRewards(_iteration.trove);
    (vars.collLots, vars.stableCoinEntry, vars.troveCollInUSD, vars.troveDebtInUSD) = _prepareTroveRedemption(
      _iteration.trove
    );

    // Determine the remaining amount (lot) to be redeemed, capped by the entire debt of the Trove minus the liquidation reserve
    vars.stableCoinLot = LiquityMath._min(_redeemMaxAmount, vars.stableCoinEntry.amount - STABLE_COIN_GAS_COMPENSATION);

    // calculate the coll lot
    uint newCollInUSD = vars.troveCollInUSD;
    for (uint i = 0; i < vars.collLots.length; i++) {
      TokenAmount memory collEntry = vars.collLots[i];

      uint collEntryInUSD = priceFeed.getUSDValue(collEntry.tokenAddress, collEntry.amount);
      uint collToRedeemInUSD = (vars.stableCoinLot * collEntryInUSD) / vars.troveCollInUSD;
      collEntry.amount = priceFeed.getAmountFromUSDValue(collEntry.tokenAddress, collToRedeemInUSD);
      newCollInUSD -= collToRedeemInUSD;
    }

    /*
     * If the provided hint is out of date, we bail since trying to reinsert without a good hint will almost
     * certainly result in running out of gas.
     */
    uint newCR = LiquityMath._computeCR(newCollInUSD, vars.troveDebtInUSD - vars.stableCoinLot);
    if (newCR != _iteration.expectedCR) {
      vars.cancelled = true;
      return vars;
    }
    sortedTroves.reInsert(_iteration.trove, newCR, _iteration.upperHint, _iteration.lowerHint);

    // updating the troves stable debt and coll
    DebtTokenAmount[] memory debtDecrease = new DebtTokenAmount[](1);
    debtDecrease[0] = DebtTokenAmount(debtTokenManager.getStableCoin(), vars.stableCoinLot, 0);
    troveManager.decreaseTroveDebt(_iteration.trove, debtDecrease);
    troveManager.increaseTroveColl(_iteration.trove, vars.collLots);
    troveManager.updateStakeAndTotalStakes(outerVars.collTokenAddresses, _iteration.trove);

    emit RedeemedFromTrove(_iteration.trove, vars.stableCoinLot, vars.collLots);
    return vars;
  }

  function _prepareTroveRedemption(
    address _borrower
  )
    internal
    view
    returns (TokenAmount[] memory amounts, TokenAmount memory stableCoinEntry, uint troveCollInUSD, uint troveDebtInUSD)
  {
    address stableCoinAddress = address(debtTokenManager.getStableCoin());

    // stable coin debt should always exists because of the gas comp
    TokenAmount[] memory troveDebt = troveManager.getTroveDebt(_borrower);
    for (uint i = 0; i < troveDebt.length; i++) {
      TokenAmount memory debtEntry = troveDebt[i];

      if (debtEntry.tokenAddress == stableCoinAddress) stableCoinEntry = debtEntry;
      troveDebtInUSD += priceFeed.getUSDValue(debtEntry.tokenAddress, debtEntry.amount);
    }

    amounts = troveManager.getTroveColl(_borrower);
    for (uint i = 0; i < amounts.length; i++)
      troveCollInUSD += priceFeed.getUSDValue(amounts[i].tokenAddress, amounts[i].amount);

    return (amounts, stableCoinEntry, troveCollInUSD, troveDebtInUSD);
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

  function _getRedemptionFee(uint _collDrawn) internal view returns (uint) {
    return _calcRedemptionFee(getRedemptionRate(), _collDrawn);
  }

  function getRedemptionFeeWithDecay(uint _collDrawn) external view override returns (uint) {
    return _calcRedemptionFee(getRedemptionRateWithDecay(), _collDrawn);
  }

  function _calcRedemptionFee(uint _redemptionRate, uint _collDrawn) internal pure returns (uint) {
    if (_collDrawn == 0) return 0;

    uint redemptionFee = (_redemptionRate * _collDrawn) / DECIMAL_PRECISION;

    // TroveManager: Fee would eat up all returned collateral
    if (redemptionFee >= _collDrawn) revert TooHighRedeemFee();
    return redemptionFee;
  }
}
