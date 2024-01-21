// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface IBase {
  enum PoolType {
    Active, // assets in active troves
    Default, // assets from redistributions, which are not yet claimed by the trove owners
    GasCompensation // stableCoin from gas compensation
  }

  error FeeExceedMaxPercentage();

  struct MintMeta {
    address upperHint;
    address lowerHint;
    uint maxFeePercentage;
  }

  struct RAmount {
    address tokenAddress;
    bool isColl; // coll or debt token
    uint amount; // initial value in trove
    uint pendingReward; // gained rewards since deposit
    uint gasCompensation; // gas compensation for liquidation
    uint toLiquidate; // amount + pendingReward - gasCompensation
    uint toRedistribute; // across other open troves
    uint toOffset; // by stability pools
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
}
