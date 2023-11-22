// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './Interfaces/IDebtToken.sol';
import './Dependencies/CheckContract.sol';
import './Interfaces/IDebtTokenManager.sol';
import './Dependencies/LiquityBase.sol';
import './Interfaces/IStabilityPool.sol';
import './Interfaces/IStabilityPoolManager.sol';
import './Interfaces/ITroveManager.sol';
import './Interfaces/IStoragePool.sol';
import './StabilityPool.sol';

contract StabilityPoolManager is Ownable, CheckContract, IStabilityPoolManager {
  string public constant NAME = 'StabilityPoolManager';

  address public troveManagerAddress;
  address public priceFeedAddress;
  IStoragePool public storagePool;
  address public debtTokenManagerAddress;

  // --- Data structures ---

  mapping(IDebtToken => IStabilityPool) public stabilityPools;
  IStabilityPool[] public stabilityPoolsArray;

  // --- Dependency setter ---

  function setAddresses(
    address _troveManagerAddress,
    address _priceFeedAddress,
    address _storagePoolAddress,
    address _debtTokenManagerAddress
  ) external onlyOwner {
    checkContract(_troveManagerAddress);
    checkContract(_priceFeedAddress);
    checkContract(_storagePoolAddress);
    checkContract(_debtTokenManagerAddress);

    troveManagerAddress = _troveManagerAddress;
    priceFeedAddress = _priceFeedAddress;
    storagePool = IStoragePool(_storagePoolAddress);
    debtTokenManagerAddress = _debtTokenManagerAddress;

    emit StabilityPoolManagerInitiated(
      _troveManagerAddress,
      _storagePoolAddress,
      _debtTokenManagerAddress,
      _priceFeedAddress
    );

    _renounceOwnership();
  }

  // --- Getters ---

  function getStabilityPool(IDebtToken _debtToken) external view override returns (IStabilityPool) {
    IStabilityPool stabilityPool = stabilityPools[_debtToken];
    if (address(stabilityPool) == address(0)) revert PoolNotExist();
    return stabilityPool;
  }

  function getStabilityPools() external view returns (IStabilityPool[] memory) {
    return stabilityPoolsArray;
  }

  function getRemainingStability(
    address[] memory collTokenAddresses
  ) external view override returns (RemainingStability[] memory) {
    RemainingStability[] memory remainingStability = new RemainingStability[](stabilityPoolsArray.length);

    for (uint i = 0; i < stabilityPoolsArray.length; i++) {
      TokenAmount[] memory collGained = new TokenAmount[](collTokenAddresses.length);
      for (uint a = 0; a < collTokenAddresses.length; a++) collGained[a] = TokenAmount(collTokenAddresses[a], 0);

      remainingStability[i] = RemainingStability({
        stabilityPool: stabilityPoolsArray[i],
        tokenAddress: address(stabilityPoolsArray[i].getDepositToken()),
        remaining: stabilityPoolsArray[i].getTotalDeposit(),
        debtToOffset: 0,
        collGained: collGained
      });
    }

    return remainingStability;
  }

  function getTotalDeposits() external view override returns (TokenAmount[] memory deposits) {
    deposits = new TokenAmount[](stabilityPoolsArray.length);
    for (uint i = 0; i < stabilityPoolsArray.length; i++) {
      deposits[i] = TokenAmount(
        address(stabilityPoolsArray[i].getDepositToken()),
        stabilityPoolsArray[i].getTotalDeposit()
      );
    }

    return deposits;
  }

  function getCompoundedDeposits() external view override returns (TokenAmount[] memory deposits) {
    deposits = new TokenAmount[](stabilityPoolsArray.length);
    for (uint i = 0; i < stabilityPoolsArray.length; i++) {
      deposits[i] = TokenAmount(
        address(stabilityPoolsArray[i].getDepositToken()),
        stabilityPoolsArray[i].getCompoundedDebtDeposit(msg.sender)
      );
    }

    return deposits;
  }

  // --- Setters ---

  function provideStability(TokenAmount[] memory _debts) external override {
    address user = msg.sender;

    for (uint i = 0; i < _debts.length; i++) {
      IDebtToken debtToken = IDebtToken(_debts[i].tokenAddress);
      IStabilityPool stabilityPool = stabilityPools[debtToken];
      if (address(stabilityPool) == address(0)) revert PoolNotExist();

      debtToken.sendToPool(user, address(stabilityPool), _debts[i].amount);
      stabilityPool.provideToSP(user, _debts[i].amount);
    }
  }

  function withdrawStability(TokenAmount[] memory _debts) external override {
    address user = msg.sender;

    for (uint i = 0; i < _debts.length; i++) {
      IDebtToken debtToken = IDebtToken(_debts[i].tokenAddress);
      IStabilityPool stabilityPool = stabilityPools[debtToken];
      if (address(stabilityPool) == address(0)) revert PoolNotExist();

      stabilityPool.withdrawFromSP(user, _debts[i].amount);
    }
  }

  function withdrawGains() external override {
    address user = msg.sender;

    for (uint i = 0; i < stabilityPoolsArray.length; i++) {
      IStabilityPool stabilityPool = stabilityPoolsArray[i];
      stabilityPool.withdrawGains(user);
    }
  }

  function offset(RemainingStability[] memory _toOffset) external override {
    _requireCallerIsTroveManager();

    IStoragePool storagePoolCached = storagePool;
    for (uint i = 0; i < _toOffset.length; i++) {
      RemainingStability memory remainingStability = _toOffset[i];
      address stabilityPoolAddress = address(remainingStability.stabilityPool);
      if (remainingStability.debtToOffset == 0) continue;

      // update internal pool stake snapshots
      remainingStability.stabilityPool.offset(remainingStability.debtToOffset, remainingStability.collGained);

      // Cancel the liquidated debt with the debt in the stability pool
      storagePoolCached.subtractValue(
        remainingStability.tokenAddress,
        false,
        PoolType.Active,
        remainingStability.debtToOffset
      );

      // Burn the debt that was successfully offset
      remainingStability.stabilityPool.getDepositToken().burn(stabilityPoolAddress, remainingStability.debtToOffset);

      // move the coll from the active pool into the stability pool
      for (uint ii = 0; ii < remainingStability.collGained.length; ii++) {
        if (remainingStability.collGained[ii].amount == 0) continue;
        storagePoolCached.withdrawalValue(
          stabilityPoolAddress,
          remainingStability.collGained[ii].tokenAddress,
          true,
          PoolType.Active,
          remainingStability.collGained[ii].amount
        );
      }
    }
  }

  function addStabilityPool(IDebtToken _debtToken) external override {
    if (msg.sender != debtTokenManagerAddress) revert Unauthorized();
    if (address(stabilityPools[_debtToken]) != address(0)) revert PoolExist();

    IStabilityPool stabilityPool = new StabilityPool(
      address(this),
      troveManagerAddress,
      priceFeedAddress,
      address(storagePool),
      address(_debtToken)
    );

    stabilityPools[_debtToken] = stabilityPool;
    stabilityPoolsArray.push(stabilityPool);
    emit StabilityPoolAdded(address(stabilityPool));
  }

  function _requireCallerIsTroveManager() internal view {
    if (msg.sender != troveManagerAddress) revert NotFromTroveManager();
  }
}
