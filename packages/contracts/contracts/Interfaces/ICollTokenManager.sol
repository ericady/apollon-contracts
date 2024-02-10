// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface ICollTokenManager {
  // --- Events ---
  event CollTokenManagerInitialized(address _priceFeedAddress);
  event CollTokenAdded(address _collTokenAddress);

  // --- Custom Errors ---
  error TokenAlreadyAdded();

  // --- Functions ---

  function getCollTokenAddresses() external view returns (address[] memory);

  function addCollToken(address _tokenAddress, uint _tellorOracleId) external;
}
