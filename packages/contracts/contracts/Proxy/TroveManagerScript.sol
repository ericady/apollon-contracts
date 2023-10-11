// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '../Dependencies/CheckContract.sol';
import '../Interfaces/ITroveManager.sol';

contract TroveManagerScript is CheckContract {
  string public constant NAME = 'TroveManagerScript';

  ITroveManager immutable troveManager;

  constructor(ITroveManager _troveManager) {
    checkContract(address(_troveManager));
    troveManager = _troveManager;
  }

  function redeemCollateral(
    uint _stableCoinAmount,
    uint _maxFeePercentage,
    address[] memory _sourceTroves
  ) external returns (uint) {
    troveManager.redeemCollateral(_stableCoinAmount, _maxFeePercentage, _sourceTroves);
  }
}
