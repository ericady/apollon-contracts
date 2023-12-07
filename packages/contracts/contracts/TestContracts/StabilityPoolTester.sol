// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '../StabilityPool.sol';

contract StabilityPoolTester is StabilityPool {
  constructor(
    address _stabilityPoolManagerAddress,
    address _troveManagerAddress,
    address _depositTokenAddress
  ) StabilityPool(_stabilityPoolManagerAddress, _troveManagerAddress, _depositTokenAddress) {}

  function setCurrentScale(uint128 _currentScale) external {
    currentScale = _currentScale;
  }

  function setTotalDeposits(uint _totalDeposits) external {
    totalDeposits = _totalDeposits;
  }
}
