// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './IDebtToken.sol';
import './IBBase.sol';
import './IPriceFeed.sol';
import './IDebtTokenManager.sol';

interface IRedemptionOperations is IBBase {
  event TroveManagerAddressChanged(address _newTroveManagerAddress);
  event PriceFeedAddressChanged(address _newPriceFeedAddress);
  event DebtTokenManagerAddressChanged(address _newDebtTokenManagerAddress);
  event CollTokenManagerAddressChanged(address _newCollTokenManagerAddress);
  event StoragePoolAddressChanged(address _storagePoolAddress);

  event Redemption(uint _attemptedLUSDAmount, uint _actualLUSDAmount, uint _ETHSent, uint _ETHFee);
  event BaseRateUpdated(uint _baseRate);

  error ZeroAmount();
  error InvalidMaxFeePercent();
  error LessThanMCR();
  error ExceedDebtBalance();
  error NoRedeems();
  error GreaterThanTCR();
  error TooHighRedeemFee();

  // --- Functions ---

  function redeemCollateral(uint _stableCoinAmount, uint _maxFee, address[] memory _sourceTroves) external;

  function getRedemptionRate() external view returns (uint);

  function getRedemptionRateWithDecay() external view returns (uint);

  function getRedemptionFeeWithDecay(uint _ETHDrawn) external view returns (uint);
}
