// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "./IBBase.sol";

// Common interface for the Trove Manager.
interface IBorrowerOperations is IBBase {
    // --- Events ---

    event TroveManagerAddressChanged(address _newTroveManagerAddress);
    event StoragePoolAddressChanged(address _storagePoolAddress);
    event StabilityPoolAddressChanged(address _stabilityPoolAddress);
    event PriceFeedAddressChanged(address _newPriceFeedAddress);
    event SortedTrovesAddressChanged(address _sortedTrovesAddress);
    event DebtTokenManagerAddressChanged(address _debtTokenManagerAddress);

    event TroveCreated(address indexed _borrower, uint arrayIndex);
    event TroveUpdated(address indexed _borrower, uint _debt, uint _coll, uint stake);
    event LUSDBorrowingFeePaid(address indexed _borrower, uint _LUSDFee);

    // --- Functions ---

    function openTrove(
        uint _maxFeePercentage,
        TokenAmount[] memory _colls,
        TokenAmount[] memory _debts,
        address _upperHint,
        address _lowerHint
    ) external payable;

    function closeTrove() external;

    function claimCollateral() external;

    function getCompositeDebt(DebtTokenAmount[] memory _debts) external pure returns (uint);
}
