// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

contract MockTellor {
  // --- Mock price data ---

  bool didRetrieve = true; // default to a positive retrieval
  uint private updateTime;
  bool private revertRequest;
  mapping(uint => uint) private prices;

  // --- Setters for mock price data ---

  function setPrice(uint requestId, uint _price) external {
    prices[requestId] = _price;
  }

  function setDidRetrieve(bool _didRetrieve) external {
    didRetrieve = _didRetrieve;
  }

  function setUpdateTime(uint _updateTime) external {
    updateTime = _updateTime;
  }

  function setRevertRequest() external {
    revertRequest = !revertRequest;
  }

  // --- Mock data reporting functions ---

  function getTimestampbyRequestIDandIndex(uint, uint) external view returns (uint) {
    return updateTime;
  }

  function getNewValueCountbyRequestId(uint) external view returns (uint) {
    if (revertRequest) require(1 == 0, 'Tellor request reverted');
    return 2;
  }

  function retrieveData(uint256 _requestId, uint256) external view returns (uint256) {
    return prices[_requestId];
  }
}
