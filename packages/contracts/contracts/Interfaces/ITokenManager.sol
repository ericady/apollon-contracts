// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './IBase.sol';
import './IDebtToken.sol';

// Common interface for the dToken Manager.
interface ITokenManager is IBase {
  // --- Events ---

  event TokenManagerInitialized(address _stabilityPoolManagerAddress, address _priceFeedAddress);
  event DebtTokenAdded(address _debtTokenAddress);
  event CollTokenAdded(address _tokenAddress, bool _isGovToken);

  // --- Custom Errors ---

  error InvalidDebtToken();
  error SymbolAlreadyExists();
  error StableCoinAlreadyExists();
  error GovTokenAlreadyDefined();

  // --- Functions ---

  function getStableCoin() external view returns (IDebtToken);

  function isDebtToken(address _address) external view returns (bool);

  function getDebtToken(address _address) external view returns (IDebtToken);

  function getDebtTokenAddresses() external view returns (address[] memory);

  function addDebtToken(address _debtTokenAddress, uint _tellorOracleId) external;

  function getCollTokenAddresses() external view returns (address[] memory);

  function getGovTokenAddress() external view returns (address);

  function addCollToken(address _tokenAddress, uint _tellorOracleId, bool _isGovToken) external;
}
