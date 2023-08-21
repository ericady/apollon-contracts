import { gql } from '@apollo/client';

export const GET_ALL_DEBT_TOKENS = gql`
  query GetDebtTokens {
    getDebtTokens {
      totalReserve
      token {
        address
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

export const GET_ALL_POOLS = gql`
  query GetPools {
    getPools {
      id
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
