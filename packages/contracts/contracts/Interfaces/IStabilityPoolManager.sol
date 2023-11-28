// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './IBBase.sol';

interface IStabilityPoolManager is IBBase {
  // --- Events ---

  event StabilityPoolManagerInitiated(
    address troveManagerAddress,
    address storgePoolAddress,
    address reservePoolAddress,
    address debtTokenManagerAddress,
    address priceFeedAddress
  );
  event StabilityPoolAdded(address stabilityPoolAddress);

  // --- Custom Errors ---
  error NotFromTroveManager();
  error NotFromReservePool();
  error PoolNotExist();
  error PoolExist();
  error Unauthorized();

  // --- Functions ---
  function getStabilityPool(IDebtToken _debtToken) external view returns (IStabilityPool);

  function getRemainingStability(
    address[] memory collTokenAddresses
  ) external view returns (RemainingStability[] memory);

  function getTotalDeposits() external view returns (TokenAmount[] memory deposits);

  function getDepositorDeposits(address _depositor) external view returns (TokenAmount[] memory deposits);

  function getCompoundedDeposits() external view returns (TokenAmount[] memory deposits);

  function getDepositorCollGains(
    address _depositor,
    address[] memory collTokenAddresses
  ) external view returns (TokenAmount[] memory collGains);

  function provideStability(TokenAmount[] memory _debts) external;

  function withdrawStability(TokenAmount[] memory _debts) external;

  function withdrawGains() external;

  function offset(RemainingStability[] memory _toOffset) external;

  function addStabilityPool(IDebtToken _debtToken) external;
}
