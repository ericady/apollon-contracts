import { faker } from '@faker-js/faker';
import { graphql } from 'msw';
import { FAVORITE_ASSETS_LOCALSTORAGE_KEY } from '../app/components/Features/Assets/Assets';
import {
  BorrowerHistory,
  BorrowerHistoryType,
  LongShortDirection,
  Pool,
  Query,
  QueryGetBorrowerPoolHistoryArgs,
  QueryGetBorrowerStabilityHistoryArgs,
  QueryGetCollateralTokensArgs,
  QueryGetDebtTokensArgs,
  QueryGetPoolPriceHistoryArgs,
  QueryGetPoolsArgs,
  QueryGetPositionsArgs,
  Token,
} from '../app/generated/gql-types';
import {
  GET_ALL_COLLATERAL_TOKENS,
  GET_ALL_DEBT_TOKENS,
  GET_ALL_POOLS,
  GET_BORROWER_DEBT_TOKENS,
  GET_BORROWER_LIQUIDITY_POOLS,
  GET_BORROWER_POSITIONS,
  GET_BORROWER_REWARDS,
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
const JUSD = {
  address: '0x6cA13a4ab78dd7D657226b155873A04DB929A3A4',
  symbol: 'JUSD',
  createdAt: faker.date.past().toISOString(),
  priceUSD: parseFloat(faker.finance.amount(1, 5000, 2)),
  priceUSD24hAgo: parseFloat(faker.finance.amount(1, 5000, 2)),
  isPoolToken: faker.datatype.boolean(),
};

// 4 hard tokens always with JUSD
const collateralTokens = faker.helpers
  .arrayElements(tokens, 3)
  .concat(JUSD)
  .map((token) => {
    const totalValueLockedUSD = parseFloat(faker.finance.amount(10000, 50000, 2));

    return {
      token: token,
      walletAmount: faker.datatype.boolean() ? parseFloat(faker.finance.amount(0, 1000, 10)) : null,
      troveLockedAmount: faker.datatype.boolean() ? parseFloat(faker.finance.amount(0, 50, 10)) : null,
      stabilityGainedAmount: faker.datatype.boolean() ? parseFloat(faker.finance.amount(50, 500, 10)) : null,
      totalValueLockedUSD,
      totalValueLockedUSD24hAgo: parseFloat(
        faker.finance.amount(totalValueLockedUSD * 0.9, totalValueLockedUSD * 1.2, 2),
      ),
    };
  });

tokens.push(JUSD);

// Generate pools once for each pair of tokens
const pools: Pool[] = [];

for (let i = 0; i < tokens.length; i++) {
  for (let j = i + 1; j < tokens.length; j++) {
    const sortedPair = [tokens[i], tokens[j]];

    pools.push({
      id: faker.string.uuid(),
      openingFee: faker.number.float({ min: -0.05, max: 0.05 }),
      liquidity: sortedPair.map((token) => ({
        token,
        totalAmount: parseFloat(faker.finance.amount(100000, 1000000, 2)),
        borrowerAmount: null,
      })),
      // Taking a subset of tokens for demonstration
      rewards: faker.datatype.boolean({ probability: 0.05 })
        ? faker.helpers.arrayElements(tokens, { min: 0, max: 3 }).map((token) => ({
            token,
            amount: parseFloat(faker.finance.amount(1, 50, 2)),
          }))
        : [],
      volume24hUSD: parseFloat(faker.finance.amount(10000, 50000, 2)),
      volume24hUSD24hAgo: parseFloat(faker.finance.amount(10000, 50000, 2)),
    });
  }
}

const liquidityPools = pools;

const totalOpenPositions = faker.number.int({ min: 0, max: 90 });
const openPositions = Array(totalOpenPositions)
  .fill(null)
  .map(() => {
    const openedAt = faker.date.past({ years: 1 }).getTime();
    const size = parseFloat(faker.finance.amount(1, 1000, 2));
    const token = faker.helpers.arrayElement(tokens);
    return {
      id: faker.string.uuid(),
      openedAt,
      closedAt: null,
      direction: faker.helpers.enumValue(LongShortDirection),
      size,
      totalPriceInStable: faker.number.float({
        min: (token.priceUSD / JUSD.priceUSD) * size * 0.5,
        max: (token.priceUSD / JUSD.priceUSD) * size * 3.5,
        precision: 2,
      }),
      feesInStable: parseFloat(faker.finance.amount(1, 50, 2)),
      profitInStable: null,
      token,
    };
  })
  .sort((a, b) => b.openedAt - a.openedAt);

const totalClosedPositions = faker.number.int({ min: 0, max: 90 });
const closedPositions = Array(totalClosedPositions)
  .fill(null)
  .map(() => {
    const openedAt = faker.date.past({ years: 1 }).getTime();
    const closedAt = openedAt + faker.number.int({ min: 1, max: 24 * 60 * 60 * 1000 });
    const size = parseFloat(faker.finance.amount(1, 1000, 2));
    const token = faker.helpers.arrayElement(tokens);
    const totalPriceInStable = faker.number.float({
      min: (token.priceUSD / JUSD.priceUSD) * size * 0.5,
      max: (token.priceUSD / JUSD.priceUSD) * size * 3.5,
      precision: 2,
    });
    return {
      id: faker.string.uuid(),
      openedAt,
      closedAt,
      direction: faker.helpers.enumValue(LongShortDirection),
      size,
      totalPriceInStable,
      feesInStable: parseFloat(faker.finance.amount(1, 50, 2)),
      profitInStable: parseFloat(faker.finance.amount(totalPriceInStable * -0.5, totalPriceInStable * 2.5, 2)),
      token,
    };
  })
  .sort((a, b) => b.openedAt - a.openedAt);

// Define a helper function to generate pool price history data
const generatePoolPriceHistory = (): number[][] => {
  const now = Date.now();
  const oneDayInMs = 24 * 60 * 60 * 1000;

  return Array(60)
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
        type: faker.helpers.enumValue(BorrowerHistoryType),
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
  // GET_ALL_POOLS
  graphql.query<{ getPools: Query['getPools'] }, QueryGetDebtTokensArgs>(GET_ALL_POOLS, (req, res, ctx) => {
    const result: Query['getPools'] = pools;
    return res(ctx.data({ getPools: result }));
  }),
  // GetBorrowerRewards
  graphql.query<{ getPools: Query['getPools'] }, QueryGetDebtTokensArgs>(GET_BORROWER_REWARDS, (req, res, ctx) => {
    const result: Query['getPools'] = pools;
    return res(ctx.data({ getPools: result }));
  }),

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

  // GetBorrowerCollateralTokens
  graphql.query<{ getCollateralTokens: Query['getCollateralTokens'] }, QueryGetCollateralTokensArgs>(
    GET_ALL_COLLATERAL_TOKENS,
    (req, res, ctx) => {
      const { borrower } = req.variables;

      if (!borrower) {
        const result: Query['getCollateralTokens'] = collateralTokens.map((collateralToken) => ({
          ...collateralToken,
          walletAmount: null,
          troveLockedAmount: null,
          stabilityGainedAmount: null,
        }));

        return res(ctx.data({ getCollateralTokens: result }));
      } else {
        return res(ctx.data({ getCollateralTokens: collateralTokens }));
      }
    },
  ),

  // GetBorrowerPositions
  graphql.query<{ getPositions: Query['getPositions'] }, QueryGetPositionsArgs>(
    GET_BORROWER_POSITIONS,
    (req, res, ctx) => {
      const { borrower, isOpen, cursor } = req.variables;
      if (!borrower) {
        throw new Error('Borrower address is required');
      }

      if (isOpen) {
        if (cursor) {
          // find the open position with the id === cursor and return the next 30 entries from that position
          const cursorPositionIndex = openPositions.findIndex(({ id }) => id === cursor);
          const positions = openPositions.slice(cursorPositionIndex + 1, cursorPositionIndex + 31);
          const hasNextPage = cursorPositionIndex + 31 < totalOpenPositions;
          const endCursor = positions[positions.length - 1].id;

          const result: Query['getPositions'] = {
            positions,
            pageInfo: {
              totalCount: totalOpenPositions,
              hasNextPage,
              endCursor,
            },
          };
          return res(ctx.data({ getPositions: result }));
        } else {
          // return the first 30 open positions
          const positions = openPositions.slice(0, 30);
          const hasNextPage = totalOpenPositions > 30;
          const endCursor = positions[positions.length - 1].id;

          const result: Query['getPositions'] = {
            positions,
            pageInfo: {
              totalCount: totalOpenPositions,
              hasNextPage,
              endCursor,
            },
          };
          return res(ctx.data({ getPositions: result }));
        }
      } else {
        if (cursor) {
          // find the closed position with the id === cursor and return the next 30 entries from that position

          const cursorPositionIndex = closedPositions.findIndex(({ id }) => id === cursor);
          const positions = closedPositions.slice(cursorPositionIndex + 1, cursorPositionIndex + 31);
          const hasNextPage = cursorPositionIndex + 31 < totalClosedPositions;
          const endCursor = positions[positions.length - 1].id;

          const result: Query['getPositions'] = {
            positions,
            pageInfo: {
              totalCount: totalClosedPositions,
              hasNextPage,
              endCursor,
            },
          };
          return res(ctx.data({ getPositions: result }));
        } else {
          // return the first 30 closed positions
          const positions = closedPositions.slice(0, 30);
          const hasNextPage = totalClosedPositions > 30;
          const endCursor = positions[positions.length - 1].id;

          const result: Query['getPositions'] = {
            positions,
            pageInfo: {
              totalCount: totalClosedPositions,
              hasNextPage,
              endCursor,
            },
          };
          return res(ctx.data({ getPositions: result }));
        }
      }
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
