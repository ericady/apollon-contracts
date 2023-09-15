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
};

export type BorrowerHistory = {
  __typename?: 'BorrowerHistory';
  claimInUSD?: Maybe<Scalars['Float']['output']>;
  id: Scalars['String']['output'];
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
  __typename?: 'CollateralTokenMeta';
  stabilityGainedAmount?: Maybe<Scalars['Float']['output']>;
  token: Token;
  totalValueLockedUSD: Scalars['Float']['output'];
  totalValueLockedUSD24hAgo: Scalars['Float']['output'];
  troveLockedAmount?: Maybe<Scalars['Float']['output']>;
  walletAmount?: Maybe<Scalars['Float']['output']>;
};

export type DebtTokenMeta = {
  __typename?: 'DebtTokenMeta';
  stabilityCompoundAmount?: Maybe<Scalars['Float']['output']>;
  stabilityDepositAPY: Scalars['Float']['output'];
  stabilityLostAmount?: Maybe<Scalars['Float']['output']>;
  token: Token;
  totalDepositedStability: Scalars['Float']['output'];
  totalReserve: Scalars['Float']['output'];
  totalReserve24hAgo: Scalars['Float']['output'];
  totalSupplyUSD: Scalars['Float']['output'];
  totalSupplyUSD24hAgo: Scalars['Float']['output'];
  troveMintedAmount?: Maybe<Scalars['Float']['output']>;
  walletAmount?: Maybe<Scalars['Float']['output']>;
};

export enum LongShortDirection {
  Long = 'LONG',
  Short = 'SHORT'
}

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor: Scalars['String']['output'];
  hasNextPage: Scalars['Boolean']['output'];
  totalCount: Scalars['Int']['output'];
};

export type Pool = {
  __typename?: 'Pool';
  id: Scalars['String']['output'];
  liquidity: Array<PoolLiquidity>;
  liquidityDepositAPY: Scalars['Float']['output'];
  openingFee: Scalars['Float']['output'];
  rewards: Array<PoolReward>;
  volume24hUSD: Scalars['Float']['output'];
  volume24hUSD24hAgo: Scalars['Float']['output'];
};

export type PoolHistoryPage = {
  __typename?: 'PoolHistoryPage';
  history: Array<BorrowerHistory>;
  pageInfo: PageInfo;
};

export type PoolLiquidity = {
  __typename?: 'PoolLiquidity';
  borrowerAmount?: Maybe<Scalars['Float']['output']>;
  token: Token;
  totalAmount: Scalars['Float']['output'];
};

export type PoolReward = {
  __typename?: 'PoolReward';
  amount: Scalars['Float']['output'];
  token: Token;
};

export type Position = {
  __typename?: 'Position';
  closedAt?: Maybe<Scalars['Int']['output']>;
  direction: LongShortDirection;
  feesInStable: Scalars['Float']['output'];
  id: Scalars['String']['output'];
  openedAt: Scalars['Int']['output'];
  profitInStable?: Maybe<Scalars['Float']['output']>;
  size: Scalars['Float']['output'];
  token: Token;
  totalPriceInStable: Scalars['Float']['output'];
};

export type PositionsPage = {
  __typename?: 'PositionsPage';
  pageInfo: PageInfo;
  positions: Array<Position>;
};

export type Query = {
  __typename?: 'Query';
  getBorrowerPoolHistory: PoolHistoryPage;
  getBorrowerStabilityHistory: PoolHistoryPage;
  getCollateralRatioHistory: Array<Array<Scalars['Int']['output']>>;
  getCollateralTokens: Array<CollateralTokenMeta>;
  getCollateralUSDHistory: Array<Array<Scalars['Int']['output']>>;
  getDebtTokens: Array<DebtTokenMeta>;
  getDebtUSDHistory: Array<Array<Scalars['Int']['output']>>;
  getPoolPriceHistory: Array<Array<Scalars['Int']['output']>>;
  getPools: Array<Pool>;
  getPositions: PositionsPage;
  getReserveUSDHistory: Array<Array<Scalars['Int']['output']>>;
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


export type QueryGetPositionsArgs = {
  borrower: Scalars['String']['input'];
  cursor?: InputMaybe<Scalars['String']['input']>;
  isOpen: Scalars['Boolean']['input'];
};

export type Token = {
  __typename?: 'Token';
  address: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  isPoolToken: Scalars['Boolean']['output'];
  priceUSD: Scalars['Float']['output'];
  priceUSD24hAgo: Scalars['Float']['output'];
  symbol: Scalars['String']['output'];
};

export type TokenAmount = {
  __typename?: 'TokenAmount';
  amount: Scalars['Float']['output'];
  token: Token;
};

export type GetAllPoolsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllPoolsQuery = { __typename?: 'Query', getPools: Array<{ __typename?: 'Pool', id: string, openingFee: number, volume24hUSD: number, liquidity: Array<{ __typename?: 'PoolLiquidity', token: { __typename?: 'Token', address: string, symbol: string, priceUSD: number, priceUSD24hAgo: number } }> }> };

export type GetDebtTokensQueryVariables = Exact<{ [key: string]: never; }>;


export type GetDebtTokensQuery = { __typename?: 'Query', getDebtTokens: Array<{ __typename?: 'DebtTokenMeta', totalSupplyUSD: number, totalReserve: number, totalReserve24hAgo: number, token: { __typename?: 'Token', address: string, symbol: string, priceUSD: number, priceUSD24hAgo: number } }> };

export type GetBorrowerDebtTokensQueryVariables = Exact<{
  borrower: Scalars['String']['input'];
}>;


export type GetBorrowerDebtTokensQuery = { __typename?: 'Query', getDebtTokens: Array<{ __typename?: 'DebtTokenMeta', troveMintedAmount?: number | null, walletAmount?: number | null, stabilityLostAmount?: number | null, stabilityCompoundAmount?: number | null, stabilityDepositAPY: number, totalDepositedStability: number, totalSupplyUSD: number, totalSupplyUSD24hAgo: number, token: { __typename?: 'Token', address: string, symbol: string, priceUSD: number, isPoolToken: boolean } }> };

export type GetBorrowerPositionsQueryVariables = Exact<{
  borrower: Scalars['String']['input'];
  isOpen: Scalars['Boolean']['input'];
  cursor?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetBorrowerPositionsQuery = { __typename?: 'Query', getPositions: { __typename?: 'PositionsPage', positions: Array<{ __typename?: 'Position', id: string, openedAt: number, closedAt?: number | null, direction: LongShortDirection, size: number, totalPriceInStable: number, feesInStable: number, profitInStable?: number | null, token: { __typename?: 'Token', address: string, symbol: string, priceUSD: number } }>, pageInfo: { __typename?: 'PageInfo', totalCount: number, hasNextPage: boolean, endCursor: string } } };

export type GetLiquidityPoolsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetLiquidityPoolsQuery = { __typename?: 'Query', getPools: Array<{ __typename?: 'Pool', id: string, liquidityDepositAPY: number, volume24hUSD: number, volume24hUSD24hAgo: number, liquidity: Array<{ __typename?: 'PoolLiquidity', totalAmount: number, token: { __typename?: 'Token', address: string, symbol: string } }> }> };

export type GetBorrowerLiquidityPoolsQueryVariables = Exact<{
  borrower: Scalars['String']['input'];
}>;


export type GetBorrowerLiquidityPoolsQuery = { __typename?: 'Query', getPools: Array<{ __typename?: 'Pool', id: string, liquidityDepositAPY: number, volume24hUSD: number, volume24hUSD24hAgo: number, liquidity: Array<{ __typename?: 'PoolLiquidity', totalAmount: number, borrowerAmount?: number | null, token: { __typename?: 'Token', address: string, symbol: string } }> }> };

export type GetCollateralTokensQueryVariables = Exact<{
  borrower: Scalars['String']['input'];
}>;


export type GetCollateralTokensQuery = { __typename?: 'Query', getCollateralTokens: Array<{ __typename?: 'CollateralTokenMeta', walletAmount?: number | null, troveLockedAmount?: number | null, stabilityGainedAmount?: number | null, totalValueLockedUSD: number, totalValueLockedUSD24hAgo: number, token: { __typename?: 'Token', address: string, symbol: string, priceUSD: number } }> };

export type GetBorrowerStabilityHistoryQueryVariables = Exact<{
  borrower: Scalars['String']['input'];
}>;


export type GetBorrowerStabilityHistoryQuery = { __typename?: 'Query', getBorrowerStabilityHistory: { __typename?: 'PoolHistoryPage', history: Array<{ __typename?: 'BorrowerHistory', id: string, timestamp: number, type: BorrowerHistoryType, resultInUSD: number, claimInUSD?: number | null, values: Array<{ __typename?: 'TokenAmount', amount: number, token: { __typename?: 'Token', address: string, symbol: string } }> }>, pageInfo: { __typename?: 'PageInfo', totalCount: number, hasNextPage: boolean, endCursor: string } } };

export type GetCollateralUsdHistoryQueryVariables = Exact<{ [key: string]: never; }>;


export type GetCollateralUsdHistoryQuery = { __typename?: 'Query', getCollateralUSDHistory: Array<Array<number>> };

export type GetDebtUsdHistoryQueryVariables = Exact<{ [key: string]: never; }>;


export type GetDebtUsdHistoryQuery = { __typename?: 'Query', getDebtUSDHistory: Array<Array<number>> };

export type GetCollateralRatioHistoryQueryVariables = Exact<{ [key: string]: never; }>;


export type GetCollateralRatioHistoryQuery = { __typename?: 'Query', getCollateralRatioHistory: Array<Array<number>> };

export type GetReserveUsdHistoryQueryVariables = Exact<{ [key: string]: never; }>;


export type GetReserveUsdHistoryQuery = { __typename?: 'Query', getReserveUSDHistory: Array<Array<number>> };
