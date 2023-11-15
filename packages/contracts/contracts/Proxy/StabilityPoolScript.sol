// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '../Dependencies/CheckContract.sol';
import '../Interfaces/IStabilityPool.sol';

contract StabilityPoolScript is CheckContract {
  string public constant NAME = 'StabilityPoolScript';

  IStabilityPool immutable stabilityPool;

  constructor(IStabilityPool _stabilityPool) {
    checkContract(address(_stabilityPool));
    stabilityPool = _stabilityPool;
  }

  function provideToSP(address user, uint _amount) external {
    stabilityPool.provideToSP(user, _amount);
  }

  function withdrawFromSP(address user, uint _amount) external {
    stabilityPool.withdrawFromSP(user, _amount);
  }

  function withdrawGains(address user) external {
    stabilityPool.withdrawGains(user);
  }
}
