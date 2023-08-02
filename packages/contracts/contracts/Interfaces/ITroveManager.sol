// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './IStabilityPool.sol';
import './IDebtToken.sol';
import './IBBase.sol';

// Common interface for the Trove Manager.
interface ITroveManager is IBBase {
  enum TroveManagerOperation {
    applyPendingRewards,
    liquidateInNormalMode,
    liquidateInRecoveryMode,
    redeemCollateral
  }

  // --- Events ---

  event BorrowerOperationsAddressChanged(address _newBorrowerOperationsAddress);
  event PriceFeedAddressChanged(address _newPriceFeedAddress);
  event DebtTokenManagerAddressChanged(address _newDebtTokenManagerAddress);
  event StoragePoolAddressChanged(address _storagePoolAddress);
  event StabilityPoolManagerAddressChanged(address _stabilityPoolManagerAddress);
  event SortedTrovesAddressChanged(address _sortedTrovesAddress);

  event Liquidation(uint _liquidatedDebt, uint _liquidatedColl, uint _collGasCompensation, uint _LUSDGasCompensation);
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

  // --- Functions ---

  function getTroveOwnersCount() external view returns (uint);

  function getTroveFromTroveOwnersArray(uint _index) external view returns (address);

  function getNominalICR(address _borrower, PriceCache memory _priceCache) external returns (uint);

  function getCurrentICR(
    address _borrower,
    PriceCache memory _priceCache
  ) external returns (uint ICR, uint currentDebtInStable);

  function liquidate(address _borrower) external;

  //    function liquidateTroves(uint _n) external;
  function batchLiquidateTroves(address[] calldata _troveArray) external;

  //    function redeemCollateral(
  //        uint _LUSDAmount,
  //        address _firstRedemptionHint,
  //        address _upperPartialRedemptionHint,
  //        address _lowerPartialRedemptionHint,
  //        uint _partialRedemptionHintNICR,
  //        uint _maxIterations,
  //        uint _maxFee
  //    ) external;
  function updateStakeAndTotalStakes(address _borrower) external;

  function updateTroveRewardSnapshots(address _borrower) external;

  function addTroveOwnerToArray(address _borrower) external returns (uint index);

  function applyPendingRewards(address _borrower) external;

  function hasPendingRewards(address _borrower) external view returns (bool);

  function getEntireDebtAndColl(address _borrower) external view returns (RAmount[] memory amounts);

  function closeTrove(address _borrower) external;

  function removeStake(address _borrower) external;

  function getRedemptionRate() external view returns (uint);

  function getRedemptionRateWithDecay() external view returns (uint);

  function getRedemptionFeeWithDecay(uint _ETHDrawn) external view returns (uint);

  function getBorrowingRate() external view returns (uint);

  function getBorrowingRateWithDecay() external view returns (uint);

  function getBorrowingFee(uint LUSDDebt) external view returns (uint);

  function getBorrowingFeeWithDecay(uint _LUSDDebt) external view returns (uint);

  function decayBaseRateFromBorrowing() external;

  function getTroveStatus(address _borrower) external view returns (uint);

  function getTroveStake(address _borrower) external view returns (uint);

  function getTroveDebt(address _borrower) external view returns (TokenAmount[] memory);

  function getTroveColl(address _borrower) external view returns (TokenAmount[] memory);

  function setTroveStatus(address _borrower, uint num) external;

  function increaseTroveColl(address _borrower, PriceTokenAmount[] memory _collTokenAmounts) external;

  function decreaseTroveColl(address _borrower, PriceTokenAmount[] memory _collTokenAmounts) external;

  function increaseTroveDebt(address _borrower, DebtTokenAmount[] memory _debtTokenAmounts) external;

  function decreaseTroveDebt(address _borrower, DebtTokenAmount[] memory _debtTokenAmounts) external;
}
