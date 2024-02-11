// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/math/Math.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';

import './Dependencies/LiquityBase.sol';
import './Dependencies/CheckContract.sol';

import './Interfaces/IReservePool.sol';
import './Interfaces/IStabilityPool.sol';
import './Interfaces/IStabilityPoolManager.sol';
import './Interfaces/IPriceFeed.sol';

contract ReservePool is LiquityBase, Ownable(msg.sender), CheckContract, IReservePool {
  string public constant NAME = 'ReservePool';

  address public stabilityPoolManagerAddress;
  IPriceFeed public priceFeed;

  IDebtToken public stableDebtToken;
  uint public relativeStableCap; // percentage of total issued stable coins

  IERC20 public govToken;
  uint public govReserveCap;

  function setAddresses(
    address _stabilityPoolManager,
    address _priceFeed,
    address _stableDebtTokenAddress,
    address _govTokenAddress,
    uint _relativeStableCap,
    uint _govReserveCap
  ) external onlyOwner {
    checkContract(_stabilityPoolManager);
    checkContract(_stableDebtTokenAddress);

    stabilityPoolManagerAddress = _stabilityPoolManager;
    priceFeed = IPriceFeed(_priceFeed);
    stableDebtToken = IDebtToken(_stableDebtTokenAddress);
    govToken = IERC20(_govTokenAddress);

    relativeStableCap = _relativeStableCap;
    govReserveCap = _govReserveCap;

    emit ReservePoolInitialized(_stabilityPoolManager, _priceFeed, _stableDebtTokenAddress, _govTokenAddress);
    emit ReserveCapChanged(_relativeStableCap, govReserveCap);
  }

  function setRelativeStableCap(uint _relativeStableCap) external onlyOwner {
    relativeStableCap = _relativeStableCap;
    emit ReserveCapChanged(relativeStableCap, govReserveCap);
  }

  function stableAmountUntilCap() external view returns (uint) {
    uint totalStableSupply = stableDebtToken.totalSupply();
    uint capTarget = (totalStableSupply * relativeStableCap) / DECIMAL_PRECISION;
    uint stableBalance = stableDebtToken.balanceOf(address(this));

    if (stableBalance >= capTarget) return 0;
    return capTarget - stableBalance;
  }

  function isGovReserveCapReached() external view returns (bool) {
    return govToken.balanceOf(address(this)) >= govReserveCap;
  }

  /**
   * @notice Withdraw reserves to stability pool to repay possible loss when offset debts
   * @dev Try to withdraw with gov tokens first, when not enough then stablecoins.
   * @param stabilityPool Address of stability pool
   * @param withdrawAmountInUSD USD value of amounts to withdraw (same as stable debt token amount)
   * @return usedGov Gov token amount of withdrawn
   * @return usedStable Stable token amount of withdrawn
   */
  function withdrawValue(
    address stabilityPool,
    uint withdrawAmountInUSD
  ) external returns (uint usedGov, uint usedStable) {
    _requireCallerIsStabilityPoolManager();

    //  todo...
    //    uint govDecimal = IERC20Metadata(address(govToken)).decimals();
    //    (uint govTokenPrice, ) = priceFeed.getPrice(address(govToken));
    //    usedGov = (withdrawAmountInUSD * 10 ** govDecimal) / govTokenPrice;
    //    usedGov = Math.min(usedGov, govToken.balanceOf(address(this)));
    //    govToken.transfer(stabilityPool, usedGov);
    //
    //    usedStable = withdrawAmountInUSD - (usedGov * govTokenPrice) / 10 ** govDecimal;
    usedStable = Math.min(usedStable, stableDebtToken.balanceOf(address(this)));
    stableDebtToken.transfer(stabilityPool, usedStable);

    emit WithdrewReserves(usedGov, usedStable);
  }

  function _requireCallerIsStabilityPoolManager() internal view {
    if (msg.sender != stabilityPoolManagerAddress) revert NotFromSPM();
  }
}
