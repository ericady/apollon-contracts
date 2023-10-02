
/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
/* eslint-disable */

export enum LongShortDirection {
    LONG = "LONG",
    SHORT = "SHORT"
}

export enum BorrowerHistoryType {
    DEPOSITED = "DEPOSITED",
    WITHDRAWN = "WITHDRAWN",
    CLAIMED_REWARDS = "CLAIMED_REWARDS"
}

export interface Token {
    address: string;
    symbol: string;
    createdAt: string;
    priceUSD: number;
    priceUSD24hAgo: number;
    isPoolToken: boolean;
}

export interface DebtTokenMeta {
    token: Token;
    walletAmount?: Nullable<number>;
    troveMintedAmount?: Nullable<number>;
    stabilityLostAmount?: Nullable<number>;
    stabilityCompoundAmount?: Nullable<number>;
    stabilityDepositAPY: number;
    totalDepositedStability: number;
    totalReserve: number;
    totalReserve24hAgo: number;
    totalSupplyUSD: number;
    totalSupplyUSD24hAgo: number;
}

export interface CollateralTokenMeta {
    token: Token;
    walletAmount?: Nullable<number>;
    troveLockedAmount?: Nullable<number>;
    stabilityGainedAmount?: Nullable<number>;
    totalValueLockedUSD: number;
    totalValueLockedUSD24hAgo: number;
}

export interface IQuery {
    getDebtTokens(borrower?: Nullable<string>): DebtTokenMeta[] | Promise<DebtTokenMeta[]>;
    getCollateralTokens(borrower?: Nullable<string>): CollateralTokenMeta[] | Promise<CollateralTokenMeta[]>;
    getPositions(borrower: string, isOpen: boolean, cursor?: Nullable<string>): PositionsPage | Promise<PositionsPage>;
    getPools(borrower?: Nullable<string>): Pool[] | Promise<Pool[]>;
    getPoolPriceHistory(poolId: string): number[][] | Promise<number[][]>;
    getCollateralUSDHistory(): number[][] | Promise<number[][]>;
    getDebtUSDHistory(): number[][] | Promise<number[][]>;
    getCollateralRatioHistory(): number[][] | Promise<number[][]>;
    getReserveUSDHistory(): number[][] | Promise<number[][]>;
    getBorrowerPoolHistory(poolId: string, borrower: string, cursor?: Nullable<string>): PoolHistoryPage | Promise<PoolHistoryPage>;
    getBorrowerStabilityHistory(borrower: string, cursor?: Nullable<string>): PoolHistoryPage | Promise<PoolHistoryPage>;
}

export interface Position {
    id: string;
    openedAt: number;
    closedAt?: Nullable<number>;
    token: Token;
    direction: LongShortDirection;
    size: number;
    totalPriceInStable: number;
    feesInStable: number;
    profitInStable?: Nullable<number>;
}

export interface PositionsPage {
    positions: Position[];
    pageInfo: PageInfo;
}

export interface PageInfo {
    totalCount: number;
    hasNextPage: boolean;
    endCursor: string;
}

export interface PoolLiquidity {
    token: Token;
    totalAmount: number;
    borrowerAmount?: Nullable<number>;
}

export interface PoolReward {
    token: Token;
    amount: number;
}

export interface Pool {
    id: string;
    openingFee: number;
    liquidity: PoolLiquidity[];
    rewards: PoolReward[];
    liquidityDepositAPY: number;
    volume24hUSD: number;
    volume24hUSD24hAgo: number;
}

export interface TokenAmount {
    token: Token;
    amount: number;
}

export interface BorrowerHistory {
    id: string;
    timestamp: number;
    type: BorrowerHistoryType;
    values: TokenAmount[];
    claimInUSD?: Nullable<number>;
    resultInUSD: number;
}

export interface PoolHistoryPage {
    history: BorrowerHistory[];
    pageInfo: PageInfo;
}

type Nullable<T> = T | null;
