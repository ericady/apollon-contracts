// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './IBase.sol';

interface IPriceFeed is IBase {
  enum Status {
    working,
    untrusted
  }

  error UnknownOracleId();
  error BadOracle();
  error NotFromTokenManager();

  // --- Events ---
  event PriceFeedInitialized(
    address tellorCallerAddress,
    address debtTokenManagerAddress,
    address collTokenManagerAddress
  );
  event TokenPriceChanged(address _token, uint _lastGoodPrice);
  event PriceFeedStatusChanged(address _token, Status _status);

  // --- Function ---
  function initiateNewOracleId(address _tokenAddress, uint _oracleId) external;

  function getPrice(address _tokenAddress) external returns (uint price);

  function getPriceAsView(address _tokenAddress) external view returns (uint price, Status status);

  function getUSDValue(address _token, uint _amount) external returns (uint usdValue);

  function getUSDValueAsView(address _token, uint256 _amount) external view returns (uint usdValue);

  function getAmountFromUSDValue(address _token, uint256 _usdValue) external returns (uint amount);
}
