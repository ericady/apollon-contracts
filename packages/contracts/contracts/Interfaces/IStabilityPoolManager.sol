// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './IBBase.sol';

interface IStabilityPoolManager is IBBase {
  event TroveManagerAddressChanged(address _newTroveManagerAddress);
  event PriceFeedAddressChanged(address _newPriceFeedAddress);
  event StoragePoolAddressChanged(address _newStoragePoolAddress);
  event DebtTokenManagerAddressChanged(address _debtTokenManagerAddress);

  event StabilityPoolAdded(IStabilityPool _stabilityPool);

  function getRemainingStability(
    address[] memory collTokenAddresses
  ) external view returns (RemainingStability[] memory);

  function addStabilityPool(IDebtToken _debtToken) external;
}
