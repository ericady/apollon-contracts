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
  address public storagePoolAddress;
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

    storagePoolAddress = _storagePoolAddress;
    emit StoragePoolAddressChanged(_storagePoolAddress);

    debtTokenManagerAddress = _debtTokenManagerAddress;
    emit DebtTokenManagerAddressChanged(_debtTokenManagerAddress);

    // todo addDebtToken should be still callable...
    //    _renounceOwnership();
  }

  // --- Getters ---

  function getStabilityPool(IDebtToken _debtToken) external view returns (IStabilityPool) {
    IStabilityPool stabilityPool = stabilityPools[_debtToken];
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

  // --- Setters ---

  function addStabilityPool(IDebtToken _debtToken) external override {
    require(msg.sender == debtTokenManagerAddress, 'unauthorized');
    require(address(stabilityPools[_debtToken]) == address(0), 'pool already exists');

    IStabilityPool stabilityPool = new StabilityPool(
      troveManagerAddress,
      priceFeedAddress,
      storagePoolAddress,
      address(_debtToken)
    );

    stabilityPools[_debtToken] = stabilityPool;
    stabilityPoolsArray.push(stabilityPool);
    emit StabilityPoolAdded(stabilityPool);
  }
}
