// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '../BorrowerOperations.sol';

/* Tester contract inherits from BorrowerOperations, and provides external functions 
for testing the parent's internal functions. */
contract BorrowerOperationsTester is BorrowerOperations {
  //  function getNewICRFromTroveChange(
  //    uint _coll,
  //    uint _debt,
  //    uint _collChange,
  //    bool isCollIncrease,
  //    uint _debtChange,
  //    bool isDebtIncrease,
  //    uint _price
  //  ) external pure returns (uint) {
  //    return _getNewICRFromTroveChange(_coll, _debt, _collChange, isCollIncrease, _debtChange, isDebtIncrease, _price);
  //  }
  //
  //  function getNewTCRFromTroveChange(
  //    uint _collChange,
  //    bool isCollIncrease,
  //    uint _debtChange,
  //    bool isDebtIncrease,
  //    uint _price
  //  ) external view returns (uint) {
  //    return _getNewTCRFromTroveChange(_collChange, isCollIncrease, _debtChange, isDebtIncrease, _price);
  //  }
  //
  //  function getUSDValue(uint _coll, uint _price) external pure returns (uint) {
  //    return _getUSDValue(_coll, _price);
  //  }
  //
  //  function callInternalAdjustLoan(
  //    address _borrower,
  //    uint _collWithdrawal,
  //    uint _debtChange,
  //    bool _isDebtIncrease,
  //    address _upperHint,
  //    address _lowerHint
  //  ) external {
  //    _adjustTrove(_borrower, _collWithdrawal, _debtChange, _isDebtIncrease, _upperHint, _lowerHint, 0);
  //  }

  // Payable fallback function

  // STORAGE POOL TESTER PROXIES
  function testStoragePool_addValue(address _tokenAddress, bool _isColl, PoolType _poolType, uint _amount) external {
    storagePool.addValue(_tokenAddress, _isColl, _poolType, _amount);
  }

  function testStoragePool_subtractValue(
    address _tokenAddress,
    bool _isColl,
    PoolType _poolType,
    uint _amount
  ) external {
    storagePool.subtractValue(_tokenAddress, _isColl, _poolType, _amount);
  }

  function testStoragePool_transferBetweenTypes(
    address _tokenAddress,
    bool _isColl,
    PoolType _fromType,
    PoolType _toType,
    uint _amount
  ) external {
    storagePool.transferBetweenTypes(_tokenAddress, _isColl, _fromType, _toType, _amount);
  }

  function testStoragePool_withdrawalValue(
    address _receiver,
    address _tokenAddress,
    bool _isColl,
    PoolType _poolType,
    uint _amount
  ) external {
    storagePool.withdrawalValue(_receiver, _tokenAddress, _isColl, _poolType, _amount);
  }

  // DEBTTOKEN TESTER PROXIES

  function testDebtToken_mint(address _account, uint256 _amount, IDebtToken _debtToken) external {
    _debtToken.mint(_account, _amount);
  }

  function testDebtToken_burn(address _account, uint256 _amount, IDebtToken _debtToken) external {
    _debtToken.burn(_account, _amount);
  }
}
