// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './IBBase.sol';

// Common interface for the Trove Manager.
interface IBorrowerOperations is IBBase {
  enum BorrowerOperation {
    openTrove,
    addColl,
    withdrawColl,
    increaseDebt,
    repayDebt,
    closeTrove
  }

  // --- Events ---

  event BorrowerOperationsInitialized(
    address _troveManagerAddress,
    address _storagePoolAddress,
    address _stabilityPoolAddress,
    address _priceFeedAddress,
    address _debtTokenManagerAddress,
    address _collTokenManagerAddress
  );
  event TroveCreated(address _borrower, uint arrayIndex);
  event TroveOperation(address _borrower, BorrowerOperation _operation, uint _paidBorrowingFeeInStable);

  // --- Custom Errors ---

  error NotFromStabilityPool();
  error CollWithdrawPermittedInRM();
  error ICR_lt_MCR();
  error ICR_lt_CCR();
  error TCR_lt_CCR();
  error ICRDecreasedInRM();
  error MaxFee_gt_100_InRM();
  error MaxFee_out_Range();
  error Repaid_gt_CurrentDebt();
  error TroveClosedOrNotExist();
  error ActiveTrove();
  error NotAllowedInRecoveryMode();
  error NotBorrower();
  error WithdrawAmount_gt_Coll();
  error ZeroDebtChange();

  // --- Functions ---

  function openTrove(TokenAmount[] memory _colls) external;

  function addColl(TokenAmount[] memory _colls) external;

  function withdrawColl(TokenAmount[] memory _colls) external;

  function increaseDebt(TokenAmount[] memory _debts, uint _maxFeePercentage) external;

  function repayDebt(TokenAmount[] memory _debts) external;

  function closeTrove() external;

  function getCompositeDebt(DebtTokenAmount[] memory _debts) external view returns (uint);
}
