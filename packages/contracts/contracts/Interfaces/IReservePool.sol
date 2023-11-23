// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './IDebtToken.sol';

interface IReservePool {
  event ReservePoolInitialized(address _stabilityPoolManager, address _stableDebtTokenAddress);
  event ReserveCapChanged(uint newReserveCap);

  error NotFromSPM();

  function stableDebtToken() external view returns (IDebtToken);

  function isReserveCapReached() external view returns (bool);

  function withdrawValue(address stabilityPool, uint withdrawAmount) external;
}
