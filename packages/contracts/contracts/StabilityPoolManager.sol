// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './Interfaces/IDebtToken.sol';
import './Dependencies/Ownable.sol';
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
    emit TroveManagerAddressChanged(_troveManagerAddress);

    priceFeedAddress = _priceFeedAddress;
    emit PriceFeedAddressChanged(_priceFeedAddress);

    storagePool = IStoragePool(_storagePoolAddress);
    emit StoragePoolAddressChanged(_storagePoolAddress);

    debtTokenManagerAddress = _debtTokenManagerAddress;
    emit DebtTokenManagerAddressChanged(_debtTokenManagerAddress);

    // todo addDebtToken should be still callable...
    //    _renounceOwnership();
  }

  // --- Getters ---

  function getStabilityPool(IDebtToken _debtToken) external view override returns (IStabilityPool) {
    IStabilityPool stabilityPool = stabilityPools[_debtToken];
    require(address(stabilityPool) != address(0), 'pool does not exist');
    return stabilityPool;
  }

  function getStabilityPoolByAddress(address _debtTokenAddress) external view override returns (IStabilityPool) {
    IStabilityPool stabilityPool = stabilityPools[IDebtToken(_debtTokenAddress)];
    require(address(stabilityPool) != address(0), 'pool does not exist');
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
    for (uint i = 0; i < _debts.length; i++) {
      IDebtToken debtToken = IDebtToken(_debts[i].tokenAddress);
      IStabilityPool stabilityPool = stabilityPools[debtToken];
      require(address(stabilityPool) != address(0), 'pool does not exist');

      stabilityPool.provideToSP(msg.sender, _debts[i].amount);
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
        // todo there is no coll gained on stability pool offset -> has to be a bug!
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
    require(msg.sender == debtTokenManagerAddress, 'unauthorized');
    require(address(stabilityPools[_debtToken]) == address(0), 'pool already exists');

    IStabilityPool stabilityPool = new StabilityPool(
      address(this),
      troveManagerAddress,
      priceFeedAddress,
      address(storagePool),
      address(_debtToken)
    );

    stabilityPools[_debtToken] = stabilityPool;
    stabilityPoolsArray.push(stabilityPool);
    emit StabilityPoolAdded(stabilityPool);
  }

  function _requireCallerIsTroveManager() internal view {
    require(msg.sender == troveManagerAddress, 'StabilityPool: Caller is not TroveManager');
  }
}
