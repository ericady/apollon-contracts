// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './IDebtToken.sol';

// Common interface for the dToken Manager.
interface IDebtTokenManager {
  // --- Events ---

  event DebtTokenManagerInitialized(address _stabilityPoolManagerAddress, address _priceFeedAddress);
  event DebtTokenAdded(address _debtTokenAddress);

  // --- Custom Errors ---

  error InvalidDebtToken();
  error SymbolAlreadyExists();
  error StableCoinAlreadyExists();

  // --- Functions ---

  function getStableCoin() external view returns (IDebtToken);

  function isDebtToken(address _address) external view returns (bool);

  function getDebtToken(address _address) external view returns (IDebtToken);

  function getDebtTokenAddresses() external view returns (address[] memory);

  function addDebtToken(address _debtTokenAddress, uint _tellorOracleId) external;
}
