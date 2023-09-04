// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './Interfaces/IDebtToken.sol';
import './Dependencies/Ownable.sol';
import './Dependencies/CheckContract.sol';
import './Interfaces/IDebtTokenManager.sol';
import './Dependencies/LiquityBase.sol';
import './DebtToken.sol';
import './Interfaces/IStabilityPoolManager.sol';
import "./TestContracts/DebtTokenTester.sol";

contract DebtTokenManager is Ownable, CheckContract, IDebtTokenManager {
  string public constant NAME = 'DTokenManager';

  // todo not in use...
  address public troveManagerAddress;
  address public borrowerOperationsAddress;
  address public priceFeedAddress;
  IStabilityPoolManager public stabilityPoolManager;

  // --- Data structures ---

  mapping(address => IDebtToken) public debtTokens;
  IDebtToken[] public debtTokensArray;
  address[] public debtTokenAddresses;
  IDebtToken public stableCoin;

  // --- Dependency setter ---

  function setAddresses(
    address _troveManagerAddress,
    address _borrowerOperationsAddress,
    address _stabilityPoolManagerAddress,
    address _priceFeedAddress
  ) external onlyOwner {
    checkContract(_troveManagerAddress);
    checkContract(_stabilityPoolManagerAddress);
    checkContract(_borrowerOperationsAddress);
    checkContract(_priceFeedAddress);

    troveManagerAddress = _troveManagerAddress;
    emit TroveManagerAddressChanged(_troveManagerAddress);

    stabilityPoolManager = IStabilityPoolManager(_stabilityPoolManagerAddress);
    emit StabilityPoolManagerAddressChanged(_stabilityPoolManagerAddress);

    borrowerOperationsAddress = _borrowerOperationsAddress;
    emit BorrowerOperationsAddressChanged(_borrowerOperationsAddress);

    priceFeedAddress = _priceFeedAddress;
    emit PriceFeedAddressChanged(_priceFeedAddress);

    // todo addDebtToken should be still callable...
    //    _renounceOwnership();
  }

  // --- Getters ---

  function getStableCoin() external view override returns (IDebtToken) {
    return stableCoin;
  }

  function getDebtToken(address _address) external view override returns (IDebtToken debtToken) {
    debtToken = debtTokens[_address];
    require(address(debtToken) != address(0), 'debtToken does not exist');
    return debtToken;
  }

  function getDebtTokenAddresses() external view override returns (address[] memory) {
    return debtTokenAddresses;
  }

  // --- Setters ---

  // todo price oracle id missing...
  function addDebtToken(
  address _debtTokenAddress
  ) external override onlyOwner {
    checkContract(_debtTokenAddress);

    IDebtToken debtToken = IDebtToken(_debtTokenAddress);
    bool isStableCoin = debtToken.isStableCoin();
    if (isStableCoin) require(address(stableCoin) == address(0), 'stableCoin already exists');

    string memory symbol = debtToken.symbol();
    for (uint i = 0; i < debtTokensArray.length; i++) {
      if (keccak256(bytes(debtTokensArray[i].symbol())) != keccak256(bytes(symbol))) continue;
      require(false, 'symbol already exists');
    }

    debtTokenAddresses.push(_debtTokenAddress);
    debtTokens[_debtTokenAddress] = debtToken;
    if (isStableCoin) stableCoin = debtToken;
    emit DebtTokenAdded(debtToken);

    stabilityPoolManager.addStabilityPool(debtToken);
  }
}
