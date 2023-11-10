
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { Log } from "@ethersproject/abstract-provider";
import { BytesLike } from "@ethersproject/bytes";
import {
  Overrides,
  CallOverrides,
  PayableOverrides,
  EventFilter
} from "@ethersproject/contracts";

import { _TypedLiquityContract, _TypedLogDescription } from "../src/contracts";

interface BorrowerOperationsCalls {
  BORROWING_FEE_FLOOR(_overrides?: CallOverrides): Promise<BigNumber>;
  CCR(_overrides?: CallOverrides): Promise<BigNumber>;
  MCR(_overrides?: CallOverrides): Promise<BigNumber>;
  NAME(_overrides?: CallOverrides): Promise<string>;
  PERCENT_DIVISOR(_overrides?: CallOverrides): Promise<BigNumber>;
  STABLE_COIN_GAS_COMPENSATION(_overrides?: CallOverrides): Promise<BigNumber>;
  _100pct(_overrides?: CallOverrides): Promise<BigNumber>;
  collTokenManager(_overrides?: CallOverrides): Promise<string>;
  debtTokenManager(_overrides?: CallOverrides): Promise<string>;
  getCompositeDebt(_debts: { debtToken: string; netDebt: BigNumberish; borrowingFee: BigNumberish }[], _overrides?: CallOverrides): Promise<BigNumber>;
  owner(_overrides?: CallOverrides): Promise<string>;
  priceFeed(_overrides?: CallOverrides): Promise<string>;
  storagePool(_overrides?: CallOverrides): Promise<string>;
  troveManager(_overrides?: CallOverrides): Promise<string>;
}

interface BorrowerOperationsTransactions {
  addColl(_colls: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  closeTrove(_overrides?: Overrides): Promise<void>;
  increaseDebt(_debts: { tokenAddress: string; amount: BigNumberish }[], _maxFeePercentage: BigNumberish, _overrides?: Overrides): Promise<void>;
  openTrove(_colls: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  renounceOwnership(_overrides?: Overrides): Promise<void>;
  repayDebt(_debts: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  setAddresses(_troveManagerAddress: string, _storagePoolAddress: string, _stabilityPoolAddress: string, _priceFeedAddress: string, _debtTokenManagerAddress: string, _collTokenManagerAddress: string, _overrides?: Overrides): Promise<void>;
  transferOwnership(newOwner: string, _overrides?: Overrides): Promise<void>;
  withdrawColl(_colls: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
}

export interface BorrowerOperations
  extends _TypedLiquityContract<BorrowerOperationsCalls, BorrowerOperationsTransactions> {
  readonly filters: {
    CollTokenManagerAddressChanged(_collTokenManagerAddress?: null): EventFilter;
    DebtTokenManagerAddressChanged(_debtTokenManagerAddress?: null): EventFilter;
    LUSDBorrowingFeePaid(_borrower?: string | null, _LUSDFee?: null): EventFilter;
    OwnershipTransferred(previousOwner?: string | null, newOwner?: string | null): EventFilter;
    PriceFeedAddressChanged(_newPriceFeedAddress?: null): EventFilter;
    StabilityPoolAddressChanged(_stabilityPoolAddress?: null): EventFilter;
    StoragePoolAddressChanged(_storagePoolAddress?: null): EventFilter;
    TroveCreated(_borrower?: string | null, arrayIndex?: null): EventFilter;
    TroveManagerAddressChanged(_newTroveManagerAddress?: null): EventFilter;
    TroveUpdated(_borrower?: string | null, _debt?: null, _coll?: null, stake?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "CollTokenManagerAddressChanged"): _TypedLogDescription<{ _collTokenManagerAddress: string }>[];
  extractEvents(logs: Log[], name: "DebtTokenManagerAddressChanged"): _TypedLogDescription<{ _debtTokenManagerAddress: string }>[];
  extractEvents(logs: Log[], name: "LUSDBorrowingFeePaid"): _TypedLogDescription<{ _borrower: string; _LUSDFee: BigNumber }>[];
  extractEvents(logs: Log[], name: "OwnershipTransferred"): _TypedLogDescription<{ previousOwner: string; newOwner: string }>[];
  extractEvents(logs: Log[], name: "PriceFeedAddressChanged"): _TypedLogDescription<{ _newPriceFeedAddress: string }>[];
  extractEvents(logs: Log[], name: "StabilityPoolAddressChanged"): _TypedLogDescription<{ _stabilityPoolAddress: string }>[];
  extractEvents(logs: Log[], name: "StoragePoolAddressChanged"): _TypedLogDescription<{ _storagePoolAddress: string }>[];
  extractEvents(logs: Log[], name: "TroveCreated"): _TypedLogDescription<{ _borrower: string; arrayIndex: BigNumber }>[];
  extractEvents(logs: Log[], name: "TroveManagerAddressChanged"): _TypedLogDescription<{ _newTroveManagerAddress: string }>[];
  extractEvents(logs: Log[], name: "TroveUpdated"): _TypedLogDescription<{ _borrower: string; _debt: BigNumber; _coll: BigNumber; stake: BigNumber }>[];
}

interface RedemptionOperationsCalls {
  BORROWING_FEE_FLOOR(_overrides?: CallOverrides): Promise<BigNumber>;
  CCR(_overrides?: CallOverrides): Promise<BigNumber>;
  MCR(_overrides?: CallOverrides): Promise<BigNumber>;
  NAME(_overrides?: CallOverrides): Promise<string>;
  PERCENT_DIVISOR(_overrides?: CallOverrides): Promise<BigNumber>;
  REDEMPTION_FEE_FLOOR(_overrides?: CallOverrides): Promise<BigNumber>;
  STABLE_COIN_GAS_COMPENSATION(_overrides?: CallOverrides): Promise<BigNumber>;
  _100pct(_overrides?: CallOverrides): Promise<BigNumber>;
  collTokenManager(_overrides?: CallOverrides): Promise<string>;
  debtTokenManager(_overrides?: CallOverrides): Promise<string>;
  getRedemptionFeeWithDecay(_ETHDrawn: BigNumberish, _overrides?: CallOverrides): Promise<BigNumber>;
  getRedemptionRate(_overrides?: CallOverrides): Promise<BigNumber>;
  getRedemptionRateWithDecay(_overrides?: CallOverrides): Promise<BigNumber>;
  owner(_overrides?: CallOverrides): Promise<string>;
  priceFeed(_overrides?: CallOverrides): Promise<string>;
  storagePool(_overrides?: CallOverrides): Promise<string>;
  troveManager(_overrides?: CallOverrides): Promise<string>;
}

interface RedemptionOperationsTransactions {
  redeemCollateral(_stableCoinAmount: BigNumberish, _maxFeePercentage: BigNumberish, _sourceTroves: string[], _overrides?: Overrides): Promise<void>;
  renounceOwnership(_overrides?: Overrides): Promise<void>;
  setAddresses(_troveManagerAddress: string, _storagePoolAddress: string, _priceFeedAddress: string, _debtTokenManagerAddress: string, _collTokenManagerAddress: string, _overrides?: Overrides): Promise<void>;
  transferOwnership(newOwner: string, _overrides?: Overrides): Promise<void>;
}

export interface RedemptionOperations
  extends _TypedLiquityContract<RedemptionOperationsCalls, RedemptionOperationsTransactions> {
  readonly filters: {
    BaseRateUpdated(_baseRate?: null): EventFilter;
    CollTokenManagerAddressChanged(_newCollTokenManagerAddress?: null): EventFilter;
    DebtTokenManagerAddressChanged(_newDebtTokenManagerAddress?: null): EventFilter;
    OwnershipTransferred(previousOwner?: string | null, newOwner?: string | null): EventFilter;
    PriceFeedAddressChanged(_newPriceFeedAddress?: null): EventFilter;
    Redemption(_attemptedLUSDAmount?: null, _actualLUSDAmount?: null, _ETHSent?: null, _ETHFee?: null): EventFilter;
    StoragePoolAddressChanged(_storagePoolAddress?: null): EventFilter;
    TroveManagerAddressChanged(_newTroveManagerAddress?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "BaseRateUpdated"): _TypedLogDescription<{ _baseRate: BigNumber }>[];
  extractEvents(logs: Log[], name: "CollTokenManagerAddressChanged"): _TypedLogDescription<{ _newCollTokenManagerAddress: string }>[];
  extractEvents(logs: Log[], name: "DebtTokenManagerAddressChanged"): _TypedLogDescription<{ _newDebtTokenManagerAddress: string }>[];
  extractEvents(logs: Log[], name: "OwnershipTransferred"): _TypedLogDescription<{ previousOwner: string; newOwner: string }>[];
  extractEvents(logs: Log[], name: "PriceFeedAddressChanged"): _TypedLogDescription<{ _newPriceFeedAddress: string }>[];
  extractEvents(logs: Log[], name: "Redemption"): _TypedLogDescription<{ _attemptedLUSDAmount: BigNumber; _actualLUSDAmount: BigNumber; _ETHSent: BigNumber; _ETHFee: BigNumber }>[];
  extractEvents(logs: Log[], name: "StoragePoolAddressChanged"): _TypedLogDescription<{ _storagePoolAddress: string }>[];
  extractEvents(logs: Log[], name: "TroveManagerAddressChanged"): _TypedLogDescription<{ _newTroveManagerAddress: string }>[];
}

interface TroveManagerCalls {
  BETA(_overrides?: CallOverrides): Promise<BigNumber>;
  BOOTSTRAP_PERIOD(_overrides?: CallOverrides): Promise<BigNumber>;
  BORROWING_FEE_FLOOR(_overrides?: CallOverrides): Promise<BigNumber>;
  CCR(_overrides?: CallOverrides): Promise<BigNumber>;
  MAX_BORROWING_FEE(_overrides?: CallOverrides): Promise<BigNumber>;
  MCR(_overrides?: CallOverrides): Promise<BigNumber>;
  MINUTE_DECAY_FACTOR(_overrides?: CallOverrides): Promise<BigNumber>;
  NAME(_overrides?: CallOverrides): Promise<string>;
  PERCENT_DIVISOR(_overrides?: CallOverrides): Promise<BigNumber>;
  SECONDS_IN_ONE_MINUTE(_overrides?: CallOverrides): Promise<BigNumber>;
  STABLE_COIN_GAS_COMPENSATION(_overrides?: CallOverrides): Promise<BigNumber>;
  TroveOwners(arg0: BigNumberish, _overrides?: CallOverrides): Promise<string>;
  Troves(arg0: string, _overrides?: CallOverrides): Promise<{ status: number; arrayIndex: BigNumber }>;
  _100pct(_overrides?: CallOverrides): Promise<BigNumber>;
  baseRate(_overrides?: CallOverrides): Promise<BigNumber>;
  borrowerOperationsAddress(_overrides?: CallOverrides): Promise<string>;
  calcDecayedBaseRate(_overrides?: CallOverrides): Promise<BigNumber>;
  collTokenManager(_overrides?: CallOverrides): Promise<string>;
  debtTokenManager(_overrides?: CallOverrides): Promise<string>;
  getBaseRate(_overrides?: CallOverrides): Promise<BigNumber>;
  getBorrowingFee(_debtValue: BigNumberish, _overrides?: CallOverrides): Promise<BigNumber>;
  getBorrowingFeeWithDecay(_debtValue: BigNumberish, _overrides?: CallOverrides): Promise<BigNumber>;
  getBorrowingRate(_overrides?: CallOverrides): Promise<BigNumber>;
  getBorrowingRateWithDecay(_overrides?: CallOverrides): Promise<BigNumber>;
  getCurrentICR(_borrower: string, _overrides?: CallOverrides): Promise<{ ICR: BigNumber; currentDebtInStable: BigNumber }>;
  getEntireDebtAndColl(_borrower: string, _overrides?: CallOverrides): Promise<{ amounts: { tokenAddress: string; isColl: boolean; amount: BigNumber; pendingReward: BigNumber; gasCompensation: BigNumber; toLiquidate: BigNumber; toRedistribute: BigNumber; toOffset: BigNumber }[]; troveCollInStable: BigNumber; troveDebtInStable: BigNumber; troveDebtInStableWithoutGasCompensation: BigNumber }>;
  getNominalICR(_borrower: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getPendingReward(_borrower: string, _tokenAddress: string, _isColl: boolean, _overrides?: CallOverrides): Promise<BigNumber>;
  getTroveColl(_borrower: string, _overrides?: CallOverrides): Promise<{ tokenAddress: string; amount: BigNumber }[]>;
  getTroveDebt(_borrower: string, _overrides?: CallOverrides): Promise<{ tokenAddress: string; amount: BigNumber }[]>;
  getTroveOwnersCount(_overrides?: CallOverrides): Promise<BigNumber>;
  getTroveStake(_borrower: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getTroveStakes(_borrower: string, _token: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getTroveStatus(_borrower: string, _overrides?: CallOverrides): Promise<BigNumber>;
  lastErrorRedistribution(arg0: string, arg1: boolean, _overrides?: CallOverrides): Promise<BigNumber>;
  lastFeeOperationTime(_overrides?: CallOverrides): Promise<BigNumber>;
  liquidatedTokens(arg0: string, arg1: boolean, _overrides?: CallOverrides): Promise<BigNumber>;
  owner(_overrides?: CallOverrides): Promise<string>;
  priceFeed(_overrides?: CallOverrides): Promise<string>;
  redemptionManagerAddress(_overrides?: CallOverrides): Promise<string>;
  rewardSnapshots(arg0: string, arg1: string, arg2: boolean, _overrides?: CallOverrides): Promise<BigNumber>;
  stabilityPoolManager(_overrides?: CallOverrides): Promise<string>;
  storagePool(_overrides?: CallOverrides): Promise<string>;
  totalCollateralSnapshots(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
  totalStakes(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
  totalStakesSnapshot(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
}

interface TroveManagerTransactions {
  addTroveOwnerToArray(_borrower: string, _overrides?: Overrides): Promise<BigNumber>;
  applyPendingRewards(_borrower: string, _overrides?: Overrides): Promise<void>;
  batchLiquidateTroves(_troveArray: string[], _overrides?: Overrides): Promise<void>;
  closeTrove(collTokenAddresses: string[], _borrower: string, _overrides?: Overrides): Promise<void>;
  decayBaseRateFromBorrowing(_overrides?: Overrides): Promise<void>;
  decreaseTroveColl(_borrower: string, _collTokenAmounts: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  decreaseTroveDebt(_borrower: string, _debtTokenAmounts: { debtToken: string; netDebt: BigNumberish; borrowingFee: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  increaseTroveColl(_borrower: string, _collTokenAmounts: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  increaseTroveDebt(_borrower: string, _debtTokenAmounts: { debtToken: string; netDebt: BigNumberish; borrowingFee: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  liquidate(_borrower: string, _overrides?: Overrides): Promise<void>;
  removeStake(collTokenAddresses: string[], _borrower: string, _overrides?: Overrides): Promise<void>;
  renounceOwnership(_overrides?: Overrides): Promise<void>;
  setAddresses(_borrowerOperationsAddress: string, _redemptionManagerAddress: string, _storagePoolAddress: string, _stabilityPoolManagerAddress: string, _priceFeedAddress: string, _debtTokenManagerAddress: string, _collTokenManagerAddress: string, _overrides?: Overrides): Promise<void>;
  setTroveStatus(_borrower: string, _num: BigNumberish, _overrides?: Overrides): Promise<void>;
  transferOwnership(newOwner: string, _overrides?: Overrides): Promise<void>;
  updateBaseRateFromRedemption(_totalRedeemedStable: BigNumberish, _totalStableCoinSupply: BigNumberish, _overrides?: Overrides): Promise<void>;
  updateStakeAndTotalStakes(collTokenAddresses: string[], _borrower: string, _overrides?: Overrides): Promise<void>;
  updateTroveRewardSnapshots(_borrower: string, _overrides?: Overrides): Promise<void>;
}

export interface TroveManager
  extends _TypedLiquityContract<TroveManagerCalls, TroveManagerTransactions> {
  readonly filters: {
    BaseRateUpdated(_baseRate?: null): EventFilter;
    BorrowerOperationsAddressChanged(_newBorrowerOperationsAddress?: null): EventFilter;
    CollTokenManagerAddressChanged(_newCollTokenManagerAddress?: null): EventFilter;
    DebtTokenManagerAddressChanged(_newDebtTokenManagerAddress?: null): EventFilter;
    LTermsUpdated(_L_ETH?: null, _L_LUSDDebt?: null): EventFilter;
    LastFeeOpTimeUpdated(_lastFeeOpTime?: null): EventFilter;
    Liquidation(liquidatedDebt?: null, liquidatedColl?: null, totalStableCoinGasCompensation?: null, totalCollGasCompensation?: null): EventFilter;
    OwnershipTransferred(previousOwner?: string | null, newOwner?: string | null): EventFilter;
    PriceFeedAddressChanged(_newPriceFeedAddress?: null): EventFilter;
    Redemption(_attemptedLUSDAmount?: null, _actualLUSDAmount?: null, _ETHSent?: null, _ETHFee?: null): EventFilter;
    RedemptionManagerAddressChanged(_newRedemptionManagerAddress?: null): EventFilter;
    StabilityPoolManagerAddressChanged(_stabilityPoolManagerAddress?: null): EventFilter;
    StoragePoolAddressChanged(_storagePoolAddress?: null): EventFilter;
    SystemSnapshotsUpdated(_totalStakesSnapshot?: null, _totalCollateralSnapshot?: null): EventFilter;
    TotalStakesUpdated(_newTotalStakes?: null): EventFilter;
    TroveIndexUpdated(_borrower?: null, _newIndex?: null): EventFilter;
    TroveLiquidated(_borrower?: string | null, _debt?: null, _coll?: null, _operation?: null): EventFilter;
    TroveSnapshotsUpdated(_L_ETH?: null, _L_LUSDDebt?: null): EventFilter;
    TroveUpdated(_borrower?: string | null, _debt?: null, _coll?: null, _stake?: null, _operation?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "BaseRateUpdated"): _TypedLogDescription<{ _baseRate: BigNumber }>[];
  extractEvents(logs: Log[], name: "BorrowerOperationsAddressChanged"): _TypedLogDescription<{ _newBorrowerOperationsAddress: string }>[];
  extractEvents(logs: Log[], name: "CollTokenManagerAddressChanged"): _TypedLogDescription<{ _newCollTokenManagerAddress: string }>[];
  extractEvents(logs: Log[], name: "DebtTokenManagerAddressChanged"): _TypedLogDescription<{ _newDebtTokenManagerAddress: string }>[];
  extractEvents(logs: Log[], name: "LTermsUpdated"): _TypedLogDescription<{ _L_ETH: BigNumber; _L_LUSDDebt: BigNumber }>[];
  extractEvents(logs: Log[], name: "LastFeeOpTimeUpdated"): _TypedLogDescription<{ _lastFeeOpTime: BigNumber }>[];
  extractEvents(logs: Log[], name: "Liquidation"): _TypedLogDescription<{ liquidatedDebt: { tokenAddress: string; amount: BigNumber }[]; liquidatedColl: { tokenAddress: string; amount: BigNumber }[]; totalStableCoinGasCompensation: BigNumber; totalCollGasCompensation: { tokenAddress: string; amount: BigNumber }[] }>[];
  extractEvents(logs: Log[], name: "OwnershipTransferred"): _TypedLogDescription<{ previousOwner: string; newOwner: string }>[];
  extractEvents(logs: Log[], name: "PriceFeedAddressChanged"): _TypedLogDescription<{ _newPriceFeedAddress: string }>[];
  extractEvents(logs: Log[], name: "Redemption"): _TypedLogDescription<{ _attemptedLUSDAmount: BigNumber; _actualLUSDAmount: BigNumber; _ETHSent: BigNumber; _ETHFee: BigNumber }>[];
  extractEvents(logs: Log[], name: "RedemptionManagerAddressChanged"): _TypedLogDescription<{ _newRedemptionManagerAddress: string }>[];
  extractEvents(logs: Log[], name: "StabilityPoolManagerAddressChanged"): _TypedLogDescription<{ _stabilityPoolManagerAddress: string }>[];
  extractEvents(logs: Log[], name: "StoragePoolAddressChanged"): _TypedLogDescription<{ _storagePoolAddress: string }>[];
  extractEvents(logs: Log[], name: "SystemSnapshotsUpdated"): _TypedLogDescription<{ _totalStakesSnapshot: BigNumber; _totalCollateralSnapshot: BigNumber }>[];
  extractEvents(logs: Log[], name: "TotalStakesUpdated"): _TypedLogDescription<{ _newTotalStakes: BigNumber }>[];
  extractEvents(logs: Log[], name: "TroveIndexUpdated"): _TypedLogDescription<{ _borrower: string; _newIndex: BigNumber }>[];
  extractEvents(logs: Log[], name: "TroveLiquidated"): _TypedLogDescription<{ _borrower: string; _debt: BigNumber; _coll: BigNumber; _operation: number }>[];
  extractEvents(logs: Log[], name: "TroveSnapshotsUpdated"): _TypedLogDescription<{ _L_ETH: BigNumber; _L_LUSDDebt: BigNumber }>[];
  extractEvents(logs: Log[], name: "TroveUpdated"): _TypedLogDescription<{ _borrower: string; _debt: BigNumber; _coll: BigNumber; _stake: BigNumber; _operation: number }>[];
}

interface StoragePoolCalls {
  BORROWING_FEE_FLOOR(_overrides?: CallOverrides): Promise<BigNumber>;
  CCR(_overrides?: CallOverrides): Promise<BigNumber>;
  MCR(_overrides?: CallOverrides): Promise<BigNumber>;
  NAME(_overrides?: CallOverrides): Promise<string>;
  PERCENT_DIVISOR(_overrides?: CallOverrides): Promise<BigNumber>;
  STABLE_COIN_GAS_COMPENSATION(_overrides?: CallOverrides): Promise<BigNumber>;
  _100pct(_overrides?: CallOverrides): Promise<BigNumber>;
  borrowerOperationsAddress(_overrides?: CallOverrides): Promise<string>;
  checkRecoveryMode(_overrides?: CallOverrides): Promise<{ isInRecoveryMode: boolean; TCR: BigNumber; entireSystemColl: BigNumber; entireSystemDebt: BigNumber }>;
  collTokenAddresses(arg0: BigNumberish, _overrides?: CallOverrides): Promise<string>;
  debtTokenAddresses(arg0: BigNumberish, _overrides?: CallOverrides): Promise<string>;
  getEntireSystemColl(_overrides?: CallOverrides): Promise<BigNumber>;
  getEntireSystemDebt(_overrides?: CallOverrides): Promise<BigNumber>;
  getValue(_tokenAddress: string, _isColl: boolean, _poolType: BigNumberish, _overrides?: CallOverrides): Promise<BigNumber>;
  owner(_overrides?: CallOverrides): Promise<string>;
  priceFeed(_overrides?: CallOverrides): Promise<string>;
  stabilityPoolManagerAddress(_overrides?: CallOverrides): Promise<string>;
  troveManagerAddress(_overrides?: CallOverrides): Promise<string>;
}

interface StoragePoolTransactions {
  addValue(_tokenAddress: string, _isColl: boolean, _poolType: BigNumberish, _amount: BigNumberish, _overrides?: Overrides): Promise<void>;
  renounceOwnership(_overrides?: Overrides): Promise<void>;
  setAddresses(_borrowerOperationsAddress: string, _troveManagerAddress: string, _stabilityPoolManagerAddress: string, _priceFeedAddress: string, _overrides?: Overrides): Promise<void>;
  subtractValue(_tokenAddress: string, _isColl: boolean, _poolType: BigNumberish, _amount: BigNumberish, _overrides?: Overrides): Promise<void>;
  transferBetweenTypes(_tokenAddress: string, _isColl: boolean, _fromType: BigNumberish, _toType: BigNumberish, _amount: BigNumberish, _overrides?: Overrides): Promise<void>;
  transferOwnership(newOwner: string, _overrides?: Overrides): Promise<void>;
  withdrawalValue(_receiver: string, _tokenAddress: string, _isColl: boolean, _poolType: BigNumberish, _amount: BigNumberish, _overrides?: Overrides): Promise<void>;
}

export interface StoragePool
  extends _TypedLiquityContract<StoragePoolCalls, StoragePoolTransactions> {
  readonly filters: {
    BorrowerOperationsAddressChanged(_newBorrowerOperationsAddress?: null): EventFilter;
    OwnershipTransferred(previousOwner?: string | null, newOwner?: string | null): EventFilter;
    PoolValueUpdated(_tokenAddress?: null, _isColl?: null, _poolType?: null, _updatedAmount?: null): EventFilter;
    PriceFeedAddressChanged(_priceFeedAddress?: null): EventFilter;
    StabilityPoolManagerAddressChanged(_newStabilityPoolAddress?: null): EventFilter;
    TroveManagerAddressChanged(_newTroveManagerAddress?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "BorrowerOperationsAddressChanged"): _TypedLogDescription<{ _newBorrowerOperationsAddress: string }>[];
  extractEvents(logs: Log[], name: "OwnershipTransferred"): _TypedLogDescription<{ previousOwner: string; newOwner: string }>[];
  extractEvents(logs: Log[], name: "PoolValueUpdated"): _TypedLogDescription<{ _tokenAddress: string; _isColl: boolean; _poolType: number; _updatedAmount: BigNumber }>[];
  extractEvents(logs: Log[], name: "PriceFeedAddressChanged"): _TypedLogDescription<{ _priceFeedAddress: string }>[];
  extractEvents(logs: Log[], name: "StabilityPoolManagerAddressChanged"): _TypedLogDescription<{ _newStabilityPoolAddress: string }>[];
  extractEvents(logs: Log[], name: "TroveManagerAddressChanged"): _TypedLogDescription<{ _newTroveManagerAddress: string }>[];
}

interface DebtTokenCalls {
  allowance(owner: string, spender: string, _overrides?: CallOverrides): Promise<BigNumber>;
  balanceOf(account: string, _overrides?: CallOverrides): Promise<BigNumber>;
  borrowerOperationsAddress(_overrides?: CallOverrides): Promise<string>;
  decimals(_overrides?: CallOverrides): Promise<number>;
  domainSeparator(_overrides?: CallOverrides): Promise<string>;
  getPrice(_overrides?: CallOverrides): Promise<BigNumber>;
  isStableCoin(_overrides?: CallOverrides): Promise<boolean>;
  name(_overrides?: CallOverrides): Promise<string>;
  nonces(owner: string, _overrides?: CallOverrides): Promise<BigNumber>;
  permitTypeHash(_overrides?: CallOverrides): Promise<string>;
  priceFeed(_overrides?: CallOverrides): Promise<string>;
  stabilityPoolManagerAddress(_overrides?: CallOverrides): Promise<string>;
  symbol(_overrides?: CallOverrides): Promise<string>;
  totalSupply(_overrides?: CallOverrides): Promise<BigNumber>;
  troveManagerAddress(_overrides?: CallOverrides): Promise<string>;
  version(_overrides?: CallOverrides): Promise<string>;
}

interface DebtTokenTransactions {
  approve(spender: string, amount: BigNumberish, _overrides?: Overrides): Promise<boolean>;
  burn(_account: string, _amount: BigNumberish, _overrides?: Overrides): Promise<void>;
  decreaseAllowance(spender: string, subtractedValue: BigNumberish, _overrides?: Overrides): Promise<boolean>;
  increaseAllowance(spender: string, addedValue: BigNumberish, _overrides?: Overrides): Promise<boolean>;
  mint(_account: string, _amount: BigNumberish, _overrides?: Overrides): Promise<void>;
  permit(owner: string, spender: string, amount: BigNumberish, deadline: BigNumberish, v: BigNumberish, r: BytesLike, s: BytesLike, _overrides?: Overrides): Promise<void>;
  sendToPool(_sender: string, _poolAddress: string, _amount: BigNumberish, _overrides?: Overrides): Promise<void>;
  transfer(recipient: string, amount: BigNumberish, _overrides?: Overrides): Promise<boolean>;
  transferFrom(sender: string, recipient: string, amount: BigNumberish, _overrides?: Overrides): Promise<boolean>;
}

export interface DebtToken
  extends _TypedLiquityContract<DebtTokenCalls, DebtTokenTransactions> {
  readonly filters: {
    Approval(owner?: string | null, spender?: string | null, value?: null): EventFilter;
    BorrowerOperationsAddressChanged(_newBorrowerOperationsAddress?: null): EventFilter;
    PriceFeedAddressChanged(_newPriceFeedAddress?: null): EventFilter;
    StabilityPoolManagerAddressChanged(_stabilityPoolManagerAddress?: null): EventFilter;
    Transfer(from?: string | null, to?: string | null, value?: null): EventFilter;
    TroveManagerAddressChanged(_troveManagerAddress?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "Approval"): _TypedLogDescription<{ owner: string; spender: string; value: BigNumber }>[];
  extractEvents(logs: Log[], name: "BorrowerOperationsAddressChanged"): _TypedLogDescription<{ _newBorrowerOperationsAddress: string }>[];
  extractEvents(logs: Log[], name: "PriceFeedAddressChanged"): _TypedLogDescription<{ _newPriceFeedAddress: string }>[];
  extractEvents(logs: Log[], name: "StabilityPoolManagerAddressChanged"): _TypedLogDescription<{ _stabilityPoolManagerAddress: string }>[];
  extractEvents(logs: Log[], name: "Transfer"): _TypedLogDescription<{ from: string; to: string; value: BigNumber }>[];
  extractEvents(logs: Log[], name: "TroveManagerAddressChanged"): _TypedLogDescription<{ _troveManagerAddress: string }>[];
}

interface PriceFeedCalls {
  ETHUSD_TELLOR_REQ_ID(_overrides?: CallOverrides): Promise<BigNumber>;
  MAX_PRICE_DEVIATION_FROM_PREVIOUS_ROUND(_overrides?: CallOverrides): Promise<BigNumber>;
  MAX_PRICE_DIFFERENCE_BETWEEN_ORACLES(_overrides?: CallOverrides): Promise<BigNumber>;
  NAME(_overrides?: CallOverrides): Promise<string>;
  TARGET_DIGITS(_overrides?: CallOverrides): Promise<BigNumber>;
  TELLOR_DIGITS(_overrides?: CallOverrides): Promise<BigNumber>;
  TIMEOUT(_overrides?: CallOverrides): Promise<BigNumber>;
  getPrice(_tokenAddress: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getUSDValue(_token: string, _amount: BigNumberish, _overrides?: CallOverrides): Promise<BigNumber>;
  lastGoodPrice(_overrides?: CallOverrides): Promise<BigNumber>;
  lastGoodPrices(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
  owner(_overrides?: CallOverrides): Promise<string>;
  priceAggregator(_overrides?: CallOverrides): Promise<string>;
  status(_overrides?: CallOverrides): Promise<number>;
  tellorCaller(_overrides?: CallOverrides): Promise<string>;
}

interface PriceFeedTransactions {
  fetchPrice(_overrides?: Overrides): Promise<BigNumber>;
  renounceOwnership(_overrides?: Overrides): Promise<void>;
  setAddresses(_priceAggregatorAddress: string, _tellorCallerAddress: string, _overrides?: Overrides): Promise<void>;
  transferOwnership(newOwner: string, _overrides?: Overrides): Promise<void>;
}

export interface PriceFeed
  extends _TypedLiquityContract<PriceFeedCalls, PriceFeedTransactions> {
  readonly filters: {
    LastGoodPriceUpdated(_lastGoodPrice?: null): EventFilter;
    OwnershipTransferred(previousOwner?: string | null, newOwner?: string | null): EventFilter;
    PriceFeedStatusChanged(newStatus?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "LastGoodPriceUpdated"): _TypedLogDescription<{ _lastGoodPrice: BigNumber }>[];
  extractEvents(logs: Log[], name: "OwnershipTransferred"): _TypedLogDescription<{ previousOwner: string; newOwner: string }>[];
  extractEvents(logs: Log[], name: "PriceFeedStatusChanged"): _TypedLogDescription<{ newStatus: number }>[];
}

interface MockPriceFeedCalls {
  getPrice(_tokenAddress: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getUSDValue(_token: string, _amount: BigNumberish, _overrides?: CallOverrides): Promise<BigNumber>;
}

interface MockPriceFeedTransactions {
  fetchPrice(_overrides?: Overrides): Promise<BigNumber>;
  setTokenPrice(tokenAddress: string, price: BigNumberish, _overrides?: Overrides): Promise<boolean>;
}

export interface MockPriceFeed
  extends _TypedLiquityContract<MockPriceFeedCalls, MockPriceFeedTransactions> {
  readonly filters: {
    LastGoodPriceUpdated(_lastGoodPrice?: null): EventFilter;
    PriceFeedStatusChanged(newStatus?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "LastGoodPriceUpdated"): _TypedLogDescription<{ _lastGoodPrice: BigNumber }>[];
  extractEvents(logs: Log[], name: "PriceFeedStatusChanged"): _TypedLogDescription<{ newStatus: number }>[];
}

interface StabilityPoolCalls {
  BORROWING_FEE_FLOOR(_overrides?: CallOverrides): Promise<BigNumber>;
  CCR(_overrides?: CallOverrides): Promise<BigNumber>;
  MCR(_overrides?: CallOverrides): Promise<BigNumber>;
  NAME(_overrides?: CallOverrides): Promise<string>;
  P(_overrides?: CallOverrides): Promise<BigNumber>;
  PERCENT_DIVISOR(_overrides?: CallOverrides): Promise<BigNumber>;
  SCALE_FACTOR(_overrides?: CallOverrides): Promise<BigNumber>;
  STABLE_COIN_GAS_COMPENSATION(_overrides?: CallOverrides): Promise<BigNumber>;
  _100pct(_overrides?: CallOverrides): Promise<BigNumber>;
  currentEpoch(_overrides?: CallOverrides): Promise<BigNumber>;
  currentScale(_overrides?: CallOverrides): Promise<BigNumber>;
  depositSnapshots(arg0: string, _overrides?: CallOverrides): Promise<{ P: BigNumber; scale: BigNumber; epoch: BigNumber }>;
  depositToken(_overrides?: CallOverrides): Promise<string>;
  deposits(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
  epochToScaleToCollTokenToSum(arg0: BigNumberish, arg1: BigNumberish, arg2: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getCompoundedDebtDeposit(_depositor: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getDepositToken(_overrides?: CallOverrides): Promise<string>;
  getDepositorCollGain(_depositor: string, _collToken: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getDepositorCollSnapshot(_depositor: string, _collToken: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getTotalDeposit(_overrides?: CallOverrides): Promise<BigNumber>;
  getTotalGainedColl(_overrides?: CallOverrides): Promise<{ tokenAddress: string; amount: BigNumber }[]>;
  lastErrorOffset(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
  owner(_overrides?: CallOverrides): Promise<string>;
  priceFeed(_overrides?: CallOverrides): Promise<string>;
  stabilityPoolManagerAddress(_overrides?: CallOverrides): Promise<string>;
  storagePool(_overrides?: CallOverrides): Promise<string>;
  totalDeposits(_overrides?: CallOverrides): Promise<BigNumber>;
  totalGainedColl(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
  troveManager(_overrides?: CallOverrides): Promise<string>;
  usedCollTokens(arg0: BigNumberish, _overrides?: CallOverrides): Promise<string>;
}

interface StabilityPoolTransactions {
  offset(_debtToOffset: BigNumberish, _collToAdd: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  provideToSP(depositor: string, _amount: BigNumberish, _overrides?: Overrides): Promise<void>;
  renounceOwnership(_overrides?: Overrides): Promise<void>;
  transferOwnership(newOwner: string, _overrides?: Overrides): Promise<void>;
  withdrawFromSP(user: string, debtToWithdrawal: BigNumberish, _overrides?: Overrides): Promise<void>;
  withdrawGains(_overrides?: Overrides): Promise<void>;
}

export interface StabilityPool
  extends _TypedLiquityContract<StabilityPoolCalls, StabilityPoolTransactions> {
  readonly filters: {
    DepositSnapshotUpdated(_depositor?: string | null, _P?: null, _S?: null): EventFilter;
    DepositTokenAddressChanged(_newDepositTokenAddress?: null): EventFilter;
    EpochUpdated(_currentEpoch?: null): EventFilter;
    OwnershipTransferred(previousOwner?: string | null, newOwner?: string | null): EventFilter;
    P_Updated(_P?: null): EventFilter;
    PriceFeedAddressChanged(_newPriceFeedAddress?: null): EventFilter;
    S_Updated(_tokenAddress?: null, _S?: null, _epoch?: null, _scale?: null): EventFilter;
    ScaleUpdated(_currentScale?: null): EventFilter;
    StabilityPoolCollBalanceUpdates(_tokenAddress?: null, _newBalance?: null): EventFilter;
    StabilityPoolDepositBalanceUpdated(_newBalance?: null): EventFilter;
    StabilityPoolManagerAddressChanged(_newStabilityPoolManagerAddress?: null): EventFilter;
    StoragePoolAddressChanged(_newStoragePoolAddress?: null): EventFilter;
    TroveManagerAddressChanged(_newTroveManagerAddress?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "DepositSnapshotUpdated"): _TypedLogDescription<{ _depositor: string; _P: BigNumber; _S: BigNumber }>[];
  extractEvents(logs: Log[], name: "DepositTokenAddressChanged"): _TypedLogDescription<{ _newDepositTokenAddress: string }>[];
  extractEvents(logs: Log[], name: "EpochUpdated"): _TypedLogDescription<{ _currentEpoch: BigNumber }>[];
  extractEvents(logs: Log[], name: "OwnershipTransferred"): _TypedLogDescription<{ previousOwner: string; newOwner: string }>[];
  extractEvents(logs: Log[], name: "P_Updated"): _TypedLogDescription<{ _P: BigNumber }>[];
  extractEvents(logs: Log[], name: "PriceFeedAddressChanged"): _TypedLogDescription<{ _newPriceFeedAddress: string }>[];
  extractEvents(logs: Log[], name: "S_Updated"): _TypedLogDescription<{ _tokenAddress: string; _S: BigNumber; _epoch: BigNumber; _scale: BigNumber }>[];
  extractEvents(logs: Log[], name: "ScaleUpdated"): _TypedLogDescription<{ _currentScale: BigNumber }>[];
  extractEvents(logs: Log[], name: "StabilityPoolCollBalanceUpdates"): _TypedLogDescription<{ _tokenAddress: string; _newBalance: BigNumber }>[];
  extractEvents(logs: Log[], name: "StabilityPoolDepositBalanceUpdated"): _TypedLogDescription<{ _newBalance: BigNumber }>[];
  extractEvents(logs: Log[], name: "StabilityPoolManagerAddressChanged"): _TypedLogDescription<{ _newStabilityPoolManagerAddress: string }>[];
  extractEvents(logs: Log[], name: "StoragePoolAddressChanged"): _TypedLogDescription<{ _newStoragePoolAddress: string }>[];
  extractEvents(logs: Log[], name: "TroveManagerAddressChanged"): _TypedLogDescription<{ _newTroveManagerAddress: string }>[];
}

interface StabilityPoolManagerCalls {
  NAME(_overrides?: CallOverrides): Promise<string>;
  debtTokenManagerAddress(_overrides?: CallOverrides): Promise<string>;
  getCompoundedDeposits(_overrides?: CallOverrides): Promise<{ tokenAddress: string; amount: BigNumber }[]>;
  getRemainingStability(collTokenAddresses: string[], _overrides?: CallOverrides): Promise<{ stabilityPool: string; tokenAddress: string; remaining: BigNumber; debtToOffset: BigNumber; collGained: { tokenAddress: string; amount: BigNumber }[] }[]>;
  getStabilityPool(_debtToken: string, _overrides?: CallOverrides): Promise<string>;
  getStabilityPools(_overrides?: CallOverrides): Promise<string[]>;
  getTotalDeposits(_overrides?: CallOverrides): Promise<{ tokenAddress: string; amount: BigNumber }[]>;
  owner(_overrides?: CallOverrides): Promise<string>;
  priceFeedAddress(_overrides?: CallOverrides): Promise<string>;
  stabilityPools(arg0: string, _overrides?: CallOverrides): Promise<string>;
  stabilityPoolsArray(arg0: BigNumberish, _overrides?: CallOverrides): Promise<string>;
  storagePool(_overrides?: CallOverrides): Promise<string>;
  troveManagerAddress(_overrides?: CallOverrides): Promise<string>;
}

interface StabilityPoolManagerTransactions {
  addStabilityPool(_debtToken: string, _overrides?: Overrides): Promise<void>;
  offset(_toOffset: { stabilityPool: string; tokenAddress: string; remaining: BigNumberish; debtToOffset: BigNumberish; collGained: { tokenAddress: string; amount: BigNumberish }[] }[], _overrides?: Overrides): Promise<void>;
  provideStability(_debts: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  renounceOwnership(_overrides?: Overrides): Promise<void>;
  setAddresses(_troveManagerAddress: string, _priceFeedAddress: string, _storagePoolAddress: string, _debtTokenManagerAddress: string, _overrides?: Overrides): Promise<void>;
  transferOwnership(newOwner: string, _overrides?: Overrides): Promise<void>;
  withdrawalStability(_debts: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
}

export interface StabilityPoolManager
  extends _TypedLiquityContract<StabilityPoolManagerCalls, StabilityPoolManagerTransactions> {
  readonly filters: {
    DebtTokenManagerAddressChanged(_debtTokenManagerAddress?: null): EventFilter;
    OwnershipTransferred(previousOwner?: string | null, newOwner?: string | null): EventFilter;
    PriceFeedAddressChanged(_newPriceFeedAddress?: null): EventFilter;
    StabilityPoolAdded(_stabilityPool?: null): EventFilter;
    StoragePoolAddressChanged(_newStoragePoolAddress?: null): EventFilter;
    TroveManagerAddressChanged(_newTroveManagerAddress?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "DebtTokenManagerAddressChanged"): _TypedLogDescription<{ _debtTokenManagerAddress: string }>[];
  extractEvents(logs: Log[], name: "OwnershipTransferred"): _TypedLogDescription<{ previousOwner: string; newOwner: string }>[];
  extractEvents(logs: Log[], name: "PriceFeedAddressChanged"): _TypedLogDescription<{ _newPriceFeedAddress: string }>[];
  extractEvents(logs: Log[], name: "StabilityPoolAdded"): _TypedLogDescription<{ _stabilityPool: string }>[];
  extractEvents(logs: Log[], name: "StoragePoolAddressChanged"): _TypedLogDescription<{ _newStoragePoolAddress: string }>[];
  extractEvents(logs: Log[], name: "TroveManagerAddressChanged"): _TypedLogDescription<{ _newTroveManagerAddress: string }>[];
}

interface DebtTokenManagerCalls {
  NAME(_overrides?: CallOverrides): Promise<string>;
  borrowerOperationsAddress(_overrides?: CallOverrides): Promise<string>;
  debtTokenAddresses(arg0: BigNumberish, _overrides?: CallOverrides): Promise<string>;
  debtTokens(arg0: string, _overrides?: CallOverrides): Promise<string>;
  debtTokensArray(arg0: BigNumberish, _overrides?: CallOverrides): Promise<string>;
  getDebtToken(_address: string, _overrides?: CallOverrides): Promise<string>;
  getDebtTokenAddresses(_overrides?: CallOverrides): Promise<string[]>;
  getStableCoin(_overrides?: CallOverrides): Promise<string>;
  owner(_overrides?: CallOverrides): Promise<string>;
  priceFeedAddress(_overrides?: CallOverrides): Promise<string>;
  stabilityPoolManager(_overrides?: CallOverrides): Promise<string>;
  stableCoin(_overrides?: CallOverrides): Promise<string>;
  troveManagerAddress(_overrides?: CallOverrides): Promise<string>;
}

interface DebtTokenManagerTransactions {
  addDebtToken(_debtTokenAddress: string, _overrides?: Overrides): Promise<void>;
  renounceOwnership(_overrides?: Overrides): Promise<void>;
  setAddresses(_troveManagerAddress: string, _borrowerOperationsAddress: string, _stabilityPoolManagerAddress: string, _priceFeedAddress: string, _overrides?: Overrides): Promise<void>;
  transferOwnership(newOwner: string, _overrides?: Overrides): Promise<void>;
}

export interface DebtTokenManager
  extends _TypedLiquityContract<DebtTokenManagerCalls, DebtTokenManagerTransactions> {
  readonly filters: {
    BorrowerOperationsAddressChanged(_newBorrowerOperationsAddress?: null): EventFilter;
    DebtTokenAdded(_debtToken?: null): EventFilter;
    OwnershipTransferred(previousOwner?: string | null, newOwner?: string | null): EventFilter;
    PriceFeedAddressChanged(_newPriceFeedAddress?: null): EventFilter;
    StabilityPoolManagerAddressChanged(_newStabilityPoolAddress?: null): EventFilter;
    TroveManagerAddressChanged(_troveManagerAddress?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "BorrowerOperationsAddressChanged"): _TypedLogDescription<{ _newBorrowerOperationsAddress: string }>[];
  extractEvents(logs: Log[], name: "DebtTokenAdded"): _TypedLogDescription<{ _debtToken: string }>[];
  extractEvents(logs: Log[], name: "OwnershipTransferred"): _TypedLogDescription<{ previousOwner: string; newOwner: string }>[];
  extractEvents(logs: Log[], name: "PriceFeedAddressChanged"): _TypedLogDescription<{ _newPriceFeedAddress: string }>[];
  extractEvents(logs: Log[], name: "StabilityPoolManagerAddressChanged"): _TypedLogDescription<{ _newStabilityPoolAddress: string }>[];
  extractEvents(logs: Log[], name: "TroveManagerAddressChanged"): _TypedLogDescription<{ _troveManagerAddress: string }>[];
}

interface CollTokenManagerCalls {
  NAME(_overrides?: CallOverrides): Promise<string>;
  collTokenAddresses(arg0: BigNumberish, _overrides?: CallOverrides): Promise<string>;
  getCollTokenAddresses(_overrides?: CallOverrides): Promise<string[]>;
  owner(_overrides?: CallOverrides): Promise<string>;
  priceFeedAddress(_overrides?: CallOverrides): Promise<string>;
}

interface CollTokenManagerTransactions {
  addCollToken(_tokenAddress: string, _overrides?: Overrides): Promise<void>;
  renounceOwnership(_overrides?: Overrides): Promise<void>;
  setAddresses(_priceFeedAddress: string, _overrides?: Overrides): Promise<void>;
  transferOwnership(newOwner: string, _overrides?: Overrides): Promise<void>;
}

export interface CollTokenManager
  extends _TypedLiquityContract<CollTokenManagerCalls, CollTokenManagerTransactions> {
  readonly filters: {
    CollTokenAdded(_collTokenAddress?: null): EventFilter;
    OwnershipTransferred(previousOwner?: string | null, newOwner?: string | null): EventFilter;
    PriceFeedAddressChanged(_newPriceFeedAddress?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "CollTokenAdded"): _TypedLogDescription<{ _collTokenAddress: string }>[];
  extractEvents(logs: Log[], name: "OwnershipTransferred"): _TypedLogDescription<{ previousOwner: string; newOwner: string }>[];
  extractEvents(logs: Log[], name: "PriceFeedAddressChanged"): _TypedLogDescription<{ _newPriceFeedAddress: string }>[];
}

interface IERC20Calls {
  allowance(owner: string, spender: string, _overrides?: CallOverrides): Promise<BigNumber>;
  balanceOf(account: string, _overrides?: CallOverrides): Promise<BigNumber>;
  totalSupply(_overrides?: CallOverrides): Promise<BigNumber>;
}

interface IERC20Transactions {
  approve(spender: string, amount: BigNumberish, _overrides?: Overrides): Promise<boolean>;
  transfer(to: string, amount: BigNumberish, _overrides?: Overrides): Promise<boolean>;
  transferFrom(from: string, to: string, amount: BigNumberish, _overrides?: Overrides): Promise<boolean>;
}

export interface IERC20
  extends _TypedLiquityContract<IERC20Calls, IERC20Transactions> {
  readonly filters: {
    Approval(owner?: string | null, spender?: string | null, value?: null): EventFilter;
    Transfer(from?: string | null, to?: string | null, value?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "Approval"): _TypedLogDescription<{ owner: string; spender: string; value: BigNumber }>[];
  extractEvents(logs: Log[], name: "Transfer"): _TypedLogDescription<{ from: string; to: string; value: BigNumber }>[];
}

interface MockERC20Calls {
  allowance(owner: string, spender: string, _overrides?: CallOverrides): Promise<BigNumber>;
  balanceOf(account: string, _overrides?: CallOverrides): Promise<BigNumber>;
  decimals(_overrides?: CallOverrides): Promise<number>;
  name(_overrides?: CallOverrides): Promise<string>;
  symbol(_overrides?: CallOverrides): Promise<string>;
  totalSupply(_overrides?: CallOverrides): Promise<BigNumber>;
}

interface MockERC20Transactions {
  approve(spender: string, amount: BigNumberish, _overrides?: Overrides): Promise<boolean>;
  decreaseAllowance(spender: string, subtractedValue: BigNumberish, _overrides?: Overrides): Promise<boolean>;
  increaseAllowance(spender: string, addedValue: BigNumberish, _overrides?: Overrides): Promise<boolean>;
  transfer(to: string, amount: BigNumberish, _overrides?: Overrides): Promise<boolean>;
  transferFrom(from: string, to: string, amount: BigNumberish, _overrides?: Overrides): Promise<boolean>;
  unprotectedMint(_account: string, _amount: BigNumberish, _overrides?: Overrides): Promise<void>;
}

export interface MockERC20
  extends _TypedLiquityContract<MockERC20Calls, MockERC20Transactions> {
  readonly filters: {
    Approval(owner?: string | null, spender?: string | null, value?: null): EventFilter;
    Transfer(from?: string | null, to?: string | null, value?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "Approval"): _TypedLogDescription<{ owner: string; spender: string; value: BigNumber }>[];
  extractEvents(logs: Log[], name: "Transfer"): _TypedLogDescription<{ from: string; to: string; value: BigNumber }>[];
}

interface IERC20Calls {
  allowance(owner: string, spender: string, _overrides?: CallOverrides): Promise<BigNumber>;
  balanceOf(account: string, _overrides?: CallOverrides): Promise<BigNumber>;
  totalSupply(_overrides?: CallOverrides): Promise<BigNumber>;
}

interface IERC20Transactions {
  approve(spender: string, amount: BigNumberish, _overrides?: Overrides): Promise<boolean>;
  transfer(to: string, amount: BigNumberish, _overrides?: Overrides): Promise<boolean>;
  transferFrom(from: string, to: string, amount: BigNumberish, _overrides?: Overrides): Promise<boolean>;
}

export interface IERC20
  extends _TypedLiquityContract<IERC20Calls, IERC20Transactions> {
  readonly filters: {
    Approval(owner?: string | null, spender?: string | null, value?: null): EventFilter;
    Transfer(from?: string | null, to?: string | null, value?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "Approval"): _TypedLogDescription<{ owner: string; spender: string; value: BigNumber }>[];
  extractEvents(logs: Log[], name: "Transfer"): _TypedLogDescription<{ from: string; to: string; value: BigNumber }>[];
}

interface PriceFeedCalls {
  ETHUSD_TELLOR_REQ_ID(_overrides?: CallOverrides): Promise<BigNumber>;
  MAX_PRICE_DEVIATION_FROM_PREVIOUS_ROUND(_overrides?: CallOverrides): Promise<BigNumber>;
  MAX_PRICE_DIFFERENCE_BETWEEN_ORACLES(_overrides?: CallOverrides): Promise<BigNumber>;
  NAME(_overrides?: CallOverrides): Promise<string>;
  TARGET_DIGITS(_overrides?: CallOverrides): Promise<BigNumber>;
  TELLOR_DIGITS(_overrides?: CallOverrides): Promise<BigNumber>;
  TIMEOUT(_overrides?: CallOverrides): Promise<BigNumber>;
  getPrice(_tokenAddress: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getUSDValue(_token: string, _amount: BigNumberish, _overrides?: CallOverrides): Promise<BigNumber>;
  lastGoodPrice(_overrides?: CallOverrides): Promise<BigNumber>;
  lastGoodPrices(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
  owner(_overrides?: CallOverrides): Promise<string>;
  priceAggregator(_overrides?: CallOverrides): Promise<string>;
  status(_overrides?: CallOverrides): Promise<number>;
  tellorCaller(_overrides?: CallOverrides): Promise<string>;
}

interface PriceFeedTransactions {
  fetchPrice(_overrides?: Overrides): Promise<BigNumber>;
  renounceOwnership(_overrides?: Overrides): Promise<void>;
  setAddresses(_priceAggregatorAddress: string, _tellorCallerAddress: string, _overrides?: Overrides): Promise<void>;
  transferOwnership(newOwner: string, _overrides?: Overrides): Promise<void>;
}

export interface PriceFeed
  extends _TypedLiquityContract<PriceFeedCalls, PriceFeedTransactions> {
  readonly filters: {
    LastGoodPriceUpdated(_lastGoodPrice?: null): EventFilter;
    OwnershipTransferred(previousOwner?: string | null, newOwner?: string | null): EventFilter;
    PriceFeedStatusChanged(newStatus?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "LastGoodPriceUpdated"): _TypedLogDescription<{ _lastGoodPrice: BigNumber }>[];
  extractEvents(logs: Log[], name: "OwnershipTransferred"): _TypedLogDescription<{ previousOwner: string; newOwner: string }>[];
  extractEvents(logs: Log[], name: "PriceFeedStatusChanged"): _TypedLogDescription<{ newStatus: number }>[];
}

interface StabilityPoolCalls {
  BORROWING_FEE_FLOOR(_overrides?: CallOverrides): Promise<BigNumber>;
  CCR(_overrides?: CallOverrides): Promise<BigNumber>;
  MCR(_overrides?: CallOverrides): Promise<BigNumber>;
  NAME(_overrides?: CallOverrides): Promise<string>;
  P(_overrides?: CallOverrides): Promise<BigNumber>;
  PERCENT_DIVISOR(_overrides?: CallOverrides): Promise<BigNumber>;
  SCALE_FACTOR(_overrides?: CallOverrides): Promise<BigNumber>;
  STABLE_COIN_GAS_COMPENSATION(_overrides?: CallOverrides): Promise<BigNumber>;
  _100pct(_overrides?: CallOverrides): Promise<BigNumber>;
  currentEpoch(_overrides?: CallOverrides): Promise<BigNumber>;
  currentScale(_overrides?: CallOverrides): Promise<BigNumber>;
  depositSnapshots(arg0: string, _overrides?: CallOverrides): Promise<{ P: BigNumber; scale: BigNumber; epoch: BigNumber }>;
  depositToken(_overrides?: CallOverrides): Promise<string>;
  deposits(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
  epochToScaleToCollTokenToSum(arg0: BigNumberish, arg1: BigNumberish, arg2: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getCompoundedDebtDeposit(_depositor: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getDepositToken(_overrides?: CallOverrides): Promise<string>;
  getDepositorCollGain(_depositor: string, _collToken: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getDepositorCollSnapshot(_depositor: string, _collToken: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getTotalDeposit(_overrides?: CallOverrides): Promise<BigNumber>;
  getTotalGainedColl(_overrides?: CallOverrides): Promise<{ tokenAddress: string; amount: BigNumber }[]>;
  lastErrorOffset(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
  owner(_overrides?: CallOverrides): Promise<string>;
  priceFeed(_overrides?: CallOverrides): Promise<string>;
  stabilityPoolManagerAddress(_overrides?: CallOverrides): Promise<string>;
  storagePool(_overrides?: CallOverrides): Promise<string>;
  totalDeposits(_overrides?: CallOverrides): Promise<BigNumber>;
  totalGainedColl(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
  troveManager(_overrides?: CallOverrides): Promise<string>;
  usedCollTokens(arg0: BigNumberish, _overrides?: CallOverrides): Promise<string>;
}

interface StabilityPoolTransactions {
  offset(_debtToOffset: BigNumberish, _collToAdd: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  provideToSP(depositor: string, _amount: BigNumberish, _overrides?: Overrides): Promise<void>;
  renounceOwnership(_overrides?: Overrides): Promise<void>;
  transferOwnership(newOwner: string, _overrides?: Overrides): Promise<void>;
  withdrawFromSP(user: string, debtToWithdrawal: BigNumberish, _overrides?: Overrides): Promise<void>;
  withdrawGains(_overrides?: Overrides): Promise<void>;
}

export interface StabilityPool
  extends _TypedLiquityContract<StabilityPoolCalls, StabilityPoolTransactions> {
  readonly filters: {
    DepositSnapshotUpdated(_depositor?: string | null, _P?: null, _S?: null): EventFilter;
    DepositTokenAddressChanged(_newDepositTokenAddress?: null): EventFilter;
    EpochUpdated(_currentEpoch?: null): EventFilter;
    OwnershipTransferred(previousOwner?: string | null, newOwner?: string | null): EventFilter;
    P_Updated(_P?: null): EventFilter;
    PriceFeedAddressChanged(_newPriceFeedAddress?: null): EventFilter;
    S_Updated(_tokenAddress?: null, _S?: null, _epoch?: null, _scale?: null): EventFilter;
    ScaleUpdated(_currentScale?: null): EventFilter;
    StabilityPoolCollBalanceUpdates(_tokenAddress?: null, _newBalance?: null): EventFilter;
    StabilityPoolDepositBalanceUpdated(_newBalance?: null): EventFilter;
    StabilityPoolManagerAddressChanged(_newStabilityPoolManagerAddress?: null): EventFilter;
    StoragePoolAddressChanged(_newStoragePoolAddress?: null): EventFilter;
    TroveManagerAddressChanged(_newTroveManagerAddress?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "DepositSnapshotUpdated"): _TypedLogDescription<{ _depositor: string; _P: BigNumber; _S: BigNumber }>[];
  extractEvents(logs: Log[], name: "DepositTokenAddressChanged"): _TypedLogDescription<{ _newDepositTokenAddress: string }>[];
  extractEvents(logs: Log[], name: "EpochUpdated"): _TypedLogDescription<{ _currentEpoch: BigNumber }>[];
  extractEvents(logs: Log[], name: "OwnershipTransferred"): _TypedLogDescription<{ previousOwner: string; newOwner: string }>[];
  extractEvents(logs: Log[], name: "P_Updated"): _TypedLogDescription<{ _P: BigNumber }>[];
  extractEvents(logs: Log[], name: "PriceFeedAddressChanged"): _TypedLogDescription<{ _newPriceFeedAddress: string }>[];
  extractEvents(logs: Log[], name: "S_Updated"): _TypedLogDescription<{ _tokenAddress: string; _S: BigNumber; _epoch: BigNumber; _scale: BigNumber }>[];
  extractEvents(logs: Log[], name: "ScaleUpdated"): _TypedLogDescription<{ _currentScale: BigNumber }>[];
  extractEvents(logs: Log[], name: "StabilityPoolCollBalanceUpdates"): _TypedLogDescription<{ _tokenAddress: string; _newBalance: BigNumber }>[];
  extractEvents(logs: Log[], name: "StabilityPoolDepositBalanceUpdated"): _TypedLogDescription<{ _newBalance: BigNumber }>[];
  extractEvents(logs: Log[], name: "StabilityPoolManagerAddressChanged"): _TypedLogDescription<{ _newStabilityPoolManagerAddress: string }>[];
  extractEvents(logs: Log[], name: "StoragePoolAddressChanged"): _TypedLogDescription<{ _newStoragePoolAddress: string }>[];
  extractEvents(logs: Log[], name: "TroveManagerAddressChanged"): _TypedLogDescription<{ _newTroveManagerAddress: string }>[];
}

interface TroveManagerCalls {
  BETA(_overrides?: CallOverrides): Promise<BigNumber>;
  BOOTSTRAP_PERIOD(_overrides?: CallOverrides): Promise<BigNumber>;
  BORROWING_FEE_FLOOR(_overrides?: CallOverrides): Promise<BigNumber>;
  CCR(_overrides?: CallOverrides): Promise<BigNumber>;
  MAX_BORROWING_FEE(_overrides?: CallOverrides): Promise<BigNumber>;
  MCR(_overrides?: CallOverrides): Promise<BigNumber>;
  MINUTE_DECAY_FACTOR(_overrides?: CallOverrides): Promise<BigNumber>;
  NAME(_overrides?: CallOverrides): Promise<string>;
  PERCENT_DIVISOR(_overrides?: CallOverrides): Promise<BigNumber>;
  SECONDS_IN_ONE_MINUTE(_overrides?: CallOverrides): Promise<BigNumber>;
  STABLE_COIN_GAS_COMPENSATION(_overrides?: CallOverrides): Promise<BigNumber>;
  TroveOwners(arg0: BigNumberish, _overrides?: CallOverrides): Promise<string>;
  Troves(arg0: string, _overrides?: CallOverrides): Promise<{ status: number; arrayIndex: BigNumber }>;
  _100pct(_overrides?: CallOverrides): Promise<BigNumber>;
  baseRate(_overrides?: CallOverrides): Promise<BigNumber>;
  borrowerOperationsAddress(_overrides?: CallOverrides): Promise<string>;
  calcDecayedBaseRate(_overrides?: CallOverrides): Promise<BigNumber>;
  collTokenManager(_overrides?: CallOverrides): Promise<string>;
  debtTokenManager(_overrides?: CallOverrides): Promise<string>;
  getBaseRate(_overrides?: CallOverrides): Promise<BigNumber>;
  getBorrowingFee(_debtValue: BigNumberish, _overrides?: CallOverrides): Promise<BigNumber>;
  getBorrowingFeeWithDecay(_debtValue: BigNumberish, _overrides?: CallOverrides): Promise<BigNumber>;
  getBorrowingRate(_overrides?: CallOverrides): Promise<BigNumber>;
  getBorrowingRateWithDecay(_overrides?: CallOverrides): Promise<BigNumber>;
  getCurrentICR(_borrower: string, _overrides?: CallOverrides): Promise<{ ICR: BigNumber; currentDebtInStable: BigNumber }>;
  getEntireDebtAndColl(_borrower: string, _overrides?: CallOverrides): Promise<{ amounts: { tokenAddress: string; isColl: boolean; amount: BigNumber; pendingReward: BigNumber; gasCompensation: BigNumber; toLiquidate: BigNumber; toRedistribute: BigNumber; toOffset: BigNumber }[]; troveCollInStable: BigNumber; troveDebtInStable: BigNumber; troveDebtInStableWithoutGasCompensation: BigNumber }>;
  getNominalICR(_borrower: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getPendingReward(_borrower: string, _tokenAddress: string, _isColl: boolean, _overrides?: CallOverrides): Promise<BigNumber>;
  getTroveColl(_borrower: string, _overrides?: CallOverrides): Promise<{ tokenAddress: string; amount: BigNumber }[]>;
  getTroveDebt(_borrower: string, _overrides?: CallOverrides): Promise<{ tokenAddress: string; amount: BigNumber }[]>;
  getTroveOwnersCount(_overrides?: CallOverrides): Promise<BigNumber>;
  getTroveStake(_borrower: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getTroveStakes(_borrower: string, _token: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getTroveStatus(_borrower: string, _overrides?: CallOverrides): Promise<BigNumber>;
  lastErrorRedistribution(arg0: string, arg1: boolean, _overrides?: CallOverrides): Promise<BigNumber>;
  lastFeeOperationTime(_overrides?: CallOverrides): Promise<BigNumber>;
  liquidatedTokens(arg0: string, arg1: boolean, _overrides?: CallOverrides): Promise<BigNumber>;
  owner(_overrides?: CallOverrides): Promise<string>;
  priceFeed(_overrides?: CallOverrides): Promise<string>;
  redemptionManagerAddress(_overrides?: CallOverrides): Promise<string>;
  rewardSnapshots(arg0: string, arg1: string, arg2: boolean, _overrides?: CallOverrides): Promise<BigNumber>;
  stabilityPoolManager(_overrides?: CallOverrides): Promise<string>;
  storagePool(_overrides?: CallOverrides): Promise<string>;
  totalCollateralSnapshots(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
  totalStakes(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
  totalStakesSnapshot(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
}

interface TroveManagerTransactions {
  addTroveOwnerToArray(_borrower: string, _overrides?: Overrides): Promise<BigNumber>;
  applyPendingRewards(_borrower: string, _overrides?: Overrides): Promise<void>;
  batchLiquidateTroves(_troveArray: string[], _overrides?: Overrides): Promise<void>;
  closeTrove(collTokenAddresses: string[], _borrower: string, _overrides?: Overrides): Promise<void>;
  decayBaseRateFromBorrowing(_overrides?: Overrides): Promise<void>;
  decreaseTroveColl(_borrower: string, _collTokenAmounts: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  decreaseTroveDebt(_borrower: string, _debtTokenAmounts: { debtToken: string; netDebt: BigNumberish; borrowingFee: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  increaseTroveColl(_borrower: string, _collTokenAmounts: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  increaseTroveDebt(_borrower: string, _debtTokenAmounts: { debtToken: string; netDebt: BigNumberish; borrowingFee: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  liquidate(_borrower: string, _overrides?: Overrides): Promise<void>;
  removeStake(collTokenAddresses: string[], _borrower: string, _overrides?: Overrides): Promise<void>;
  renounceOwnership(_overrides?: Overrides): Promise<void>;
  setAddresses(_borrowerOperationsAddress: string, _redemptionManagerAddress: string, _storagePoolAddress: string, _stabilityPoolManagerAddress: string, _priceFeedAddress: string, _debtTokenManagerAddress: string, _collTokenManagerAddress: string, _overrides?: Overrides): Promise<void>;
  setTroveStatus(_borrower: string, _num: BigNumberish, _overrides?: Overrides): Promise<void>;
  transferOwnership(newOwner: string, _overrides?: Overrides): Promise<void>;
  updateBaseRateFromRedemption(_totalRedeemedStable: BigNumberish, _totalStableCoinSupply: BigNumberish, _overrides?: Overrides): Promise<void>;
  updateStakeAndTotalStakes(collTokenAddresses: string[], _borrower: string, _overrides?: Overrides): Promise<void>;
  updateTroveRewardSnapshots(_borrower: string, _overrides?: Overrides): Promise<void>;
}

export interface TroveManager
  extends _TypedLiquityContract<TroveManagerCalls, TroveManagerTransactions> {
  readonly filters: {
    BaseRateUpdated(_baseRate?: null): EventFilter;
    BorrowerOperationsAddressChanged(_newBorrowerOperationsAddress?: null): EventFilter;
    CollTokenManagerAddressChanged(_newCollTokenManagerAddress?: null): EventFilter;
    DebtTokenManagerAddressChanged(_newDebtTokenManagerAddress?: null): EventFilter;
    LTermsUpdated(_L_ETH?: null, _L_LUSDDebt?: null): EventFilter;
    LastFeeOpTimeUpdated(_lastFeeOpTime?: null): EventFilter;
    Liquidation(liquidatedDebt?: null, liquidatedColl?: null, totalStableCoinGasCompensation?: null, totalCollGasCompensation?: null): EventFilter;
    OwnershipTransferred(previousOwner?: string | null, newOwner?: string | null): EventFilter;
    PriceFeedAddressChanged(_newPriceFeedAddress?: null): EventFilter;
    Redemption(_attemptedLUSDAmount?: null, _actualLUSDAmount?: null, _ETHSent?: null, _ETHFee?: null): EventFilter;
    RedemptionManagerAddressChanged(_newRedemptionManagerAddress?: null): EventFilter;
    StabilityPoolManagerAddressChanged(_stabilityPoolManagerAddress?: null): EventFilter;
    StoragePoolAddressChanged(_storagePoolAddress?: null): EventFilter;
    SystemSnapshotsUpdated(_totalStakesSnapshot?: null, _totalCollateralSnapshot?: null): EventFilter;
    TotalStakesUpdated(_newTotalStakes?: null): EventFilter;
    TroveIndexUpdated(_borrower?: null, _newIndex?: null): EventFilter;
    TroveLiquidated(_borrower?: string | null, _debt?: null, _coll?: null, _operation?: null): EventFilter;
    TroveSnapshotsUpdated(_L_ETH?: null, _L_LUSDDebt?: null): EventFilter;
    TroveUpdated(_borrower?: string | null, _debt?: null, _coll?: null, _stake?: null, _operation?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "BaseRateUpdated"): _TypedLogDescription<{ _baseRate: BigNumber }>[];
  extractEvents(logs: Log[], name: "BorrowerOperationsAddressChanged"): _TypedLogDescription<{ _newBorrowerOperationsAddress: string }>[];
  extractEvents(logs: Log[], name: "CollTokenManagerAddressChanged"): _TypedLogDescription<{ _newCollTokenManagerAddress: string }>[];
  extractEvents(logs: Log[], name: "DebtTokenManagerAddressChanged"): _TypedLogDescription<{ _newDebtTokenManagerAddress: string }>[];
  extractEvents(logs: Log[], name: "LTermsUpdated"): _TypedLogDescription<{ _L_ETH: BigNumber; _L_LUSDDebt: BigNumber }>[];
  extractEvents(logs: Log[], name: "LastFeeOpTimeUpdated"): _TypedLogDescription<{ _lastFeeOpTime: BigNumber }>[];
  extractEvents(logs: Log[], name: "Liquidation"): _TypedLogDescription<{ liquidatedDebt: { tokenAddress: string; amount: BigNumber }[]; liquidatedColl: { tokenAddress: string; amount: BigNumber }[]; totalStableCoinGasCompensation: BigNumber; totalCollGasCompensation: { tokenAddress: string; amount: BigNumber }[] }>[];
  extractEvents(logs: Log[], name: "OwnershipTransferred"): _TypedLogDescription<{ previousOwner: string; newOwner: string }>[];
  extractEvents(logs: Log[], name: "PriceFeedAddressChanged"): _TypedLogDescription<{ _newPriceFeedAddress: string }>[];
  extractEvents(logs: Log[], name: "Redemption"): _TypedLogDescription<{ _attemptedLUSDAmount: BigNumber; _actualLUSDAmount: BigNumber; _ETHSent: BigNumber; _ETHFee: BigNumber }>[];
  extractEvents(logs: Log[], name: "RedemptionManagerAddressChanged"): _TypedLogDescription<{ _newRedemptionManagerAddress: string }>[];
  extractEvents(logs: Log[], name: "StabilityPoolManagerAddressChanged"): _TypedLogDescription<{ _stabilityPoolManagerAddress: string }>[];
  extractEvents(logs: Log[], name: "StoragePoolAddressChanged"): _TypedLogDescription<{ _storagePoolAddress: string }>[];
  extractEvents(logs: Log[], name: "SystemSnapshotsUpdated"): _TypedLogDescription<{ _totalStakesSnapshot: BigNumber; _totalCollateralSnapshot: BigNumber }>[];
  extractEvents(logs: Log[], name: "TotalStakesUpdated"): _TypedLogDescription<{ _newTotalStakes: BigNumber }>[];
  extractEvents(logs: Log[], name: "TroveIndexUpdated"): _TypedLogDescription<{ _borrower: string; _newIndex: BigNumber }>[];
  extractEvents(logs: Log[], name: "TroveLiquidated"): _TypedLogDescription<{ _borrower: string; _debt: BigNumber; _coll: BigNumber; _operation: number }>[];
  extractEvents(logs: Log[], name: "TroveSnapshotsUpdated"): _TypedLogDescription<{ _L_ETH: BigNumber; _L_LUSDDebt: BigNumber }>[];
  extractEvents(logs: Log[], name: "TroveUpdated"): _TypedLogDescription<{ _borrower: string; _debt: BigNumber; _coll: BigNumber; _stake: BigNumber; _operation: number }>[];
}
