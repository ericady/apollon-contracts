// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/access/Ownable.sol';

import './Dependencies/LiquityBase.sol';
import './Dependencies/CheckContract.sol';

import './Interfaces/IReservePool.sol';
import './Interfaces/IStabilityPool.sol';
import './Interfaces/IStabilityPoolManager.sol';
import './Interfaces/IDebtToken.sol';

contract ReservePool is LiquityBase, Ownable, CheckContract, IReservePool {
  string public constant NAME = 'ReservePool';

  IStabilityPool public stabilityPool;
  IStabilityPoolManager public stabilityPoolManager;
  IDebtToken public stableDebtToken;

  uint public reserveCap;

  constructor(
    address _stabilityPoolAddress,
    address _stabilityPoolManager,
    address _stableDebtTokenAddress,
    uint _reserveCap
  ) {
    checkContract(_stabilityPoolAddress);
    checkContract(_stabilityPoolManager);
    checkContract(_stableDebtTokenAddress);

    stabilityPool = IStabilityPool(_stabilityPoolAddress);
    stabilityPoolManager = IStabilityPoolManager(_stabilityPoolManager);
    stableDebtToken = IDebtToken(_stableDebtTokenAddress);

    reserveCap = _reserveCap;

    emit ReserveCapChanged(reserveCap);
    emit ReservePoolInitialized(_stabilityPoolAddress, _stabilityPoolManager, _stableDebtTokenAddress);
  }

  function setReserveCap(uint newReserveCap) external onlyOwner {
    reserveCap = newReserveCap;
    emit ReserveCapChanged(newReserveCap);
  }

  function isReserveCapReached() external view returns (bool) {
    return stableDebtToken.balanceOf(address(this)) >= reserveCap;
  }

  function repayStabilityPool() external onlyOwner {
    TokenAmount[] memory amounts = new TokenAmount[](1);
    amounts[0].tokenAddress = address(stableDebtToken);
    amounts[0].amount = stableDebtToken.balanceOf(address(this));
    stabilityPoolManager.provideStability(amounts);
  }
}
