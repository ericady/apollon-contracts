// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './IDebtToken.sol';

// Common interface for the dToken Manager.
interface IDebtTokenManager {
  // --- Events ---

  event DebtTokenAdded(IDebtToken _debtToken);
  event TroveManagerAddressChanged(address _troveManagerAddress);
  event StabilityPoolManagerAddressChanged(address _newStabilityPoolAddress);
  event BorrowerOperationsAddressChanged(address _newBorrowerOperationsAddress);
  event PriceFeedAddressChanged(address _newPriceFeedAddress);

  // --- Functions ---

  function getStableCoin() external view returns (IDebtToken);

  function getDebtToken(address _address) external view returns (IDebtToken);

  function getDebtTokenAddresses() external view returns (address[] memory);

  function addDebtToken(address _debtTokenAddress) external;
}
