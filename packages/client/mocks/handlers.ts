import { faker } from '@faker-js/faker';
import { graphql } from 'msw';
import { FAVORITE_ASSETS_LOCALSTORAGE_KEY } from '../app/components/Features/Assets/Assets';
import {
  BorrowerHistory,
  BorrowerHistoryType,
  Query,
  QueryGetBorrowerPoolHistoryArgs,
  QueryGetBorrowerStabilityHistoryArgs,
  QueryGetCollateralTokensArgs,
  QueryGetDebtTokensArgs,
  QueryGetPoolPriceHistoryArgs,
  QueryGetPoolsArgs,
  Token,
} from '../app/generated/gql-types';
import {
  GET_ALL_COLLATERAL_TOKENS,
  GET_ALL_DEBT_TOKENS,
  GET_BORROWER_COLLATERAL_TOKENS,
  GET_BORROWER_DEBT_TOKENS,
  GET_BORROWER_LIQUIDITY_POOLS,
  GET_LIQUIDITY_POOLS,
} from '../app/queries';

const favoritedAssets: string[] = JSON.parse(localStorage.getItem(FAVORITE_ASSETS_LOCALSTORAGE_KEY) ?? '[]');

const tokens: Token[] = Array(10)
  .fill(null)
  .map((_, index) => ({
    address: index <= favoritedAssets.length - 1 ? favoritedAssets[index] : faker.string.uuid(),
    symbol: faker.finance.currencyCode(),
    createdAt: faker.date.past().toISOString(),
    priceUSD: parseFloat(faker.finance.amount(1, 5000, 2)),
    priceUSD24hAgo: parseFloat(faker.finance.amount(1, 5000, 2)),
    isPoolToken: faker.datatype.boolean(),
  }));
tokens.push({
  address: '0x6cA13a4ab78dd7D657226b155873A04DB929A3A4',
  symbol: 'JUSD',
  createdAt: faker.date.past().toISOString(),
  priceUSD: parseFloat(faker.finance.amount(1, 5000, 2)),
  priceUSD24hAgo: parseFloat(faker.finance.amount(1, 5000, 2)),
  isPoolToken: faker.datatype.boolean(),
});

const liquidityPools = Array(20)
  .fill(null)
  .map(() => {
    // take 2 random entries from tokens array that are not the same
    const liqudityTokenPair = faker.helpers.arrayElements(tokens, 2);
    return {
      id: faker.string.uuid(),
      liquidity: liqudityTokenPair.map((token) => ({
        token,
        totalAmount: parseFloat(faker.finance.amount(100000, 1000000, 2)),
        borrowerAmount: null,
      })),
      rewards: tokens.slice(0, 3).map((token) => ({
        // Taking a subset of tokens for demonstration
        token,
        amount: parseFloat(faker.finance.amount(1, 50, 2)),
      })),
      volume24hUSD: parseFloat(faker.finance.amount(10000, 50000, 2)),
      volume24hUSD24hAgo: parseFloat(faker.finance.amount(10000, 50000, 2)),
    };
  });

// Define a helper function to generate pool price history data
const generatePoolPriceHistory = (): number[][] => {
  const now = Date.now();
  const oneDayInMs = 24 * 60 * 60 * 1000;

  return Array(30)
    .fill(null)
    .map((_, i) => {
      // Generate a timestamp for each day in the past month
      const timestamp = now - i * oneDayInMs;
      const price = parseFloat(faker.finance.amount(1, 5000, 2));
      return [timestamp, price];
    })
    .reverse(); // reverse to get the timeline in chronological order
};

const generateBorrowerHistory = (): BorrowerHistory[] => {
  const now = Date.now();
  const oneDayInMs = 24 * 60 * 60 * 1000;

  return Array(10)
    .fill(null)
    .map(() => {
      const randomToken = tokens[faker.number.int({ min: 0, max: tokens.length - 1 })];
      return {
        timestamp: now - faker.number.int({ min: 0, max: 29 }) * oneDayInMs,
        type: faker.helpers.arrayElement(Object.values(BorrowerHistoryType)),
        values: [
          {
            token: randomToken,
            amount: parseFloat(faker.finance.amount(1, 1000, 2)),
          },
        ],
        resultInUSD: parseFloat(faker.finance.amount(1, 5000, 2)),
      };
    });
};

export const handlers = [
  // GetDebtTokens
  graphql.query<{ getDebtTokens: Query['getDebtTokens'] }, QueryGetDebtTokensArgs>(
    GET_ALL_DEBT_TOKENS,
    (req, res, ctx) => {
      const result: Query['getDebtTokens'] = tokens.map((token) => ({
        token: token,
        walletAmount: null,
        troveMintedAmount: null,
        stabilityLostAmount: null,
        totalDepositedStability: parseFloat(faker.finance.amount(1000, 5000, 2)),
        totalReserve: parseFloat(faker.finance.amount(1000, 5000, 2)),
        totalReserve24hAgo: parseFloat(faker.finance.amount(1000, 5000, 2)),
        totalSupplyUSD: parseFloat(faker.finance.amount(10000, 50000, 2)),
        totalSupplyUSD24hAgo: parseFloat(faker.finance.amount(10000, 50000, 2)),
      }));

      return res(ctx.data({ getDebtTokens: result }));
    },
  ),
  // GetBorrowerDebtTokens
  graphql.query<{ getDebtTokens: Query['getDebtTokens'] }, QueryGetDebtTokensArgs>(
    GET_BORROWER_DEBT_TOKENS,
    (req, res, ctx) => {
      const { borrower } = req.variables;

      const result: Query['getDebtTokens'] = tokens.map((token) => ({
        token: token,
        walletAmount: borrower ? parseFloat(faker.finance.amount(0, 1000, 2)) : null,
        troveMintedAmount: borrower ? parseFloat(faker.finance.amount(0, 500, 2)) : null,
        stabilityLostAmount: borrower ? parseFloat(faker.finance.amount(0, 50, 2)) : null,
        totalDepositedStability: parseFloat(faker.finance.amount(1000, 5000, 2)),
        totalReserve: parseFloat(faker.finance.amount(1000, 5000, 2)),
        totalReserve24hAgo: parseFloat(faker.finance.amount(1000, 5000, 2)),
        totalSupplyUSD: parseFloat(faker.finance.amount(10000, 50000, 2)),
        totalSupplyUSD24hAgo: parseFloat(faker.finance.amount(10000, 50000, 2)),
      }));

      return res(ctx.data({ getDebtTokens: result }));
    },
  ),

  // GetCollateralTokens
  graphql.query<{ getCollateralTokens: Query['getCollateralTokens'] }, QueryGetCollateralTokensArgs>(
    GET_ALL_COLLATERAL_TOKENS,
    (req, res, ctx) => {
      const { borrower } = req.variables;

      const result: Query['getCollateralTokens'] = tokens.map((token) => ({
        token: token,
        walletAmount: borrower ? parseFloat(faker.finance.amount(0, 1000, 10)) : null,
        troveLockedAmount: borrower ? parseFloat(faker.finance.amount(0, 50, 10)) : null,
        stabilityGainedAmount: borrower ? parseFloat(faker.finance.amount(50, 500, 10)) : null,
        totalValueLockedUSD: parseFloat(faker.finance.amount(10000, 50000, 2)),
        totalValueLockedUSD24hAgo: parseFloat(faker.finance.amount(10000, 50000, 2)),
      }));

      return res(ctx.data({ getCollateralTokens: result }));
    },
  ),
  // GetBorrowerCollateralTokens
  graphql.query<{ getCollateralTokens: Query['getCollateralTokens'] }, QueryGetCollateralTokensArgs>(
    GET_BORROWER_COLLATERAL_TOKENS,
    (req, res, ctx) => {
      const { borrower } = req.variables;

      const result: Query['getCollateralTokens'] = tokens.map((token) => ({
        token: token,
        walletAmount: borrower ? parseFloat(faker.finance.amount(0, 1000, 2)) : null,
        troveLockedAmount: borrower ? parseFloat(faker.finance.amount(0, 50, 10)) : null,
        stabilityGainedAmount: borrower ? parseFloat(faker.finance.amount(50, 500, 10)) : null,
        totalValueLockedUSD: parseFloat(faker.finance.amount(10000, 50000, 2)),
        totalValueLockedUSD24hAgo: parseFloat(faker.finance.amount(10000, 50000, 2)),
      }));

      return res(ctx.data({ getCollateralTokens: result }));
    },
  ),

  // GetLiquidityPools
  graphql.query<{ getPools: Query['getPools'] }, QueryGetPoolsArgs>(GET_LIQUIDITY_POOLS, (req, res, ctx) => {
    const result: Query['getPools'] = liquidityPools;

    return res(ctx.data({ getPools: result }));
  }),
  // GetBorrowerLiquidityPools
  graphql.query<{ getPools: Query['getPools'] }, QueryGetPoolsArgs>(GET_BORROWER_LIQUIDITY_POOLS, (req, res, ctx) => {
    const { borrower } = req.variables;
    if (!borrower) {
      throw new Error('Borrower address is required');
    }

    const borrowerLiquidityPools = faker.helpers.arrayElements(liquidityPools, { min: 1, max: 5 });

    const result: Query['getPools'] = borrowerLiquidityPools.map((pool) => {
      return {
        ...pool,
        liquidity: pool.liquidity.map((liquidity) => ({
          ...liquidity,
          borrowerAmount: parseFloat(faker.finance.amount(0, 10000, 2)),
        })),
      };
    });

    return res(ctx.data({ getPools: result }));
  }),

  // CHART DATA MOCK

  // GetPoolPriceHistory
  graphql.query<{ getPoolPriceHistory: Query['getPoolPriceHistory'] }, QueryGetPoolPriceHistoryArgs>(
    'GetPoolPriceHistory',
    (req, res, ctx) => {
      // For this mock, we ignore the actual poolId and just generate mock data
      const result = generatePoolPriceHistory();

      return res(ctx.data({ getPoolPriceHistory: result }));
    },
  ),
  // GetCollateralUSDHistory
  graphql.query<{ getCollateralUSDHistory: Query['getCollateralUSDHistory'] }>(
    'GetCollateralUSDHistory',
    (req, res, ctx) => {
      // For this mock, we ignore the actual poolId and just generate mock data
      const result = generatePoolPriceHistory();

      return res(ctx.data({ getCollateralUSDHistory: result }));
    },
  ),
  // GetDebtUSDHistory
  graphql.query<{ getDebtUSDHistory: Query['getDebtUSDHistory'] }>('GetDebtUSDHistory', (req, res, ctx) => {
    // For this mock, we ignore the actual poolId and just generate mock data
    const result = generatePoolPriceHistory();

    return res(ctx.data({ getDebtUSDHistory: result }));
  }),
  // GetReserveUSDHistory
  graphql.query<{ getReserveUSDHistory: Query['getReserveUSDHistory'] }>('GetReserveUSDHistory', (req, res, ctx) => {
    // For this mock, we ignore the actual poolId and just generate mock data
    const result = generatePoolPriceHistory();

    return res(ctx.data({ getReserveUSDHistory: result }));
  }),

  // GetBorrowerPoolHistory
  graphql.query<{ getBorrowerPoolHistory: Query['getBorrowerPoolHistory'] }, QueryGetBorrowerPoolHistoryArgs>(
    'GetBorrowerPoolHistory',
    (req, res, ctx) => {
      // For this mock, we ignore the actual poolId and just generate mock data
      const result = generateBorrowerHistory();

      return res(ctx.data({ getBorrowerPoolHistory: result }));
    },
  ),
  // GetBorrowerStabilityHistory
  graphql.query<
    { getBorrowerStabilityHistory: Query['getBorrowerStabilityHistory'] },
    QueryGetBorrowerStabilityHistoryArgs
  >('GetBorrowerStabilityHistory', (req, res, ctx) => {
    // For this mock, we ignore the actual poolId and just generate mock data
    const result = generateBorrowerHistory();

    return res(ctx.data({ getBorrowerStabilityHistory: result }));
  }),
];
