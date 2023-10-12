// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../Dependencies/LiquityMath.sol';
import '../Interfaces/IBorrowerOperations.sol';
import '../Interfaces/ITroveManager.sol';
import '../Interfaces/IStabilityPool.sol';
import '../Interfaces/IPriceFeed.sol';
import './BorrowerOperationsScript.sol';
import './ETHTransferScript.sol';

contract BorrowerWrappersScript is BorrowerOperationsScript, ETHTransferScript {
  string public constant NAME = 'BorrowerWrappersScript';

  ITroveManager immutable troveManager;
  IPriceFeed immutable priceFeed;

  //  IERC20 immutable anyToken;

  constructor(
    address _borrowerOperationsAddress,
    address _troveManagerAddress,
    address _priceFeedAddress
  ) BorrowerOperationsScript(IBorrowerOperations(_borrowerOperationsAddress)) {
    checkContract(_troveManagerAddress);
    ITroveManager troveManagerCached = ITroveManager(_troveManagerAddress);
    troveManager = troveManagerCached;

    checkContract(_priceFeedAddress);
    IPriceFeed priceFeedCached = IPriceFeed(_priceFeedAddress);
    priceFeed = priceFeedCached;

    //    address lusdTokenCached = address(troveManagerCached.lusdToken());
    //    checkContract(lusdTokenCached);
    //    lusdToken = IERC20(lusdTokenCached);
  }

  //  function claimCollateralAndOpenTrove(
  //    uint _maxFee,
  //    uint _LUSDAmount,
  //    address _upperHint,
  //    address _lowerHint
  //  ) external payable {
  //    uint balanceBefore = address(this).balance;
  //
  //    // Claim collateral
  //    borrowerOperations.claimCollateral();
  //
  //    uint balanceAfter = address(this).balance;
  //
  //    // already checked in CollSurplusPool
  //    assert(balanceAfter > balanceBefore);
  //
  //    uint totalCollateral = balanceAfter.sub(balanceBefore).add(msg.value);
  //
  //    // Open trove with obtained collateral, plus collateral sent by user
  //    borrowerOperations.openTrove{ value: totalCollateral }(_maxFee, _LUSDAmount, _upperHint, _lowerHint);
  //  }
  //
  //  function claimSPRewardsAndRecycle(uint _maxFee, address _upperHint, address _lowerHint) external {
  //    uint collBalanceBefore = address(this).balance;
  //    uint lqtyBalanceBefore = lqtyToken.balanceOf(address(this));
  //
  //    // Claim rewards
  //    stabilityPool.withdrawFromSP(0);
  //
  //    uint collBalanceAfter = address(this).balance;
  //    uint lqtyBalanceAfter = lqtyToken.balanceOf(address(this));
  //    uint claimedCollateral = collBalanceAfter.sub(collBalanceBefore);
  //
  //    // Add claimed ETH to trove, get more LUSD and stake it into the Stability Pool
  //    if (claimedCollateral > 0) {
  //      _requireUserHasTrove(address(this));
  //      uint LUSDAmount = _getNetLUSDAmount(claimedCollateral);
  //      borrowerOperations.adjustTrove{ value: claimedCollateral }(_maxFee, 0, LUSDAmount, true, _upperHint, _lowerHint);
  //      // Provide withdrawn LUSD to Stability Pool
  //      if (LUSDAmount > 0) {
  //        stabilityPool.provideToSP(LUSDAmount, address(0));
  //      }
  //    }
  //
  //    // Stake claimed LQTY
  //    uint claimedLQTY = lqtyBalanceAfter.sub(lqtyBalanceBefore);
  //    //        if (claimedLQTY > 0) {
  //    //            lqtyStaking.stake(claimedLQTY);
  //    //        }
  //  }
  //
  //  function claimStakingGainsAndRecycle(uint _maxFee, address _upperHint, address _lowerHint) external {
  //    uint collBalanceBefore = address(this).balance;
  //    uint lusdBalanceBefore = lusdToken.balanceOf(address(this));
  //    uint lqtyBalanceBefore = lqtyToken.balanceOf(address(this));
  //
  //    // Claim gains
  //    //        lqtyStaking.unstake(0);
  //
  //    uint gainedCollateral = address(this).balance.sub(collBalanceBefore); // stack too deep issues :'(
  //    uint gainedLUSD = lusdToken.balanceOf(address(this)).sub(lusdBalanceBefore);
  //
  //    uint netLUSDAmount;
  //    // Top up trove and get more LUSD, keeping ICR constant
  //    if (gainedCollateral > 0) {
  //      _requireUserHasTrove(address(this));
  //      netLUSDAmount = _getNetLUSDAmount(gainedCollateral);
  //      borrowerOperations.adjustTrove{ value: gainedCollateral }(
  //        _maxFee,
  //        0,
  //        netLUSDAmount,
  //        true,
  //        _upperHint,
  //        _lowerHint
  //      );
  //    }
  //
  //    uint totalLUSD = gainedLUSD.add(netLUSDAmount);
  //    if (totalLUSD > 0) {
  //      stabilityPool.provideToSP(totalLUSD, address(0));
  //
  //      // Providing to Stability Pool also triggers LQTY claim, so stake it if any
  //      uint lqtyBalanceAfter = lqtyToken.balanceOf(address(this));
  //      uint claimedLQTY = lqtyBalanceAfter.sub(lqtyBalanceBefore);
  //      //            if (claimedLQTY > 0) {
  //      //                lqtyStaking.stake(claimedLQTY);
  //      //            }
  //    }
  //  }
  //
  //  function _getNetLUSDAmount(uint _collateral) internal returns (uint) {
  //    uint price = priceFeed.fetchPrice();
  //    uint ICR = troveManager.getCurrentICR(address(this), price);
  //
  //    uint LUSDAmount = _collateral.mul(price).div(ICR);
  //    uint borrowingRate = troveManager.getBorrowingRateWithDecay();
  //    uint netDebt = LUSDAmount.mul(LiquityMath.DECIMAL_PRECISION).div(LiquityMath.DECIMAL_PRECISION.add(borrowingRate));
  //
  //    return netDebt;
  //  }

  function _requireUserHasTrove(address _depositor) internal view {
    require(troveManager.getTroveStatus(_depositor) == 1, 'BorrowerWrappersScript: caller must have an active trove');
  }
}
