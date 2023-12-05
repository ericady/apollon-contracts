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

export interface StabilityPoolInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "BORROWING_FEE_FLOOR"
      | "CCR"
      | "MAX_BORROWING_FEE"
      | "MCR"
      | "NAME"
      | "P"
      | "PERCENT_DIVISOR"
      | "REDEMPTION_FEE_FLOOR"
      | "RESERVE_FEE"
      | "SCALE_FACTOR"
      | "STABLE_COIN_GAS_COMPENSATION"
      | "_100pct"
      | "currentEpoch"
      | "currentScale"
      | "depositSnapshots"
      | "depositToken"
      | "deposits"
      | "epochToScaleToCollTokenToSum"
      | "getCompoundedDebtDeposit"
      | "getDepositToken"
      | "getDepositorCollGain"
      | "getDepositorCollSnapshot"
      | "getDepositorDeposit"
      | "getTotalDeposit"
      | "getTotalGainedColl"
      | "lastErrorOffset"
      | "offset"
      | "provideToSP"
      | "stabilityPoolManagerAddress"
      | "totalDeposits"
      | "totalGainedColl"
      | "troveManager"
      | "usedCollTokens"
      | "withdrawFromSP"
      | "withdrawGains"
  ): FunctionFragment;

  getEvent(
    nameOrSignatureOrTopic:
      | "DepositSnapshotUpdated"
      | "EpochUpdated"
      | "P_Updated"
      | "S_Updated"
      | "ScaleUpdated"
      | "StabilityGainsWithdrawn"
      | "StabilityOffset"
      | "StabilityPoolInitialized"
      | "StabilityProvided"
      | "StabilityWithdrawn"
  ): EventFragment;

  encodeFunctionData(
    functionFragment: "BORROWING_FEE_FLOOR",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "CCR", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "MAX_BORROWING_FEE",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "MCR", values?: undefined): string;
  encodeFunctionData(functionFragment: "NAME", values?: undefined): string;
  encodeFunctionData(functionFragment: "P", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "PERCENT_DIVISOR",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "REDEMPTION_FEE_FLOOR",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "RESERVE_FEE",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "SCALE_FACTOR",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "STABLE_COIN_GAS_COMPENSATION",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "_100pct", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "currentEpoch",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "currentScale",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "depositSnapshots",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "depositToken",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "deposits",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "epochToScaleToCollTokenToSum",
    values: [BigNumberish, BigNumberish, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "getCompoundedDebtDeposit",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "getDepositToken",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getDepositorCollGain",
    values: [AddressLike, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "getDepositorCollSnapshot",
    values: [AddressLike, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "getDepositorDeposit",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "getTotalDeposit",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getTotalGainedColl",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "lastErrorOffset",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "offset",
    values: [BigNumberish, IBase.TokenAmountStruct[]]
  ): string;
  encodeFunctionData(
    functionFragment: "provideToSP",
    values: [AddressLike, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "stabilityPoolManagerAddress",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "totalDeposits",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "totalGainedColl",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "troveManager",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "usedCollTokens",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "withdrawFromSP",
    values: [AddressLike, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "withdrawGains",
    values: [AddressLike]
  ): string;

  decodeFunctionResult(
    functionFragment: "BORROWING_FEE_FLOOR",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "CCR", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "MAX_BORROWING_FEE",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "MCR", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "NAME", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "P", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "PERCENT_DIVISOR",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "REDEMPTION_FEE_FLOOR",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "RESERVE_FEE",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "SCALE_FACTOR",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "STABLE_COIN_GAS_COMPENSATION",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "_100pct", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "currentEpoch",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "currentScale",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "depositSnapshots",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "depositToken",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "deposits", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "epochToScaleToCollTokenToSum",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getCompoundedDebtDeposit",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getDepositToken",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getDepositorCollGain",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getDepositorCollSnapshot",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getDepositorDeposit",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getTotalDeposit",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getTotalGainedColl",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "lastErrorOffset",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "offset", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "provideToSP",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "stabilityPoolManagerAddress",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "totalDeposits",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "totalGainedColl",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "troveManager",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "usedCollTokens",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "withdrawFromSP",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "withdrawGains",
    data: BytesLike
  ): Result;
}

export namespace DepositSnapshotUpdatedEvent {
  export type InputTuple = [_depositor: AddressLike];
  export type OutputTuple = [_depositor: string];
  export interface OutputObject {
    _depositor: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace EpochUpdatedEvent {
  export type InputTuple = [_currentEpoch: BigNumberish];
  export type OutputTuple = [_currentEpoch: bigint];
  export interface OutputObject {
    _currentEpoch: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace P_UpdatedEvent {
  export type InputTuple = [_P: BigNumberish];
  export type OutputTuple = [_P: bigint];
  export interface OutputObject {
    _P: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace S_UpdatedEvent {
  export type InputTuple = [
    _tokenAddress: AddressLike,
    _S: BigNumberish,
    _epoch: BigNumberish,
    _scale: BigNumberish
  ];
  export type OutputTuple = [
    _tokenAddress: string,
    _S: bigint,
    _epoch: bigint,
    _scale: bigint
  ];
  export interface OutputObject {
    _tokenAddress: string;
    _S: bigint;
    _epoch: bigint;
    _scale: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace ScaleUpdatedEvent {
  export type InputTuple = [_currentScale: BigNumberish];
  export type OutputTuple = [_currentScale: bigint];
  export interface OutputObject {
    _currentScale: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace StabilityGainsWithdrawnEvent {
  export type InputTuple = [
    user: AddressLike,
    depositLost: BigNumberish,
    gainsWithdrawn: IBase.TokenAmountStruct[]
  ];
  export type OutputTuple = [
    user: string,
    depositLost: bigint,
    gainsWithdrawn: IBase.TokenAmountStructOutput[]
  ];
  export interface OutputObject {
    user: string;
    depositLost: bigint;
    gainsWithdrawn: IBase.TokenAmountStructOutput[];
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace StabilityOffsetEvent {
  export type InputTuple = [
    removedDeposit: BigNumberish,
    addedGains: IBase.TokenAmountStruct[]
  ];
  export type OutputTuple = [
    removedDeposit: bigint,
    addedGains: IBase.TokenAmountStructOutput[]
  ];
  export interface OutputObject {
    removedDeposit: bigint;
    addedGains: IBase.TokenAmountStructOutput[];
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace StabilityPoolInitializedEvent {
  export type InputTuple = [
    stabilityPoolManagerAddress: AddressLike,
    troveManagerAddress: AddressLike,
    depositTokenAddress: AddressLike
  ];
  export type OutputTuple = [
    stabilityPoolManagerAddress: string,
    troveManagerAddress: string,
    depositTokenAddress: string
  ];
  export interface OutputObject {
    stabilityPoolManagerAddress: string;
    troveManagerAddress: string;
    depositTokenAddress: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace StabilityProvidedEvent {
  export type InputTuple = [user: AddressLike, amount: BigNumberish];
  export type OutputTuple = [user: string, amount: bigint];
  export interface OutputObject {
    user: string;
    amount: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace StabilityWithdrawnEvent {
  export type InputTuple = [user: AddressLike, amount: BigNumberish];
  export type OutputTuple = [user: string, amount: bigint];
  export interface OutputObject {
    user: string;
    amount: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export interface StabilityPool extends BaseContract {
  connect(runner?: ContractRunner | null): StabilityPool;
  waitForDeployment(): Promise<this>;

  interface: StabilityPoolInterface;

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

  BORROWING_FEE_FLOOR: TypedContractMethod<[], [bigint], "view">;

  CCR: TypedContractMethod<[], [bigint], "view">;

  MAX_BORROWING_FEE: TypedContractMethod<[], [bigint], "view">;

  MCR: TypedContractMethod<[], [bigint], "view">;

  NAME: TypedContractMethod<[], [string], "view">;

  P: TypedContractMethod<[], [bigint], "view">;

  PERCENT_DIVISOR: TypedContractMethod<[], [bigint], "view">;

  REDEMPTION_FEE_FLOOR: TypedContractMethod<[], [bigint], "view">;

  RESERVE_FEE: TypedContractMethod<[], [bigint], "view">;

  SCALE_FACTOR: TypedContractMethod<[], [bigint], "view">;

  STABLE_COIN_GAS_COMPENSATION: TypedContractMethod<[], [bigint], "view">;

  _100pct: TypedContractMethod<[], [bigint], "view">;

  currentEpoch: TypedContractMethod<[], [bigint], "view">;

  currentScale: TypedContractMethod<[], [bigint], "view">;

  depositSnapshots: TypedContractMethod<
    [arg0: AddressLike],
    [[bigint, bigint, bigint] & { P: bigint; scale: bigint; epoch: bigint }],
    "view"
  >;

  depositToken: TypedContractMethod<[], [string], "view">;

  deposits: TypedContractMethod<[arg0: AddressLike], [bigint], "view">;

  epochToScaleToCollTokenToSum: TypedContractMethod<
    [arg0: BigNumberish, arg1: BigNumberish, arg2: AddressLike],
    [bigint],
    "view"
  >;

  getCompoundedDebtDeposit: TypedContractMethod<
    [_depositor: AddressLike],
    [bigint],
    "view"
  >;

  getDepositToken: TypedContractMethod<[], [string], "view">;

  getDepositorCollGain: TypedContractMethod<
    [_depositor: AddressLike, _collToken: AddressLike],
    [bigint],
    "view"
  >;

  getDepositorCollSnapshot: TypedContractMethod<
    [_depositor: AddressLike, _collToken: AddressLike],
    [bigint],
    "view"
  >;

  getDepositorDeposit: TypedContractMethod<
    [_depositor: AddressLike],
    [bigint],
    "view"
  >;

  getTotalDeposit: TypedContractMethod<[], [bigint], "view">;

  getTotalGainedColl: TypedContractMethod<
    [],
    [IBase.TokenAmountStructOutput[]],
    "view"
  >;

  lastErrorOffset: TypedContractMethod<[arg0: AddressLike], [bigint], "view">;

  offset: TypedContractMethod<
    [_debtToOffset: BigNumberish, _collToAdd: IBase.TokenAmountStruct[]],
    [void],
    "nonpayable"
  >;

  provideToSP: TypedContractMethod<
    [depositor: AddressLike, _amount: BigNumberish],
    [void],
    "nonpayable"
  >;

  stabilityPoolManagerAddress: TypedContractMethod<[], [string], "view">;

  totalDeposits: TypedContractMethod<[], [bigint], "view">;

  totalGainedColl: TypedContractMethod<[arg0: AddressLike], [bigint], "view">;

  troveManager: TypedContractMethod<[], [string], "view">;

  usedCollTokens: TypedContractMethod<[arg0: BigNumberish], [string], "view">;

  withdrawFromSP: TypedContractMethod<
    [user: AddressLike, depositToWithdrawal: BigNumberish],
    [void],
    "nonpayable"
  >;

  withdrawGains: TypedContractMethod<[user: AddressLike], [void], "nonpayable">;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "BORROWING_FEE_FLOOR"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "CCR"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "MAX_BORROWING_FEE"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "MCR"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "NAME"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "P"): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "PERCENT_DIVISOR"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "REDEMPTION_FEE_FLOOR"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "RESERVE_FEE"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "SCALE_FACTOR"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "STABLE_COIN_GAS_COMPENSATION"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "_100pct"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "currentEpoch"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "currentScale"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "depositSnapshots"
  ): TypedContractMethod<
    [arg0: AddressLike],
    [[bigint, bigint, bigint] & { P: bigint; scale: bigint; epoch: bigint }],
    "view"
  >;
  getFunction(
    nameOrSignature: "depositToken"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "deposits"
  ): TypedContractMethod<[arg0: AddressLike], [bigint], "view">;
  getFunction(
    nameOrSignature: "epochToScaleToCollTokenToSum"
  ): TypedContractMethod<
    [arg0: BigNumberish, arg1: BigNumberish, arg2: AddressLike],
    [bigint],
    "view"
  >;
  getFunction(
    nameOrSignature: "getCompoundedDebtDeposit"
  ): TypedContractMethod<[_depositor: AddressLike], [bigint], "view">;
  getFunction(
    nameOrSignature: "getDepositToken"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "getDepositorCollGain"
  ): TypedContractMethod<
    [_depositor: AddressLike, _collToken: AddressLike],
    [bigint],
    "view"
  >;
  getFunction(
    nameOrSignature: "getDepositorCollSnapshot"
  ): TypedContractMethod<
    [_depositor: AddressLike, _collToken: AddressLike],
    [bigint],
    "view"
  >;
  getFunction(
    nameOrSignature: "getDepositorDeposit"
  ): TypedContractMethod<[_depositor: AddressLike], [bigint], "view">;
  getFunction(
    nameOrSignature: "getTotalDeposit"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "getTotalGainedColl"
  ): TypedContractMethod<[], [IBase.TokenAmountStructOutput[]], "view">;
  getFunction(
    nameOrSignature: "lastErrorOffset"
  ): TypedContractMethod<[arg0: AddressLike], [bigint], "view">;
  getFunction(
    nameOrSignature: "offset"
  ): TypedContractMethod<
    [_debtToOffset: BigNumberish, _collToAdd: IBase.TokenAmountStruct[]],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "provideToSP"
  ): TypedContractMethod<
    [depositor: AddressLike, _amount: BigNumberish],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "stabilityPoolManagerAddress"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "totalDeposits"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "totalGainedColl"
  ): TypedContractMethod<[arg0: AddressLike], [bigint], "view">;
  getFunction(
    nameOrSignature: "troveManager"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "usedCollTokens"
  ): TypedContractMethod<[arg0: BigNumberish], [string], "view">;
  getFunction(
    nameOrSignature: "withdrawFromSP"
  ): TypedContractMethod<
    [user: AddressLike, depositToWithdrawal: BigNumberish],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "withdrawGains"
  ): TypedContractMethod<[user: AddressLike], [void], "nonpayable">;

  getEvent(
    key: "DepositSnapshotUpdated"
  ): TypedContractEvent<
    DepositSnapshotUpdatedEvent.InputTuple,
    DepositSnapshotUpdatedEvent.OutputTuple,
    DepositSnapshotUpdatedEvent.OutputObject
  >;
  getEvent(
    key: "EpochUpdated"
  ): TypedContractEvent<
    EpochUpdatedEvent.InputTuple,
    EpochUpdatedEvent.OutputTuple,
    EpochUpdatedEvent.OutputObject
  >;
  getEvent(
    key: "P_Updated"
  ): TypedContractEvent<
    P_UpdatedEvent.InputTuple,
    P_UpdatedEvent.OutputTuple,
    P_UpdatedEvent.OutputObject
  >;
  getEvent(
    key: "S_Updated"
  ): TypedContractEvent<
    S_UpdatedEvent.InputTuple,
    S_UpdatedEvent.OutputTuple,
    S_UpdatedEvent.OutputObject
  >;
  getEvent(
    key: "ScaleUpdated"
  ): TypedContractEvent<
    ScaleUpdatedEvent.InputTuple,
    ScaleUpdatedEvent.OutputTuple,
    ScaleUpdatedEvent.OutputObject
  >;
  getEvent(
    key: "StabilityGainsWithdrawn"
  ): TypedContractEvent<
    StabilityGainsWithdrawnEvent.InputTuple,
    StabilityGainsWithdrawnEvent.OutputTuple,
    StabilityGainsWithdrawnEvent.OutputObject
  >;
  getEvent(
    key: "StabilityOffset"
  ): TypedContractEvent<
    StabilityOffsetEvent.InputTuple,
    StabilityOffsetEvent.OutputTuple,
    StabilityOffsetEvent.OutputObject
  >;
  getEvent(
    key: "StabilityPoolInitialized"
  ): TypedContractEvent<
    StabilityPoolInitializedEvent.InputTuple,
    StabilityPoolInitializedEvent.OutputTuple,
    StabilityPoolInitializedEvent.OutputObject
  >;
  getEvent(
    key: "StabilityProvided"
  ): TypedContractEvent<
    StabilityProvidedEvent.InputTuple,
    StabilityProvidedEvent.OutputTuple,
    StabilityProvidedEvent.OutputObject
  >;
  getEvent(
    key: "StabilityWithdrawn"
  ): TypedContractEvent<
    StabilityWithdrawnEvent.InputTuple,
    StabilityWithdrawnEvent.OutputTuple,
    StabilityWithdrawnEvent.OutputObject
  >;

  filters: {
    "DepositSnapshotUpdated(address)": TypedContractEvent<
      DepositSnapshotUpdatedEvent.InputTuple,
      DepositSnapshotUpdatedEvent.OutputTuple,
      DepositSnapshotUpdatedEvent.OutputObject
    >;
    DepositSnapshotUpdated: TypedContractEvent<
      DepositSnapshotUpdatedEvent.InputTuple,
      DepositSnapshotUpdatedEvent.OutputTuple,
      DepositSnapshotUpdatedEvent.OutputObject
    >;

    "EpochUpdated(uint128)": TypedContractEvent<
      EpochUpdatedEvent.InputTuple,
      EpochUpdatedEvent.OutputTuple,
      EpochUpdatedEvent.OutputObject
    >;
    EpochUpdated: TypedContractEvent<
      EpochUpdatedEvent.InputTuple,
      EpochUpdatedEvent.OutputTuple,
      EpochUpdatedEvent.OutputObject
    >;

    "P_Updated(uint256)": TypedContractEvent<
      P_UpdatedEvent.InputTuple,
      P_UpdatedEvent.OutputTuple,
      P_UpdatedEvent.OutputObject
    >;
    P_Updated: TypedContractEvent<
      P_UpdatedEvent.InputTuple,
      P_UpdatedEvent.OutputTuple,
      P_UpdatedEvent.OutputObject
    >;

    "S_Updated(address,uint256,uint128,uint128)": TypedContractEvent<
      S_UpdatedEvent.InputTuple,
      S_UpdatedEvent.OutputTuple,
      S_UpdatedEvent.OutputObject
    >;
    S_Updated: TypedContractEvent<
      S_UpdatedEvent.InputTuple,
      S_UpdatedEvent.OutputTuple,
      S_UpdatedEvent.OutputObject
    >;

    "ScaleUpdated(uint128)": TypedContractEvent<
      ScaleUpdatedEvent.InputTuple,
      ScaleUpdatedEvent.OutputTuple,
      ScaleUpdatedEvent.OutputObject
    >;
    ScaleUpdated: TypedContractEvent<
      ScaleUpdatedEvent.InputTuple,
      ScaleUpdatedEvent.OutputTuple,
      ScaleUpdatedEvent.OutputObject
    >;

    "StabilityGainsWithdrawn(address,uint256,tuple[])": TypedContractEvent<
      StabilityGainsWithdrawnEvent.InputTuple,
      StabilityGainsWithdrawnEvent.OutputTuple,
      StabilityGainsWithdrawnEvent.OutputObject
    >;
    StabilityGainsWithdrawn: TypedContractEvent<
      StabilityGainsWithdrawnEvent.InputTuple,
      StabilityGainsWithdrawnEvent.OutputTuple,
      StabilityGainsWithdrawnEvent.OutputObject
    >;

    "StabilityOffset(uint256,tuple[])": TypedContractEvent<
      StabilityOffsetEvent.InputTuple,
      StabilityOffsetEvent.OutputTuple,
      StabilityOffsetEvent.OutputObject
    >;
    StabilityOffset: TypedContractEvent<
      StabilityOffsetEvent.InputTuple,
      StabilityOffsetEvent.OutputTuple,
      StabilityOffsetEvent.OutputObject
    >;

    "StabilityPoolInitialized(address,address,address)": TypedContractEvent<
      StabilityPoolInitializedEvent.InputTuple,
      StabilityPoolInitializedEvent.OutputTuple,
      StabilityPoolInitializedEvent.OutputObject
    >;
    StabilityPoolInitialized: TypedContractEvent<
      StabilityPoolInitializedEvent.InputTuple,
      StabilityPoolInitializedEvent.OutputTuple,
      StabilityPoolInitializedEvent.OutputObject
    >;

    "StabilityProvided(address,uint256)": TypedContractEvent<
      StabilityProvidedEvent.InputTuple,
      StabilityProvidedEvent.OutputTuple,
      StabilityProvidedEvent.OutputObject
    >;
    StabilityProvided: TypedContractEvent<
      StabilityProvidedEvent.InputTuple,
      StabilityProvidedEvent.OutputTuple,
      StabilityProvidedEvent.OutputObject
    >;

    "StabilityWithdrawn(address,uint256)": TypedContractEvent<
      StabilityWithdrawnEvent.InputTuple,
      StabilityWithdrawnEvent.OutputTuple,
      StabilityWithdrawnEvent.OutputObject
    >;
    StabilityWithdrawn: TypedContractEvent<
      StabilityWithdrawnEvent.InputTuple,
      StabilityWithdrawnEvent.OutputTuple,
      StabilityWithdrawnEvent.OutputObject
    >;
  };
}
