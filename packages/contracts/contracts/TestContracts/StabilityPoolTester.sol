// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '../StabilityPool.sol';

contract StabilityPoolTester is StabilityPool {
  function setCurrentScale(uint128 _currentScale) external {
    currentScale = _currentScale;
  }

  function setTotalDeposits(uint _totalDeposits) external {
    totalDeposits = _totalDeposits;
  }
}
