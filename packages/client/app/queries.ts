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
          priceUSD
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

export const GET_ALL_DEBT_TOKENS = gql`
  query GetDebtTokens {
    getDebtTokens {
      # TODO: Implement sort in query or sort server side
      totalSupplyUSD
      totalReserve
      totalReserve30dAverage {
        id
        value
      }

      token {
        id
        address
        symbol
        priceUSD
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

      stabilityDepositAPY {
        id
        profit
        volume
      }
      totalDepositedStability
      totalSupplyUSD
      totalSupplyUSD30dAverage {
        id
        value
      }
      token {
        id
        address
        symbol
        priceUSD
        isPoolToken
      }
    }
  }
`;
// TODO: Use real subgraph query:
// query AAA {
//   debtTokenMetas {
//     timestamp
//   }
// }

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
          priceUSD
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
          priceUSD
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
        priceUSD
      }
      walletAmount @client
      troveLockedAmount @client
      stabilityGainedAmount

      totalValueLockedUSD
      totalValueLockedUSD30dAverage {
        id
        value
      }
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
        claimInUSD
        lostDepositInUSD
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

// TRADING VIEW

export const GET_TRADING_VIEW_CANDLES = gql`
  query GetTradingViewCandles($where: TokenCandle_filter!) {
    tokenCandles(where: $where, orderBy: timestamp, orderDirection: desc) {
      id
      timestamp
      open
      high
      low
      close
      volume
    }
  }
`;

export const GET_TRADING_VIEW_LATEST_CANDLE = gql`
  query GetTradingViewLatestCandle($id: ID!) {
    # "TokenCandleSingleton" + token + candleSize
    tokenCandleSingleton(id: $id) {
      id
      timestamp
      open
      high
      low
      close
      volume
    }
  }
`;

// -------------------- Fragments used by the cache itself --------------------

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
