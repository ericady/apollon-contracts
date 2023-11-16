// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface IReservePool {
  event ReservePoolInitialized(
    address _stabilityPoolAddress,
    address _stabilityPoolManager,
    address _stableDebtTokenAddress
  );
  event ReserveCapChanged(uint newReserveCap);

  function isReserveCapReached() external view returns (bool);
}
