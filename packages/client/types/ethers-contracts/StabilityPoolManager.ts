/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumberish,
  BytesLike,
  FunctionFragment,
  Result,
  Interface,
  EventFragment,
  AddressLike,
  ContractRunner,
  ContractMethod,
  Listener,
} from "ethers";
import type {
  TypedContractEvent,
  TypedDeferredTopicFilter,
  TypedEventLog,
  TypedLogDescription,
  TypedListener,
  TypedContractMethod,
} from "./common";

export declare namespace IBase {
  export type TokenAmountStruct = {
    tokenAddress: AddressLike;
    amount: BigNumberish;
  };

  export type TokenAmountStructOutput = [
    tokenAddress: string,
    amount: bigint
  ] & { tokenAddress: string; amount: bigint };
}

export declare namespace IBBase {
  export type RemainingStabilityStruct = {
    stabilityPool: AddressLike;
    tokenAddress: AddressLike;
    remaining: BigNumberish;
    debtToOffset: BigNumberish;
    collGained: IBase.TokenAmountStruct[];
  };

  export type RemainingStabilityStructOutput = [
    stabilityPool: string,
    tokenAddress: string,
    remaining: bigint,
    debtToOffset: bigint,
    collGained: IBase.TokenAmountStructOutput[]
  ] & {
    stabilityPool: string;
    tokenAddress: string;
    remaining: bigint;
    debtToOffset: bigint;
    collGained: IBase.TokenAmountStructOutput[];
  };
}

export interface StabilityPoolManagerInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "NAME"
      | "addStabilityPool"
      | "debtTokenManagerAddress"
      | "getCompoundedDeposits"
      | "getRemainingStability"
      | "getStabilityPool"
      | "getStabilityPools"
      | "getTotalDeposits"
      | "offset"
      | "owner"
      | "priceFeedAddress"
      | "provideStability"
      | "renounceOwnership"
      | "setAddresses"
      | "stabilityPools"
      | "stabilityPoolsArray"
      | "storagePool"
      | "transferOwnership"
      | "troveManagerAddress"
      | "withdrawGains"
      | "withdrawStability"
  ): FunctionFragment;

  getEvent(
    nameOrSignatureOrTopic:
      | "OwnershipTransferred"
      | "StabilityPoolAdded"
      | "StabilityPoolManagerInitiated"
  ): EventFragment;

  encodeFunctionData(functionFragment: "NAME", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "addStabilityPool",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "debtTokenManagerAddress",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getCompoundedDeposits",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getRemainingStability",
    values: [AddressLike[]]
  ): string;
  encodeFunctionData(
    functionFragment: "getStabilityPool",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "getStabilityPools",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getTotalDeposits",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "offset",
    values: [IBBase.RemainingStabilityStruct[]]
  ): string;
  encodeFunctionData(functionFragment: "owner", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "priceFeedAddress",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "provideStability",
    values: [IBase.TokenAmountStruct[]]
  ): string;
  encodeFunctionData(
    functionFragment: "renounceOwnership",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "setAddresses",
    values: [AddressLike, AddressLike, AddressLike, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "stabilityPools",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "stabilityPoolsArray",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "storagePool",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "transferOwnership",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "troveManagerAddress",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "withdrawGains",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "withdrawStability",
    values: [IBase.TokenAmountStruct[]]
  ): string;

  decodeFunctionResult(functionFragment: "NAME", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "addStabilityPool",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "debtTokenManagerAddress",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getCompoundedDeposits",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getRemainingStability",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getStabilityPool",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getStabilityPools",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getTotalDeposits",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "offset", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "owner", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "priceFeedAddress",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "provideStability",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "renounceOwnership",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setAddresses",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "stabilityPools",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "stabilityPoolsArray",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "storagePool",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "transferOwnership",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "troveManagerAddress",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "withdrawGains",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "withdrawStability",
    data: BytesLike
  ): Result;
}

export namespace OwnershipTransferredEvent {
  export type InputTuple = [previousOwner: AddressLike, newOwner: AddressLike];
  export type OutputTuple = [previousOwner: string, newOwner: string];
  export interface OutputObject {
    previousOwner: string;
    newOwner: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace StabilityPoolAddedEvent {
  export type InputTuple = [stabilityPoolAddress: AddressLike];
  export type OutputTuple = [stabilityPoolAddress: string];
  export interface OutputObject {
    stabilityPoolAddress: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace StabilityPoolManagerInitiatedEvent {
  export type InputTuple = [
    troveManagerAddress: AddressLike,
    storgePoolAddress: AddressLike,
    debtTokenManagerAddress: AddressLike,
    priceFeedAddress: AddressLike
  ];
  export type OutputTuple = [
    troveManagerAddress: string,
    storgePoolAddress: string,
    debtTokenManagerAddress: string,
    priceFeedAddress: string
  ];
  export interface OutputObject {
    troveManagerAddress: string;
    storgePoolAddress: string;
    debtTokenManagerAddress: string;
    priceFeedAddress: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export interface StabilityPoolManager extends BaseContract {
  connect(runner?: ContractRunner | null): StabilityPoolManager;
  waitForDeployment(): Promise<this>;

  interface: StabilityPoolManagerInterface;

  queryFilter<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;
  queryFilter<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;

  on<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  on<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  once<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  once<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  listeners<TCEvent extends TypedContractEvent>(
    event: TCEvent
  ): Promise<Array<TypedListener<TCEvent>>>;
  listeners(eventName?: string): Promise<Array<Listener>>;
  removeAllListeners<TCEvent extends TypedContractEvent>(
    event?: TCEvent
  ): Promise<this>;

  NAME: TypedContractMethod<[], [string], "view">;

  addStabilityPool: TypedContractMethod<
    [_debtToken: AddressLike],
    [void],
    "nonpayable"
  >;

  debtTokenManagerAddress: TypedContractMethod<[], [string], "view">;

  getCompoundedDeposits: TypedContractMethod<
    [],
    [IBase.TokenAmountStructOutput[]],
    "view"
  >;

  getRemainingStability: TypedContractMethod<
    [collTokenAddresses: AddressLike[]],
    [IBBase.RemainingStabilityStructOutput[]],
    "view"
  >;

  getStabilityPool: TypedContractMethod<
    [_debtToken: AddressLike],
    [string],
    "view"
  >;

  getStabilityPools: TypedContractMethod<[], [string[]], "view">;

  getTotalDeposits: TypedContractMethod<
    [],
    [IBase.TokenAmountStructOutput[]],
    "view"
  >;

  offset: TypedContractMethod<
    [_toOffset: IBBase.RemainingStabilityStruct[]],
    [void],
    "nonpayable"
  >;

  owner: TypedContractMethod<[], [string], "view">;

  priceFeedAddress: TypedContractMethod<[], [string], "view">;

  provideStability: TypedContractMethod<
    [_debts: IBase.TokenAmountStruct[]],
    [void],
    "nonpayable"
  >;

  renounceOwnership: TypedContractMethod<[], [void], "nonpayable">;

  setAddresses: TypedContractMethod<
    [
      _troveManagerAddress: AddressLike,
      _priceFeedAddress: AddressLike,
      _storagePoolAddress: AddressLike,
      _debtTokenManagerAddress: AddressLike
    ],
    [void],
    "nonpayable"
  >;

  stabilityPools: TypedContractMethod<[arg0: AddressLike], [string], "view">;

  stabilityPoolsArray: TypedContractMethod<
    [arg0: BigNumberish],
    [string],
    "view"
  >;

  storagePool: TypedContractMethod<[], [string], "view">;

  transferOwnership: TypedContractMethod<
    [newOwner: AddressLike],
    [void],
    "nonpayable"
  >;

  troveManagerAddress: TypedContractMethod<[], [string], "view">;

  withdrawGains: TypedContractMethod<[], [void], "nonpayable">;

  withdrawStability: TypedContractMethod<
    [_debts: IBase.TokenAmountStruct[]],
    [void],
    "nonpayable"
  >;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "NAME"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "addStabilityPool"
  ): TypedContractMethod<[_debtToken: AddressLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "debtTokenManagerAddress"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "getCompoundedDeposits"
  ): TypedContractMethod<[], [IBase.TokenAmountStructOutput[]], "view">;
  getFunction(
    nameOrSignature: "getRemainingStability"
  ): TypedContractMethod<
    [collTokenAddresses: AddressLike[]],
    [IBBase.RemainingStabilityStructOutput[]],
    "view"
  >;
  getFunction(
    nameOrSignature: "getStabilityPool"
  ): TypedContractMethod<[_debtToken: AddressLike], [string], "view">;
  getFunction(
    nameOrSignature: "getStabilityPools"
  ): TypedContractMethod<[], [string[]], "view">;
  getFunction(
    nameOrSignature: "getTotalDeposits"
  ): TypedContractMethod<[], [IBase.TokenAmountStructOutput[]], "view">;
  getFunction(
    nameOrSignature: "offset"
  ): TypedContractMethod<
    [_toOffset: IBBase.RemainingStabilityStruct[]],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "owner"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "priceFeedAddress"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "provideStability"
  ): TypedContractMethod<
    [_debts: IBase.TokenAmountStruct[]],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "renounceOwnership"
  ): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "setAddresses"
  ): TypedContractMethod<
    [
      _troveManagerAddress: AddressLike,
      _priceFeedAddress: AddressLike,
      _storagePoolAddress: AddressLike,
      _debtTokenManagerAddress: AddressLike
    ],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "stabilityPools"
  ): TypedContractMethod<[arg0: AddressLike], [string], "view">;
  getFunction(
    nameOrSignature: "stabilityPoolsArray"
  ): TypedContractMethod<[arg0: BigNumberish], [string], "view">;
  getFunction(
    nameOrSignature: "storagePool"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "transferOwnership"
  ): TypedContractMethod<[newOwner: AddressLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "troveManagerAddress"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "withdrawGains"
  ): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "withdrawStability"
  ): TypedContractMethod<
    [_debts: IBase.TokenAmountStruct[]],
    [void],
    "nonpayable"
  >;

  getEvent(
    key: "OwnershipTransferred"
  ): TypedContractEvent<
    OwnershipTransferredEvent.InputTuple,
    OwnershipTransferredEvent.OutputTuple,
    OwnershipTransferredEvent.OutputObject
  >;
  getEvent(
    key: "StabilityPoolAdded"
  ): TypedContractEvent<
    StabilityPoolAddedEvent.InputTuple,
    StabilityPoolAddedEvent.OutputTuple,
    StabilityPoolAddedEvent.OutputObject
  >;
  getEvent(
    key: "StabilityPoolManagerInitiated"
  ): TypedContractEvent<
    StabilityPoolManagerInitiatedEvent.InputTuple,
    StabilityPoolManagerInitiatedEvent.OutputTuple,
    StabilityPoolManagerInitiatedEvent.OutputObject
  >;

  filters: {
    "OwnershipTransferred(address,address)": TypedContractEvent<
      OwnershipTransferredEvent.InputTuple,
      OwnershipTransferredEvent.OutputTuple,
      OwnershipTransferredEvent.OutputObject
    >;
    OwnershipTransferred: TypedContractEvent<
      OwnershipTransferredEvent.InputTuple,
      OwnershipTransferredEvent.OutputTuple,
      OwnershipTransferredEvent.OutputObject
    >;

    "StabilityPoolAdded(address)": TypedContractEvent<
      StabilityPoolAddedEvent.InputTuple,
      StabilityPoolAddedEvent.OutputTuple,
      StabilityPoolAddedEvent.OutputObject
    >;
    StabilityPoolAdded: TypedContractEvent<
      StabilityPoolAddedEvent.InputTuple,
      StabilityPoolAddedEvent.OutputTuple,
      StabilityPoolAddedEvent.OutputObject
    >;

    "StabilityPoolManagerInitiated(address,address,address,address)": TypedContractEvent<
      StabilityPoolManagerInitiatedEvent.InputTuple,
      StabilityPoolManagerInitiatedEvent.OutputTuple,
      StabilityPoolManagerInitiatedEvent.OutputObject
    >;
    StabilityPoolManagerInitiated: TypedContractEvent<
      StabilityPoolManagerInitiatedEvent.InputTuple,
      StabilityPoolManagerInitiatedEvent.OutputTuple,
      StabilityPoolManagerInitiatedEvent.OutputObject
    >;
  };
}
