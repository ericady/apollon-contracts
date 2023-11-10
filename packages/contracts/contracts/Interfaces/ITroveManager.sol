// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './IStabilityPool.sol';
import './IDebtToken.sol';
import './IBBase.sol';
import './IPriceFeed.sol';
import './IDebtTokenManager.sol';

// Common interface for the Trove Manager.
interface ITroveManager is IBBase {
  enum TroveManagerOperation {
    applyPendingRewards,
    liquidateInNormalMode,
    liquidateInRecoveryMode,
    redeemCollateral
  }

  // --- Events ---

  event RedemptionManagerAddressChanged(address _newRedemptionManagerAddress);
  event BorrowerOperationsAddressChanged(address _newBorrowerOperationsAddress);
  event PriceFeedAddressChanged(address _newPriceFeedAddress);
  event DebtTokenManagerAddressChanged(address _newDebtTokenManagerAddress);
  event CollTokenManagerAddressChanged(address _newCollTokenManagerAddress);
  event StoragePoolAddressChanged(address _storagePoolAddress);
  event StabilityPoolManagerAddressChanged(address _stabilityPoolManagerAddress);

  event Liquidation(
    TokenAmount[] liquidatedDebt,
    TokenAmount[] liquidatedColl,
    uint totalStableCoinGasCompensation,
    TokenAmount[] totalCollGasCompensation
  );
  event Redemption(uint _attemptedLUSDAmount, uint _actualLUSDAmount, uint _ETHSent, uint _ETHFee);
  event TroveUpdated(address indexed _borrower, uint _debt, uint _coll, uint _stake, TroveManagerOperation _operation);
  event TroveLiquidated(address indexed _borrower, uint _debt, uint _coll, TroveManagerOperation _operation);
  event BaseRateUpdated(uint _baseRate);
  event LastFeeOpTimeUpdated(uint _lastFeeOpTime);
  event TotalStakesUpdated(uint _newTotalStakes);
  event SystemSnapshotsUpdated(uint _totalStakesSnapshot, uint _totalCollateralSnapshot);
  event LTermsUpdated(uint _L_ETH, uint _L_LUSDDebt);
  event TroveSnapshotsUpdated(uint _L_ETH, uint _L_LUSDDebt);
  event TroveIndexUpdated(address _borrower, uint _newIndex);

  error NotFromBorrowerOrRedemptionOps();
  error InvalidTrove();
  error ExceedDebtBalance();
  error OnlyOneTrove();
  error ZeroAmount();
  error LessThanMCR();
  error GreaterThanTCR();
  error InvalidMaxFeePercent();
  error NoLiquidatableTrove();
  error EmptyArray();

  // --- Functions ---

  function getTroveOwnersCount() external view returns (uint);

  function getNominalICR(address _borrower) external returns (uint);

  function getCurrentICR(address _borrower) external view returns (uint ICR, uint currentDebtInStable);

  function liquidate(address _borrower) external;

  function batchLiquidateTroves(address[] calldata _troveArray) external;

  function updateStakeAndTotalStakes(address[] memory collTokenAddresses, address _borrower) external;

  function updateTroveRewardSnapshots(address _borrower) external;

  function calcDecayedBaseRate() external view returns (uint);

  function updateBaseRateFromRedemption(uint _totalRedeemedStable, uint _totalStableCoinSupply) external;

  function addTroveOwnerToArray(address _borrower) external returns (uint index);

  function applyPendingRewards(address _borrower) external;

  function getPendingReward(
    address _borrower,
    address _tokenAddress,
    bool _isColl
  ) external view returns (uint pendingReward);

  function getEntireDebtAndColl(
    address _borrower
  )
    external
    view
    returns (
      RAmount[] memory amounts,
      uint troveCollInStable,
      uint troveDebtInStable,
      uint troveDebtInStableWithoutGasCompensation
    );

  function closeTrove(address[] memory collTokenAddresses, address _borrower) external;

  function removeStake(address[] memory collTokenAddresses, address _borrower) external;

  function getBaseRate() external view returns (uint);

  function getBorrowingRate() external view returns (uint);

  function getBorrowingRateWithDecay() external view returns (uint);

  function getBorrowingFee(uint LUSDDebt) external view returns (uint);

  function getBorrowingFeeWithDecay(uint _LUSDDebt) external view returns (uint);

  function decayBaseRateFromBorrowing() external;

  function getTroveStatus(address _borrower) external view returns (uint);

  function getTroveDebt(address _borrower) external view returns (TokenAmount[] memory);

  function getTroveColl(address _borrower) external view returns (TokenAmount[] memory);

  function getTroveStakes(address _borrower, address _token) external view returns (uint);

  function setTroveStatus(address _borrower, uint num) external;

  function getTroveStake(address _borrower) external view returns (uint);

  function increaseTroveColl(address _borrower, TokenAmount[] memory _collTokenAmounts) external;

  function decreaseTroveColl(address _borrower, TokenAmount[] memory _collTokenAmounts) external;

  function increaseTroveDebt(address _borrower, DebtTokenAmount[] memory _debtTokenAmounts) external;

  function decreaseTroveDebt(address _borrower, DebtTokenAmount[] memory _debtTokenAmounts) external;
}
