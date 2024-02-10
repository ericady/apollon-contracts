// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/access/Ownable.sol';
import './Dependencies/CheckContract.sol';
import './Interfaces/ICollTokenManager.sol';
import './Interfaces/IPriceFeed.sol';

contract CollTokenManager is Ownable(msg.sender), CheckContract, ICollTokenManager {
  string public constant NAME = 'CollTokenManager';

  IPriceFeed public priceFeed;

  // --- Data structures ---

  address[] public collTokenAddresses;

  // --- Dependency setter ---

  function setAddresses(address _priceFeedAddress) external onlyOwner {
    checkContract(_priceFeedAddress);
    priceFeed = IPriceFeed(_priceFeedAddress);
    emit CollTokenManagerInitialized(_priceFeedAddress);
  }

  // --- Getters ---

  function getCollTokenAddresses() external view override returns (address[] memory) {
    return collTokenAddresses;
  }

  // --- Setters ---

  function addCollToken(address _tokenAddress, uint _tellorOracleId) external override onlyOwner {
    for (uint i = 0; i < collTokenAddresses.length; i++)
      if (collTokenAddresses[i] == _tokenAddress) revert TokenAlreadyAdded();

    collTokenAddresses.push(_tokenAddress);
    priceFeed.initiateNewOracleId(_tokenAddress, _tellorOracleId);
    emit CollTokenAdded(_tokenAddress);
  }
}
