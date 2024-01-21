// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './IDebtToken.sol';
import './IBBase.sol';
import './IPriceFeed.sol';
import './IDebtTokenManager.sol';

interface IRedemptionOperations is IBBase {
  // --- structs ---

  struct RedemptionCollAmount {
    address collToken;
    uint drawn;
    uint redemptionFee;
    uint sendToRedeemer;
  }

  struct RedeemIteration {
    address trove;
    address upperHint;
    address lowerHint;
    uint expectedCR;
  }

  // --- Events ---

  event RedemptionOperationsInitialized(
    address _troveManager,
    address _storgePool,
    address _priceFeed,
    address _debtTokenManager,
    address _collTokenManager,
    address _sortedTrovesAddress
  );
  event SuccessfulRedemption(
    uint _attemptedStableAmount,
    uint _actualStableAmount,
    RedemptionCollAmount[] _collPayouts
  );
  event RedeemedFromTrove(address _borrower, uint stableAmount, TokenAmount[] _drawnCollAmounts);

  // --- Errors ---

  error ZeroAmount();
  error InvalidMaxFeePercent();
  error LessThanMCR();
  error ExceedDebtBalance();
  error NoRedeems();
  error GreaterThanTCR();
  error TooHighRedeemFee();
  error InvalidRedemptionHint();

  // --- Functions ---

  function redeemCollateral(
    uint _stableCoinAmount,
    uint _maxFeePercentage,
    RedeemIteration[] memory _iterations
  ) external;

  function getRedemptionRate() external view returns (uint);

  function getRedemptionRateWithDecay() external view returns (uint);

  function getRedemptionFeeWithDecay(uint _ETHDrawn) external view returns (uint);
}
