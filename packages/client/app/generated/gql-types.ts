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

export type Pool = {
  __typename?: 'Pool';
  id: Scalars['String']['output'];
  liquidity: Array<PoolLiquidity>;
  rewards: Array<PoolReward>;
  volume24hUSD: Scalars['Float']['output'];
  volume24hUSD24hAgo: Scalars['Float']['output'];
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

export type Query = {
  __typename?: 'Query';
  getBorrowerPoolHistory: Array<BorrowerHistory>;
  getBorrowerStabilityHistory: Array<BorrowerHistory>;
  getCRHistory: Array<Array<Scalars['Int']['output']>>;
  getCollateralTokens: Array<CollateralTokenMeta>;
  getCollateralUSDHistory: Array<Array<Scalars['Int']['output']>>;
  getDebtTokens: Array<DebtTokenMeta>;
  getDebtUSDHistory: Array<Array<Scalars['Int']['output']>>;
  getPoolPriceHistory: Array<Array<Scalars['Int']['output']>>;
  getPools: Array<Pool>;
  getReserveUSDHistory: Array<Array<Scalars['Int']['output']>>;
};


export type QueryGetBorrowerPoolHistoryArgs = {
  borrower: Scalars['String']['input'];
  poolId: Scalars['String']['input'];
};


export type QueryGetBorrowerStabilityHistoryArgs = {
  borrower: Scalars['String']['input'];
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

export type GetDebtTokensQueryVariables = Exact<{ [key: string]: never; }>;


export type GetDebtTokensQuery = { __typename?: 'Query', getDebtTokens: Array<{ __typename?: 'DebtTokenMeta', totalSupplyUSD: number, token: { __typename?: 'Token', address: string, symbol: string, priceUSD: number, priceUSD24hAgo: number } }> };

export type GetCollateralTokensQueryVariables = Exact<{ [key: string]: never; }>;


export type GetCollateralTokensQuery = { __typename?: 'Query', getCollateralTokens: Array<{ __typename?: 'CollateralTokenMeta', walletAmount?: number | null, token: { __typename?: 'Token', address: string } }> };

export type GetPoolsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetPoolsQuery = { __typename?: 'Query', getPools: Array<{ __typename?: 'Pool', id: string }> };

export type GetPoolPriceHistoryQueryVariables = Exact<{ [key: string]: never; }>;


export type GetPoolPriceHistoryQuery = { __typename?: 'Query', getPoolPriceHistory: Array<Array<number>> };

export type GetCollateralUsdHistoryQueryVariables = Exact<{ [key: string]: never; }>;


export type GetCollateralUsdHistoryQuery = { __typename?: 'Query', getCollateralUSDHistory: Array<Array<number>> };

export type GetDebtUsdHistoryQueryVariables = Exact<{ [key: string]: never; }>;


export type GetDebtUsdHistoryQuery = { __typename?: 'Query', getDebtUSDHistory: Array<Array<number>> };

export type GetReserveUsdHistoryQueryVariables = Exact<{ [key: string]: never; }>;


export type GetReserveUsdHistoryQuery = { __typename?: 'Query', getReserveUSDHistory: Array<Array<number>> };

export type GetBorrowerPoolHistoryQueryVariables = Exact<{ [key: string]: never; }>;


export type GetBorrowerPoolHistoryQuery = { __typename?: 'Query', getBorrowerPoolHistory: Array<{ __typename?: 'BorrowerHistory', timestamp: number }> };

export type GetBorrowerStabilityHistoryQueryVariables = Exact<{ [key: string]: never; }>;


export type GetBorrowerStabilityHistoryQuery = { __typename?: 'Query', getBorrowerStabilityHistory: Array<{ __typename?: 'BorrowerHistory', timestamp: number }> };
