/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Interface, type ContractRunner } from "ethers";
import type { TroveManager, TroveManagerInterface } from "../TroveManager";

const _abi = [
  {
    inputs: [],
    name: "EmptyArray",
    type: "error",
  },
  {
    inputs: [],
    name: "ExceedDebtBalance",
    type: "error",
  },
  {
    inputs: [],
    name: "FeeExceedMaxPercentage",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidMaxFeePercent",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidTrove",
    type: "error",
  },
  {
    inputs: [],
    name: "LessThanMCR",
    type: "error",
  },
  {
    inputs: [],
    name: "NoLiquidatableTrove",
    type: "error",
  },
  {
    inputs: [],
    name: "NotContract",
    type: "error",
  },
  {
    inputs: [],
    name: "NotFromBorrowerOrRedemptionOps",
    type: "error",
  },
  {
    inputs: [],
    name: "OnlyOneTrove",
    type: "error",
  },
  {
    inputs: [],
    name: "ZeroAddress",
    type: "error",
  },
  {
    inputs: [],
    name: "ZeroAmount",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "_baseRate",
        type: "uint256",
      },
    ],
    name: "BaseRateUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "tokenAddress",
            type: "address",
          },
          {
            internalType: "bool",
            name: "isColl",
            type: "bool",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
        ],
        indexed: false,
        internalType: "struct IBase.CAmount[]",
        name: "_liquidatedTokens",
        type: "tuple[]",
      },
    ],
    name: "LTermsUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "_lastFeeOpTime",
        type: "uint256",
      },
    ],
    name: "LastFeeOpTimeUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "tokenAddress",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
        ],
        indexed: false,
        internalType: "struct IBase.TokenAmount[]",
        name: "liquidatedDebt",
        type: "tuple[]",
      },
      {
        components: [
          {
            internalType: "address",
            name: "tokenAddress",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
        ],
        indexed: false,
        internalType: "struct IBase.TokenAmount[]",
        name: "liquidatedColl",
        type: "tuple[]",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "totalStableCoinGasCompensation",
        type: "uint256",
      },
      {
        components: [
          {
            internalType: "address",
            name: "tokenAddress",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
        ],
        indexed: false,
        internalType: "struct IBase.TokenAmount[]",
        name: "totalCollGasCompensation",
        type: "tuple[]",
      },
    ],
    name: "LiquidationSummary",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "tokenAddress",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
        ],
        indexed: false,
        internalType: "struct IBase.TokenAmount[]",
        name: "_totalStakesSnapshot",
        type: "tuple[]",
      },
      {
        components: [
          {
            internalType: "address",
            name: "tokenAddress",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
        ],
        indexed: false,
        internalType: "struct IBase.TokenAmount[]",
        name: "_totalCollateralSnapshot",
        type: "tuple[]",
      },
    ],
    name: "SystemSnapshotsUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "tokenAddress",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
        ],
        indexed: false,
        internalType: "struct IBase.TokenAmount[]",
        name: "_totalStakes",
        type: "tuple[]",
      },
    ],
    name: "TotalStakesUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "_borrower",
        type: "address",
      },
      {
        components: [
          {
            internalType: "address",
            name: "tokenAddress",
            type: "address",
          },
          {
            internalType: "bool",
            name: "isColl",
            type: "bool",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
        ],
        indexed: false,
        internalType: "struct IBase.CAmount[]",
        name: "_appliedRewards",
        type: "tuple[]",
      },
    ],
    name: "TroveAppliedRewards",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "_borrower",
        type: "address",
      },
      {
        indexed: false,
        internalType: "enum ITroveManager.Status",
        name: "_closingState",
        type: "uint8",
      },
    ],
    name: "TroveClosed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "_borrower",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address[]",
        name: "_collTokenAddresses",
        type: "address[]",
      },
    ],
    name: "TroveCollChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "_borrower",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_newIndex",
        type: "uint256",
      },
    ],
    name: "TroveIndexUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "_borrowerOperationsAddress",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "_redemptionOperationsAddress",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "_storagePoolAddress",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "_stabilityPoolAddress",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "_priceFeedAddress",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "_debtTokenManagerAddress",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "_collTokenManagerAddress",
        type: "address",
      },
    ],
    name: "TroveManagerInitialized",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "tokenAddress",
            type: "address",
          },
          {
            internalType: "bool",
            name: "isColl",
            type: "bool",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
        ],
        indexed: false,
        internalType: "struct IBase.CAmount[]",
        name: "_liquidatedTokens",
        type: "tuple[]",
      },
    ],
    name: "TroveSnapshotsUpdated",
    type: "event",
  },
  {
    inputs: [],
    name: "BETA",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "BOOTSTRAP_PERIOD",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "BORROWING_FEE_FLOOR",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "CCR",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MAX_BORROWING_FEE",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MCR",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MINUTE_DECAY_FACTOR",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "NAME",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "PERCENT_DIVISOR",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "SECONDS_IN_ONE_MINUTE",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "STABLE_COIN_GAS_COMPENSATION",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "TroveOwners",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "Troves",
    outputs: [
      {
        internalType: "enum ITroveManager.Status",
        name: "status",
        type: "uint8",
      },
      {
        internalType: "uint128",
        name: "arrayIndex",
        type: "uint128",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "_100pct",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_borrower",
        type: "address",
      },
    ],
    name: "addTroveOwnerToArray",
    outputs: [
      {
        internalType: "uint256",
        name: "index",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_borrower",
        type: "address",
      },
    ],
    name: "applyPendingRewards",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "baseRate",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "_troveArray",
        type: "address[]",
      },
    ],
    name: "batchLiquidateTroves",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "borrowerOperationsAddress",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "calcDecayedBaseRate",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "collTokenAddresses",
        type: "address[]",
      },
      {
        internalType: "address",
        name: "_borrower",
        type: "address",
      },
    ],
    name: "closeTrove",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "collTokenManager",
    outputs: [
      {
        internalType: "contract ICollTokenManager",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "debtTokenManager",
    outputs: [
      {
        internalType: "contract IDebtTokenManager",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decayBaseRateFromBorrowing",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_borrower",
        type: "address",
      },
      {
        components: [
          {
            internalType: "address",
            name: "tokenAddress",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
        ],
        internalType: "struct IBase.TokenAmount[]",
        name: "_collTokenAmounts",
        type: "tuple[]",
      },
    ],
    name: "decreaseTroveColl",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_borrower",
        type: "address",
      },
      {
        components: [
          {
            internalType: "contract IDebtToken",
            name: "debtToken",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "netDebt",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "borrowingFee",
            type: "uint256",
          },
        ],
        internalType: "struct IBBase.DebtTokenAmount[]",
        name: "_debtTokenAmounts",
        type: "tuple[]",
      },
    ],
    name: "decreaseTroveDebt",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getBaseRate",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_debtValue",
        type: "uint256",
      },
    ],
    name: "getBorrowingFee",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_debtValue",
        type: "uint256",
      },
    ],
    name: "getBorrowingFeeWithDecay",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getBorrowingRate",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getBorrowingRateWithDecay",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_borrower",
        type: "address",
      },
    ],
    name: "getCurrentICR",
    outputs: [
      {
        internalType: "uint256",
        name: "ICR",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "currentDebtInUSD",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_borrower",
        type: "address",
      },
    ],
    name: "getEntireDebtAndColl",
    outputs: [
      {
        components: [
          {
            internalType: "address",
            name: "tokenAddress",
            type: "address",
          },
          {
            internalType: "bool",
            name: "isColl",
            type: "bool",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "pendingReward",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "gasCompensation",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "toLiquidate",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "toRedistribute",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "toOffset",
            type: "uint256",
          },
        ],
        internalType: "struct IBase.RAmount[]",
        name: "amounts",
        type: "tuple[]",
      },
      {
        internalType: "uint256",
        name: "troveCollInUSD",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "troveDebtInUSD",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "troveDebtInUSDWithoutGasCompensation",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_borrower",
        type: "address",
      },
    ],
    name: "getNominalICR",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_borrower",
        type: "address",
      },
      {
        internalType: "address",
        name: "_tokenAddress",
        type: "address",
      },
      {
        internalType: "bool",
        name: "_isColl",
        type: "bool",
      },
    ],
    name: "getPendingReward",
    outputs: [
      {
        internalType: "uint256",
        name: "pendingReward",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_borrower",
        type: "address",
      },
    ],
    name: "getTroveColl",
    outputs: [
      {
        components: [
          {
            internalType: "address",
            name: "tokenAddress",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
        ],
        internalType: "struct IBase.TokenAmount[]",
        name: "colls",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_borrower",
        type: "address",
      },
    ],
    name: "getTroveDebt",
    outputs: [
      {
        components: [
          {
            internalType: "address",
            name: "tokenAddress",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
        ],
        internalType: "struct IBase.TokenAmount[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTroveOwnersCount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_borrower",
        type: "address",
      },
    ],
    name: "getTroveStake",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_borrower",
        type: "address",
      },
      {
        internalType: "address",
        name: "_token",
        type: "address",
      },
    ],
    name: "getTroveStakes",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_borrower",
        type: "address",
      },
    ],
    name: "getTroveStatus",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_borrower",
        type: "address",
      },
      {
        components: [
          {
            internalType: "address",
            name: "tokenAddress",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
        ],
        internalType: "struct IBase.TokenAmount[]",
        name: "_collTokenAmounts",
        type: "tuple[]",
      },
    ],
    name: "increaseTroveColl",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_borrower",
        type: "address",
      },
      {
        components: [
          {
            internalType: "contract IDebtToken",
            name: "debtToken",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "netDebt",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "borrowingFee",
            type: "uint256",
          },
        ],
        internalType: "struct IBBase.DebtTokenAmount[]",
        name: "_debtTokenAmounts",
        type: "tuple[]",
      },
    ],
    name: "increaseTroveDebt",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    name: "lastErrorRedistribution",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastFeeOperationTime",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_borrower",
        type: "address",
      },
    ],
    name: "liquidate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    name: "liquidatedTokens",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "priceFeed",
    outputs: [
      {
        internalType: "contract IPriceFeed",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "redemptionManagerAddress",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "collTokenAddresses",
        type: "address[]",
      },
      {
        internalType: "address",
        name: "_borrower",
        type: "address",
      },
    ],
    name: "removeStake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    name: "rewardSnapshots",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_borrowerOperationsAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_redemptionManagerAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_storagePoolAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_stabilityPoolManagerAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_priceFeedAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_debtTokenManagerAddress",
        type: "address",
      },
      {
        internalType: "address",
        name: "_collTokenManagerAddress",
        type: "address",
      },
    ],
    name: "setAddresses",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_borrower",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_num",
        type: "uint256",
      },
    ],
    name: "setTroveStatus",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "stabilityPoolManager",
    outputs: [
      {
        internalType: "contract IStabilityPoolManager",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "storagePool",
    outputs: [
      {
        internalType: "contract IStoragePool",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "totalCollateralSnapshots",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "totalStakes",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "totalStakesSnapshot",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_totalRedeemedStable",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_totalStableCoinSupply",
        type: "uint256",
      },
    ],
    name: "updateBaseRateFromRedemption",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "collTokenAddresses",
        type: "address[]",
      },
      {
        internalType: "address",
        name: "_borrower",
        type: "address",
      },
    ],
    name: "updateStakeAndTotalStakes",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_borrower",
        type: "address",
      },
    ],
    name: "updateTroveRewardSnapshots",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export class TroveManager__factory {
  static readonly abi = _abi;
  static createInterface(): TroveManagerInterface {
    return new Interface(_abi) as TroveManagerInterface;
  }
  static connect(
    address: string,
    runner?: ContractRunner | null
  ): TroveManager {
    return new Contract(address, _abi, runner) as unknown as TroveManager;
  }
}
