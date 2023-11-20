// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './IDebtToken.sol';

// Common interface for the dToken Manager.
interface IDebtTokenManager {
  // --- Events ---

  event DebtTokenManagerInitialized(address _stabilityPoolManagerAddress);
  event DebtTokenAdded(address _debtTokenAddress);

  // --- Functions ---

  function getStableCoin() external view returns (IDebtToken);

  function getDebtToken(address _address) external view returns (IDebtToken);

  function getDebtTokenAddresses() external view returns (address[] memory);

  function addDebtToken(address _debtTokenAddress) external;
}
