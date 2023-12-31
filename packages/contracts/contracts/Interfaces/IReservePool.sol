// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './IBBase.sol';
import './IDebtToken.sol';

interface IReservePool is IBBase {
  error NotFromSPM();

  event ReservePoolInitialized(
    address _stabilityPoolManager,
    address _priceFeed,
    address _stableDebtTokenAddress,
    address _govTokenAddress
  );
  event ReserveCapChanged(uint newReserveCap, uint newGovReserveCap);
  event WithdrewReserves(uint govAmount, uint stableAmount);

  function stableDebtToken() external view returns (IDebtToken);

  function govToken() external view returns (IERC20);

  function setRelativeStableCap(uint _relativeStableCap) external;

  function stableAmountUntilCap() external view returns (uint);

  function isGovReserveCapReached() external view returns (bool);

  function withdrawValue(address stabilityPool, uint withdrawAmount) external returns (uint usedGov, uint usedStable);
}
