// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '../BorrowerOperations.sol';

/* Tester contract inherits from TroveManager, and provides external functions 
for testing the parent's internal functions. */

contract MockBorrowerOperations is BorrowerOperations {
  function increaseDebts(TokenAmount[] memory _debts, MintMeta memory _meta) external {
    // separate minting is allowed for better testing
    // _requireCallerIsSwapOperations();

    _increaseDebt(msg.sender, msg.sender, _debts, _meta);
  }

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

  // TROVE MANAGER TESTER PROXIES

  function testTroveManager_increaseTroveDebt(address _borrower, DebtTokenAmount[] memory _debtTokenAmounts) external {
    troveManager.increaseTroveDebt(_borrower, _debtTokenAmounts);
  }

  function testTroveManager_setTroveStatus(address _borrower, uint _num) external {
    troveManager.setTroveStatus(_borrower, _num);
  }

  function testTroveManager_closeTrove(PriceCache memory _priceCache, address _borrower) external {
    troveManager.closeTroveByProtocol(_priceCache, _borrower, Status.closedByOwner);
  }
}
