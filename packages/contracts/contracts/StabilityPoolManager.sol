// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/access/Ownable.sol';
import './Interfaces/IDebtToken.sol';
import './Dependencies/CheckContract.sol';
import './Interfaces/IDebtTokenManager.sol';
import './Dependencies/LiquityBase.sol';
import './Interfaces/IStabilityPool.sol';
import './Interfaces/IStabilityPoolManager.sol';
import './Interfaces/ITroveManager.sol';
import './Interfaces/IStoragePool.sol';
import './Interfaces/IReservePool.sol';
import './Interfaces/IPriceFeed.sol';
import './StabilityPool.sol';

contract StabilityPoolManager is Ownable(msg.sender), CheckContract, IStabilityPoolManager {
  string public constant NAME = 'StabilityPoolManager';

  address public troveManagerAddress;
  IStoragePool public storagePool;
  IReservePool public reservePool;
  IPriceFeed public priceFeed;
  address public debtTokenManagerAddress;

  // --- Data structures ---

  mapping(IDebtToken => IStabilityPool) public stabilityPools;
  IStabilityPool[] public stabilityPoolsArray;

  // --- Dependency setter ---

  function setAddresses(
    address _troveManagerAddress,
    address _priceFeedAddress,
    address _storagePoolAddress,
    address _reservePoolAddress,
    address _debtTokenManagerAddress
  ) external onlyOwner {
    checkContract(_troveManagerAddress);
    checkContract(_priceFeedAddress);
    checkContract(_storagePoolAddress);
    checkContract(_reservePoolAddress);
    checkContract(_debtTokenManagerAddress);

    troveManagerAddress = _troveManagerAddress;
    priceFeed = IPriceFeed(_priceFeedAddress);
    storagePool = IStoragePool(_storagePoolAddress);
    reservePool = IReservePool(_reservePoolAddress);
    debtTokenManagerAddress = _debtTokenManagerAddress;

    emit StabilityPoolManagerInitiated(
      _troveManagerAddress,
      _storagePoolAddress,
      _reservePoolAddress,
      _debtTokenManagerAddress,
      _priceFeedAddress
    );

    renounceOwnership();
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

  function getTotalDeposit(address _debtTokenAddress) external view returns (uint amount) {
    IStabilityPool pool = stabilityPools[IDebtToken(_debtTokenAddress)];
    if (address(pool) == address(0)) return 0;
    return pool.getTotalDeposit();
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

  function getDepositorDeposits(address _depositor) external view override returns (TokenAmount[] memory deposits) {
    deposits = new TokenAmount[](stabilityPoolsArray.length);
    for (uint i = 0; i < stabilityPoolsArray.length; i++) {
      deposits[i] = TokenAmount(
        address(stabilityPoolsArray[i].getDepositToken()),
        stabilityPoolsArray[i].getDepositorDeposit(_depositor)
      );
    }

    return deposits;
  }

  function getDepositorDeposit(
    address _depositor,
    address _debtTokenAddress
  ) external view override returns (uint amount) {
    IStabilityPool pool = stabilityPools[IDebtToken(_debtTokenAddress)];
    if (address(pool) == address(0)) return 0;
    return pool.getDepositorDeposit(_depositor);
  }

  function getDepositorCompoundedDeposit(
    address _depositor,
    address _debtTokenAddress
  ) external view override returns (uint amount) {
    IStabilityPool pool = stabilityPools[IDebtToken(_debtTokenAddress)];
    if (address(pool) == address(0)) return 0;
    return pool.getCompoundedDebtDeposit(_depositor);
  }

  function getDepositorCollGains(
    address _depositor,
    address[] memory collTokenAddresses
  ) external view override returns (TokenAmount[] memory collGains) {
    collGains = new TokenAmount[](collTokenAddresses.length);
    for (uint i = 0; i < collTokenAddresses.length; i++) {
      for (uint ii = 0; ii < stabilityPoolsArray.length; ii++) {
        collGains[i] = TokenAmount(
          address(stabilityPoolsArray[ii].getDepositToken()),
          stabilityPoolsArray[ii].getDepositorCollGain(_depositor, collTokenAddresses[i])
        );
      }
    }

    return collGains;
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

      // Burn the debt that was successfully offset
      remainingStability.stabilityPool.getDepositToken().burn(stabilityPoolAddress, remainingStability.debtToOffset);

      // move the coll from the active pool into the stability pool
      IDebtToken stableDebt = reservePool.stableDebtToken();
      IERC20 govToken = reservePool.govToken();
      uint stableCollIndex = remainingStability.collGained.length; // out range index as default
      uint govTokenCollIndex = remainingStability.collGained.length;

      for (uint ii = 0; ii < remainingStability.collGained.length; ii++) {
        if (remainingStability.collGained[ii].tokenAddress == address(stableDebt)) stableCollIndex = ii;
        if (remainingStability.collGained[ii].tokenAddress == address(govToken)) govTokenCollIndex = ii;
        if (remainingStability.collGained[ii].amount == 0) continue;

        storagePoolCached.withdrawalValue(
          stabilityPoolAddress,
          remainingStability.collGained[ii].tokenAddress,
          true,
          PoolType.Active,
          remainingStability.collGained[ii].amount
        );
      }

      // check possible loss
      uint gainedCollValue = _getGainedCollValue(remainingStability.collGained);
      uint offsetValue = priceFeed.getUSDValue(remainingStability.tokenAddress, remainingStability.debtToOffset);
      if (offsetValue > gainedCollValue) {
        // Repay loss from reserve pool
        (uint repaidGov, uint repaidStable) = reservePool.withdrawValue(
          stabilityPoolAddress,
          offsetValue - gainedCollValue
        );

        // add repaid gov token to coll gained array
        if (repaidGov > 0) {
          if (govTokenCollIndex >= remainingStability.collGained.length) {
            // govTokenCollIndex not found in prev loop, add to end of array
            TokenAmount[] memory collGained = new TokenAmount[](remainingStability.collGained.length + 1);
            for (uint ii = 0; ii < remainingStability.collGained.length; ii++) {
              collGained[ii] = remainingStability.collGained[ii];
            }
            collGained[remainingStability.collGained.length] = TokenAmount({
              tokenAddress: address(govToken),
              amount: repaidGov
            });
            remainingStability.collGained = collGained;
          } else {
            remainingStability.collGained[govTokenCollIndex].amount += repaidGov;
          }
        }
        // add repaid stableCoin to coll gained array
        if (repaidStable > 0) {
          if (stableCollIndex >= remainingStability.collGained.length) {
            // stablecoinIndex not found in prev loop, add to end of array
            TokenAmount[] memory collGained = new TokenAmount[](remainingStability.collGained.length + 1);
            for (uint ii = 1; ii < remainingStability.collGained.length; ii++) {
              collGained[ii] = remainingStability.collGained[ii];
            }
            collGained[remainingStability.collGained.length] = TokenAmount({
              tokenAddress: address(stableDebt),
              amount: repaidStable
            });
            remainingStability.collGained = collGained;
          } else {
            remainingStability.collGained[stableCollIndex].amount += repaidStable;
          }
        }
      }

      // update internal pool stake snapshots
      remainingStability.stabilityPool.offset(remainingStability.debtToOffset, remainingStability.collGained);

      // Cancel the liquidated debt with the debt in the stability pool
      storagePoolCached.subtractValue(
        remainingStability.tokenAddress,
        false,
        PoolType.Active,
        remainingStability.debtToOffset
      );
    }
  }

  function addStabilityPool(IDebtToken _debtToken) external override {
    if (msg.sender != debtTokenManagerAddress) revert Unauthorized();
    if (address(stabilityPools[_debtToken]) != address(0)) revert PoolExist();

    IStabilityPool stabilityPool = new StabilityPool(address(this), troveManagerAddress, address(_debtToken));

    stabilityPools[_debtToken] = stabilityPool;
    stabilityPoolsArray.push(stabilityPool);
    emit StabilityPoolAdded(address(stabilityPool));
  }

  function _getGainedCollValue(TokenAmount[] memory collGained) internal view returns (uint gainedValue) {
    for (uint i = 0; i < collGained.length; i++) {
      gainedValue += priceFeed.getUSDValue(collGained[i].tokenAddress, collGained[i].amount);
    }
  }

  function _requireCallerIsTroveManager() internal view {
    if (msg.sender != troveManagerAddress) revert NotFromTroveManager();
  }

  function _requireCallerIsReservePool() internal view {
    if (msg.sender != address(reservePool)) revert NotFromReservePool();
  }
}
