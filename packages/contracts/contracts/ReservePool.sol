// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/access/Ownable.sol';

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
  }

  function isReserveCapReached() external view returns (bool stableCapReached, bool govCapReached) {
    stableCapReached = stableDebtToken.balanceOf(address(this)) >= stableReserveCap;
    // TODO: enable when gov token implemented
    // govCapReached = govToken.balanceOf(address(this)) >= govReserveCap;
  }

  /**
   * @notice Withdraw reserves to stability pool to repay possible loss when offset debts
   * @dev Withdraw 50:50 reserves of stable tokens and gov tokens
   * @param stabilityPool Address of stability pool
   * @param withdrawAmount USD value of amounts to withdraw (same as stable debt token amount)
   * @return repaidReserves TokenAmount array of reserves repaid, [stableCoin, govToken]
   */
  function withdrawValue(
    address stabilityPool,
    uint withdrawAmount
  ) external returns (TokenAmount[] memory repaidReserves) {
    _requireCallerIsStabilityPoolManager();

    repaidReserves = new TokenAmount[](1);
    repaidReserves[0].tokenAddress = address(stableDebtToken);

    uint stableAmount = withdrawAmount / 2;
    if (stableDebtToken.balanceOf(address(this)) > stableAmount) {
      stableDebtToken.transfer(stabilityPool, stableAmount);
      repaidReserves[0].amount = stableAmount;
    }

    // TODO: enable when gov token implemented
    // repaidReserves[1].tokenAddress = address(govToken);
    // uint govAmount = (stableAmount * 1e18) / priceFeed.getPrice(address(govToken));
    // if (govToken.balanceOf(address(this)) > govAmount) {
    //   govToken.transfer(stabilityPool, govAmount);
    //   repaidReserves[0].amount = govAmount;
    // }
  }

  function _requireCallerIsStabilityPoolManager() internal view {
    if (msg.sender != address(stabilityPoolManager)) revert NotFromSPM();
  }
}
