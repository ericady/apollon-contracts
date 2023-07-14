// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "../Dependencies/IERC20.sol";
import "../Dependencies/IERC2612.sol";
import "./IBase.sol";

interface IDebtToken is IERC20, IERC2612, IBase {
    // --- Events ---

    event TroveManagerAddressChanged(address _troveManagerAddress);
    event StabilityPoolAddressChanged(address _newStabilityPoolAddress);
    event BorrowerOperationsAddressChanged(address _newBorrowerOperationsAddress);
    event PriceFeedAddressChanged(address _newPriceFeedAddress);

    // --- Functions ---

    function isStableCoin() external view returns (bool);

    function getPrice(PriceCache memory _priceCache) external returns (uint);

    function mint(address _account, uint256 _amount) external;

    function burn(address _account, uint256 _amount) external;

    function sendToPool(address _sender, address _poolAddress, uint256 _amount) external;

    function returnFromPool(address _poolAddress, address _receiver, uint256 _amount) external;

    function totalSupply() external view override returns (uint256);

    function balanceOf(address account) external view override returns (uint256);

    function transfer(address recipient, uint256 amount) external override returns (bool);

    function allowance(address owner, address spender) external view override returns (uint256);

    function approve(address spender, uint256 amount) external override returns (bool);

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external override returns (bool);

    function increaseAllowance(address spender, uint256 addedValue) external override returns (bool);

    function decreaseAllowance(
        address spender,
        uint256 subtractedValue
    ) external override returns (bool);

    function domainSeparator() external view override returns (bytes32);

    function permit(
        address owner,
        address spender,
        uint amount,
        uint deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override;

    function nonces(address owner) external view override returns (uint256);

    function name() external view override returns (string memory);

    function symbol() external view override returns (string memory);

    function decimals() external view override returns (uint8);

    function version() external view override returns (string memory);

    function permitTypeHash() external view override returns (bytes32);
}
