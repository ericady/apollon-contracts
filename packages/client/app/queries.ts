import { gql } from '@apollo/client';

export const GET_ALL_DEBT_TOKENS = gql`
  query GetDebtTokens {
    getDebtTokens {
      # TODO: Implement sort in query or sort server side
      totalSupplyUSD
      token {
        address
        symbol
        priceUSD
        priceUSD24hAgo
      }
    }
  }
`;

export const GET_ALL_COLLATERAL_TOKENS = gql`
  query GetCollateralTokens {
    getCollateralTokens {
      walletAmount
      token {
        address
      }
    }
  }
`;

export const GET_BORROWER_DEBT_TOKENS = gql`
  query GetBorrowerDebtTokens($borrower: String!) {
    getDebtTokens(borrower: $borrower) {
      troveMintedAmount
      walletAmount
      token {
        address
        symbol
        priceUSD
        isPoolToken
      }
    }
  }
`;

export const GET_BORROWER_COLLATERAL_TOKENS = gql`
  query GetBorrowerCollateralTokens($borrower: String!) {
    getCollateralTokens(borrower: $borrower) {
      troveLockedAmount
      walletAmount
      token {
        address
        symbol
      }
    }
  }
`;

export const GET_BORROWER_POSITIONS = gql`
  query GetBorrowerPositions($borrower: String!, $isOpen: Boolean!, $cursor: String) {
    getPositions(borrower: $borrower, isOpen: $isOpen, cursor: $cursor) {
      positions {
        id
        openedAt
        closedAt
        token {
          address
          symbol
          priceUSD
        }
        direction
        size
        totalPriceInStable
        feesInStable
        profitInStable
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_LIQUIDITY_POOLS = gql`
  query GetLiquidityPools {
    getPools {
      id
      liquidity {
        token {
          address
          symbol
        }
        totalAmount
      }
      volume24hUSD
      volume24hUSD24hAgo
    }
  }
`;

export const GET_BORROWER_LIQUIDITY_POOLS = gql`
  query GetBorrowerLiquidityPools($borrower: String!) {
    getPools(borrower: $borrower) {
      id
      liquidity {
        token {
          address
          symbol
        }
        totalAmount
        borrowerAmount
      }
      volume24hUSD
      volume24hUSD24hAgo
    }
  }
`;

// CHARTS

export const GET_POOL_PRICE_HISTORY = gql`
  query GetPoolPriceHistory {
    getPoolPriceHistory(poolId: "String!")
  }
`;

export const GET_COLLATERAL_USD_HISTORY = gql`
  query GetCollateralUSDHistory {
    getCollateralUSDHistory
  }
`;

export const GET_DEBT_USD_HISTORY = gql`
  query GetDebtUSDHistory {
    getDebtUSDHistory
  }
`;

export const GET_RESERVE_USD_HISTORY = gql`
  query GetReserveUSDHistory {
    getReserveUSDHistory
  }
`;

export const GET_BORROWER_POOL_HISTORY = gql`
  query GetBorrowerPoolHistory {
    getBorrowerPoolHistory(poolId: "String!", borrower: "String!") {
      timestamp
    }
  }
`;

export const GET_BORROWER_STABILITY_HISTORY = gql`
  query GetBorrowerStabilityHistory {
    getBorrowerStabilityHistory(borrower: "String!") {
      timestamp
    }
  }
`;
