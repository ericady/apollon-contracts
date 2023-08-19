import { gql } from '@apollo/client';

export const GET_ALL_DEBT_TOKENS = gql`
  query GetAllDebtTokens {
    getDebtTokens {
      totalReserve
      token {
        address
      }
    }
  }
`;
