// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './Dependencies/IERC20.sol';
import './Interfaces/IStoragePool.sol';
import './Dependencies/SafeMath.sol';
import './Dependencies/Ownable.sol';
import './Dependencies/CheckContract.sol';
import './Dependencies/console.sol';
import './Dependencies/LiquityBase.sol';
import './Interfaces/IPriceFeed.sol';
import './Interfaces/IStabilityPoolManager.sol';

/*
 * The Active Pool holds the collateral and debt (but not the token itself) for all active troves.
 *
 * When a trove is liquidated, it's coll and debt are transferred from the Active Pool, to either the
 * Stability Pool, the Default Pool, or both, depending on the liquidation conditions.
 *
 */
contract StoragePool is LiquityBase, Ownable, CheckContract, IStoragePool {
  using SafeMath for uint256;

  string public constant NAME = 'StoragePool';

  address public borrowerOperationsAddress;
  address public troveManagerAddress;
  address public stabilityPoolManagerAddress;
  IPriceFeed public priceFeed;

  struct PoolEntry {
    address tokenAddress;
    bool isColl;
    uint256 totalAmount;
    mapping(PoolType => uint256) poolTypes;
    bool exists;
  }
  mapping(address => mapping(bool => PoolEntry)) internal poolEntries; // [tokenAddress][isColl] => PoolEntry
  address[] public collTokenAddresses;
  address[] public debtTokenAddresses;

  // --- Contract setters ---

  function setAddresses(
    address _borrowerOperationsAddress,
    address _troveManagerAddress,
    address _stabilityPoolManagerAddress,
    address _priceFeedAddress
  ) external onlyOwner {
    checkContract(_borrowerOperationsAddress);
    checkContract(_troveManagerAddress);
    checkContract(_stabilityPoolManagerAddress);
    checkContract(_priceFeedAddress);

    borrowerOperationsAddress = _borrowerOperationsAddress;
    emit BorrowerOperationsAddressChanged(_borrowerOperationsAddress);

    troveManagerAddress = _troveManagerAddress;
    emit TroveManagerAddressChanged(_troveManagerAddress);

    stabilityPoolManagerAddress = _stabilityPoolManagerAddress;
    emit StabilityPoolManagerAddressChanged(_stabilityPoolManagerAddress);

    priceFeed = IPriceFeed(_priceFeedAddress);
    emit PriceFeedAddressChanged(_priceFeedAddress);

    _renounceOwnership();
  }

  // --- Getters for public variables. Required by IPool interface ---

  function getValue(address _tokenAddress, bool _isColl, PoolType _poolType) external view override returns (uint) {
    return poolEntries[_tokenAddress][_isColl].poolTypes[_poolType];
  }

  // --- Pool functionality ---

  function addValue(address _tokenAddress, bool _isColl, PoolType _poolType, uint _amount) external override {
    _requireCallerIsBOorTroveMorSP();

    PoolEntry storage entry = poolEntries[_tokenAddress][_isColl];
    if (!entry.exists) {
      poolEntries[_tokenAddress][_isColl].exists = true;
      poolEntries[_tokenAddress][_isColl].tokenAddress = _tokenAddress;

      if (_isColl) collTokenAddresses.push(_tokenAddress);
      else debtTokenAddresses.push(_tokenAddress);
    }

    entry.poolTypes[_poolType] = entry.poolTypes[_poolType].add(_amount);
    entry.totalAmount = entry.totalAmount.add(_amount);
    emit PoolValueUpdated(_tokenAddress, _isColl, _poolType, entry.poolTypes[_poolType]);
  }

  function subtractValue(address _tokenAddress, bool _isColl, PoolType _poolType, uint _amount) external override {
    _requireCallerIsBOorTroveMorSP();
    _subtractValue(_tokenAddress, _isColl, _poolType, _amount);
  }

  function withdrawalValue(
    address _receiver,
    address _tokenAddress,
    bool _isColl,
    PoolType _poolType,
    uint _amount
  ) external override {
    _requireCallerIsBOorTroveMorSP();
    _subtractValue(_tokenAddress, _isColl, _poolType, _amount);
    IERC20(_tokenAddress).transfer(_receiver, _amount);
  }

  function _subtractValue(address _tokenAddress, bool _isColl, PoolType _poolType, uint _amount) internal {
    PoolEntry storage entry = poolEntries[_tokenAddress][_isColl];
    require(entry.exists, 'StoragePool: PoolEntry does not exist');

    entry.poolTypes[_poolType] = entry.poolTypes[_poolType].sub(_amount);
    entry.totalAmount = entry.totalAmount.sub(_amount);
    emit PoolValueUpdated(_tokenAddress, _isColl, _poolType, entry.poolTypes[_poolType]);
  }

  function transferBetweenTypes(
    address _tokenAddress,
    bool _isColl,
    PoolType _fromType,
    PoolType _toType,
    uint _amount
  ) external override {
    _requireCallerIsBOorTroveMorSP();
    _requirePositiveAmount(_amount);

    PoolEntry storage entry = poolEntries[_tokenAddress][_isColl];

    entry.poolTypes[_fromType] = entry.poolTypes[_fromType].sub(_amount);
    emit PoolValueUpdated(_tokenAddress, _isColl, _fromType, entry.poolTypes[_fromType]);

    entry.poolTypes[_toType] = entry.poolTypes[_toType].add(_amount);
    emit PoolValueUpdated(_tokenAddress, _isColl, _toType, entry.poolTypes[_toType]);
  }

  function getEntireSystemColl(PriceCache memory _priceCache) external view override returns (uint entireSystemColl) {
    IPriceFeed priceFeedCached = priceFeed;
    for (uint i = 0; i < collTokenAddresses.length; i++) {
      uint price = priceFeedCached.getPrice(_priceCache, collTokenAddresses[i]);
      entireSystemColl = entireSystemColl.add(poolEntries[collTokenAddresses[i]][true].totalAmount.mul(price)); // todo should surplus or gas be excluded?
    }
    return entireSystemColl;
  }

  function getEntireSystemDebt(PriceCache memory _priceCache) external view override returns (uint entireSystemDebt) {
    IPriceFeed priceFeedCached = priceFeed;
    for (uint i = 0; i < debtTokenAddresses.length; i++) {
      uint price = priceFeedCached.getPrice(_priceCache, debtTokenAddresses[i]);
      entireSystemDebt = entireSystemDebt.add(poolEntries[debtTokenAddresses[i]][false].totalAmount.mul(price)); // todo should surplus or gas be excluded?
    }
    return entireSystemDebt;
  }

  function checkRecoveryMode(
    PriceCache memory _priceCache
  ) external view override returns (bool isInRecoveryMode, uint TCR, uint entireSystemColl, uint entireSystemDebt) {
    entireSystemColl = this.getEntireSystemColl(_priceCache);
    entireSystemDebt = this.getEntireSystemDebt(_priceCache);
    TCR = LiquityMath._computeCR(entireSystemColl, entireSystemDebt);
    isInRecoveryMode = TCR < CCR;
  }

  // --- 'require' functions ---

  function _requireCallerIsBOorTroveMorSP() internal view {
    require(
      msg.sender == borrowerOperationsAddress ||
        msg.sender == troveManagerAddress ||
        msg.sender == stabilityPoolManagerAddress,
      'ActivePool: Caller is neither BorrowerOperations nor TroveManager nor StabilityPool'
    );
  }

  function _requirePositiveAmount(uint _amount) internal pure {
    require(_amount >= 0, 'DefaultPool: Amount must be positive');
  }
}
