// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/access/Ownable.sol';
import './Interfaces/IDebtToken.sol';
import './Dependencies/CheckContract.sol';
import './Interfaces/ITokenManager.sol';
import './Dependencies/LiquityBase.sol';
import './DebtToken.sol';
import './Interfaces/IStabilityPoolManager.sol';
import './Interfaces/IPriceFeed.sol';

contract TokenManager is Ownable(msg.sender), CheckContract, ITokenManager {
  string public constant NAME = 'TokenManager';

  IPriceFeed public priceFeed;
  IStabilityPoolManager public stabilityPoolManager;

  // --- Data structures ---

  mapping(address => IDebtToken) public debtTokens; // todo does it make sense to store them as IDebtToken instaed of address?
  IDebtToken[] public debtTokensArray;
  IDebtToken public stableCoin;

  address[] public debtTokenAddresses;
  address[] public collTokenAddresses;
  address govTokenAddress;

  // --- Dependency setter ---

  function setAddresses(address _stabilityPoolManagerAddress, address _priceFeedAddress) external onlyOwner {
    checkContract(_stabilityPoolManagerAddress);
    checkContract(_priceFeedAddress);

    stabilityPoolManager = IStabilityPoolManager(_stabilityPoolManagerAddress);
    priceFeed = IPriceFeed(_priceFeedAddress);

    emit TokenManagerInitialized(_stabilityPoolManagerAddress, _priceFeedAddress);
  }

  // --- Getters ---

  function getStableCoin() external view override returns (IDebtToken) {
    return stableCoin;
  }

  function isDebtToken(address _address) external view override returns (bool) {
    return address(debtTokens[_address]) != address(0);
  }

  function getDebtToken(address _address) external view override returns (IDebtToken debtToken) {
    debtToken = debtTokens[_address];
    if (address(debtToken) == address(0)) revert InvalidDebtToken();
    return debtToken;
  }

  function getDebtTokenAddresses() external view override returns (address[] memory) {
    return debtTokenAddresses;
  }

  function getCollTokenAddresses() external view override returns (address[] memory) {
    return collTokenAddresses;
  }

  function getGovTokenAddress() external view override returns (address) {
    return govTokenAddress;
  }

  // --- Setters ---

  function addDebtToken(address _debtTokenAddress, uint _tellorOracleId) external override onlyOwner {
    checkContract(_debtTokenAddress);

    IDebtToken debtToken = IDebtToken(_debtTokenAddress);
    bool isStableCoin = debtToken.isStableCoin();
    if (isStableCoin && address(stableCoin) != address(0)) revert StableCoinAlreadyExists();

    string memory symbol = debtToken.symbol();
    for (uint i = 0; i < debtTokensArray.length; i++) {
      if (keccak256(bytes(debtTokensArray[i].symbol())) != keccak256(bytes(symbol))) continue;
      revert SymbolAlreadyExists();
    }

    debtTokenAddresses.push(_debtTokenAddress);
    debtTokens[_debtTokenAddress] = debtToken;
    if (isStableCoin) stableCoin = debtToken;

    stabilityPoolManager.addStabilityPool(debtToken);
    priceFeed.initiateNewOracleId(_debtTokenAddress, _tellorOracleId);
    emit DebtTokenAdded(_debtTokenAddress);
  }

  function addCollToken(address _tokenAddress, uint _tellorOracleId, bool _isGovToken) external override onlyOwner {
    if (_isGovToken && govTokenAddress != address(0)) revert GovTokenAlreadyDefined();

    for (uint i = 0; i < collTokenAddresses.length; i++)
      if (collTokenAddresses[i] == _tokenAddress) revert SymbolAlreadyExists();

    collTokenAddresses.push(_tokenAddress);
    if (_isGovToken) govTokenAddress = _tokenAddress;

    priceFeed.initiateNewOracleId(_tokenAddress, _tellorOracleId);
    emit CollTokenAdded(_tokenAddress, _isGovToken);
  }
}
