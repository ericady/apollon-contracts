// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "../PriceFeed.sol";

contract PriceFeedTester is PriceFeed {
    function setLastGoodPrice(uint _lastGoodPrice) external {
        lastGoodPrice = _lastGoodPrice;
    }

    function setStatus(Status _status) external {
        status = _status;
    }
}
