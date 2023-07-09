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
    function sendToPool(address _sender,  address _poolAddress, uint256 _amount) external;
    function returnFromPool(address _poolAddress, address _receiver, uint256 _amount) external;
    function totalSupply() override external view returns (uint256);
    function balanceOf(address account) override external view returns (uint256);
    function transfer(address recipient, uint256 amount) override external  returns (bool);
    function allowance(address owner, address spender) override external view  returns (uint256);
    function approve(address spender, uint256 amount) override external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) override external returns (bool);
    function increaseAllowance(address spender, uint256 addedValue) override external returns (bool);
    function decreaseAllowance(address spender, uint256 subtractedValue) override external returns (bool);
    function domainSeparator() override view external returns (bytes32);
    function permit(address owner, address spender, uint amount, uint deadline, uint8 v, bytes32 r, bytes32 s) override external;
    function nonces(address owner) override external view returns (uint256);
    function name() override external view returns (string memory);
    function symbol() override external view  returns (string memory);
    function decimals() override external view returns (uint8);
    function version() override external view returns (string memory);
    function permitTypeHash() override external view returns (bytes32);
}
