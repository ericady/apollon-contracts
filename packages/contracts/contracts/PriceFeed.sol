// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
import './Interfaces/IPriceFeed.sol';
import './Dependencies/ITellorCaller.sol';
import './Dependencies/CheckContract.sol';
import './Dependencies/LiquityMath.sol';
import './Interfaces/ITokenManager.sol';

contract PriceFeed is Ownable(msg.sender), CheckContract, IPriceFeed {
  string public constant NAME = 'PriceFeed';

  uint public constant TARGET_DIGITS = 18;
  uint public constant TELLOR_DIGITS = 6; // Use to convert a price answer to an 18-digit precision uint

  uint public constant PRICE_TTL = 60; // 1 minute, time before a new price fetched from tellor
  uint public constant ORACLE_TIMEOUT = 60 * 30; // 30 minutes, Maximum time period allowed since latest round data timestamp.
  uint public constant MAX_PRICE_DEVIATION_FROM_PREVIOUS_ROUND = 0.5e18; // 50%, Maximum deviation allowed between two consecutive oracle prices, beyond which the oracles is considered unstable

  mapping(address => uint) public tokenToOracleId;

  struct TellorResponse {
    bool success;
    uint256 timestamp;
    uint price;
    bool isTrusted;
  }
  ITellorCaller public tellorCaller;
  ITokenManager public tokenManager;

  // --- Dependency setters ---

  function setAddresses(address _tellorCallerAddress, address _tokenManagerAddress) external onlyOwner {
    checkContract(_tellorCallerAddress);
    checkContract(_tokenManagerAddress);

    tellorCaller = ITellorCaller(_tellorCallerAddress);
    tokenManager = ITokenManager(_tokenManagerAddress);

    emit PriceFeedInitialized(_tellorCallerAddress, _tokenManagerAddress);
    renounceOwnership();
  }

  function initiateNewOracleId(address _tokenAddress, uint _oracleId) external {
    _requireCallerIsTokenManager();
    tokenToOracleId[_tokenAddress] = _oracleId;
  }

  function _requireCallerIsTokenManager() internal view {
    if (msg.sender != address(tokenManager)) revert NotFromTokenManager();
  }

  // --- Functions ---

  function getPrice(address _tokenAddress) public view override returns (uint price, bool isTrusted) {
    // map token to oracle id
    uint oracleId = tokenToOracleId[_tokenAddress];
    if (oracleId == 0) revert UnknownOracleId();

    // fetch price
    TellorResponse memory latestResponse = _getCurrentTellorResponse(oracleId, false);
    TellorResponse memory previousResponse = _getCurrentTellorResponse(oracleId, true);

    if (!latestResponse.success) {
      if (!previousResponse.success) revert BadOracle(); // both calls failed, unable to provide a price
      return (previousResponse.price, false); // return previous price as untrusted, latest call failed
    }

    // latest call succeeded
    if (!previousResponse.isTrusted || !latestResponse.isTrusted) return (latestResponse.price, false); // at least one price is untrusted, return latest price as untrusted

    // compare price differance
    uint deviation = LiquityMath._getAbsoluteDifference(latestResponse.price, previousResponse.price);
    uint max = LiquityMath._max(latestResponse.price, previousResponse.price);
    if (((deviation * TARGET_DIGITS) / max) > MAX_PRICE_DEVIATION_FROM_PREVIOUS_ROUND)
      return (latestResponse.price, false); // price deviation is too high, return latest price as untrusted

    // returning latest price as trusted
    return (latestResponse.price, true);
  }

  /**
   * @return usdValue USD value of given amount in 18 decimals
   */
  function getUSDValue(address _tokenAddress, uint256 _amount) external view override returns (uint usdValue) {
    TokenPrice memory _tokenPrice = _buildTokenPrice(_tokenAddress);
    return _getUSDValue(_tokenPrice, _amount);
  }

  function getUSDValue(TokenPrice memory _tokenPrice, uint256 _amount) external pure override returns (uint usdValue) {
    return _getUSDValue(_tokenPrice, _amount);
  }

  function getUSDValue(
    PriceCache memory _priceCache,
    address _tokenAddress,
    uint256 _amount
  ) external pure override returns (uint usdValue) {
    return _getUSDValue(_getTokenPrice(_priceCache, _tokenAddress), _amount);
  }

  function _getUSDValue(TokenPrice memory _tokenPrice, uint256 _amount) internal pure returns (uint usdValue) {
    usdValue = (_tokenPrice.price * _amount) / 10 ** _tokenPrice.tokenDecimals;
  }

  function getAmountFromUSDValue(
    address _tokenAddress,
    uint256 _usdValue
  ) external view override returns (uint amount) {
    TokenPrice memory tokenPrice = _buildTokenPrice(_tokenAddress);
    return _getAmountFromUSDValue(tokenPrice, _usdValue);
  }

  function getAmountFromUSDValue(
    TokenPrice memory _tokenPrice,
    uint256 _usdValue
  ) external pure override returns (uint amount) {
    return _getAmountFromUSDValue(_tokenPrice, _usdValue);
  }

  function getAmountFromUSDValue(
    PriceCache memory _priceCache,
    address _tokenAddress,
    uint256 _usdValue
  ) external pure override returns (uint amount) {
    TokenPrice memory tokenPrice = _getTokenPrice(_priceCache, _tokenAddress);
    return _getAmountFromUSDValue(tokenPrice, _usdValue);
  }

  function _getAmountFromUSDValue(
    TokenPrice memory _tokenPrice,
    uint256 _usdValue
  ) internal pure returns (uint amount) {
    amount = (_usdValue * 10 ** _tokenPrice.tokenDecimals) / _tokenPrice.price;
  }

  function getTokenPrice(
    PriceCache memory _priceCache,
    address _tokenAddress
  ) external pure override returns (TokenPrice memory) {
    return _getTokenPrice(_priceCache, _tokenAddress);
  }

  function _getTokenPrice(
    PriceCache memory _priceCache,
    address _tokenAddress
  ) internal pure returns (TokenPrice memory) {
    for (uint i = 0; i < _priceCache.collPrices.length; i++)
      if (_priceCache.collPrices[i].tokenAddress == _tokenAddress) return _priceCache.collPrices[i];
    for (uint i = 0; i < _priceCache.debtPrices.length; i++)
      if (_priceCache.debtPrices[i].tokenAddress == _tokenAddress) return _priceCache.debtPrices[i];
    revert TokenNotInCache();
  }

  function buildPriceCache() external view override returns (PriceCache memory cache) {
    cache.collPrices = _getTokenPrices(tokenManager.getCollTokenAddresses());
    cache.debtPrices = _getTokenPrices(tokenManager.getDebtTokenAddresses());
    return cache;
  }

  function _getTokenPrices(address[] memory tokens) internal view returns (TokenPrice[] memory) {
    TokenPrice[] memory tokenPrices = new TokenPrice[](tokens.length);
    for (uint i = 0; i < tokens.length; i++) tokenPrices[i] = _buildTokenPrice(tokens[i]);
    return tokenPrices;
  }

  function _buildTokenPrice(address _tokenAddress) internal view returns (TokenPrice memory) {
    (uint price, bool isTrusted) = getPrice(_tokenAddress);
    uint8 decimals = IERC20Metadata(_tokenAddress).decimals();
    return TokenPrice(_tokenAddress, decimals, price, isTrusted);
  }

  // --- Helper functions ---

  function _getCurrentTellorResponse(
    uint _tellorOracleId,
    bool _fetchPreviousValue
  ) internal view returns (TellorResponse memory tellorResponse) {
    try tellorCaller.getTellorCurrentValue(_tellorOracleId, _fetchPreviousValue) returns (
      uint256 value,
      uint256 _timestampRetrieved
    ) {
      // If call to Tellor succeeds, return the response and success = true
      tellorResponse.timestamp = _timestampRetrieved;
      tellorResponse.price = value * (10 ** (TARGET_DIGITS - TELLOR_DIGITS));
      tellorResponse.success = value > 0;
      tellorResponse.isTrusted = _isTellorResponseTrusted(tellorResponse);

      return (tellorResponse);
    } catch {
      // If call to Tellor reverts, return a zero response with success = false
      return (tellorResponse);
    }
  }

  function _isTellorResponseTrusted(TellorResponse memory _response) internal view returns (bool) {
    if (!_response.success) return false; // Check for response call reverted
    if (_response.timestamp == 0 || _response.timestamp > block.timestamp) return false; // Check for an invalid timeStamp that is 0, or in the future
    if (block.timestamp - _response.timestamp > ORACLE_TIMEOUT) return false; // Check for timeout
    return true;
  }
}
