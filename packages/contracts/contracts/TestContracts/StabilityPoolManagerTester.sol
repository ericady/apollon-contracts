// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '../StabilityPoolManager.sol';

contract StabilityPoolManagerTester is StabilityPoolManager {
  // DEBTTOKEN POOL TESTER PROXIES
  IDebtToken public debtToken;

  function setDebtToken(IDebtToken _debtToken) external {
    debtToken = _debtToken;
  }

  function testDebtToken_sendToPool(address _sender, address _poolAddress, uint256 _amount) external {
    debtToken.sendToPool(_sender, _poolAddress, _amount);
  }
}
