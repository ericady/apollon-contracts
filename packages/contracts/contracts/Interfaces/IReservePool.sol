// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface IReservePool {
  event ReservePoolInitialized(address _stabilityPoolManager, address _stableDebtTokenAddress);
  event ReserveCapChanged(uint newReserveCap);

  error NotFromSPM();

  function isReserveCapReached() external view returns (bool);

  function withdrawValue(address stabilityPool, address stableDebt, uint withdrawAmount) external;
}
