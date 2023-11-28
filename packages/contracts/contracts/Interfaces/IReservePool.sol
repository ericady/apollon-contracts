// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './IBase.sol';
import './IDebtToken.sol';

interface IReservePool is IBase {
  event ReservePoolInitialized(
    address _stabilityPoolManager,
    address _priceFeed,
    address _stableDebtTokenAddress,
    address _govTokenAddress
  );
  event ReserveCapChanged(uint newReserveCap, uint newGovReserveCap);

  error NotFromSPM();

  function stableReserveCap() external view returns (uint);

  function govReserveCap() external view returns (uint);

  function stableDebtToken() external view returns (IDebtToken);

  function isReserveCapReached() external view returns (bool, bool);

  function withdrawValue(address stabilityPool, uint withdrawAmount) external returns (TokenAmount[] memory);
}
