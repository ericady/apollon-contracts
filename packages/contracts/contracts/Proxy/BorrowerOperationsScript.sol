// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '../Dependencies/CheckContract.sol';
import '../Interfaces/IBorrowerOperations.sol';
import '../Interfaces/IBBase.sol';

contract BorrowerOperationsScript is CheckContract, IBase {
  IBorrowerOperations immutable borrowerOperations;

  constructor(IBorrowerOperations _borrowerOperations) {
    checkContract(address(_borrowerOperations));
    borrowerOperations = _borrowerOperations;
  }

  function openTrove(TokenAmount[] memory _colls) external payable {
    borrowerOperations.openTrove(_colls);
  }

  function addColl(TokenAmount[] memory _colls) external payable {
    borrowerOperations.addColl(_colls);
  }

  function withdrawColl(TokenAmount[] memory _colls) external {
    borrowerOperations.withdrawColl(_colls);
  }

  function increaseDebt(TokenAmount[] memory _debts, uint _maxFeePercentage) external {
    borrowerOperations.increaseDebt(_debts, _maxFeePercentage);
  }

  function repayDebt(TokenAmount[] memory _debts) external {
    borrowerOperations.repayDebt(_debts);
  }

  function closeTrove() external {
    borrowerOperations.closeTrove();
  }
}
