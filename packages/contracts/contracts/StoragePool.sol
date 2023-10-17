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

    renounceOwnership();
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

    entry.poolTypes[_poolType] += _amount;
    entry.totalAmount += _amount;
    emit PoolValueUpdated(_tokenAddress, _isColl, _poolType, entry.poolTypes[_poolType]);
  }

  function subtractValue(address _tokenAddress, bool _isColl, PoolType _poolType, uint _amount) external override {
    _requireCallerIsBOorTroveMorSP();
    _subtractValue(_tokenAddress, _isColl, _poolType, _amount);
  }

  function refundValue(address _account, address _token, uint _amount) external override {
    _requireCallerIsBOorTroveMorSP();
    IERC20(_token).transfer(_account, _amount);
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

    entry.poolTypes[_poolType] -= _amount;
    entry.totalAmount -= _amount;
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

    PoolEntry storage entry = poolEntries[_tokenAddress][_isColl];

    entry.poolTypes[_fromType] -= _amount;
    emit PoolValueUpdated(_tokenAddress, _isColl, _fromType, entry.poolTypes[_fromType]);

    entry.poolTypes[_toType] += _amount;
    emit PoolValueUpdated(_tokenAddress, _isColl, _toType, entry.poolTypes[_toType]);
  }

  function getEntireSystemColl() external view returns (uint entireSystemColl) {
    IPriceFeed priceFeedCached = priceFeed;
    for (uint i = 0; i < collTokenAddresses.length; i++) {
      // TODO: should surplus or gas be excluded?
      entireSystemColl += priceFeedCached.getUSDValue(
        collTokenAddresses[i],
        poolEntries[collTokenAddresses[i]][true].totalAmount
      );
    }
  }

  function getEntireSystemDebt() external view returns (uint entireSystemDebt) {
    IPriceFeed priceFeedCached = priceFeed;
    for (uint i = 0; i < debtTokenAddresses.length; i++) {
      // TODO: should surplus or gas be excluded?
      entireSystemDebt += priceFeedCached.getUSDValue(
        debtTokenAddresses[i],
        poolEntries[debtTokenAddresses[i]][false].totalAmount
      );
    }
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

  function _requireCallerIsBOorTroveMorSP() internal view {
    if (
      msg.sender != borrowerOperationsAddress &&
      msg.sender != troveManagerAddress &&
      msg.sender != stabilityPoolManagerAddress
    ) revert NotFromBOorTroveMorSP();
  }
}
