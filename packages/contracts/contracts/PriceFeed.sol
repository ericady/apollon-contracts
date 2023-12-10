// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
import './Interfaces/IPriceFeed.sol';
import './Interfaces/ITellorCaller.sol';
import './Dependencies/CheckContract.sol';
import './Dependencies/LiquityMath.sol';

contract PriceFeed is Ownable(msg.sender), CheckContract, IPriceFeed {
  string public constant NAME = 'PriceFeed';
  uint internal constant DECIMAL_PRECISION = 1e18;

  //  ITellorCaller public tellorCaller;

  // @dev The last good prices seen from an oracle by Apollon, prices in 18 decimals
  mapping(address => uint) public lastGoodPrices;

  // --- Dependency setters ---

  function setAddresses() external onlyOwner {}

  // --- Functions ---

  function getPrice(address _tokenAddress) external view returns (uint price) {
    price = lastGoodPrices[_tokenAddress];

    if (price == 0) {
      // TODO: fetch price
    }
  }

  /**
   * @notice Get USD value of given amount of token in 18 decimals
   * @param _token Token Address to get USD value of
   * @param _amount Amount of token to get USD value of
   * @return usdValue USD value of given amount in 18 decimals
   */
  function getUSDValue(address _token, uint256 _amount) external view returns (uint usdValue) {
    uint price = lastGoodPrices[_token];
    uint8 decimals = IERC20Metadata(_token).decimals();
    usdValue = (price * _amount) / 10 ** decimals;
  }

  function getAmountFromUSDValue(address _token, uint256 _usdValue) external view returns (uint amount) {
    uint price = lastGoodPrices[_token];
    uint8 decimals = IERC20Metadata(_token).decimals();
    amount = (_usdValue * 10 ** decimals) / price;
  }
}
