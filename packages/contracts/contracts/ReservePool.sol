// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/access/Ownable.sol';

import './Dependencies/LiquityBase.sol';
import './Dependencies/CheckContract.sol';

import './Interfaces/IReservePool.sol';
import './Interfaces/IStabilityPool.sol';
import './Interfaces/IStabilityPoolManager.sol';

contract ReservePool is LiquityBase, Ownable, CheckContract, IReservePool {
  string public constant NAME = 'ReservePool';

  IStabilityPoolManager public stabilityPoolManager;
  IDebtToken public stableDebtToken;

  uint public reserveCap;

  constructor(address _stabilityPoolManager, address _stableDebtTokenAddress, uint _reserveCap) {
    checkContract(_stabilityPoolManager);
    checkContract(_stableDebtTokenAddress);

    stabilityPoolManager = IStabilityPoolManager(_stabilityPoolManager);
    stableDebtToken = IDebtToken(_stableDebtTokenAddress);

    reserveCap = _reserveCap;

    emit ReserveCapChanged(reserveCap);
    emit ReservePoolInitialized(_stabilityPoolManager, _stableDebtTokenAddress);
  }

  function setReserveCap(uint newReserveCap) external onlyOwner {
    reserveCap = newReserveCap;
    emit ReserveCapChanged(newReserveCap);
  }

  function isReserveCapReached() external view returns (bool) {
    return stableDebtToken.balanceOf(address(this)) >= reserveCap;
  }

  function withdrawValue(address stabilityPool, uint withdrawAmount) external {
    _requireCallerIsStabilityPoolManager();

    stableDebtToken.transfer(stabilityPool, withdrawAmount);
  }

  function _requireCallerIsStabilityPoolManager() internal view {
    if (msg.sender != address(stabilityPoolManager)) revert NotFromSPM();
  }
}
