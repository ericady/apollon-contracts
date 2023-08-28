// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface ICollTokenManager {
  // --- Events ---

  event CollTokenAdded(address _collTokenAddress);
  event PriceFeedAddressChanged(address _newPriceFeedAddress);

  // --- Functions ---

  function getCollTokenAddresses() external view returns (address[] memory);

  function addCollToken(address _tokenAddress) external;
}
