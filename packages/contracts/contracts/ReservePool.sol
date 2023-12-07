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

  IStabilityPoolManager public stabilityPoolManager;
  IPriceFeed public priceFeed;

  IDebtToken public stableDebtToken;
  IERC20 public govToken;

  uint public stableReserveCap;
  uint public govReserveCap;

  function setAddresses(
    address _stabilityPoolManager,
    address _priceFeed,
    address _stableDebtTokenAddress,
    address _govTokenAddress,
    uint _stableReserveCap,
    uint _govReserveCap
  ) external onlyOwner {
    checkContract(_stabilityPoolManager);
    checkContract(_stableDebtTokenAddress);

    stabilityPoolManager = IStabilityPoolManager(_stabilityPoolManager);
    priceFeed = IPriceFeed(_priceFeed);
    stableDebtToken = IDebtToken(_stableDebtTokenAddress);
    govToken = IERC20(_govTokenAddress);

    stableReserveCap = _stableReserveCap;
    govReserveCap = _govReserveCap;

    emit ReservePoolInitialized(_stabilityPoolManager, _priceFeed, _stableDebtTokenAddress, _govTokenAddress);
    emit ReserveCapChanged(stableReserveCap, govReserveCap);
  }

  function setReserveCap(uint newStableReserveCap, uint newGovReserveCap) external onlyOwner {
    stableReserveCap = newStableReserveCap;
    govReserveCap = newGovReserveCap;
    emit ReserveCapChanged(newStableReserveCap, govReserveCap);

    uint stableBal = stableDebtToken.balanceOf(address(this));
    uint govBal = govToken.balanceOf(address(this));
    uint stableOffset = stableBal > newStableReserveCap ? stableBal - newStableReserveCap : 0;
    uint govOffset = govBal > newGovReserveCap ? govBal - newGovReserveCap : 0;
    if (stableOffset > 0 || govOffset > 0) {
      address[] memory collTokens = new address[](2);
      collTokens[0] = address(govToken);
      collTokens[1] = address(stableDebtToken);
      RemainingStability[] memory remainingStabilities = stabilityPoolManager.getRemainingStability(collTokens);
      for (uint i = 0; i < remainingStabilities.length; i++) {
        remainingStabilities[i].collGained[0].amount += govOffset / remainingStabilities.length;
        remainingStabilities[i].collGained[1].amount += stableOffset / remainingStabilities.length;
      }
      stabilityPoolManager.offset(remainingStabilities);
    }
  }

  function isReserveCapReached() external view returns (bool stableCapReached, bool govCapReached) {
    stableCapReached = stableDebtToken.balanceOf(address(this)) >= stableReserveCap;
    govCapReached = govToken.balanceOf(address(this)) >= govReserveCap;
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

    uint govDecimal = IERC20Metadata(address(govToken)).decimals();
    uint govTokenPrice = priceFeed.getPrice(address(govToken));
    usedGov = (withdrawAmountInUSD * 10 ** govDecimal) / govTokenPrice;
    usedGov = Math.min(usedGov, govToken.balanceOf(address(this)));
    govToken.transfer(stabilityPool, usedGov);

    usedStable = withdrawAmountInUSD - (usedGov * govTokenPrice) / 10 ** govDecimal;
    usedStable = Math.min(usedStable, stableDebtToken.balanceOf(address(this)));
    stableDebtToken.transfer(stabilityPool, usedStable);

    emit WithdrewReserves(usedGov, usedStable);
  }

  function _requireCallerIsStabilityPoolManager() internal view {
    if (msg.sender != address(stabilityPoolManager)) revert NotFromSPM();
  }
}
