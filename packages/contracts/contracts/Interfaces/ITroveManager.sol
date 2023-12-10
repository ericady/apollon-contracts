// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './IStabilityPool.sol';
import './IDebtToken.sol';
import './IBBase.sol';
import './IPriceFeed.sol';
import './IDebtTokenManager.sol';

// Common interface for the Trove Manager.
interface ITroveManager is IBBase {
  enum Status {
    nonExistent,
    active,
    closedByOwner,
    closedByLiquidationInNormalMode,
    closedByLiquidationInRecoveryMode
  }

  enum TroveManagerOperation {
    applyPendingRewards,
    liquidateInNormalMode,
    liquidateInRecoveryMode,
    redeemCollateral
  }

  // --- Events ---

  event TroveManagerInitialized(
    address _borrowerOperationsAddress,
    address _redemptionOperationsAddress,
    address _storagePoolAddress,
    address _stabilityPoolAddress,
    address _priceFeedAddress,
    address _debtTokenManagerAddress,
    address _collTokenManagerAddress
  );

  event TroveAppliedRewards(address _borrower, CAmount[] _appliedRewards);
  event TroveClosed(address _borrower, Status _closingState);
  event TroveIndexUpdated(address _borrower, uint _newIndex);
  event TroveCollChanged(address _borrower, address[] _collTokenAddresses);
  event LiquidationSummary(
    TokenAmount[] liquidatedDebt,
    TokenAmount[] liquidatedColl,
    uint totalStableCoinGasCompensation,
    TokenAmount[] totalCollGasCompensation
  );

  event BaseRateUpdated(uint _baseRate);
  event LastFeeOpTimeUpdated(uint _lastFeeOpTime);
  event TotalStakesUpdated(TokenAmount[] _totalStakes);
  event SystemSnapshotsUpdated(TokenAmount[] _totalStakesSnapshot, TokenAmount[] _totalCollateralSnapshot);
  event LTermsUpdated(CAmount[] _liquidatedTokens);
  event TroveSnapshotsUpdated(CAmount[] _liquidatedTokens);

  // --- Events ---

  error NotFromBorrowerOrRedemptionOps();
  error InvalidTrove();
  error ExceedDebtBalance();
  error OnlyOneTrove();
  error ZeroAmount();
  error LessThanMCR();
  error InvalidMaxFeePercent();
  error NoLiquidatableTrove();
  error EmptyArray();

  // --- Functions ---

  function getTroveOwnersCount() external view returns (uint);

  function getNominalICR(address _borrower) external returns (uint);

  function getCurrentICR(address _borrower) external view returns (uint ICR, uint currentDebtInUSD);

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
      uint troveCollInUSD,
      uint troveDebtInUSD,
      uint troveDebtInUSDWithoutGasCompensation
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

  function getTroveRepayableDebt(address _borrower, address _debtTokenAddress) external view returns (uint amount);

  function getTroveColl(address _borrower) external view returns (TokenAmount[] memory);

  function getTroveWithdrawableColl(address _borrower, address _collTokenAddress) external view returns (uint amount);

  function getTroveStakes(address _borrower, address _token) external view returns (uint);

  function setTroveStatus(address _borrower, uint num) external;

  function getTroveStakeValue(address _borrower) external view returns (uint);

  function increaseTroveColl(address _borrower, TokenAmount[] memory _collTokenAmounts) external;

  function decreaseTroveColl(address _borrower, TokenAmount[] memory _collTokenAmounts) external;

  function increaseTroveDebt(address _borrower, DebtTokenAmount[] memory _debtTokenAmounts) external;

  function decreaseTroveDebt(address _borrower, DebtTokenAmount[] memory _debtTokenAmounts) external;
}
