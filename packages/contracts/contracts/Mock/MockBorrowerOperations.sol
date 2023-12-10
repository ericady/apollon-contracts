// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '../BorrowerOperations.sol';

/* Tester contract inherits from TroveManager, and provides external functions 
for testing the parent's internal functions. */

contract MockBorrowerOperations is BorrowerOperations {
  function increaseDebt(TokenAmount[] memory _debts, uint _maxFeePercentage) external {
    // separate minting is allowed for better testing
    // _requireCallerIsSwapOperations();

    _increaseDebt(msg.sender, msg.sender, _debts, _maxFeePercentage);
  }
}
