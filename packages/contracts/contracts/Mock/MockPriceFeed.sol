// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '../Interfaces/IPriceFeed.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';

/*
 * PriceFeed placeholder for testnet and development. The price is simply set manually and saved in a state
 * variable. The contract does not connect to a live Chainlink price feed.
 */
contract MockPriceFeed is IPriceFeed {
  mapping(address => uint256) private tokenPrices;
  uint256 private _price = 1e18; // 1$

  // --- Functions ---

  // View price getter for simplicity in tests
  function getPrice(address _tokenAddress) external view override returns (uint price) {
    // todo include priceCache into tests
    //    // first try to get the price from the cache
    //    for (uint i = 0; i < _priceCache.prices.length; i++) {
    //      if (_priceCache.prices[i].tokenAddress != _tokenAddress) continue;
    //
    //      price = _priceCache.prices[i].amount;
    //      if (price != 0) return price;
    //    }

    uint256 tokenPrice = tokenPrices[_tokenAddress];
    if (tokenPrice != 0) return tokenPrice;

    return _price;
  }

  // todo...
  function fetchPrice() external override returns (uint256) {
    // Fire an event just like the mainnet version would.
    // This lets the subgraph rely on events to get the latest price even when developing locally.
    emit LastGoodPriceUpdated(_price);
    return _price;
  }

  function setTokenPrice(address tokenAddress, uint256 price) external returns (bool) {
    tokenPrices[tokenAddress] = price;
    return true;
  }

  function getUSDValue(address _token, uint256 _amount) external view returns (uint usdValue) {
    uint price = tokenPrices[_token];
    uint8 decimals = IERC20Metadata(_token).decimals();
    usdValue = (price * _amount) / 10 ** decimals;
  }

  function getAmountFromUSDValue(address _token, uint256 _usdValue) external view returns (uint amount) {
    uint price = tokenPrices[_token];
    uint8 decimals = IERC20Metadata(_token).decimals();
    amount = (_usdValue * 10 ** decimals) / price;
  }
}
