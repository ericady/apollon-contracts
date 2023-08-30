// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '../Dependencies/CheckContract.sol';
import '../Interfaces/IStabilityPool.sol';

contract StabilityPoolScript is CheckContract {
  string public constant NAME = 'StabilityPoolScript';

  IStabilityPool immutable stabilityPool;

  constructor(IStabilityPool _stabilityPool) public {
    checkContract(address(_stabilityPool));
    stabilityPool = _stabilityPool;
  }

  function provideToSP(uint _amount) external {
    stabilityPool.provideToSP(_amount);
  }

  function withdrawFromSP(uint _amount) external {
    stabilityPool.withdrawFromSP(_amount);
  }

  function withdrawGains() external {
    stabilityPool.withdrawGains();
  }
}
