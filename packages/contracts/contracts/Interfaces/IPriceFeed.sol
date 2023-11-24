// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './IBase.sol';

interface IPriceFeed is IBase {
  enum Status {
    chainlinkWorking,
    usingTellorChainlinkUntrusted,
    bothOraclesUntrusted,
    usingTellorChainlinkFrozen,
    usingChainlinkTellorUntrusted
  }

  // --- Events ---
  event LastGoodPriceUpdated(address _token, uint _lastGoodPrice);
  event PriceFeedStatusChanged(address _token, Status newStatus);
  event TokenPriceChanged(address _token);

  // --- Function ---
  function getPrice(address _tokenAddress) external view returns (uint price);

  function getUSDValue(address _token, uint _amount) external view returns (uint usdValue);

  function getAmountFromUSDValue(address _token, uint256 _usdValue) external view returns (uint amount);

  function fetchPrice() external returns (uint);
}
