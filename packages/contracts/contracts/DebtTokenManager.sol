// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/access/Ownable.sol';
import './Interfaces/IDebtToken.sol';
import './Dependencies/CheckContract.sol';
import './Interfaces/IDebtTokenManager.sol';
import './Dependencies/LiquityBase.sol';
import './DebtToken.sol';
import './Interfaces/IStabilityPoolManager.sol';

contract DebtTokenManager is Ownable(msg.sender), CheckContract, IDebtTokenManager {
  string public constant NAME = 'DTokenManager';

  IStabilityPoolManager public stabilityPoolManager;

  // --- Data structures ---

  mapping(address => IDebtToken) public debtTokens;
  IDebtToken[] public debtTokensArray;
  address[] public debtTokenAddresses;
  IDebtToken public stableCoin;

  // --- Dependency setter ---

  function setAddresses(address _stabilityPoolManagerAddress) external onlyOwner {
    checkContract(_stabilityPoolManagerAddress);
    stabilityPoolManager = IStabilityPoolManager(_stabilityPoolManagerAddress);
    emit DebtTokenManagerInitialized(_stabilityPoolManagerAddress);
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

  // --- Setters ---

  // todo price oracle id/linking missing...
  function addDebtToken(address _debtTokenAddress) external override onlyOwner {
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

    emit DebtTokenAdded(_debtTokenAddress);
  }
}
