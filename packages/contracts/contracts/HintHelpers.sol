// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/access/Ownable.sol';
import './Interfaces/ITroveManager.sol';
import './Interfaces/ISortedTroves.sol';
import './Dependencies/LiquityBase.sol';
import './Dependencies/CheckContract.sol';

contract HintHelpers is LiquityBase, Ownable(msg.sender), CheckContract {
  string public constant NAME = 'HintHelpers';

  ISortedTroves public sortedTroves;
  ITroveManager public troveManager;

  // --- Events ---

  event HintHelpersInitialized(address _sortedTrovesAddress, address _troveManagerAddress);

  // --- Dependency setters ---

  function setAddresses(address _sortedTrovesAddress, address _troveManagerAddress) external onlyOwner {
    checkContract(_sortedTrovesAddress);
    checkContract(_troveManagerAddress);

    sortedTroves = ISortedTroves(_sortedTrovesAddress);
    troveManager = ITroveManager(_troveManagerAddress);

    emit HintHelpersInitialized(_sortedTrovesAddress, _troveManagerAddress);
    renounceOwnership();
  }

  // --- Functions ---

  /* getApproxHint() - return address of a Trove that is, on average, (length / numTrials) positions away in the
    sortedTroves list from the correct insert position of the Trove to be inserted.

    Note: The output address is worst-case O(n) positions away from the correct insert position, however, the function
    is probabilistic. Input can be tuned to guarantee results to a high degree of confidence, e.g:

    Submitting numTrials = k * sqrt(length), with k = 15 makes it very, very likely that the ouput address will
    be <= sqrt(length) positions away from the correct insert position.
    */
  function getApproxHint(
    uint _CR,
    uint _numTrials,
    uint _inputRandomSeed
  ) external view returns (address hintAddress, uint diff, uint latestRandomSeed) {
    uint arrayLength = sortedTroves.getSize();
    if (arrayLength == 0) return (address(0), 0, _inputRandomSeed);

    hintAddress = sortedTroves.getLast();
    diff = LiquityMath._getAbsoluteDifference(_CR, sortedTroves.getUsedCR(hintAddress));
    latestRandomSeed = _inputRandomSeed;

    uint i = 1;
    while (i < _numTrials) {
      latestRandomSeed = uint(keccak256(abi.encodePacked(latestRandomSeed)));

      uint arrayIndex = latestRandomSeed % arrayLength;
      address currentAddress = sortedTroves.getByIndex(arrayIndex);

      // check if abs(current - CR) > abs(closest - CR), and update closest if current is closer
      uint currentDiff = LiquityMath._getAbsoluteDifference(_CR, sortedTroves.getUsedCR(currentAddress));
      if (currentDiff < diff) {
        diff = currentDiff;
        hintAddress = currentAddress;
      }

      i++;
    }
  }
}
