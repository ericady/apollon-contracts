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
  event LastGoodPriceUpdated(uint _lastGoodPrice);
  event PriceFeedStatusChanged(Status newStatus);

  // --- Function ---
  function getPrice(PriceCache memory _priceCache, address _tokenAddress) external view returns (uint price);

  function fetchPrice() external returns (uint);
}
