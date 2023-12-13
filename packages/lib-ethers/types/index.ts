
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
  MAX_BORROWING_FEE(_overrides?: CallOverrides): Promise<BigNumber>;
  MCR(_overrides?: CallOverrides): Promise<BigNumber>;
  NAME(_overrides?: CallOverrides): Promise<string>;
  PERCENT_DIVISOR(_overrides?: CallOverrides): Promise<BigNumber>;
  REDEMPTION_FEE_FLOOR(_overrides?: CallOverrides): Promise<BigNumber>;
  RESERVE_FEE(_overrides?: CallOverrides): Promise<BigNumber>;
  STABLE_COIN_GAS_COMPENSATION(_overrides?: CallOverrides): Promise<BigNumber>;
  _100pct(_overrides?: CallOverrides): Promise<BigNumber>;
  collTokenManager(_overrides?: CallOverrides): Promise<string>;
  debtTokenManager(_overrides?: CallOverrides): Promise<string>;
  getCompositeDebt(_debts: { debtToken: string; netDebt: BigNumberish; borrowingFee: BigNumberish }[], _overrides?: CallOverrides): Promise<BigNumber>;
  owner(_overrides?: CallOverrides): Promise<string>;
  priceFeed(_overrides?: CallOverrides): Promise<string>;
  reservePool(_overrides?: CallOverrides): Promise<string>;
  storagePool(_overrides?: CallOverrides): Promise<string>;
  troveManager(_overrides?: CallOverrides): Promise<string>;
}

interface BorrowerOperationsTransactions {
  addColl(_colls: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  closeTrove(_overrides?: Overrides): Promise<void>;
  increaseDebt(_borrower: string, _to: string, _debts: { tokenAddress: string; amount: BigNumberish }[], _maxFeePercentage: BigNumberish, _overrides?: Overrides): Promise<void>;
  openTrove(_colls: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  renounceOwnership(_overrides?: Overrides): Promise<void>;
  repayDebt(_debts: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  repayDebtFromPoolBurn(borrower: string, _debts: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  setAddresses(_troveManagerAddress: string, _storagePoolAddress: string, _stabilityPoolAddress: string, _reservePoolAddress: string, _priceFeedAddress: string, _debtTokenManagerAddress: string, _collTokenManagerAddress: string, _swapOperations: string, _overrides?: Overrides): Promise<void>;
  transferOwnership(newOwner: string, _overrides?: Overrides): Promise<void>;
  withdrawColl(_colls: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
}

export interface BorrowerOperations
  extends _TypedLiquityContract<BorrowerOperationsCalls, BorrowerOperationsTransactions> {
  readonly filters: {
    BorrowerOperationsInitialized(_troveManagerAddress?: null, _storagePoolAddress?: null, _stabilityPoolAddress?: null, _reservePoolAddress?: null, _priceFeedAddress?: null, _debtTokenManagerAddress?: null, _collTokenManagerAddress?: null, _swapOperationsAddress?: null): EventFilter;
    OwnershipTransferred(previousOwner?: string | null, newOwner?: string | null): EventFilter;
    SentBorrowingFeesToReserve(_borrower?: string | null, amount?: null): EventFilter;
    TroveCreated(_borrower?: null, arrayIndex?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "BorrowerOperationsInitialized"): _TypedLogDescription<{ _troveManagerAddress: string; _storagePoolAddress: string; _stabilityPoolAddress: string; _reservePoolAddress: string; _priceFeedAddress: string; _debtTokenManagerAddress: string; _collTokenManagerAddress: string; _swapOperationsAddress: string }>[];
  extractEvents(logs: Log[], name: "OwnershipTransferred"): _TypedLogDescription<{ previousOwner: string; newOwner: string }>[];
  extractEvents(logs: Log[], name: "SentBorrowingFeesToReserve"): _TypedLogDescription<{ _borrower: string; amount: BigNumber }>[];
  extractEvents(logs: Log[], name: "TroveCreated"): _TypedLogDescription<{ _borrower: string; arrayIndex: BigNumber }>[];
}

interface RedemptionOperationsCalls {
  BORROWING_FEE_FLOOR(_overrides?: CallOverrides): Promise<BigNumber>;
  CCR(_overrides?: CallOverrides): Promise<BigNumber>;
  MAX_BORROWING_FEE(_overrides?: CallOverrides): Promise<BigNumber>;
  MCR(_overrides?: CallOverrides): Promise<BigNumber>;
  NAME(_overrides?: CallOverrides): Promise<string>;
  PERCENT_DIVISOR(_overrides?: CallOverrides): Promise<BigNumber>;
  REDEMPTION_FEE_FLOOR(_overrides?: CallOverrides): Promise<BigNumber>;
  RESERVE_FEE(_overrides?: CallOverrides): Promise<BigNumber>;
  STABLE_COIN_GAS_COMPENSATION(_overrides?: CallOverrides): Promise<BigNumber>;
  _100pct(_overrides?: CallOverrides): Promise<BigNumber>;
  collTokenManager(_overrides?: CallOverrides): Promise<string>;
  debtTokenManager(_overrides?: CallOverrides): Promise<string>;
  getRedemptionFeeWithDecay(_collDrawn: BigNumberish, _overrides?: CallOverrides): Promise<BigNumber>;
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
    OwnershipTransferred(previousOwner?: string | null, newOwner?: string | null): EventFilter;
    RedeemedFromTrove(_borrower?: null, stableAmount?: null, _drawnCollAmounts?: null): EventFilter;
    RedemptionOperationsInitialized(_troveManager?: null, _storgePool?: null, _priceFeed?: null, _debtTokenManager?: null, _collTokenManager?: null): EventFilter;
    SuccessfulRedemption(_attemptedStableAmount?: null, _actualStableAmount?: null, _collPayouts?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "OwnershipTransferred"): _TypedLogDescription<{ previousOwner: string; newOwner: string }>[];
  extractEvents(logs: Log[], name: "RedeemedFromTrove"): _TypedLogDescription<{ _borrower: string; stableAmount: BigNumber; _drawnCollAmounts: { tokenAddress: string; amount: BigNumber }[] }>[];
  extractEvents(logs: Log[], name: "RedemptionOperationsInitialized"): _TypedLogDescription<{ _troveManager: string; _storgePool: string; _priceFeed: string; _debtTokenManager: string; _collTokenManager: string }>[];
  extractEvents(logs: Log[], name: "SuccessfulRedemption"): _TypedLogDescription<{ _attemptedStableAmount: BigNumber; _actualStableAmount: BigNumber; _collPayouts: { collToken: string; drawn: BigNumber; redemptionFee: BigNumber; sendToRedeemer: BigNumber }[] }>[];
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
  REDEMPTION_FEE_FLOOR(_overrides?: CallOverrides): Promise<BigNumber>;
  RESERVE_FEE(_overrides?: CallOverrides): Promise<BigNumber>;
  STABLE_COIN_GAS_COMPENSATION(_overrides?: CallOverrides): Promise<BigNumber>;
  TroveOwners(arg0: BigNumberish, _overrides?: CallOverrides): Promise<string>;
  Troves(arg0: string, _overrides?: CallOverrides): Promise<{ status: number; arrayIndex: BigNumber }>;
  _100pct(_overrides?: CallOverrides): Promise<BigNumber>;
  baseRate(_overrides?: CallOverrides): Promise<BigNumber>;
  borrowerOperationsAddress(_overrides?: CallOverrides): Promise<string>;
  calcDecayedBaseRate(_overrides?: CallOverrides): Promise<BigNumber>;
  getBaseRate(_overrides?: CallOverrides): Promise<BigNumber>;
  getBorrowingFee(_debtValue: BigNumberish, _overrides?: CallOverrides): Promise<BigNumber>;
  getBorrowingFeeWithDecay(_debtValue: BigNumberish, _overrides?: CallOverrides): Promise<BigNumber>;
  getBorrowingRate(_overrides?: CallOverrides): Promise<BigNumber>;
  getBorrowingRateWithDecay(_overrides?: CallOverrides): Promise<BigNumber>;
  getCurrentICR(_borrower: string, _overrides?: CallOverrides): Promise<{ ICR: BigNumber; currentDebtInUSD: BigNumber }>;
  getEntireDebtAndColl(_borrower: string, _overrides?: CallOverrides): Promise<{ amounts: { tokenAddress: string; isColl: boolean; amount: BigNumber; pendingReward: BigNumber; gasCompensation: BigNumber; toLiquidate: BigNumber; toRedistribute: BigNumber; toOffset: BigNumber }[]; troveCollInUSD: BigNumber; troveDebtInUSD: BigNumber; troveDebtInUSDWithoutGasCompensation: BigNumber }>;
  getNominalICR(_borrower: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getPendingReward(_borrower: string, _tokenAddress: string, _isColl: boolean, _overrides?: CallOverrides): Promise<BigNumber>;
  getTroveColl(_borrower: string, _overrides?: CallOverrides): Promise<{ tokenAddress: string; amount: BigNumber }[]>;
  getTroveDebt(_borrower: string, _overrides?: CallOverrides): Promise<{ tokenAddress: string; amount: BigNumber }[]>;
  getTroveOwnersCount(_overrides?: CallOverrides): Promise<BigNumber>;
  getTroveRepayableDebt(_borrower: string, _debtTokenAddress: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getTroveStakeValue(_borrower: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getTroveStakes(_borrower: string, _token: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getTroveStatus(_borrower: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getTroveWithdrawableColl(_borrower: string, _collTokenAddress: string, _overrides?: CallOverrides): Promise<BigNumber>;
  isTroveActive(_borrower: string, _overrides?: CallOverrides): Promise<boolean>;
  lastErrorRedistribution(arg0: string, arg1: boolean, _overrides?: CallOverrides): Promise<BigNumber>;
  lastFeeOperationTime(_overrides?: CallOverrides): Promise<BigNumber>;
  liquidatedTokens(arg0: string, arg1: boolean, _overrides?: CallOverrides): Promise<BigNumber>;
  liquidationOperationsAddress(_overrides?: CallOverrides): Promise<string>;
  owner(_overrides?: CallOverrides): Promise<string>;
  priceFeed(_overrides?: CallOverrides): Promise<string>;
  redemptionOperationsAddress(_overrides?: CallOverrides): Promise<string>;
  rewardSnapshots(arg0: string, arg1: string, arg2: boolean, _overrides?: CallOverrides): Promise<BigNumber>;
  storagePool(_overrides?: CallOverrides): Promise<string>;
  totalCollateralSnapshots(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
  totalStakes(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
  totalStakesSnapshot(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
}

interface TroveManagerTransactions {
  addTroveOwnerToArray(_borrower: string, _overrides?: Overrides): Promise<BigNumber>;
  applyPendingRewards(_borrower: string, _overrides?: Overrides): Promise<void>;
  closeTroveByProtocol(collTokenAddresses: string[], _borrower: string, closedStatus: BigNumberish, _overrides?: Overrides): Promise<void>;
  decayBaseRateFromBorrowing(_overrides?: Overrides): Promise<void>;
  decreaseTroveColl(_borrower: string, _collTokenAmounts: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  decreaseTroveDebt(_borrower: string, _debtTokenAmounts: { debtToken: string; netDebt: BigNumberish; borrowingFee: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  increaseTroveColl(_borrower: string, _collTokenAmounts: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  increaseTroveDebt(_borrower: string, _debtTokenAmounts: { debtToken: string; netDebt: BigNumberish; borrowingFee: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  redistributeDebtAndColl(collTokenAddresses: string[], toRedistribute: { tokenAddress: string; isColl: boolean; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  removeStake(collTokenAddresses: string[], _borrower: string, _overrides?: Overrides): Promise<void>;
  renounceOwnership(_overrides?: Overrides): Promise<void>;
  setAddresses(_borrowerOperationsAddress: string, _redemptionOperationsAddress: string, _liquidationOperationsAddress: string, _storagePoolAddress: string, _priceFeedAddress: string, _overrides?: Overrides): Promise<void>;
  setTroveStatus(_borrower: string, _num: BigNumberish, _overrides?: Overrides): Promise<void>;
  transferOwnership(newOwner: string, _overrides?: Overrides): Promise<void>;
  updateBaseRateFromRedemption(_totalRedeemedStable: BigNumberish, _totalStableCoinSupply: BigNumberish, _overrides?: Overrides): Promise<void>;
  updateStakeAndTotalStakes(collTokenAddresses: string[], _borrower: string, _overrides?: Overrides): Promise<void>;
  updateSystemSnapshots_excludeCollRemainder(totalCollGasCompensation: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  updateTroveRewardSnapshots(_borrower: string, _overrides?: Overrides): Promise<void>;
}

export interface TroveManager
  extends _TypedLiquityContract<TroveManagerCalls, TroveManagerTransactions> {
  readonly filters: {
    BaseRateUpdated(_baseRate?: null): EventFilter;
    LTermsUpdated(_liquidatedTokens?: null): EventFilter;
    LastFeeOpTimeUpdated(_lastFeeOpTime?: null): EventFilter;
    OwnershipTransferred(previousOwner?: string | null, newOwner?: string | null): EventFilter;
    SystemSnapshotsUpdated(_totalStakesSnapshot?: null, _totalCollateralSnapshot?: null): EventFilter;
    TotalStakesUpdated(_totalStakes?: null): EventFilter;
    TroveAppliedRewards(_borrower?: null, _appliedRewards?: null): EventFilter;
    TroveClosed(_borrower?: null, _closingState?: null): EventFilter;
    TroveCollChanged(_borrower?: null, _collTokenAddresses?: null): EventFilter;
    TroveIndexUpdated(_borrower?: null, _newIndex?: null): EventFilter;
    TroveManagerInitialized(_borrowerOperationsAddress?: null, _redemptionOperationsAddress?: null, _liquidationOperationsAddress?: null, _storagePoolAddress?: null, _priceFeedAddress?: null): EventFilter;
    TroveSnapshotsUpdated(_liquidatedTokens?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "BaseRateUpdated"): _TypedLogDescription<{ _baseRate: BigNumber }>[];
  extractEvents(logs: Log[], name: "LTermsUpdated"): _TypedLogDescription<{ _liquidatedTokens: { tokenAddress: string; isColl: boolean; amount: BigNumber }[] }>[];
  extractEvents(logs: Log[], name: "LastFeeOpTimeUpdated"): _TypedLogDescription<{ _lastFeeOpTime: BigNumber }>[];
  extractEvents(logs: Log[], name: "OwnershipTransferred"): _TypedLogDescription<{ previousOwner: string; newOwner: string }>[];
  extractEvents(logs: Log[], name: "SystemSnapshotsUpdated"): _TypedLogDescription<{ _totalStakesSnapshot: { tokenAddress: string; amount: BigNumber }[]; _totalCollateralSnapshot: { tokenAddress: string; amount: BigNumber }[] }>[];
  extractEvents(logs: Log[], name: "TotalStakesUpdated"): _TypedLogDescription<{ _totalStakes: { tokenAddress: string; amount: BigNumber }[] }>[];
  extractEvents(logs: Log[], name: "TroveAppliedRewards"): _TypedLogDescription<{ _borrower: string; _appliedRewards: { tokenAddress: string; isColl: boolean; amount: BigNumber }[] }>[];
  extractEvents(logs: Log[], name: "TroveClosed"): _TypedLogDescription<{ _borrower: string; _closingState: number }>[];
  extractEvents(logs: Log[], name: "TroveCollChanged"): _TypedLogDescription<{ _borrower: string; _collTokenAddresses: string[] }>[];
  extractEvents(logs: Log[], name: "TroveIndexUpdated"): _TypedLogDescription<{ _borrower: string; _newIndex: BigNumber }>[];
  extractEvents(logs: Log[], name: "TroveManagerInitialized"): _TypedLogDescription<{ _borrowerOperationsAddress: string; _redemptionOperationsAddress: string; _liquidationOperationsAddress: string; _storagePoolAddress: string; _priceFeedAddress: string }>[];
  extractEvents(logs: Log[], name: "TroveSnapshotsUpdated"): _TypedLogDescription<{ _liquidatedTokens: { tokenAddress: string; isColl: boolean; amount: BigNumber }[] }>[];
}

interface StoragePoolCalls {
  BORROWING_FEE_FLOOR(_overrides?: CallOverrides): Promise<BigNumber>;
  CCR(_overrides?: CallOverrides): Promise<BigNumber>;
  MAX_BORROWING_FEE(_overrides?: CallOverrides): Promise<BigNumber>;
  MCR(_overrides?: CallOverrides): Promise<BigNumber>;
  NAME(_overrides?: CallOverrides): Promise<string>;
  PERCENT_DIVISOR(_overrides?: CallOverrides): Promise<BigNumber>;
  REDEMPTION_FEE_FLOOR(_overrides?: CallOverrides): Promise<BigNumber>;
  RESERVE_FEE(_overrides?: CallOverrides): Promise<BigNumber>;
  STABLE_COIN_GAS_COMPENSATION(_overrides?: CallOverrides): Promise<BigNumber>;
  _100pct(_overrides?: CallOverrides): Promise<BigNumber>;
  borrowerOperationsAddress(_overrides?: CallOverrides): Promise<string>;
  checkRecoveryMode(_overrides?: CallOverrides): Promise<{ isInRecoveryMode: boolean; TCR: BigNumber; entireSystemColl: BigNumber; entireSystemDebt: BigNumber }>;
  collTokenAddresses(arg0: BigNumberish, _overrides?: CallOverrides): Promise<string>;
  debtTokenAddresses(arg0: BigNumberish, _overrides?: CallOverrides): Promise<string>;
  getEntireSystemColl(_overrides?: CallOverrides): Promise<BigNumber>;
  getEntireSystemDebt(_overrides?: CallOverrides): Promise<BigNumber>;
  getTokenTotalAmount(_tokenAddress: string, _isColl: boolean, _overrides?: CallOverrides): Promise<BigNumber>;
  getValue(_tokenAddress: string, _isColl: boolean, _poolType: BigNumberish, _overrides?: CallOverrides): Promise<BigNumber>;
  liquidationOperationsAddress(_overrides?: CallOverrides): Promise<string>;
  owner(_overrides?: CallOverrides): Promise<string>;
  priceFeed(_overrides?: CallOverrides): Promise<string>;
  redemptionOperationsAddress(_overrides?: CallOverrides): Promise<string>;
  stabilityPoolManagerAddress(_overrides?: CallOverrides): Promise<string>;
  troveManagerAddress(_overrides?: CallOverrides): Promise<string>;
}

interface StoragePoolTransactions {
  addValue(_tokenAddress: string, _isColl: boolean, _poolType: BigNumberish, _amount: BigNumberish, _overrides?: Overrides): Promise<void>;
  renounceOwnership(_overrides?: Overrides): Promise<void>;
  setAddresses(_borrowerOperationsAddress: string, _troveManagerAddress: string, _redemptionOperationsAddress: string, _liquidationOperationsAddress: string, _stabilityPoolManagerAddress: string, _priceFeedAddress: string, _overrides?: Overrides): Promise<void>;
  subtractValue(_tokenAddress: string, _isColl: boolean, _poolType: BigNumberish, _amount: BigNumberish, _overrides?: Overrides): Promise<void>;
  transferBetweenTypes(_tokenAddress: string, _isColl: boolean, _fromType: BigNumberish, _toType: BigNumberish, _amount: BigNumberish, _overrides?: Overrides): Promise<void>;
  transferOwnership(newOwner: string, _overrides?: Overrides): Promise<void>;
  withdrawalValue(_receiver: string, _tokenAddress: string, _isColl: boolean, _poolType: BigNumberish, _amount: BigNumberish, _overrides?: Overrides): Promise<void>;
}

export interface StoragePool
  extends _TypedLiquityContract<StoragePoolCalls, StoragePoolTransactions> {
  readonly filters: {
    OwnershipTransferred(previousOwner?: string | null, newOwner?: string | null): EventFilter;
    StoragePoolInitialized(_borrowerOperationsAddress?: null, _troveManagerAddress?: null, _redemptionOperationsAddress?: null, _liquidationOperationsAddress?: null, _stabilityPoolManagerAddress?: null, _priceFeedAddress?: null): EventFilter;
    StoragePoolValueUpdated(_tokenAddress?: null, _isColl?: null, _poolType?: null, _updatedAmount?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "OwnershipTransferred"): _TypedLogDescription<{ previousOwner: string; newOwner: string }>[];
  extractEvents(logs: Log[], name: "StoragePoolInitialized"): _TypedLogDescription<{ _borrowerOperationsAddress: string; _troveManagerAddress: string; _redemptionOperationsAddress: string; _liquidationOperationsAddress: string; _stabilityPoolManagerAddress: string; _priceFeedAddress: string }>[];
  extractEvents(logs: Log[], name: "StoragePoolValueUpdated"): _TypedLogDescription<{ _tokenAddress: string; _isColl: boolean; _poolType: number; _updatedAmount: BigNumber }>[];
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
  redemptionOperationsAddress(_overrides?: CallOverrides): Promise<string>;
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
    Transfer(from?: string | null, to?: string | null, value?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "Approval"): _TypedLogDescription<{ owner: string; spender: string; value: BigNumber }>[];
  extractEvents(logs: Log[], name: "Transfer"): _TypedLogDescription<{ from: string; to: string; value: BigNumber }>[];
}

interface PriceFeedCalls {
  NAME(_overrides?: CallOverrides): Promise<string>;
  getAmountFromUSDValue(_token: string, _usdValue: BigNumberish, _overrides?: CallOverrides): Promise<BigNumber>;
  getPrice(_tokenAddress: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getUSDValue(_token: string, _amount: BigNumberish, _overrides?: CallOverrides): Promise<BigNumber>;
  lastGoodPrices(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
  owner(_overrides?: CallOverrides): Promise<string>;
}

interface PriceFeedTransactions {
  renounceOwnership(_overrides?: Overrides): Promise<void>;
  setAddresses(_overrides?: Overrides): Promise<void>;
  transferOwnership(newOwner: string, _overrides?: Overrides): Promise<void>;
}

export interface PriceFeed
  extends _TypedLiquityContract<PriceFeedCalls, PriceFeedTransactions> {
  readonly filters: {
    LastGoodPriceUpdated(_token?: null, _lastGoodPrice?: null): EventFilter;
    OwnershipTransferred(previousOwner?: string | null, newOwner?: string | null): EventFilter;
    PriceFeedStatusChanged(_token?: null, newStatus?: null): EventFilter;
    TokenPriceChanged(_token?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "LastGoodPriceUpdated"): _TypedLogDescription<{ _token: string; _lastGoodPrice: BigNumber }>[];
  extractEvents(logs: Log[], name: "OwnershipTransferred"): _TypedLogDescription<{ previousOwner: string; newOwner: string }>[];
  extractEvents(logs: Log[], name: "PriceFeedStatusChanged"): _TypedLogDescription<{ _token: string; newStatus: number }>[];
  extractEvents(logs: Log[], name: "TokenPriceChanged"): _TypedLogDescription<{ _token: string }>[];
}

interface MockPriceFeedCalls {
  getAmountFromUSDValue(_token: string, _usdValue: BigNumberish, _overrides?: CallOverrides): Promise<BigNumber>;
  getPrice(_tokenAddress: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getUSDValue(_token: string, _amount: BigNumberish, _overrides?: CallOverrides): Promise<BigNumber>;
}

interface MockPriceFeedTransactions {
  setTokenPrice(tokenAddress: string, price: BigNumberish, _overrides?: Overrides): Promise<boolean>;
}

export interface MockPriceFeed
  extends _TypedLiquityContract<MockPriceFeedCalls, MockPriceFeedTransactions> {
  readonly filters: {
    LastGoodPriceUpdated(_token?: null, _lastGoodPrice?: null): EventFilter;
    PriceFeedStatusChanged(_token?: null, newStatus?: null): EventFilter;
    TokenPriceChanged(_token?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "LastGoodPriceUpdated"): _TypedLogDescription<{ _token: string; _lastGoodPrice: BigNumber }>[];
  extractEvents(logs: Log[], name: "PriceFeedStatusChanged"): _TypedLogDescription<{ _token: string; newStatus: number }>[];
  extractEvents(logs: Log[], name: "TokenPriceChanged"): _TypedLogDescription<{ _token: string }>[];
}

interface StabilityPoolCalls {
  BORROWING_FEE_FLOOR(_overrides?: CallOverrides): Promise<BigNumber>;
  CCR(_overrides?: CallOverrides): Promise<BigNumber>;
  MAX_BORROWING_FEE(_overrides?: CallOverrides): Promise<BigNumber>;
  MCR(_overrides?: CallOverrides): Promise<BigNumber>;
  NAME(_overrides?: CallOverrides): Promise<string>;
  P(_overrides?: CallOverrides): Promise<BigNumber>;
  PERCENT_DIVISOR(_overrides?: CallOverrides): Promise<BigNumber>;
  REDEMPTION_FEE_FLOOR(_overrides?: CallOverrides): Promise<BigNumber>;
  RESERVE_FEE(_overrides?: CallOverrides): Promise<BigNumber>;
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
  getDepositorDeposit(_depositor: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getTotalDeposit(_overrides?: CallOverrides): Promise<BigNumber>;
  getTotalGainedColl(_overrides?: CallOverrides): Promise<{ tokenAddress: string; amount: BigNumber }[]>;
  lastErrorOffset(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
  stabilityPoolManagerAddress(_overrides?: CallOverrides): Promise<string>;
  totalDeposits(_overrides?: CallOverrides): Promise<BigNumber>;
  totalGainedColl(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
  usedCollTokens(arg0: BigNumberish, _overrides?: CallOverrides): Promise<string>;
}

interface StabilityPoolTransactions {
  offset(_debtToOffset: BigNumberish, _collToAdd: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  provideToSP(depositor: string, _amount: BigNumberish, _overrides?: Overrides): Promise<void>;
  withdrawFromSP(user: string, depositToWithdrawal: BigNumberish, _overrides?: Overrides): Promise<void>;
  withdrawGains(user: string, _overrides?: Overrides): Promise<void>;
}

export interface StabilityPool
  extends _TypedLiquityContract<StabilityPoolCalls, StabilityPoolTransactions> {
  readonly filters: {
    DepositSnapshotUpdated(_depositor?: string | null): EventFilter;
    EpochUpdated(_currentEpoch?: null): EventFilter;
    P_Updated(_P?: null): EventFilter;
    S_Updated(_tokenAddress?: null, _S?: null, _epoch?: null, _scale?: null): EventFilter;
    ScaleUpdated(_currentScale?: null): EventFilter;
    StabilityGainsWithdrawn(user?: null, depositLost?: null, gainsWithdrawn?: null): EventFilter;
    StabilityOffset(removedDeposit?: null, addedGains?: null): EventFilter;
    StabilityPoolInitialized(stabilityPoolManagerAddress?: null, depositTokenAddress?: null): EventFilter;
    StabilityProvided(user?: null, amount?: null): EventFilter;
    StabilityWithdrawn(user?: null, amount?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "DepositSnapshotUpdated"): _TypedLogDescription<{ _depositor: string }>[];
  extractEvents(logs: Log[], name: "EpochUpdated"): _TypedLogDescription<{ _currentEpoch: BigNumber }>[];
  extractEvents(logs: Log[], name: "P_Updated"): _TypedLogDescription<{ _P: BigNumber }>[];
  extractEvents(logs: Log[], name: "S_Updated"): _TypedLogDescription<{ _tokenAddress: string; _S: BigNumber; _epoch: BigNumber; _scale: BigNumber }>[];
  extractEvents(logs: Log[], name: "ScaleUpdated"): _TypedLogDescription<{ _currentScale: BigNumber }>[];
  extractEvents(logs: Log[], name: "StabilityGainsWithdrawn"): _TypedLogDescription<{ user: string; depositLost: BigNumber; gainsWithdrawn: { tokenAddress: string; amount: BigNumber }[] }>[];
  extractEvents(logs: Log[], name: "StabilityOffset"): _TypedLogDescription<{ removedDeposit: BigNumber; addedGains: { tokenAddress: string; amount: BigNumber }[] }>[];
  extractEvents(logs: Log[], name: "StabilityPoolInitialized"): _TypedLogDescription<{ stabilityPoolManagerAddress: string; depositTokenAddress: string }>[];
  extractEvents(logs: Log[], name: "StabilityProvided"): _TypedLogDescription<{ user: string; amount: BigNumber }>[];
  extractEvents(logs: Log[], name: "StabilityWithdrawn"): _TypedLogDescription<{ user: string; amount: BigNumber }>[];
}

interface StabilityPoolManagerCalls {
  NAME(_overrides?: CallOverrides): Promise<string>;
  debtTokenManagerAddress(_overrides?: CallOverrides): Promise<string>;
  getCompoundedDeposits(_overrides?: CallOverrides): Promise<{ tokenAddress: string; amount: BigNumber }[]>;
  getDepositorCollGains(_depositor: string, collTokenAddresses: string[], _overrides?: CallOverrides): Promise<{ tokenAddress: string; amount: BigNumber }[]>;
  getDepositorCompoundedDeposit(_depositor: string, _debtTokenAddress: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getDepositorDeposit(_depositor: string, _debtTokenAddress: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getDepositorDeposits(_depositor: string, _overrides?: CallOverrides): Promise<{ tokenAddress: string; amount: BigNumber }[]>;
  getRemainingStability(collTokenAddresses: string[], _overrides?: CallOverrides): Promise<{ stabilityPool: string; tokenAddress: string; remaining: BigNumber; debtToOffset: BigNumber; collGained: { tokenAddress: string; amount: BigNumber }[] }[]>;
  getStabilityPool(_debtToken: string, _overrides?: CallOverrides): Promise<string>;
  getStabilityPools(_overrides?: CallOverrides): Promise<string[]>;
  getTotalDeposit(_debtTokenAddress: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getTotalDeposits(_overrides?: CallOverrides): Promise<{ tokenAddress: string; amount: BigNumber }[]>;
  liquidationOperationsAddress(_overrides?: CallOverrides): Promise<string>;
  owner(_overrides?: CallOverrides): Promise<string>;
  priceFeed(_overrides?: CallOverrides): Promise<string>;
  reservePool(_overrides?: CallOverrides): Promise<string>;
  stabilityPools(arg0: string, _overrides?: CallOverrides): Promise<string>;
  stabilityPoolsArray(arg0: BigNumberish, _overrides?: CallOverrides): Promise<string>;
  storagePool(_overrides?: CallOverrides): Promise<string>;
}

interface StabilityPoolManagerTransactions {
  addStabilityPool(_debtToken: string, _overrides?: Overrides): Promise<void>;
  offset(_toOffset: { stabilityPool: string; tokenAddress: string; remaining: BigNumberish; debtToOffset: BigNumberish; collGained: { tokenAddress: string; amount: BigNumberish }[] }[], _overrides?: Overrides): Promise<void>;
  provideStability(_debts: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  renounceOwnership(_overrides?: Overrides): Promise<void>;
  setAddresses(_liquidationOperationsAddress: string, _priceFeedAddress: string, _storagePoolAddress: string, _reservePoolAddress: string, _debtTokenManagerAddress: string, _overrides?: Overrides): Promise<void>;
  transferOwnership(newOwner: string, _overrides?: Overrides): Promise<void>;
  withdrawGains(_overrides?: Overrides): Promise<void>;
  withdrawStability(_debts: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
}

export interface StabilityPoolManager
  extends _TypedLiquityContract<StabilityPoolManagerCalls, StabilityPoolManagerTransactions> {
  readonly filters: {
    OwnershipTransferred(previousOwner?: string | null, newOwner?: string | null): EventFilter;
    StabilityPoolAdded(stabilityPoolAddress?: null): EventFilter;
    StabilityPoolManagerInitiated(liquidationOperationsAddress?: null, storgePoolAddress?: null, reservePoolAddress?: null, debtTokenManagerAddress?: null, priceFeedAddress?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "OwnershipTransferred"): _TypedLogDescription<{ previousOwner: string; newOwner: string }>[];
  extractEvents(logs: Log[], name: "StabilityPoolAdded"): _TypedLogDescription<{ stabilityPoolAddress: string }>[];
  extractEvents(logs: Log[], name: "StabilityPoolManagerInitiated"): _TypedLogDescription<{ liquidationOperationsAddress: string; storgePoolAddress: string; reservePoolAddress: string; debtTokenManagerAddress: string; priceFeedAddress: string }>[];
}

interface DebtTokenManagerCalls {
  NAME(_overrides?: CallOverrides): Promise<string>;
  debtTokenAddresses(arg0: BigNumberish, _overrides?: CallOverrides): Promise<string>;
  debtTokens(arg0: string, _overrides?: CallOverrides): Promise<string>;
  debtTokensArray(arg0: BigNumberish, _overrides?: CallOverrides): Promise<string>;
  getDebtToken(_address: string, _overrides?: CallOverrides): Promise<string>;
  getDebtTokenAddresses(_overrides?: CallOverrides): Promise<string[]>;
  getStableCoin(_overrides?: CallOverrides): Promise<string>;
  owner(_overrides?: CallOverrides): Promise<string>;
  stabilityPoolManager(_overrides?: CallOverrides): Promise<string>;
  stableCoin(_overrides?: CallOverrides): Promise<string>;
}

interface DebtTokenManagerTransactions {
  addDebtToken(_debtTokenAddress: string, _overrides?: Overrides): Promise<void>;
  renounceOwnership(_overrides?: Overrides): Promise<void>;
  setAddresses(_stabilityPoolManagerAddress: string, _overrides?: Overrides): Promise<void>;
  transferOwnership(newOwner: string, _overrides?: Overrides): Promise<void>;
}

export interface DebtTokenManager
  extends _TypedLiquityContract<DebtTokenManagerCalls, DebtTokenManagerTransactions> {
  readonly filters: {
    DebtTokenAdded(_debtTokenAddress?: null): EventFilter;
    DebtTokenManagerInitialized(_stabilityPoolManagerAddress?: null): EventFilter;
    OwnershipTransferred(previousOwner?: string | null, newOwner?: string | null): EventFilter;
  };
  extractEvents(logs: Log[], name: "DebtTokenAdded"): _TypedLogDescription<{ _debtTokenAddress: string }>[];
  extractEvents(logs: Log[], name: "DebtTokenManagerInitialized"): _TypedLogDescription<{ _stabilityPoolManagerAddress: string }>[];
  extractEvents(logs: Log[], name: "OwnershipTransferred"): _TypedLogDescription<{ previousOwner: string; newOwner: string }>[];
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
    CollTokenManagerInitialized(_priceFeedAddress?: null): EventFilter;
    OwnershipTransferred(previousOwner?: string | null, newOwner?: string | null): EventFilter;
  };
  extractEvents(logs: Log[], name: "CollTokenAdded"): _TypedLogDescription<{ _collTokenAddress: string }>[];
  extractEvents(logs: Log[], name: "CollTokenManagerInitialized"): _TypedLogDescription<{ _priceFeedAddress: string }>[];
  extractEvents(logs: Log[], name: "OwnershipTransferred"): _TypedLogDescription<{ previousOwner: string; newOwner: string }>[];
}

interface IERC20Calls {
  allowance(owner: string, spender: string, _overrides?: CallOverrides): Promise<BigNumber>;
  balanceOf(account: string, _overrides?: CallOverrides): Promise<BigNumber>;
  totalSupply(_overrides?: CallOverrides): Promise<BigNumber>;
}

interface IERC20Transactions {
  approve(spender: string, value: BigNumberish, _overrides?: Overrides): Promise<boolean>;
  transfer(to: string, value: BigNumberish, _overrides?: Overrides): Promise<boolean>;
  transferFrom(from: string, to: string, value: BigNumberish, _overrides?: Overrides): Promise<boolean>;
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
  approve(spender: string, value: BigNumberish, _overrides?: Overrides): Promise<boolean>;
  transfer(to: string, value: BigNumberish, _overrides?: Overrides): Promise<boolean>;
  transferFrom(from: string, to: string, value: BigNumberish, _overrides?: Overrides): Promise<boolean>;
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
  approve(spender: string, value: BigNumberish, _overrides?: Overrides): Promise<boolean>;
  transfer(to: string, value: BigNumberish, _overrides?: Overrides): Promise<boolean>;
  transferFrom(from: string, to: string, value: BigNumberish, _overrides?: Overrides): Promise<boolean>;
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
  NAME(_overrides?: CallOverrides): Promise<string>;
  getAmountFromUSDValue(_token: string, _usdValue: BigNumberish, _overrides?: CallOverrides): Promise<BigNumber>;
  getPrice(_tokenAddress: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getUSDValue(_token: string, _amount: BigNumberish, _overrides?: CallOverrides): Promise<BigNumber>;
  lastGoodPrices(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
  owner(_overrides?: CallOverrides): Promise<string>;
}

interface PriceFeedTransactions {
  renounceOwnership(_overrides?: Overrides): Promise<void>;
  setAddresses(_overrides?: Overrides): Promise<void>;
  transferOwnership(newOwner: string, _overrides?: Overrides): Promise<void>;
}

export interface PriceFeed
  extends _TypedLiquityContract<PriceFeedCalls, PriceFeedTransactions> {
  readonly filters: {
    LastGoodPriceUpdated(_token?: null, _lastGoodPrice?: null): EventFilter;
    OwnershipTransferred(previousOwner?: string | null, newOwner?: string | null): EventFilter;
    PriceFeedStatusChanged(_token?: null, newStatus?: null): EventFilter;
    TokenPriceChanged(_token?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "LastGoodPriceUpdated"): _TypedLogDescription<{ _token: string; _lastGoodPrice: BigNumber }>[];
  extractEvents(logs: Log[], name: "OwnershipTransferred"): _TypedLogDescription<{ previousOwner: string; newOwner: string }>[];
  extractEvents(logs: Log[], name: "PriceFeedStatusChanged"): _TypedLogDescription<{ _token: string; newStatus: number }>[];
  extractEvents(logs: Log[], name: "TokenPriceChanged"): _TypedLogDescription<{ _token: string }>[];
}

interface StabilityPoolCalls {
  BORROWING_FEE_FLOOR(_overrides?: CallOverrides): Promise<BigNumber>;
  CCR(_overrides?: CallOverrides): Promise<BigNumber>;
  MAX_BORROWING_FEE(_overrides?: CallOverrides): Promise<BigNumber>;
  MCR(_overrides?: CallOverrides): Promise<BigNumber>;
  NAME(_overrides?: CallOverrides): Promise<string>;
  P(_overrides?: CallOverrides): Promise<BigNumber>;
  PERCENT_DIVISOR(_overrides?: CallOverrides): Promise<BigNumber>;
  REDEMPTION_FEE_FLOOR(_overrides?: CallOverrides): Promise<BigNumber>;
  RESERVE_FEE(_overrides?: CallOverrides): Promise<BigNumber>;
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
  getDepositorDeposit(_depositor: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getTotalDeposit(_overrides?: CallOverrides): Promise<BigNumber>;
  getTotalGainedColl(_overrides?: CallOverrides): Promise<{ tokenAddress: string; amount: BigNumber }[]>;
  lastErrorOffset(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
  stabilityPoolManagerAddress(_overrides?: CallOverrides): Promise<string>;
  totalDeposits(_overrides?: CallOverrides): Promise<BigNumber>;
  totalGainedColl(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
  usedCollTokens(arg0: BigNumberish, _overrides?: CallOverrides): Promise<string>;
}

interface StabilityPoolTransactions {
  offset(_debtToOffset: BigNumberish, _collToAdd: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  provideToSP(depositor: string, _amount: BigNumberish, _overrides?: Overrides): Promise<void>;
  withdrawFromSP(user: string, depositToWithdrawal: BigNumberish, _overrides?: Overrides): Promise<void>;
  withdrawGains(user: string, _overrides?: Overrides): Promise<void>;
}

export interface StabilityPool
  extends _TypedLiquityContract<StabilityPoolCalls, StabilityPoolTransactions> {
  readonly filters: {
    DepositSnapshotUpdated(_depositor?: string | null): EventFilter;
    EpochUpdated(_currentEpoch?: null): EventFilter;
    P_Updated(_P?: null): EventFilter;
    S_Updated(_tokenAddress?: null, _S?: null, _epoch?: null, _scale?: null): EventFilter;
    ScaleUpdated(_currentScale?: null): EventFilter;
    StabilityGainsWithdrawn(user?: null, depositLost?: null, gainsWithdrawn?: null): EventFilter;
    StabilityOffset(removedDeposit?: null, addedGains?: null): EventFilter;
    StabilityPoolInitialized(stabilityPoolManagerAddress?: null, depositTokenAddress?: null): EventFilter;
    StabilityProvided(user?: null, amount?: null): EventFilter;
    StabilityWithdrawn(user?: null, amount?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "DepositSnapshotUpdated"): _TypedLogDescription<{ _depositor: string }>[];
  extractEvents(logs: Log[], name: "EpochUpdated"): _TypedLogDescription<{ _currentEpoch: BigNumber }>[];
  extractEvents(logs: Log[], name: "P_Updated"): _TypedLogDescription<{ _P: BigNumber }>[];
  extractEvents(logs: Log[], name: "S_Updated"): _TypedLogDescription<{ _tokenAddress: string; _S: BigNumber; _epoch: BigNumber; _scale: BigNumber }>[];
  extractEvents(logs: Log[], name: "ScaleUpdated"): _TypedLogDescription<{ _currentScale: BigNumber }>[];
  extractEvents(logs: Log[], name: "StabilityGainsWithdrawn"): _TypedLogDescription<{ user: string; depositLost: BigNumber; gainsWithdrawn: { tokenAddress: string; amount: BigNumber }[] }>[];
  extractEvents(logs: Log[], name: "StabilityOffset"): _TypedLogDescription<{ removedDeposit: BigNumber; addedGains: { tokenAddress: string; amount: BigNumber }[] }>[];
  extractEvents(logs: Log[], name: "StabilityPoolInitialized"): _TypedLogDescription<{ stabilityPoolManagerAddress: string; depositTokenAddress: string }>[];
  extractEvents(logs: Log[], name: "StabilityProvided"): _TypedLogDescription<{ user: string; amount: BigNumber }>[];
  extractEvents(logs: Log[], name: "StabilityWithdrawn"): _TypedLogDescription<{ user: string; amount: BigNumber }>[];
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
  REDEMPTION_FEE_FLOOR(_overrides?: CallOverrides): Promise<BigNumber>;
  RESERVE_FEE(_overrides?: CallOverrides): Promise<BigNumber>;
  STABLE_COIN_GAS_COMPENSATION(_overrides?: CallOverrides): Promise<BigNumber>;
  TroveOwners(arg0: BigNumberish, _overrides?: CallOverrides): Promise<string>;
  Troves(arg0: string, _overrides?: CallOverrides): Promise<{ status: number; arrayIndex: BigNumber }>;
  _100pct(_overrides?: CallOverrides): Promise<BigNumber>;
  baseRate(_overrides?: CallOverrides): Promise<BigNumber>;
  borrowerOperationsAddress(_overrides?: CallOverrides): Promise<string>;
  calcDecayedBaseRate(_overrides?: CallOverrides): Promise<BigNumber>;
  getBaseRate(_overrides?: CallOverrides): Promise<BigNumber>;
  getBorrowingFee(_debtValue: BigNumberish, _overrides?: CallOverrides): Promise<BigNumber>;
  getBorrowingFeeWithDecay(_debtValue: BigNumberish, _overrides?: CallOverrides): Promise<BigNumber>;
  getBorrowingRate(_overrides?: CallOverrides): Promise<BigNumber>;
  getBorrowingRateWithDecay(_overrides?: CallOverrides): Promise<BigNumber>;
  getCurrentICR(_borrower: string, _overrides?: CallOverrides): Promise<{ ICR: BigNumber; currentDebtInUSD: BigNumber }>;
  getEntireDebtAndColl(_borrower: string, _overrides?: CallOverrides): Promise<{ amounts: { tokenAddress: string; isColl: boolean; amount: BigNumber; pendingReward: BigNumber; gasCompensation: BigNumber; toLiquidate: BigNumber; toRedistribute: BigNumber; toOffset: BigNumber }[]; troveCollInUSD: BigNumber; troveDebtInUSD: BigNumber; troveDebtInUSDWithoutGasCompensation: BigNumber }>;
  getNominalICR(_borrower: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getPendingReward(_borrower: string, _tokenAddress: string, _isColl: boolean, _overrides?: CallOverrides): Promise<BigNumber>;
  getTroveColl(_borrower: string, _overrides?: CallOverrides): Promise<{ tokenAddress: string; amount: BigNumber }[]>;
  getTroveDebt(_borrower: string, _overrides?: CallOverrides): Promise<{ tokenAddress: string; amount: BigNumber }[]>;
  getTroveOwnersCount(_overrides?: CallOverrides): Promise<BigNumber>;
  getTroveRepayableDebt(_borrower: string, _debtTokenAddress: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getTroveStakeValue(_borrower: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getTroveStakes(_borrower: string, _token: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getTroveStatus(_borrower: string, _overrides?: CallOverrides): Promise<BigNumber>;
  getTroveWithdrawableColl(_borrower: string, _collTokenAddress: string, _overrides?: CallOverrides): Promise<BigNumber>;
  isTroveActive(_borrower: string, _overrides?: CallOverrides): Promise<boolean>;
  lastErrorRedistribution(arg0: string, arg1: boolean, _overrides?: CallOverrides): Promise<BigNumber>;
  lastFeeOperationTime(_overrides?: CallOverrides): Promise<BigNumber>;
  liquidatedTokens(arg0: string, arg1: boolean, _overrides?: CallOverrides): Promise<BigNumber>;
  liquidationOperationsAddress(_overrides?: CallOverrides): Promise<string>;
  owner(_overrides?: CallOverrides): Promise<string>;
  priceFeed(_overrides?: CallOverrides): Promise<string>;
  redemptionOperationsAddress(_overrides?: CallOverrides): Promise<string>;
  rewardSnapshots(arg0: string, arg1: string, arg2: boolean, _overrides?: CallOverrides): Promise<BigNumber>;
  storagePool(_overrides?: CallOverrides): Promise<string>;
  totalCollateralSnapshots(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
  totalStakes(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
  totalStakesSnapshot(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
}

interface TroveManagerTransactions {
  addTroveOwnerToArray(_borrower: string, _overrides?: Overrides): Promise<BigNumber>;
  applyPendingRewards(_borrower: string, _overrides?: Overrides): Promise<void>;
  closeTroveByProtocol(collTokenAddresses: string[], _borrower: string, closedStatus: BigNumberish, _overrides?: Overrides): Promise<void>;
  decayBaseRateFromBorrowing(_overrides?: Overrides): Promise<void>;
  decreaseTroveColl(_borrower: string, _collTokenAmounts: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  decreaseTroveDebt(_borrower: string, _debtTokenAmounts: { debtToken: string; netDebt: BigNumberish; borrowingFee: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  increaseTroveColl(_borrower: string, _collTokenAmounts: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  increaseTroveDebt(_borrower: string, _debtTokenAmounts: { debtToken: string; netDebt: BigNumberish; borrowingFee: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  redistributeDebtAndColl(collTokenAddresses: string[], toRedistribute: { tokenAddress: string; isColl: boolean; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  removeStake(collTokenAddresses: string[], _borrower: string, _overrides?: Overrides): Promise<void>;
  renounceOwnership(_overrides?: Overrides): Promise<void>;
  setAddresses(_borrowerOperationsAddress: string, _redemptionOperationsAddress: string, _liquidationOperationsAddress: string, _storagePoolAddress: string, _priceFeedAddress: string, _overrides?: Overrides): Promise<void>;
  setTroveStatus(_borrower: string, _num: BigNumberish, _overrides?: Overrides): Promise<void>;
  transferOwnership(newOwner: string, _overrides?: Overrides): Promise<void>;
  updateBaseRateFromRedemption(_totalRedeemedStable: BigNumberish, _totalStableCoinSupply: BigNumberish, _overrides?: Overrides): Promise<void>;
  updateStakeAndTotalStakes(collTokenAddresses: string[], _borrower: string, _overrides?: Overrides): Promise<void>;
  updateSystemSnapshots_excludeCollRemainder(totalCollGasCompensation: { tokenAddress: string; amount: BigNumberish }[], _overrides?: Overrides): Promise<void>;
  updateTroveRewardSnapshots(_borrower: string, _overrides?: Overrides): Promise<void>;
}

export interface TroveManager
  extends _TypedLiquityContract<TroveManagerCalls, TroveManagerTransactions> {
  readonly filters: {
    BaseRateUpdated(_baseRate?: null): EventFilter;
    LTermsUpdated(_liquidatedTokens?: null): EventFilter;
    LastFeeOpTimeUpdated(_lastFeeOpTime?: null): EventFilter;
    OwnershipTransferred(previousOwner?: string | null, newOwner?: string | null): EventFilter;
    SystemSnapshotsUpdated(_totalStakesSnapshot?: null, _totalCollateralSnapshot?: null): EventFilter;
    TotalStakesUpdated(_totalStakes?: null): EventFilter;
    TroveAppliedRewards(_borrower?: null, _appliedRewards?: null): EventFilter;
    TroveClosed(_borrower?: null, _closingState?: null): EventFilter;
    TroveCollChanged(_borrower?: null, _collTokenAddresses?: null): EventFilter;
    TroveIndexUpdated(_borrower?: null, _newIndex?: null): EventFilter;
    TroveManagerInitialized(_borrowerOperationsAddress?: null, _redemptionOperationsAddress?: null, _liquidationOperationsAddress?: null, _storagePoolAddress?: null, _priceFeedAddress?: null): EventFilter;
    TroveSnapshotsUpdated(_liquidatedTokens?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "BaseRateUpdated"): _TypedLogDescription<{ _baseRate: BigNumber }>[];
  extractEvents(logs: Log[], name: "LTermsUpdated"): _TypedLogDescription<{ _liquidatedTokens: { tokenAddress: string; isColl: boolean; amount: BigNumber }[] }>[];
  extractEvents(logs: Log[], name: "LastFeeOpTimeUpdated"): _TypedLogDescription<{ _lastFeeOpTime: BigNumber }>[];
  extractEvents(logs: Log[], name: "OwnershipTransferred"): _TypedLogDescription<{ previousOwner: string; newOwner: string }>[];
  extractEvents(logs: Log[], name: "SystemSnapshotsUpdated"): _TypedLogDescription<{ _totalStakesSnapshot: { tokenAddress: string; amount: BigNumber }[]; _totalCollateralSnapshot: { tokenAddress: string; amount: BigNumber }[] }>[];
  extractEvents(logs: Log[], name: "TotalStakesUpdated"): _TypedLogDescription<{ _totalStakes: { tokenAddress: string; amount: BigNumber }[] }>[];
  extractEvents(logs: Log[], name: "TroveAppliedRewards"): _TypedLogDescription<{ _borrower: string; _appliedRewards: { tokenAddress: string; isColl: boolean; amount: BigNumber }[] }>[];
  extractEvents(logs: Log[], name: "TroveClosed"): _TypedLogDescription<{ _borrower: string; _closingState: number }>[];
  extractEvents(logs: Log[], name: "TroveCollChanged"): _TypedLogDescription<{ _borrower: string; _collTokenAddresses: string[] }>[];
  extractEvents(logs: Log[], name: "TroveIndexUpdated"): _TypedLogDescription<{ _borrower: string; _newIndex: BigNumber }>[];
  extractEvents(logs: Log[], name: "TroveManagerInitialized"): _TypedLogDescription<{ _borrowerOperationsAddress: string; _redemptionOperationsAddress: string; _liquidationOperationsAddress: string; _storagePoolAddress: string; _priceFeedAddress: string }>[];
  extractEvents(logs: Log[], name: "TroveSnapshotsUpdated"): _TypedLogDescription<{ _liquidatedTokens: { tokenAddress: string; isColl: boolean; amount: BigNumber }[] }>[];
}

interface SwapERC20Calls {
  DOMAIN_SEPARATOR(_overrides?: CallOverrides): Promise<string>;
  PERMIT_TYPEHASH(_overrides?: CallOverrides): Promise<string>;
  allowance(arg0: string, arg1: string, _overrides?: CallOverrides): Promise<BigNumber>;
  balanceOf(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
  decimals(_overrides?: CallOverrides): Promise<number>;
  name(_overrides?: CallOverrides): Promise<string>;
  nonces(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
  symbol(_overrides?: CallOverrides): Promise<string>;
  totalSupply(_overrides?: CallOverrides): Promise<BigNumber>;
}

interface SwapERC20Transactions {
}

export interface SwapERC20
  extends _TypedLiquityContract<SwapERC20Calls, SwapERC20Transactions> {
  readonly filters: {
    Approval(owner?: string | null, spender?: string | null, value?: null): EventFilter;
    Transfer(from?: string | null, to?: string | null, value?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "Approval"): _TypedLogDescription<{ owner: string; spender: string; value: BigNumber }>[];
  extractEvents(logs: Log[], name: "Transfer"): _TypedLogDescription<{ from: string; to: string; value: BigNumber }>[];
}

interface SwapPairCalls {
  DOMAIN_SEPARATOR(_overrides?: CallOverrides): Promise<string>;
  MINIMUM_LIQUIDITY(_overrides?: CallOverrides): Promise<BigNumber>;
  PERMIT_TYPEHASH(_overrides?: CallOverrides): Promise<string>;
  allowance(arg0: string, arg1: string, _overrides?: CallOverrides): Promise<BigNumber>;
  balanceOf(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
  decimals(_overrides?: CallOverrides): Promise<number>;
  getReserves(_overrides?: CallOverrides): Promise<{ _reserve0: BigNumber; _reserve1: BigNumber; _blockTimestampLast: number }>;
  kLast(_overrides?: CallOverrides): Promise<BigNumber>;
  name(_overrides?: CallOverrides): Promise<string>;
  nonces(arg0: string, _overrides?: CallOverrides): Promise<BigNumber>;
  operations(_overrides?: CallOverrides): Promise<string>;
  price0CumulativeLast(_overrides?: CallOverrides): Promise<BigNumber>;
  price1CumulativeLast(_overrides?: CallOverrides): Promise<BigNumber>;
  symbol(_overrides?: CallOverrides): Promise<string>;
  token0(_overrides?: CallOverrides): Promise<string>;
  token1(_overrides?: CallOverrides): Promise<string>;
  totalSupply(_overrides?: CallOverrides): Promise<BigNumber>;
}

interface SwapPairTransactions {
  burn(to: string, liquidity: BigNumberish, debt0: BigNumberish, debt1: BigNumberish, _overrides?: Overrides): Promise<{ amount0: BigNumber; amount1: BigNumber; burned0: BigNumber; burned1: BigNumber }>;
  initialize(_token0: string, _token1: string, _overrides?: Overrides): Promise<void>;
  mint(to: string, _overrides?: Overrides): Promise<BigNumber>;
  skim(to: string, _overrides?: Overrides): Promise<void>;
  swap(amount0Out: BigNumberish, amount1Out: BigNumberish, to: string, data: BytesLike, _overrides?: Overrides): Promise<void>;
  sync(_overrides?: Overrides): Promise<void>;
}

export interface SwapPair
  extends _TypedLiquityContract<SwapPairCalls, SwapPairTransactions> {
  readonly filters: {
    Approval(owner?: string | null, spender?: string | null, value?: null): EventFilter;
    Burn(sender?: string | null, amount0?: null, amount1?: null, to?: string | null): EventFilter;
    Mint(sender?: string | null, amount0?: null, amount1?: null): EventFilter;
    Swap(sender?: string | null, amount0In?: null, amount1In?: null, amount0Out?: null, amount1Out?: null, amount0Fee?: null, amount1Fee?: null, to?: string | null): EventFilter;
    Sync(reserve0?: null, reserve1?: null): EventFilter;
    Transfer(from?: string | null, to?: string | null, value?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "Approval"): _TypedLogDescription<{ owner: string; spender: string; value: BigNumber }>[];
  extractEvents(logs: Log[], name: "Burn"): _TypedLogDescription<{ sender: string; amount0: BigNumber; amount1: BigNumber; to: string }>[];
  extractEvents(logs: Log[], name: "Mint"): _TypedLogDescription<{ sender: string; amount0: BigNumber; amount1: BigNumber }>[];
  extractEvents(logs: Log[], name: "Swap"): _TypedLogDescription<{ sender: string; amount0In: BigNumber; amount1In: BigNumber; amount0Out: BigNumber; amount1Out: BigNumber; amount0Fee: BigNumber; amount1Fee: BigNumber; to: string }>[];
  extractEvents(logs: Log[], name: "Sync"): _TypedLogDescription<{ reserve0: BigNumber; reserve1: BigNumber }>[];
  extractEvents(logs: Log[], name: "Transfer"): _TypedLogDescription<{ from: string; to: string; value: BigNumber }>[];
}

interface SwapOperationsCalls {
  allPairs(arg0: BigNumberish, _overrides?: CallOverrides): Promise<string>;
  allPairsLength(_overrides?: CallOverrides): Promise<BigNumber>;
  borrowerOperations(_overrides?: CallOverrides): Promise<string>;
  debtTokenManager(_overrides?: CallOverrides): Promise<string>;
  feeTo(_overrides?: CallOverrides): Promise<string>;
  getAmountIn(amountOut: BigNumberish, reserveIn: BigNumberish, reserveOut: BigNumberish, _overrides?: CallOverrides): Promise<BigNumber>;
  getAmountOut(amountIn: BigNumberish, reserveIn: BigNumberish, reserveOut: BigNumberish, _overrides?: CallOverrides): Promise<BigNumber>;
  getAmountsIn(amountOut: BigNumberish, path: string[], _overrides?: CallOverrides): Promise<BigNumber[]>;
  getAmountsOut(amountIn: BigNumberish, path: string[], _overrides?: CallOverrides): Promise<BigNumber[]>;
  getFeeTo(_overrides?: CallOverrides): Promise<string>;
  getPair(arg0: string, arg1: string, _overrides?: CallOverrides): Promise<string>;
  owner(_overrides?: CallOverrides): Promise<string>;
  priceFeed(_overrides?: CallOverrides): Promise<string>;
  quote(amountA: BigNumberish, reserveA: BigNumberish, reserveB: BigNumberish, _overrides?: CallOverrides): Promise<BigNumber>;
  troveManager(_overrides?: CallOverrides): Promise<string>;
}

interface SwapOperationsTransactions {
  addLiquidity(tokenA: string, tokenB: string, amountADesired: BigNumberish, amountBDesired: BigNumberish, amountAMin: BigNumberish, amountBMin: BigNumberish, _maxMintFeePercentage: BigNumberish, deadline: BigNumberish, _overrides?: Overrides): Promise<{ amountA: BigNumber; amountB: BigNumber; liquidity: BigNumber }>;
  createPair(tokenA: string, tokenB: string, _overrides?: Overrides): Promise<string>;
  openLongPosition(stableToMintIn: BigNumberish, debtOutMin: BigNumberish, debtTokenAddress: string, to: string, _maxMintFeePercentage: BigNumberish, deadline: BigNumberish, _overrides?: Overrides): Promise<BigNumber[]>;
  openShortPosition(debtToMintIn: BigNumberish, stableOutMin: BigNumberish, debtTokenAddress: string, to: string, _maxMintFeePercentage: BigNumberish, deadline: BigNumberish, _overrides?: Overrides): Promise<BigNumber[]>;
  removeLiquidity(tokenA: string, tokenB: string, liquidity: BigNumberish, amountAMin: BigNumberish, amountBMin: BigNumberish, deadline: BigNumberish, _overrides?: Overrides): Promise<{ amountA: BigNumber; amountB: BigNumber }>;
  renounceOwnership(_overrides?: Overrides): Promise<void>;
  setAddresses(_borrowerOperationsAddress: string, _troveManagerAddress: string, _priceFeedAddress: string, _debtTokenManager: string, _overrides?: Overrides): Promise<void>;
  swapExactTokensForTokens(amountIn: BigNumberish, amountOutMin: BigNumberish, path: string[], to: string, deadline: BigNumberish, _overrides?: Overrides): Promise<BigNumber[]>;
  swapTokensForExactTokens(amountOut: BigNumberish, amountInMax: BigNumberish, path: string[], to: string, deadline: BigNumberish, _overrides?: Overrides): Promise<BigNumber[]>;
  transferOwnership(newOwner: string, _overrides?: Overrides): Promise<void>;
}

export interface SwapOperations
  extends _TypedLiquityContract<SwapOperationsCalls, SwapOperationsTransactions> {
  readonly filters: {
    OwnershipTransferred(previousOwner?: string | null, newOwner?: string | null): EventFilter;
    PairCreated(token0?: string | null, token1?: string | null, pair?: null, null?: null): EventFilter;
    SwapOperationsInitialized(borrowerOperations?: null, troveManager?: null, priceFeed?: null, debtTokenManager?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "OwnershipTransferred"): _TypedLogDescription<{ previousOwner: string; newOwner: string }>[];
  extractEvents(logs: Log[], name: "PairCreated"): _TypedLogDescription<[string, string, string, BigNumber]>[];
  extractEvents(logs: Log[], name: "SwapOperationsInitialized"): _TypedLogDescription<{ borrowerOperations: string; troveManager: string; priceFeed: string; debtTokenManager: string }>[];
}

interface ReservePoolCalls {
  BORROWING_FEE_FLOOR(_overrides?: CallOverrides): Promise<BigNumber>;
  CCR(_overrides?: CallOverrides): Promise<BigNumber>;
  MAX_BORROWING_FEE(_overrides?: CallOverrides): Promise<BigNumber>;
  MCR(_overrides?: CallOverrides): Promise<BigNumber>;
  NAME(_overrides?: CallOverrides): Promise<string>;
  PERCENT_DIVISOR(_overrides?: CallOverrides): Promise<BigNumber>;
  REDEMPTION_FEE_FLOOR(_overrides?: CallOverrides): Promise<BigNumber>;
  RESERVE_FEE(_overrides?: CallOverrides): Promise<BigNumber>;
  STABLE_COIN_GAS_COMPENSATION(_overrides?: CallOverrides): Promise<BigNumber>;
  _100pct(_overrides?: CallOverrides): Promise<BigNumber>;
  govReserveCap(_overrides?: CallOverrides): Promise<BigNumber>;
  govToken(_overrides?: CallOverrides): Promise<string>;
  isReserveCapReached(_overrides?: CallOverrides): Promise<{ stableCapReached: boolean; govCapReached: boolean }>;
  owner(_overrides?: CallOverrides): Promise<string>;
  priceFeed(_overrides?: CallOverrides): Promise<string>;
  stabilityPoolManager(_overrides?: CallOverrides): Promise<string>;
  stableDebtToken(_overrides?: CallOverrides): Promise<string>;
  stableReserveCap(_overrides?: CallOverrides): Promise<BigNumber>;
}

interface ReservePoolTransactions {
  renounceOwnership(_overrides?: Overrides): Promise<void>;
  setAddresses(_stabilityPoolManager: string, _priceFeed: string, _stableDebtTokenAddress: string, _govTokenAddress: string, _stableReserveCap: BigNumberish, _govReserveCap: BigNumberish, _overrides?: Overrides): Promise<void>;
  setReserveCap(newStableReserveCap: BigNumberish, newGovReserveCap: BigNumberish, _overrides?: Overrides): Promise<void>;
  transferOwnership(newOwner: string, _overrides?: Overrides): Promise<void>;
  withdrawValue(stabilityPool: string, withdrawAmountInUSD: BigNumberish, _overrides?: Overrides): Promise<{ usedGov: BigNumber; usedStable: BigNumber }>;
}

export interface ReservePool
  extends _TypedLiquityContract<ReservePoolCalls, ReservePoolTransactions> {
  readonly filters: {
    OwnershipTransferred(previousOwner?: string | null, newOwner?: string | null): EventFilter;
    ReserveCapChanged(newReserveCap?: null, newGovReserveCap?: null): EventFilter;
    ReservePoolInitialized(_stabilityPoolManager?: null, _priceFeed?: null, _stableDebtTokenAddress?: null, _govTokenAddress?: null): EventFilter;
    WithdrewReserves(govAmount?: null, stableAmount?: null): EventFilter;
  };
  extractEvents(logs: Log[], name: "OwnershipTransferred"): _TypedLogDescription<{ previousOwner: string; newOwner: string }>[];
  extractEvents(logs: Log[], name: "ReserveCapChanged"): _TypedLogDescription<{ newReserveCap: BigNumber; newGovReserveCap: BigNumber }>[];
  extractEvents(logs: Log[], name: "ReservePoolInitialized"): _TypedLogDescription<{ _stabilityPoolManager: string; _priceFeed: string; _stableDebtTokenAddress: string; _govTokenAddress: string }>[];
  extractEvents(logs: Log[], name: "WithdrewReserves"): _TypedLogDescription<{ govAmount: BigNumber; stableAmount: BigNumber }>[];
}

interface LiquidationOperationsCalls {
  BORROWING_FEE_FLOOR(_overrides?: CallOverrides): Promise<BigNumber>;
  CCR(_overrides?: CallOverrides): Promise<BigNumber>;
  MAX_BORROWING_FEE(_overrides?: CallOverrides): Promise<BigNumber>;
  MCR(_overrides?: CallOverrides): Promise<BigNumber>;
  NAME(_overrides?: CallOverrides): Promise<string>;
  PERCENT_DIVISOR(_overrides?: CallOverrides): Promise<BigNumber>;
  REDEMPTION_FEE_FLOOR(_overrides?: CallOverrides): Promise<BigNumber>;
  RESERVE_FEE(_overrides?: CallOverrides): Promise<BigNumber>;
  STABLE_COIN_GAS_COMPENSATION(_overrides?: CallOverrides): Promise<BigNumber>;
  _100pct(_overrides?: CallOverrides): Promise<BigNumber>;
  collTokenManager(_overrides?: CallOverrides): Promise<string>;
  debtTokenManager(_overrides?: CallOverrides): Promise<string>;
  owner(_overrides?: CallOverrides): Promise<string>;
  priceFeed(_overrides?: CallOverrides): Promise<string>;
  stabilityPoolManager(_overrides?: CallOverrides): Promise<string>;
  storagePool(_overrides?: CallOverrides): Promise<string>;
  troveManager(_overrides?: CallOverrides): Promise<string>;
}

interface LiquidationOperationsTransactions {
  batchLiquidateTroves(_troveArray: string[], _overrides?: Overrides): Promise<void>;
  liquidate(_borrower: string, _overrides?: Overrides): Promise<void>;
  renounceOwnership(_overrides?: Overrides): Promise<void>;
  setAddresses(_troveManagerAddress: string, _storagePoolAddress: string, _priceFeedAddress: string, _debtTokenManagerAddress: string, _collTokenManagerAddress: string, _stabilityPoolManagerAddress: string, _overrides?: Overrides): Promise<void>;
  transferOwnership(newOwner: string, _overrides?: Overrides): Promise<void>;
}

export interface LiquidationOperations
  extends _TypedLiquityContract<LiquidationOperationsCalls, LiquidationOperationsTransactions> {
  readonly filters: {
    LiquidationOperationsInitialized(_troveManager?: null, _storgePool?: null, _priceFeed?: null, _debtTokenManager?: null, _collTokenManager?: null, _stabilityPoolManager?: null): EventFilter;
    LiquidationSummary(liquidatedDebt?: null, liquidatedColl?: null, totalStableCoinGasCompensation?: null, totalCollGasCompensation?: null): EventFilter;
    OwnershipTransferred(previousOwner?: string | null, newOwner?: string | null): EventFilter;
  };
  extractEvents(logs: Log[], name: "LiquidationOperationsInitialized"): _TypedLogDescription<{ _troveManager: string; _storgePool: string; _priceFeed: string; _debtTokenManager: string; _collTokenManager: string; _stabilityPoolManager: string }>[];
  extractEvents(logs: Log[], name: "LiquidationSummary"): _TypedLogDescription<{ liquidatedDebt: { tokenAddress: string; amount: BigNumber }[]; liquidatedColl: { tokenAddress: string; amount: BigNumber }[]; totalStableCoinGasCompensation: BigNumber; totalCollGasCompensation: { tokenAddress: string; amount: BigNumber }[] }>[];
  extractEvents(logs: Log[], name: "OwnershipTransferred"): _TypedLogDescription<{ previousOwner: string; newOwner: string }>[];
}
