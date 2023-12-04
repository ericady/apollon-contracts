// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/math/Math.sol';

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
   * @param withdrawAmount USD value of amounts to withdraw (same as stable debt token amount)
   * @return repaidReserves TokenAmount array of reserves repaid, [govToken, stablecoin]
   */
  function withdrawValue(
    address stabilityPool,
    uint withdrawAmount
  ) external returns (TokenAmount[] memory repaidReserves) {
    _requireCallerIsStabilityPoolManager();

    repaidReserves = new TokenAmount[](2);
    repaidReserves[0].tokenAddress = address(govToken);
    repaidReserves[1].tokenAddress = address(stableDebtToken);

    uint govTokenPrice = priceFeed.getPrice(address(govToken));
    uint govAmount = (withdrawAmount * 1e18) / govTokenPrice;
    govAmount = Math.min(govAmount, govToken.balanceOf(address(this)));
    govToken.transfer(stabilityPool, govAmount);
    repaidReserves[0].amount = govAmount;

    uint stableAmount = withdrawAmount - (govAmount * govTokenPrice) / 1e18;
    stableAmount = Math.min(stableAmount, stableDebtToken.balanceOf(address(this)));
    stableDebtToken.transfer(stabilityPool, stableAmount);
    repaidReserves[0].amount = stableAmount;

    emit WithdrewReserves(govAmount, stableAmount);
  }

  function _requireCallerIsStabilityPoolManager() internal view {
    if (msg.sender != address(stabilityPoolManager)) revert NotFromSPM();
  }
}
