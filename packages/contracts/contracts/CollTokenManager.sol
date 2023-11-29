// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/access/Ownable.sol';
import './Dependencies/CheckContract.sol';
import './Interfaces/ICollTokenManager.sol';

contract CollTokenManager is Ownable(msg.sender), CheckContract, ICollTokenManager {
  string public constant NAME = 'CollTokenManager';

  address public priceFeedAddress;

  // --- Data structures ---

  address[] public collTokenAddresses;

  // --- Dependency setter ---

  function setAddresses(address _priceFeedAddress) external onlyOwner {
    checkContract(_priceFeedAddress);
    priceFeedAddress = _priceFeedAddress;
    emit CollTokenManagerInitialized(_priceFeedAddress);
  }

  // --- Getters ---

  function getCollTokenAddresses() external view override returns (address[] memory) {
    return collTokenAddresses;
  }

  // --- Setters ---

  // todo oracle id missing
  function addCollToken(address _tokenAddress) external override onlyOwner {
    for (uint i = 0; i < collTokenAddresses.length; i++)
      if (collTokenAddresses[i] == _tokenAddress) revert TokenAlreadyAdded();

    collTokenAddresses.push(_tokenAddress);
    emit CollTokenAdded(_tokenAddress);
  }
}
