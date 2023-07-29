// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './IDebtToken.sol';
import './IBase.sol';

interface IStabilityPool is IBase {
  // --- Events ---

  event StabilityPoolCollBalanceUpdates(
    address _tokenAddress,
    uint _newBalance
  );
  event StabilityPoolDepositBalanceUpdated(uint _newBalance);

  event TroveManagerAddressChanged(address _newTroveManagerAddress);
  event SortedTrovesAddressChanged(address _newSortedTrovesAddress);
  event PriceFeedAddressChanged(address _newPriceFeedAddress);
  event StoragePoolAddressChanged(address _newStoragePoolAddress);

  event P_Updated(uint _P);
  event S_Updated(
    address _tokenAddress,
    uint _S,
    uint128 _epoch,
    uint128 _scale
  );
  event DepositSnapshotUpdated(address indexed _depositor, uint _P, uint _S);

  //    event G_Updated(uint _G, uint128 _epoch, uint128 _scale);
  event EpochUpdated(uint128 _currentEpoch);
  event ScaleUpdated(uint128 _currentScale);

  // --- Functions ---

  function getTotalGainedColl()
    external
    view
    returns (TokenAmount[] memory coll);

  function getTotalDeposit() external view returns (uint);

  function getDepositToken() external view returns (IDebtToken);

  function provideToSP(uint _amount) external;

  function withdrawFromSP(uint _amount) external;

  function withdrawGains(address _upperHint, address _lowerHint) external;

  function offset(uint _debtToOffset, TokenAmount[] memory _collToAdd) external;

  function getDepositorCollGain(
    address _depositor,
    address _collToken
  ) external view returns (uint);

  function getCompoundedDebtDeposit(
    address _depositor
  ) external view returns (uint);
}
