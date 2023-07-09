// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;


import "./IBase.sol";

// Common interface for the Pools.
interface IStoragePool is IBase {

    // --- Events ---

    event PoolValueUpdated(address _tokenAddress, bool _isColl, PoolType _poolType, uint _updatedAmount);
    event BorrowerOperationsAddressChanged(address _newBorrowerOperationsAddress);
    event TroveManagerAddressChanged(address _newTroveManagerAddress);
    event StabilityPoolAddressChanged(address _newStabilityPoolAddress);
    event PriceFeedAddressChanged(address _priceFeedAddress);

    // --- Functions ---

    function getValue(address _tokenAddress, bool _isColl, PoolType _poolType) external view returns (uint);
    function addValue(address _tokenAddress, bool _isColl, PoolType _poolType, uint _amount) external;
    function subtractValue(address _tokenAddress, bool _isColl, PoolType _poolType, uint _amount) external;
    function transferBetweenTypes(address _tokenAddress, bool _isCool, PoolType _fromType, PoolType _toType, uint _amount) external;
    function getEntireSystemColl(PriceCache memory _priceCache) external returns (uint entireSystemColl);
    function getEntireSystemDebt(PriceCache memory _priceCache) external returns (uint entireSystemDebt);
    function checkRecoveryMode(PriceCache memory _priceCache) external returns (bool);
}
