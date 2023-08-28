// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './Dependencies/Ownable.sol';
import './Dependencies/CheckContract.sol';
import './Interfaces/ICollTokenManager.sol';

contract DebtTokenManager is Ownable, CheckContract, ICollTokenManager {
  string public constant NAME = 'CollTokenManager';

  address public priceFeedAddress;

  // --- Data structures ---

  address[] public collTokenAddresses;

  // --- Dependency setter ---

  function setAddresses(address _priceFeedAddress) external onlyOwner {
    checkContract(_priceFeedAddress);

    priceFeedAddress = _priceFeedAddress;
    emit PriceFeedAddressChanged(_priceFeedAddress);

    _renounceOwnership();
  }

  // --- Getters ---

  function getCollTokenAddresses() external view override returns (address[] memory) {
    return collTokenAddresses;
  }

  // --- Setters ---

  // todo (flat) owner only, should be also callable after deployment
  // todo price oracle id missing...
  function addCollToken(address _tokenAddress) external override onlyOwner {
    for (uint i = 0; i < collTokenAddresses.length; i++)
      require(collTokenAddresses[i] != _tokenAddress, 'CollTokenManager: token already added');

    collTokenAddresses.push(_tokenAddress);
    emit CollTokenAdded(_tokenAddress);
  }
}
