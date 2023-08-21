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

export const GET_POOL_PRICE_HISTORY = gql`
  query GetPoolPriceHistory {
    getPoolPriceHistory(poolId: "1")
  }
`;
