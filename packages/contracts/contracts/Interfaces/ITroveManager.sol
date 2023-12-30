// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './IStabilityPool.sol';
import './IDebtToken.sol';
import './IBBase.sol';
import './IPriceFeed.sol';
import './IDebtTokenManager.sol';

// Common interface for the Trove Manager.
interface ITroveManager is IBBase {
  // --- Events ---

  event TroveManagerInitialized(
    address _borrowerOperationsAddress,
    address _redemptionOperationsAddress,
    address _liquidationOperationsAddress,
    address _storagePoolAddress,
    address _priceFeedAddress
  );

  event TroveAppliedRewards(address _borrower, CAmount[] _appliedRewards);
  event TroveClosed(address _borrower, Status _closingState);
  event TroveIndexUpdated(address _borrower, uint _newIndex);
  event TroveCollChanged(address _borrower, address[] _collTokenAddresses);

  event BaseRateUpdated(uint _baseRate);
  event LastFeeOpTimeUpdated(uint _lastFeeOpTime);
  event TotalStakesUpdated(TokenAmount[] _totalStakes);
  event SystemSnapshotsUpdated(TokenAmount[] _totalStakesSnapshot, TokenAmount[] _totalCollateralSnapshot);
  event LTermsUpdated(CAmount[] _liquidatedTokens);
  event TroveSnapshotsUpdated(CAmount[] _liquidatedTokens);

  // --- Errors ---

  error NotFromBorrowerOrRedemptionOps();
  error InvalidTrove();
  error ExceedDebtBalance();
  error OnlyOneTrove();
  error ZeroAmount();
  error LessThanMCR();
  error InvalidMaxFeePercent();

  // --- Functions ---

  function getTroveOwnersCount() external view returns (uint);

  function getTroveStatus(address _borrower) external view returns (uint);

  function isTroveActive(address _borrower) external view returns (bool);

  function setTroveStatus(address _borrower, uint num) external;

  //

  function getNominalICR(address _borrower) external returns (uint);

  function getCurrentICR(address _borrower) external view returns (uint ICR, uint currentDebtInUSD);

  //

  function updateStakeAndTotalStakes(address[] memory collTokenAddresses, address _borrower) external;

  function removeStake(address[] memory collTokenAddresses, address _borrower) external;

  function updateSystemSnapshots_excludeCollRemainder(TokenAmount[] memory totalCollGasCompensation) external;

  function getTroveStakes(address _borrower, address _token) external view returns (uint);

  function getTroveStakeValue(address _borrower) external view returns (uint);

  //

  function redistributeDebtAndColl(address[] memory collTokenAddresses, CAmount[] memory toRedistribute) external;

  function getPendingReward(
    address _borrower,
    address _tokenAddress,
    bool _isColl
  ) external view returns (uint pendingReward);

  function applyPendingRewards(address _borrower) external;

  function updateTroveRewardSnapshots(address _borrower) external;

  //

  function increaseTroveColl(address _borrower, TokenAmount[] memory _collTokenAmounts) external;

  function decreaseTroveColl(address _borrower, TokenAmount[] memory _collTokenAmounts) external;

  function increaseTroveDebt(address _borrower, DebtTokenAmount[] memory _debtTokenAmounts) external;

  function decreaseTroveDebt(address _borrower, DebtTokenAmount[] memory _debtTokenAmounts) external;

  //

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

  function getTroveDebt(address _borrower) external view returns (TokenAmount[] memory);

  function getTroveRepayableDebt(address _borrower, address _debtTokenAddress) external view returns (uint amount);

  function getTroveRepayableDebts(address _borrower) external view returns (TokenAmount[] memory);

  function getTroveColl(address _borrower) external view returns (TokenAmount[] memory);

  function getTroveWithdrawableColl(address _borrower, address _collTokenAddress) external view returns (uint amount);

  function getTroveWithdrawableColls(address _borrower) external view returns (TokenAmount[] memory colls);

  //

  function addTroveOwnerToArray(address _borrower) external returns (uint128 index);

  function closeTroveByProtocol(address[] memory collTokenAddresses, address _borrower, Status closedStatus) external;

  //

  function getBaseRate() external view returns (uint);

  function getBorrowingRate() external view returns (uint);

  function getBorrowingRateWithDecay() external view returns (uint);

  function getBorrowingFee(uint LUSDDebt) external view returns (uint);

  function getBorrowingFeeWithDecay(uint _LUSDDebt) external view returns (uint);

  function decayBaseRateFromBorrowing() external;

  function updateBaseRateFromRedemption(uint _totalRedeemedStable, uint _totalStableCoinSupply) external;

  function calcDecayedBaseRate() external view returns (uint);
}
