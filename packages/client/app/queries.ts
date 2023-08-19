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
