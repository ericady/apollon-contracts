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

  struct SingleRedemptionVariables {
    TokenAmount stableCoinEntry;
    //
    uint stableCoinLot; // redeemer pays for the debts of the trove owner
    TokenAmount[] collLots; // will be removed from the troves coll and paid to the redeemer
    //
    uint troveCollInUSD;
    uint troveDebtInUSD;
    uint resultingCR;
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
  event RedeemedFromTrove(address _borrower, uint stableAmount, TokenAmount[] _drawnCollAmounts);
  event SuccessfulRedemption(
    uint _attemptedStableAmount,
    uint _actualStableAmount,
    RedemptionCollAmount[] _collPayouts
  );

  // --- Errors ---

  error ZeroAmount();
  error InvalidMaxFeePercent();
  error LessThanMCR();
  error ExceedDebtBalance();
  error NoRedeems();
  error GreaterThanTCR();
  error TooHighRedeemFee();
  error InvalidRedemptionHint();
  error HintUnknown();
  error HintBelowMCR();
  error InvalidHintLowerCRExists();

  // --- Functions ---

  function redeemCollateral(
    uint _stableCoinAmount,
    RedeemIteration[] memory _iterations,
    uint _maxFeePercentage
  ) external;

  function calculateTroveRedemption(
    address _borrower,
    uint _redeemMaxAmount,
    bool _includePendingRewards
  ) external returns (SingleRedemptionVariables memory vars);

  function getRedemptionRate() external view returns (uint);

  function getRedemptionRateWithDecay() external view returns (uint);

  function getRedemptionFeeWithDecay(uint _ETHDrawn) external view returns (uint);
}
