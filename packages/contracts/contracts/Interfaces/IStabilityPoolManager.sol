// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "./IBBase.sol";

interface IStabilityPoolManager is IBBase {
    event StabilityPoolAdded(IStabilityPool _stabilityPool);

    function getRemainingStability(
        address[] memory collTokenAddresses
    ) external view returns (RemainingStability[] memory);
}
