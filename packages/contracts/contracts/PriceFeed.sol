// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
import './Interfaces/IPriceFeed.sol';
import './Dependencies/ITellorCaller.sol';
import './Dependencies/CheckContract.sol';
import './Dependencies/LiquityMath.sol';

contract PriceFeed is Ownable(msg.sender), CheckContract, IPriceFeed {
  string public constant NAME = 'PriceFeed';

  uint public constant TARGET_DIGITS = 18;
  uint public constant TELLOR_DIGITS = 6; // Use to convert a price answer to an 18-digit precision uint

  uint public constant PRICE_TTL = 60; // 1 minute, time before a new price fetched from tellor
  uint public constant ORACLE_TIMEOUT = 60 * 30; // 30 minutes, Maximum time period allowed since latest round data timestamp.
  uint public constant MAX_PRICE_DEVIATION_FROM_PREVIOUS_ROUND = 0.5e18; // 50%, Maximum deviation allowed between two consecutive oracle prices, beyond which the oracles is considered unstable

  struct PriceAt {
    Status status;
    uint timestamp;
    uint price;
  }
  mapping(address => PriceAt) public prices;
  mapping(address => uint) public tokenToOracleId;

  struct TellorResponse {
    bool ifRetrieve;
    uint256 value;
    uint256 timestamp;
    bool success;
  }
  ITellorCaller public tellorCaller;

  address public debtTokenManagerAddress;
  address public collTokenManagerAddress;

  // --- Dependency setters ---

  function setAddresses(
    address _tellorCallerAddress,
    address _debtTokenManagerAddress,
    address _collTokenManagerAddress
  ) external onlyOwner {
    checkContract(_tellorCallerAddress);
    checkContract(_debtTokenManagerAddress);
    checkContract(_collTokenManagerAddress);

    tellorCaller = ITellorCaller(_tellorCallerAddress);
    debtTokenManagerAddress = _debtTokenManagerAddress;
    collTokenManagerAddress = _collTokenManagerAddress;

    emit PriceFeedInitialized(_tellorCallerAddress, _debtTokenManagerAddress, _collTokenManagerAddress);
    renounceOwnership();
  }

  function initiateNewOracleId(address _tokenAddress, uint _oracleId) external {
    _requireCallerIsTokenManager();

    tokenToOracleId[_tokenAddress] = _oracleId;

    TellorResponse memory tellorResponse = _getCurrentTellorResponse(_oracleId);
    if (_tellorIsUntrusted(tellorResponse)) revert BadOracle();

    uint price = _scaleTellorPriceByDigits(tellorResponse);
    prices[_tokenAddress] = PriceAt({ status: Status.working, timestamp: block.timestamp, price: price });
    emit TokenPriceChanged(_tokenAddress, price);
    emit PriceFeedStatusChanged(_tokenAddress, Status.working);
  }

  function _requireCallerIsTokenManager() internal view {
    if (msg.sender != debtTokenManagerAddress && msg.sender != collTokenManagerAddress) revert NotFromTokenManager();
  }

  // --- Functions ---

  function getPrice(address _tokenAddress) public override returns (uint price) {
    (uint price, Status status) = getPriceAsView(_tokenAddress);

    // if the status is untrusted, the old last price was returned
    if (status == Status.untrusted) {
      _changeStatus(_tokenAddress, Status.untrusted);
      return price;
    }

    // storing the new price into the contract
    prices[_tokenAddress].price = price;
    prices[_tokenAddress].timestamp = block.timestamp;
    emit TokenPriceChanged(_tokenAddress, price);
    _changeStatus(_tokenAddress, Status.working);
    return price;
  }

  function getPriceAsView(address _tokenAddress) public view override returns (uint price, Status status) {
    PriceAt memory lastPriceAt = prices[_tokenAddress];

    // check if the price is still valid
    if (lastPriceAt.timestamp > 0 && block.timestamp - lastPriceAt.timestamp < PRICE_TTL) return lastPriceAt.price;

    // map token to oracle id
    uint oracleId = tokenToOracleId[_tokenAddress];
    if (oracleId == 0) revert UnknownOracleId();

    // price outdated, fetch new one
    TellorResponse memory tellorResponse = _getCurrentTellorResponse(oracleId);

    // check if the response is trusted, if not, return last price
    if (_tellorIsUntrusted(tellorResponse)) return (lastPriceAt.price, Status.untrusted);

    uint newPrice = _scaleTellorPriceByDigits(tellorResponse);

    // check the price deviation, if it's too high, return last price
    if (lastPriceAt.timestamp > 0) {
      uint deviation = LiquityMath._getAbsoluteDifference(newPrice, lastPriceAt.price);
      uint max = LiquityMath._max(newPrice, lastPriceAt.price);
      if ((deviation * TARGET_DIGITS) / max > MAX_PRICE_DEVIATION_FROM_PREVIOUS_ROUND)
        return (lastPriceAt.price, Status.untrusted);
    }

    return (newPrice, Status.working);
  }

  /**
   * @notice Get USD value of given amount of token in 18 decimals
   * @param _token Token Address to get USD value of
   * @param _amount Amount of token to get USD value of
   * @return usdValue USD value of given amount in 18 decimals
   */
  function getUSDValue(address _token, uint256 _amount) external override returns (uint usdValue) {
    uint price = getPrice(_token);
    uint8 decimals = IERC20Metadata(_token).decimals();
    usdValue = (price * _amount) / 10 ** decimals;
  }

  function getUSDValueAsView(address _token, uint256 _amount) external view override returns (uint usdValue) {
    (uint price, ) = getPriceAsView(_token);
    uint8 decimals = IERC20Metadata(_token).decimals();
    usdValue = (price * _amount) / 10 ** decimals;
  }

  function getAmountFromUSDValue(address _token, uint256 _usdValue) external override returns (uint amount) {
    uint price = getPrice(_token);
    uint8 decimals = IERC20Metadata(_token).decimals();
    amount = (_usdValue * 10 ** decimals) / price;
  }

  // --- Helper functions ---

  function _changeStatus(address _tokenAddress, Status _status) internal {
    if (prices[_tokenAddress].status == _status) return; // No change in status, so no need to emit an event

    prices[_tokenAddress].status = _status;
    emit PriceFeedStatusChanged(_tokenAddress, _status);
  }

  function _tellorIsUntrusted(TellorResponse memory _response) internal view returns (bool) {
    if (!_response.success) return true; // Check for response call reverted
    if (_response.timestamp == 0 || _response.timestamp > block.timestamp) return true; // Check for an invalid timeStamp that is 0, or in the future
    if (_response.value == 0) return true; // Check for zero price
    if (block.timestamp - _response.timestamp > ORACLE_TIMEOUT) return true; // Check for timeout
    return false;
  }

  function _scaleTellorPriceByDigits(TellorResponse memory _tellorResponse) internal pure returns (uint) {
    return _tellorResponse.value * (10 ** (TARGET_DIGITS - TELLOR_DIGITS));
  }

  function _getCurrentTellorResponse(uint tellorOracleId) internal view returns (TellorResponse memory tellorResponse) {
    try tellorCaller.getTellorCurrentValue(tellorOracleId) returns (
      bool ifRetrieve,
      uint256 value,
      uint256 _timestampRetrieved
    ) {
      // If call to Tellor succeeds, return the response and success = true
      tellorResponse.ifRetrieve = ifRetrieve;
      tellorResponse.value = value;
      tellorResponse.timestamp = _timestampRetrieved;
      tellorResponse.success = true;

      return (tellorResponse);
    } catch {
      // If call to Tellor reverts, return a zero response with success = false
      return (tellorResponse);
    }
  }
}
