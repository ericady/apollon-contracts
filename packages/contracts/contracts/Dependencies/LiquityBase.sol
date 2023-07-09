// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "./LiquityMath.sol";
import "../Interfaces/IBase.sol";

/* 
* Base contract for TroveManager, BorrowerOperations and StabilityPool. Contains global system constants and
* common functions. 
*/
contract LiquityBase is IBase {
    using SafeMath for uint;

    uint internal constant DECIMAL_PRECISION = 1e18;
    uint constant public _100pct = 1000000000000000000; // 1e18 == 100%
    uint constant public MCR = 1100000000000000000; // 110%, Minimum collateral ratio for individual troves
    uint constant public CCR = 1500000000000000000; // 150%, Critical system collateral ratio. If the system's total collateral ratio (TCR) falls below the CCR, Recovery Mode is triggered.
    uint constant public STABLE_COIN_GAS_COMPENSATION = 200e18; // Amount of LUSD to be locked in gas pool on opening troves
    uint constant public MIN_NET_DEBT = 1800e18; // Minimum amount of net LUSD debt a trove must have
    uint constant public PERCENT_DIVISOR = 200; // dividing by 200 yields 0.5%
    uint constant public BORROWING_FEE_FLOOR = DECIMAL_PRECISION / 1000 * 5; // 0.5%

    // Return the coll amount of to be drawn from a trove's collateral and sent as gas compensation.
    function _getCollGasCompensation(uint _collAmount) internal pure returns (uint) {
        return _collAmount / PERCENT_DIVISOR;
    }

    function _requireUserAcceptsFee(uint _fee, uint _amount, uint _maxFeePercentage) internal pure {
        uint feePercentage = _fee.mul(DECIMAL_PRECISION).div(_amount);
        require(feePercentage <= _maxFeePercentage, "Fee exceeded provided maximum");
    }
}
