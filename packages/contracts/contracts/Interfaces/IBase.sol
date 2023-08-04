// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface IBase {
  enum PoolType {
    Active, // assets in active troves
    Default, // assets from redistributions, which are not yet claimed by the trove owners
    GasCompensation // stableCoin from gas compensation
  }

  struct RAmount {
    address tokenAddress;
    uint price; // todo not defined yet
    bool isColl; // coll or debt token
    uint amount; // initial value in trove
    uint pendingReward; // gained rewards since deposit
    uint gasCompensation; // gas compensation for liquidation
    uint toLiquidate; // amount + pendingReward - gasCompensation
    uint toRedistribute;
    uint toOffset;
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

  struct PriceTokenAmount {
    address tokenAddress;
    uint price;
    uint coll; // todo rename to amount....
  }

  struct PriceCache {
    TokenAmount[] prices;
  }
}
