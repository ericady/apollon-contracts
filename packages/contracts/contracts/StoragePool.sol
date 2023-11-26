// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './Dependencies/CheckContract.sol';
import './Dependencies/LiquityBase.sol';
import './Interfaces/IStoragePool.sol';
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
  string public constant NAME = 'StoragePool';

  address public borrowerOperationsAddress;
  address public troveManagerAddress;
  address public redemptionOperationsAddress;
  address public stabilityPoolManagerAddress;
  IPriceFeed public priceFeed;

  struct PoolEntry {
    address tokenAddress;
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
    address _redemptionOperationsAddress,
    address _stabilityPoolManagerAddress,
    address _priceFeedAddress
  ) external onlyOwner {
    checkContract(_borrowerOperationsAddress);
    checkContract(_troveManagerAddress);
    checkContract(_redemptionOperationsAddress);
    checkContract(_stabilityPoolManagerAddress);
    checkContract(_priceFeedAddress);

    borrowerOperationsAddress = _borrowerOperationsAddress;
    troveManagerAddress = _troveManagerAddress;
    redemptionOperationsAddress = _redemptionOperationsAddress;
    stabilityPoolManagerAddress = _stabilityPoolManagerAddress;
    priceFeed = IPriceFeed(_priceFeedAddress);

    emit StoragePoolInitialized(
      _borrowerOperationsAddress,
      _troveManagerAddress,
      _redemptionOperationsAddress,
      _stabilityPoolManagerAddress,
      _priceFeedAddress
    );

    renounceOwnership();
  }

  // --- Getters for public variables. Required by IPool interface ---

  function getValue(address _tokenAddress, bool _isColl, PoolType _poolType) external view override returns (uint) {
    return poolEntries[_tokenAddress][_isColl].poolTypes[_poolType];
  }

  // --- Pool functionality ---

  function addValue(address _tokenAddress, bool _isColl, PoolType _poolType, uint _amount) external override {
    _requireCallerIsBOorTroveMorSPorRO();

    PoolEntry storage entry = poolEntries[_tokenAddress][_isColl];
    if (!entry.exists) {
      poolEntries[_tokenAddress][_isColl].exists = true;
      poolEntries[_tokenAddress][_isColl].tokenAddress = _tokenAddress;

      if (_isColl) collTokenAddresses.push(_tokenAddress);
      else debtTokenAddresses.push(_tokenAddress);
    }

    entry.poolTypes[_poolType] += _amount;
    entry.totalAmount += _amount;
    emit StoragePoolValueUpdated(_tokenAddress, _isColl, _poolType, entry.poolTypes[_poolType]);
  }

  function subtractValue(address _tokenAddress, bool _isColl, PoolType _poolType, uint _amount) external override {
    _requireCallerIsBOorTroveMorSPorRO();
    _subtractValue(_tokenAddress, _isColl, _poolType, _amount);
  }

  function withdrawalValue(
    address _receiver,
    address _tokenAddress,
    bool _isColl,
    PoolType _poolType,
    uint _amount
  ) external override {
    _requireCallerIsBOorTroveMorSPorRO();
    _subtractValue(_tokenAddress, _isColl, _poolType, _amount);
    IERC20(_tokenAddress).transfer(_receiver, _amount);
    emit CollateralTokenUpdated(_tokenAddress, address(this), _receiver);
  }

  function _subtractValue(address _tokenAddress, bool _isColl, PoolType _poolType, uint _amount) internal {
    PoolEntry storage entry = poolEntries[_tokenAddress][_isColl];
    require(entry.exists, 'StoragePool: PoolEntry does not exist');

    entry.poolTypes[_poolType] -= _amount;
    entry.totalAmount -= _amount;
    emit StoragePoolValueUpdated(_tokenAddress, _isColl, _poolType, entry.poolTypes[_poolType]);
  }

  function transferBetweenTypes(
    address _tokenAddress,
    bool _isColl,
    PoolType _fromType,
    PoolType _toType,
    uint _amount
  ) external override {
    _requireCallerIsBOorTroveMorSPorRO();

    PoolEntry storage entry = poolEntries[_tokenAddress][_isColl];
    require(entry.exists, 'StoragePool: PoolEntry does not exist');

    entry.poolTypes[_fromType] -= _amount;
    emit StoragePoolValueUpdated(_tokenAddress, _isColl, _fromType, entry.poolTypes[_fromType]);

    entry.poolTypes[_toType] += _amount;
    emit StoragePoolValueUpdated(_tokenAddress, _isColl, _toType, entry.poolTypes[_toType]);
  }

  function getEntireSystemColl() external view returns (uint entireSystemColl) {
    IPriceFeed priceFeedCached = priceFeed;
    for (uint i = 0; i < collTokenAddresses.length; i++)
      entireSystemColl += priceFeedCached.getUSDValue(
        collTokenAddresses[i],
        poolEntries[collTokenAddresses[i]][true].totalAmount
      );

    return entireSystemColl;
  }

  function getEntireSystemDebt() external view returns (uint entireSystemDebt) {
    IPriceFeed priceFeedCached = priceFeed;
    for (uint i = 0; i < debtTokenAddresses.length; i++)
      entireSystemDebt += priceFeedCached.getUSDValue(
        debtTokenAddresses[i],
        poolEntries[debtTokenAddresses[i]][false].totalAmount
      );

    return entireSystemDebt;
  }

  function checkRecoveryMode()
    external
    view
    returns (bool isInRecoveryMode, uint TCR, uint entireSystemColl, uint entireSystemDebt)
  {
    entireSystemColl = this.getEntireSystemColl();
    entireSystemDebt = this.getEntireSystemDebt();
    TCR = LiquityMath._computeCR(entireSystemColl, entireSystemDebt);
    isInRecoveryMode = TCR < CCR;
  }

  // --- 'require' functions ---

  function _requireCallerIsBOorTroveMorSPorRO() internal view {
    if (
      msg.sender != borrowerOperationsAddress &&
      msg.sender != troveManagerAddress &&
      msg.sender != stabilityPoolManagerAddress &&
      msg.sender != redemptionOperationsAddress
    ) revert NotFromBOorTroveMorSP();
  }
}
