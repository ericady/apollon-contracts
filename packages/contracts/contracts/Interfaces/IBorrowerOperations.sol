// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './IBBase.sol';

// Common interface for the Trove Manager.
interface IBorrowerOperations is IBBase {
  // --- Events ---

  event TroveManagerAddressChanged(address _newTroveManagerAddress);
  event StoragePoolAddressChanged(address _storagePoolAddress);
  event StabilityPoolAddressChanged(address _stabilityPoolAddress);
  event PriceFeedAddressChanged(address _newPriceFeedAddress);
  event DebtTokenManagerAddressChanged(address _debtTokenManagerAddress);
  event CollTokenManagerAddressChanged(address _collTokenManagerAddress);

  event TroveCreated(address indexed _borrower, uint arrayIndex);
  event TroveUpdated(address indexed _borrower, uint _debt, uint _coll, uint stake);
  event LUSDBorrowingFeePaid(address indexed _borrower, uint _LUSDFee);

  // --- Functions ---

  function openTrove(TokenAmount[] memory _colls) external;

  function addColl(TokenAmount[] memory _colls) external;

  function withdrawColl(TokenAmount[] memory _colls) external;

  function increaseDebt(TokenAmount[] memory _debts, uint _maxFeePercentage) external;

  function repayDebt(TokenAmount[] memory _debts) external;

  function closeTrove() external;

  function getCompositeDebt(DebtTokenAmount[] memory _debts) external pure returns (uint);
}
