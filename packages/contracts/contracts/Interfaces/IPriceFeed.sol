// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './IBase.sol';

interface IPriceFeed is IBase {
  error UnknownOracleId();
  error BadOracle();
  error NotFromTokenManager();

  // --- Events ---
  event PriceFeedInitialized(
    address tellorCallerAddress,
    address debtTokenManagerAddress,
    address collTokenManagerAddress
  );

  // --- Function ---
  function initiateNewOracleId(address _tokenAddress, uint _oracleId) external;

  function getPrice(address _tokenAddress) external view returns (uint price, bool isTrusted);

  function getUSDValue(address _token, uint _amount) external view returns (uint usdValue);

  function getAmountFromUSDValue(address _token, uint256 _usdValue) external view returns (uint amount);
}
