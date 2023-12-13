// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './IDebtToken.sol';
import './IBBase.sol';
import './IPriceFeed.sol';
import './IDebtTokenManager.sol';

interface ILiquidationOperations is IBBase {
  // --- Events ---

  event LiquidationOperationsInitialized(
    address _troveManager,
    address _storgePool,
    address _priceFeed,
    address _debtTokenManager,
    address _collTokenManager,
    address _stabilityPoolManager
  );

  event LiquidationSummary(
    TokenAmount[] liquidatedDebt,
    TokenAmount[] liquidatedColl,
    uint totalStableCoinGasCompensation,
    TokenAmount[] totalCollGasCompensation
  );

  // --- Errors ---

  error NoLiquidatableTrove();
  error EmptyArray();

  // --- Functions ---

  function liquidate(address _borrower) external;

  function batchLiquidateTroves(address[] calldata _troveArray) external;
}
