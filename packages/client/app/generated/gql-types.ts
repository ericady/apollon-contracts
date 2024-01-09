export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  BigInt: { input: string; output: string; }
  Bytes: { input: string; output: string; }
};

export type BorrowerHistory = {
  __typename: 'BorrowerHistory';
  claimInUSD?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  resultInUSD: Scalars['Float']['output'];
  timestamp: Scalars['Int']['output'];
  type: BorrowerHistoryType;
  values: Array<TokenAmount>;
};

export enum BorrowerHistoryType {
  ClaimedRewards = 'CLAIMED_REWARDS',
  Deposited = 'DEPOSITED',
  Withdrawn = 'WITHDRAWN'
}

export type CollateralTokenMeta = {
  __typename: 'CollateralTokenMeta';
  id: Scalars['ID']['output'];
  stabilityGainedAmount: Scalars['Float']['output'];
  token: Token;
  totalValueLockedUSD: Scalars['Float']['output'];
  totalValueLockedUSD30dAverage: Scalars['Float']['output'];
  troveLockedAmount: Scalars['Float']['output'];
  walletAmount: Scalars['Float']['output'];
};

export type DebtTokenMeta = {
  __typename: 'DebtTokenMeta';
  compoundedDeposit: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  providedStability: Scalars['Float']['output'];
  stabilityCompoundAmount: Scalars['Float']['output'];
  stabilityDepositAPY: Scalars['Float']['output'];
  token: Token;
  totalDepositedStability: Scalars['Float']['output'];
  totalReserve: Scalars['Float']['output'];
  totalReserve30dAverage: Scalars['Float']['output'];
  totalSupplyUSD: Scalars['Float']['output'];
  totalSupplyUSD30dAverage: Scalars['Float']['output'];
  troveMintedAmount: Scalars['Float']['output'];
  troveRepableDebtAmount: Scalars['Float']['output'];
  walletAmount: Scalars['Float']['output'];
};

export enum LongShortDirection {
  Long = 'LONG',
  Short = 'SHORT'
}

export enum OrderDirection {
  Asc = 'asc',
  Desc = 'desc'
}

export type PageInfo = {
  __typename: 'PageInfo';
  endCursor: Scalars['String']['output'];
  hasNextPage: Scalars['Boolean']['output'];
  totalCount: Scalars['Int']['output'];
};

export type Pool = {
  __typename: 'Pool';
  borrowerAmount: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  liquidity: Array<PoolLiquidity>;
  liquidityDepositAPY: Scalars['Float']['output'];
  rewards: Array<PoolReward>;
  swapFee: Scalars['Float']['output'];
  totalSupply: Scalars['Float']['output'];
  volume30dUSD: Scalars['Float']['output'];
  volume30dUSD30dAgo: Scalars['Float']['output'];
};

export type PoolHistoryPage = {
  __typename: 'PoolHistoryPage';
  history: Array<BorrowerHistory>;
  pageInfo: PageInfo;
};

export type PoolLiquidity = {
  __typename: 'PoolLiquidity';
  id: Scalars['ID']['output'];
  token: Token;
  totalAmount: Scalars['Float']['output'];
};

export type PoolReward = {
  __typename: 'PoolReward';
  amount: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  token: Token;
};

export type Query = {
  __typename: 'Query';
  getBorrowerPoolHistory: PoolHistoryPage;
  getBorrowerStabilityHistory: PoolHistoryPage;
  getCollateralRatioHistory: Array<Array<Scalars['Int']['output']>>;
  getCollateralTokens: Array<CollateralTokenMeta>;
  getCollateralUSDHistory: Array<Array<Scalars['Int']['output']>>;
  getDebtTokens: Array<DebtTokenMeta>;
  getDebtUSDHistory: Array<Array<Scalars['Int']['output']>>;
  getPoolPriceHistory: Array<Array<Scalars['Int']['output']>>;
  getPools: Array<Pool>;
  getReserveUSDHistory: Array<Array<Scalars['Int']['output']>>;
  getSwaps: SwapEventPage;
  getSystemInfo: SystemInfo;
  getToken: Token;
  getTroveManager: TroveManager;
  tokenCandleSingleton: TokenCandleSingleton;
  tokenCandles: Array<TokenCandle>;
};


export type QueryGetBorrowerPoolHistoryArgs = {
  borrower: Scalars['String']['input'];
  cursor?: InputMaybe<Scalars['String']['input']>;
  poolId: Scalars['String']['input'];
};


export type QueryGetBorrowerStabilityHistoryArgs = {
  borrower: Scalars['String']['input'];
  cursor?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetCollateralTokensArgs = {
  borrower?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetDebtTokensArgs = {
  borrower?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetPoolPriceHistoryArgs = {
  poolId: Scalars['String']['input'];
};


export type QueryGetPoolsArgs = {
  borrower?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetSwapsArgs = {
  borrower: Scalars['String']['input'];
  cursor?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetTokenArgs = {
  address: Scalars['String']['input'];
};


export type QueryTokenCandleSingletonArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTokenCandlesArgs = {
  orderBy?: InputMaybe<TokenCandle_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<TokenCandle_Filter>;
};

export type SwapEvent = {
  __typename: 'SwapEvent';
  borrower: Scalars['String']['output'];
  direction: LongShortDirection;
  id: Scalars['ID']['output'];
  size: Scalars['Float']['output'];
  swapFee: Scalars['Float']['output'];
  timestamp: Scalars['Int']['output'];
  token: Token;
  totalPriceInStable: Scalars['Float']['output'];
};

export type SwapEventPage = {
  __typename: 'SwapEventPage';
  pageInfo: PageInfo;
  swaps: Array<SwapEvent>;
};

export type SystemInfo = {
  __typename: 'SystemInfo';
  id: Scalars['ID']['output'];
  recoveryModeActive: Scalars['Boolean']['output'];
  totalCollateralRatio: Scalars['Float']['output'];
};

export type Token = {
  __typename: 'Token';
  address: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isPoolToken: Scalars['Boolean']['output'];
  priceUSD: Scalars['Float']['output'];
  priceUSD24hAgo: Scalars['Float']['output'];
  priceUSDOracle: Scalars['Float']['output'];
  symbol: Scalars['String']['output'];
};

export type TokenAmount = {
  __typename: 'TokenAmount';
  amount: Scalars['Float']['output'];
  token: Token;
};

export type TokenCandle = {
  __typename: 'TokenCandle';
  candleSize: Scalars['Int']['output'];
  close: Scalars['BigInt']['output'];
  high: Scalars['BigInt']['output'];
  id: Scalars['Bytes']['output'];
  low: Scalars['BigInt']['output'];
  open: Scalars['BigInt']['output'];
  timestamp: Scalars['Int']['output'];
  token: Token;
  volume: Scalars['BigInt']['output'];
};

export type TokenCandleSingleton = {
  __typename: 'TokenCandleSingleton';
  candleSize: Scalars['Int']['output'];
  close: Scalars['BigInt']['output'];
  high: Scalars['BigInt']['output'];
  id: Scalars['String']['output'];
  low: Scalars['BigInt']['output'];
  open: Scalars['BigInt']['output'];
  timestamp: Scalars['Int']['output'];
  token: Scalars['Bytes']['output'];
  volume: Scalars['BigInt']['output'];
};

export type TokenCandle_Filter = {
  candleSize?: InputMaybe<Scalars['Int']['input']>;
  timestamp?: InputMaybe<Scalars['Int']['input']>;
  timestamp_gt?: InputMaybe<Scalars['Int']['input']>;
  timestamp_gte?: InputMaybe<Scalars['Int']['input']>;
  timestamp_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  timestamp_lt?: InputMaybe<Scalars['Int']['input']>;
  timestamp_lte?: InputMaybe<Scalars['Int']['input']>;
  timestamp_not?: InputMaybe<Scalars['Int']['input']>;
  timestamp_not_in?: InputMaybe<Array<Scalars['Int']['input']>>;
  token?: InputMaybe<Scalars['String']['input']>;
};

export enum TokenCandle_OrderBy {
  CandleSize = 'candleSize',
  Close = 'close',
  High = 'high',
  Id = 'id',
  Low = 'low',
  Open = 'open',
  Timestamp = 'timestamp',
  Token = 'token',
  TokenAddress = 'token__address',
  TokenCreatedAt = 'token__createdAt',
  TokenId = 'token__id',
  TokenIsPoolToken = 'token__isPoolToken',
  TokenPriceUsd = 'token__priceUSD',
  TokenSymbol = 'token__symbol',
  Volume = 'volume'
}

export type TroveManager = {
  __typename: 'TroveManager';
  borrowingRate: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
};

export type GetAllPoolsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllPoolsQuery = { __typename: 'Query', getPools: Array<{ __typename: 'Pool', id: string, swapFee: number, volume30dUSD: number, liquidity: Array<{ __typename: 'PoolLiquidity', totalAmount: number, token: { __typename: 'Token', id: string, address: string, symbol: string, priceUSD: number, priceUSD24hAgo: number } }> }> };

export type GetSelectedTokenQueryVariables = Exact<{
  address: Scalars['String']['input'];
}>;


export type GetSelectedTokenQuery = { __typename: 'Query', getToken: { __typename: 'Token', priceUSDOracle: number } };

export type GetDebtTokensQueryVariables = Exact<{ [key: string]: never; }>;


export type GetDebtTokensQuery = { __typename: 'Query', getDebtTokens: Array<{ __typename: 'DebtTokenMeta', totalSupplyUSD: number, totalReserve: number, totalReserve30dAverage: number, token: { __typename: 'Token', id: string, address: string, symbol: string, priceUSD: number, priceUSD24hAgo: number } }> };

export type GetBorrowerDebtTokensQueryVariables = Exact<{
  borrower: Scalars['String']['input'];
}>;


export type GetBorrowerDebtTokensQuery = { __typename: 'Query', getDebtTokens: Array<{ __typename: 'DebtTokenMeta', troveMintedAmount: number, walletAmount: number, providedStability: number, compoundedDeposit: number, stabilityCompoundAmount: number, troveRepableDebtAmount: number, stabilityDepositAPY: number, totalDepositedStability: number, totalSupplyUSD: number, totalSupplyUSD30dAverage: number, token: { __typename: 'Token', id: string, address: string, symbol: string, priceUSD: number, isPoolToken: boolean } }> };

export type GetBorrowerSwapEventsQueryVariables = Exact<{
  borrower: Scalars['String']['input'];
  cursor?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetBorrowerSwapEventsQuery = { __typename: 'Query', getSwaps: { __typename: 'SwapEventPage', swaps: Array<{ __typename: 'SwapEvent', id: string, timestamp: number, direction: LongShortDirection, size: number, totalPriceInStable: number, swapFee: number, token: { __typename: 'Token', id: string, address: string, symbol: string, priceUSD: number } }>, pageInfo: { __typename: 'PageInfo', totalCount: number, hasNextPage: boolean, endCursor: string } } };

export type GetBorrowerLiquidityPoolsQueryVariables = Exact<{
  borrower?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetBorrowerLiquidityPoolsQuery = { __typename: 'Query', getPools: Array<{ __typename: 'Pool', id: string, liquidityDepositAPY: number, volume30dUSD: number, volume30dUSD30dAgo: number, totalSupply: number, borrowerAmount: number, liquidity: Array<{ __typename: 'PoolLiquidity', id: string, totalAmount: number, token: { __typename: 'Token', id: string, address: string, symbol: string, priceUSD: number } }> }> };

export type GetCollateralTokensQueryVariables = Exact<{
  borrower: Scalars['String']['input'];
}>;


export type GetCollateralTokensQuery = { __typename: 'Query', getCollateralTokens: Array<{ __typename: 'CollateralTokenMeta', walletAmount: number, troveLockedAmount: number, stabilityGainedAmount: number, totalValueLockedUSD: number, totalValueLockedUSD30dAverage: number, token: { __typename: 'Token', id: string, address: string, symbol: string, priceUSD: number } }> };

export type GetBorrowerStabilityHistoryQueryVariables = Exact<{
  borrower: Scalars['String']['input'];
}>;


export type GetBorrowerStabilityHistoryQuery = { __typename: 'Query', getBorrowerStabilityHistory: { __typename: 'PoolHistoryPage', history: Array<{ __typename: 'BorrowerHistory', id: string, timestamp: number, type: BorrowerHistoryType, resultInUSD: number, claimInUSD?: number | null, values: Array<{ __typename: 'TokenAmount', amount: number, token: { __typename: 'Token', address: string, symbol: string } }> }>, pageInfo: { __typename: 'PageInfo', totalCount: number, hasNextPage: boolean, endCursor: string } } };

export type GetCollateralUsdHistoryQueryVariables = Exact<{ [key: string]: never; }>;


export type GetCollateralUsdHistoryQuery = { __typename: 'Query', getCollateralUSDHistory: Array<Array<number>> };

export type GetDebtUsdHistoryQueryVariables = Exact<{ [key: string]: never; }>;


export type GetDebtUsdHistoryQuery = { __typename: 'Query', getDebtUSDHistory: Array<Array<number>> };

export type GetReserveUsdHistoryQueryVariables = Exact<{ [key: string]: never; }>;


export type GetReserveUsdHistoryQuery = { __typename: 'Query', getReserveUSDHistory: Array<Array<number>> };

export type GetTradingViewCandlesQueryVariables = Exact<{
  where: TokenCandle_Filter;
}>;


export type GetTradingViewCandlesQuery = { __typename: 'Query', tokenCandles: Array<{ __typename: 'TokenCandle', id: string, timestamp: number, open: string, high: string, low: string, close: string, volume: string }> };

export type GetTradingViewLatestCandleQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetTradingViewLatestCandleQuery = { __typename: 'Query', tokenCandleSingleton: { __typename: 'TokenCandleSingleton', id: string, timestamp: number, open: string, high: string, low: string, close: string, volume: string } };

export type TokenFragmentFragment = { __typename: 'Token', id: string, address: string };

export type GetTroveManagerQueryVariables = Exact<{ [key: string]: never; }>;


export type GetTroveManagerQuery = { __typename: 'Query', getTroveManager: { __typename: 'TroveManager', id: string, borrowingRate: number } };

export type GetSystemInfoQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSystemInfoQuery = { __typename: 'Query', getSystemInfo: { __typename: 'SystemInfo', id: string, recoveryModeActive: boolean, totalCollateralRatio: number } };
