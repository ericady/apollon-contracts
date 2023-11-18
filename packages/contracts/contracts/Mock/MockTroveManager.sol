// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '../TroveManager.sol';

/* Tester contract inherits from TroveManager, and provides external functions 
for testing the parent's internal functions. */

contract MockTroveManager is TroveManager {
  function computeICR(uint _coll, uint _debt) external pure returns (uint) {
    return LiquityMath._computeCR(_coll, _debt);
  }

  function getCollGasCompensation(uint _coll) external pure returns (uint) {
    return _getCollGasCompensation(_coll);
  }

  function getLiquidatedTokens(address tokenAddress, bool isColl) external view returns (uint) {
    return liquidatedTokens[tokenAddress][isColl];
  }

  //  function unprotectedDecayBaseRateFromBorrowing() external returns (uint) {
  //    baseRate = this.calcDecayedBaseRate();
  //    assert(baseRate >= 0 && baseRate <= DECIMAL_PRECISION);
  //
  //    _updateLastFeeOpTime();
  //    return baseRate;
  //  }
  //
  //  function minutesPassedSinceLastFeeOp() external view returns (uint) {
  //    return _minutesPassedSinceLastFeeOp();
  //  }
  //
  //  function setLastFeeOpTimeToNow() external {
  //    lastFeeOperationTime = block.timestamp;
  //  }
  //
  //  function setBaseRate(uint _baseRate) external {
  //    baseRate = _baseRate;
  //  }
  //
  //  function callInternalRemoveTroveOwner(address _troveOwner) external {
  //    uint troveOwnersArrayLength = TroveOwners.length;
  //    _removeTroveOwner(_troveOwner, troveOwnersArrayLength);
  //  }
}
