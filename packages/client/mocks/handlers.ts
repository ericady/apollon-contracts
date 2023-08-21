import { faker } from '@faker-js/faker';
import { graphql } from 'msw';
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

const tokens: Token[] = Array(10)
  .fill(null)
  .map(() => ({
    address: faker.string.uuid(),
    symbol: faker.finance.currencyCode(),
    createdAt: faker.date.past().toISOString(),
    priceUSD: parseFloat(faker.finance.amount(1, 5000, 2)),
    priceUSD24hAgo: parseFloat(faker.finance.amount(1, 5000, 2)),
    isPoolToken: faker.datatype.boolean(),
  }));

// Define a helper function to generate pool price history data
const generatePoolPriceHistory = (): number[][] => {
  const now = Date.now();
  const oneDayInMs = 24 * 60 * 60 * 1000;

  return Array(30)
    .fill(null)
    .map((_, i) => {
      // Generate a timestamp for each day in the past month
      const timestamp = now - i * oneDayInMs;
      // Generate a random price between $1 and $5000 for demo purposes
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

  graphql.query<Query['getDebtTokens'], QueryGetDebtTokensArgs>('GetDebtTokens', (req, res, ctx) => {
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

    return res(ctx.data(result));
  }),

  // GetCollateralTokens

  graphql.query<Query['getCollateralTokens'], QueryGetCollateralTokensArgs>('GetCollateralTokens', (req, res, ctx) => {
    const { borrower } = req.variables;

    const result: Query['getCollateralTokens'] = tokens.map((token) => ({
      token: token,
      walletAmount: borrower ? parseFloat(faker.finance.amount(0, 1000, 2)) : null,
      troveLockedAmount: borrower ? parseFloat(faker.finance.amount(0, 500, 2)) : null,
      stabilityGainedAmount: borrower ? parseFloat(faker.finance.amount(0, 50, 2)) : null,
      totalValueLockedUSD: parseFloat(faker.finance.amount(10000, 50000, 2)),
      totalValueLockedUSD24hAgo: parseFloat(faker.finance.amount(10000, 50000, 2)),
    }));

    return res(ctx.data(result));
  }),

  // GetPools
  graphql.query<Query['getPools'], QueryGetPoolsArgs>('GetPools', (req, res, ctx) => {
    const { borrower } = req.variables;

    const result: Query['getPools'] = Array(5)
      .fill(null)
      .map(() => ({
        id: faker.string.uuid(),
        liquidity: tokens.map((token) => ({
          token,
          totalAmount: parseFloat(faker.finance.amount(100, 1000, 2)),
          borrowerAmount: borrower ? parseFloat(faker.finance.amount(0, 100, 2)) : null,
        })),
        rewards: tokens.slice(0, 3).map((token) => ({
          // Taking a subset of tokens for demonstration
          token,
          amount: parseFloat(faker.finance.amount(1, 50, 2)),
        })),
        volume24hUSD: parseFloat(faker.finance.amount(10000, 50000, 2)),
        volume24hUSD24hAgo: parseFloat(faker.finance.amount(10000, 50000, 2)),
      }));

    return res(ctx.data(result));
  }),

  // CHART DATA MOCK

  // GetPoolPriceHistory
  graphql.query<Query['getPoolPriceHistory'], QueryGetPoolPriceHistoryArgs>('GetPoolPriceHistory', (req, res, ctx) => {
    // For this mock, we ignore the actual poolId and just generate mock data
    const result = generatePoolPriceHistory();

    return res(ctx.data(result));
  }),
  // GetCollateralUSDHistory
  graphql.query<Query['getCollateralUSDHistory']>('GetCollateralUSDHistory', (req, res, ctx) => {
    // For this mock, we ignore the actual poolId and just generate mock data
    const result = generatePoolPriceHistory();

    return res(ctx.data(result));
  }),
  // GetDebtUSDHistory
  graphql.query<Query['getDebtUSDHistory']>('GetDebtUSDHistory', (req, res, ctx) => {
    // For this mock, we ignore the actual poolId and just generate mock data
    const result = generatePoolPriceHistory();

    return res(ctx.data(result));
  }),
  // GetReserveUSDHistory
  graphql.query<Query['getReserveUSDHistory']>('GetReserveUSDHistory', (req, res, ctx) => {
    // For this mock, we ignore the actual poolId and just generate mock data
    const result = generatePoolPriceHistory();

    return res(ctx.data(result));
  }),

  // GetBorrowerPoolHistory
  graphql.query<Query['getBorrowerPoolHistory'], QueryGetBorrowerPoolHistoryArgs>(
    'GetBorrowerPoolHistory',
    (req, res, ctx) => {
      // For this mock, we ignore the actual poolId and just generate mock data
      const result = generateBorrowerHistory();

      return res(ctx.data(result));
    },
  ),
  // GetBorrowerStabilityHistory
  graphql.query<Query['getBorrowerStabilityHistory'], QueryGetBorrowerStabilityHistoryArgs>(
    'GetBorrowerStabilityHistory',
    (req, res, ctx) => {
      // For this mock, we ignore the actual poolId and just generate mock data
      const result = generateBorrowerHistory();

      return res(ctx.data(result));
    },
  ),
];
