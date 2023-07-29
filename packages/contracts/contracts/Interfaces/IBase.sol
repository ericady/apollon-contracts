// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface IBase {
  enum PoolType {
    Active, // assets in active troves
    Default, // assets from redistributions, which are not yet claimed
    Surplus, // collateral from troves, which got fully redeamed (due to its initial over-collateralization)
    GasCompensation // stableCoin from gas compensation
  }

  struct RAmount {
    address tokenAddress;
    bool isColl; // coll or debt token
    uint amount; // initial value in trove
    uint pendingReward; // gained rewards since deposit
    uint gasCompensation; // gas compensation for liquidation
    uint toLiquidate; // amount + pendingReward - gasCompensation
    uint toRedistribute;
  }

  struct CAmount {
    address tokenAddress;
    bool isColl; // coll or debt token
    uint amount;
  }

  struct TokenAmount {
    address tokenAddress;
    uint amount;
  }

  struct CollTokenAmount {
    address tokenAddress;
    uint price;
    uint coll;
  }

  struct PriceCache {
    TokenAmount[] prices;
  }
}
