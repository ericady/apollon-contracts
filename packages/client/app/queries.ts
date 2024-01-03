import { gql } from '@apollo/client';

export const GET_ALL_POOLS = gql`
  query GetAllPools {
    getPools {
      id
      swapFee @client
      volume30dUSD
      liquidity {
        totalAmount
        token {
          id
          address
          symbol
          priceUSD @client
          priceUSD24hAgo
        }
      }
    }
  }
`;

export const GET_SELECTED_TOKEN = gql`
  query GetSelectedToken($address: String!) {
    getToken(address: $address) {
      priceUSDOracle @client
    }
  }
`;

// TODO: Maybe unite this
export const GET_ALL_DEBT_TOKENS = gql`
  query GetDebtTokens {
    getDebtTokens {
      # TODO: Implement sort in query or sort server side
      totalSupplyUSD
      totalReserve
      totalReserve30dAverage

      token {
        id
        address
        symbol
        priceUSD @client
        priceUSD24hAgo
      }
    }
  }
`;

export const GET_BORROWER_DEBT_TOKENS = gql`
  query GetBorrowerDebtTokens($borrower: String!) {
    getDebtTokens(borrower: $borrower) {
      troveMintedAmount
      walletAmount @client
      providedStability @client
      compoundedDeposit
      stabilityCompoundAmount
      troveRepableDebtAmount @client

      stabilityDepositAPY
      totalDepositedStability
      totalSupplyUSD
      totalSupplyUSD30dAverage
      token {
        id
        address
        symbol
        priceUSD @client
        isPoolToken
      }
    }
  }
`;

// TODO: Not yet used. Maybe remove it later.
export const GET_BORROWER_SWAPS = gql`
  query GetBorrowerSwapEvents($borrower: String!, $cursor: String) {
    getSwaps(borrower: $borrower, cursor: $cursor) {
      swaps {
        id
        timestamp
        token {
          id
          address
          symbol
          priceUSD @client
        }
        direction
        size
        totalPriceInStable
        swapFee
      }
      pageInfo {
        totalCount
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_BORROWER_LIQUIDITY_POOLS = gql`
  query GetBorrowerLiquidityPools($borrower: String) {
    getPools(borrower: $borrower) {
      id
      liquidity {
        id
        token {
          id
          address
          symbol
          priceUSD @client
        }
        totalAmount
      }
      liquidityDepositAPY
      volume30dUSD
      volume30dUSD30dAgo

      totalSupply
      # client side
      borrowerAmount @client
    }
  }
`;

// BALANCE PAGE

export const GET_BORROWER_COLLATERAL_TOKENS = gql`
  query GetCollateralTokens($borrower: String!) {
    getCollateralTokens(borrower: $borrower) {
      token {
        id
        address
        symbol
        priceUSD @client
      }
      walletAmount @client
      troveLockedAmount @client
      stabilityGainedAmount

      totalValueLockedUSD
      totalValueLockedUSD30dAverage
    }
  }
`;

export const GET_BORROWER_STABILITY_HISTORY = gql`
  query GetBorrowerStabilityHistory($borrower: String!) {
    getBorrowerStabilityHistory(borrower: $borrower) {
      history {
        id
        timestamp
        type
        values {
          token {
            address
            symbol
          }
          amount
        }
        resultInUSD
        claimInUSD
      }
      pageInfo {
        totalCount
        hasNextPage
        endCursor
      }
    }
  }
`;

// CHARTS

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

// -------------------- Fragments used the cache --------------------

export const TOKEN_FRAGMENT = gql`
  fragment TokenFragment on Token {
    id
    address
  }
`;

// -------------------- Client side queries that are only resolved by the cache --------------------

export const GET_TROVEMANAGER = gql`
  query GetTroveManager {
    getTroveManager {
      id
      borrowingRate
    }
  }
`;

export const GET_SYSTEMINFO = gql`
  query GetSystemInfo {
    getSystemInfo {
      id
      recoveryModeActive
      totalCollateralRatio
    }
  }
`;
