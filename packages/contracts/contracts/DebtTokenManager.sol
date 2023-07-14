// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "./Interfaces/IDebtToken.sol";
import "./Dependencies/Ownable.sol";
import "./Dependencies/CheckContract.sol";
import "./Interfaces/IDebtTokenManager.sol";
import "./Dependencies/LiquityBase.sol";
import "./DebtToken.sol";

contract DebtTokenManager is Ownable, CheckContract, IDebtTokenManager {
    string public constant NAME = "DTokenManager";

    address public troveManagerAddress;
    address public stabilityPoolAddress;
    address public borrowerOperationsAddress;
    address public priceFeedAddress;

    // --- Data structures ---

    mapping(address => IDebtToken) public debtTokens;
    IDebtToken[] public debtTokensArray;
    IDebtToken public stableCoin;

    // --- Dependency setter ---

    function setAddresses(
        address _troveManagerAddress,
        address _stabilityPoolAddress,
        address _borrowerOperationsAddress,
        address _priceFeedAddress
    ) external onlyOwner {
        checkContract(_troveManagerAddress);
        checkContract(_stabilityPoolAddress);
        checkContract(_borrowerOperationsAddress);
        checkContract(_priceFeedAddress);

        troveManagerAddress = _troveManagerAddress;
        emit TroveManagerAddressChanged(_troveManagerAddress);

        stabilityPoolAddress = _stabilityPoolAddress;
        emit StabilityPoolAddressChanged(_stabilityPoolAddress);

        borrowerOperationsAddress = _borrowerOperationsAddress;
        emit BorrowerOperationsAddressChanged(_borrowerOperationsAddress);

        priceFeedAddress = _priceFeedAddress;
        emit PriceFeedAddressChanged(_priceFeedAddress);

        _renounceOwnership();
    }

    // --- Getters ---

    function getStableCoin() external view override returns (IDebtToken) {
        return stableCoin;
    }

    function getDebtToken(address _address) external view override returns (IDebtToken debtToken) {
        debtToken = debtTokens[_address];
        require(address(debtToken) != address(0), "debtToken does not exist");
        return debtToken;
    }

    // --- Setters ---

    // todo (flat) owner only, should be also callable after deployment
    function addDebtToken(
        string memory _symbol,
        string memory _name,
        string memory _version,
        bool _isStableCoin
    ) external override onlyOwner returns (bool) {
        if (_isStableCoin) require(address(stableCoin) == address(0), "stableCoin already exists");

        for (uint i = 0; i < debtTokensArray.length; i++) {
            if (keccak256(bytes(debtTokensArray[i].symbol())) != keccak256(bytes(_symbol))) continue;
            require(false, "symbol already exists");
        }

        IDebtToken debtToken = new DebtToken(
            troveManagerAddress,
            stabilityPoolAddress,
            borrowerOperationsAddress,
            priceFeedAddress,
            _symbol,
            _name,
            _version,
            _isStableCoin
        );

        debtTokens[address(debtToken)] = debtToken;
        if (_isStableCoin) stableCoin = debtToken;
        emit DebtTokenAdded(debtToken);
        return true;
    }
}
