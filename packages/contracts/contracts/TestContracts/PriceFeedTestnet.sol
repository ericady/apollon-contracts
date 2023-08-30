// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '../Interfaces/IPriceFeed.sol';

/*
 * PriceFeed placeholder for testnet and development. The price is simply set manually and saved in a state
 * variable. The contract does not connect to a live Chainlink price feed.
 */
contract PriceFeedTestnet is IPriceFeed {
  uint256 private _price = 200 * 1e18; // todo extren for different prices...

  // --- Functions ---

  // View price getter for simplicity in tests
  function getPrice(PriceCache memory _priceCache, address _tokenAddress) external view override returns (uint price) {
    // first try to get the price from the cache
    for (uint i = 0; i < _priceCache.prices.length; i++) {
      if (_priceCache.prices[i].tokenAddress != _tokenAddress) continue;

      price = _priceCache.prices[i].amount;
      if (price != 0) return price;
    }

    return _price;
  }

  function fetchPrice() external override returns (uint256) {
    // Fire an event just like the mainnet version would.
    // This lets the subgraph rely on events to get the latest price even when developing locally.
    emit LastGoodPriceUpdated(_price);
    return _price;
  }

  // Manual external price setter.
  function setPrice(uint256 price) external returns (bool) {
    _price = price;
    return true;
  }
}
