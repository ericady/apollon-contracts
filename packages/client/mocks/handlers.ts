import { faker } from '@faker-js/faker';
import { graphql } from 'msw';
import { FAVORITE_ASSETS_LOCALSTORAGE_KEY } from '../app/components/Features/Assets/Assets';
import {
  BorrowerHistory,
  BorrowerHistoryType,
  CollateralTokenMeta,
  DebtTokenMeta,
  LongShortDirection,
  Pool,
  Query,
  QueryGetBorrowerStabilityHistoryArgs,
  QueryGetCollateralTokensArgs,
  QueryGetDebtTokensArgs,
  QueryGetPoolPriceHistoryArgs,
  QueryGetPoolsArgs,
  QueryGetPositionsArgs,
  Token,
} from '../app/generated/gql-types';
import {
  GET_ALL_DEBT_TOKENS,
  GET_ALL_POOLS,
  GET_BORROWER_COLLATERAL_TOKENS,
  GET_BORROWER_DEBT_TOKENS,
  GET_BORROWER_LIQUIDITY_POOLS,
  GET_BORROWER_POSITIONS,
  GET_BORROWER_STABILITY_HISTORY,
  GET_COLLATERAL_RATIO_HISTORY,
  GET_COLLATERAL_USD_HISTORY,
  GET_DEBT_USD_HISTORY,
  GET_LIQUIDITY_POOLS,
  GET_RESERVE_USD_HISTORY,
} from '../app/queries';

const favoritedAssets: string[] = JSON.parse(localStorage.getItem(FAVORITE_ASSETS_LOCALSTORAGE_KEY) ?? '[]');
const now = Date.now();
const oneDayInMs = 24 * 60 * 60 * 1000;

const JUSD = {
  address: '0x6cA13a4ab78dd7D657226b155873A04DB929AXXX',
  symbol: 'JUSD',
  createdAt: faker.date.past().toISOString(),
  priceUSD: parseFloat(faker.finance.amount(1, 5000, 2)),
  priceUSD24hAgo: parseFloat(faker.finance.amount(1, 5000, 2)),
  isPoolToken: faker.datatype.boolean(),
};
const tokens: Token[] = Array(10)
  .fill(null)
  .map((_, index) => ({
    address: index <= favoritedAssets.length - 1 ? favoritedAssets[index] : faker.string.uuid(),
    symbol: faker.finance.currencyCode(),
    createdAt: faker.date.past().toISOString(),
    priceUSD: parseFloat(faker.finance.amount(1, 5000, 2)),
    priceUSD24hAgo: parseFloat(faker.finance.amount(1, 5000, 2)),
    isPoolToken: faker.datatype.boolean(),
  }))
  .concat(JUSD);

// 5 hard tokens always with JUSD
const collateralTokens: CollateralTokenMeta[] = faker.helpers
  .arrayElements(tokens.slice(0, tokens.length - 2), 4)
  .concat(JUSD)
  .map((token) => {
    const totalValueLockedUSD = parseFloat(faker.finance.amount(10000, 50000, 2));

    return {
      token: token,
      walletAmount: parseFloat(faker.finance.amount(0, 1000, 10)),
      troveLockedAmount: parseFloat(faker.finance.amount(0, 50, 10)),
      stabilityGainedAmount: parseFloat(faker.finance.amount(50, 500, 10)),
      totalValueLockedUSD,
      totalValueLockedUSD24hAgo: parseFloat(
        faker.finance.amount(totalValueLockedUSD * 0.9, totalValueLockedUSD * 1.2, 2),
      ),
    };
  });

// less than 5 hard tokens always with JUSD that are less in worth than the collateral tokens
const debtTokens: DebtTokenMeta[] = faker.helpers
  .arrayElements(collateralTokens.slice(0, collateralTokens.length - 1), 3)
  .map(({ token, stabilityGainedAmount }) => {
    const totalSupplyUSD = parseFloat(faker.finance.amount(10000, 50000, 2));
    const totalReserve = parseFloat(faker.finance.amount(1000, 5000, 2));

    return {
      token: token,
      walletAmount: parseFloat(faker.finance.amount(0, 1000, 2)),
      troveMintedAmount: parseFloat(faker.finance.amount(0, 500, 2)),
      stabilityLostAmount: faker.number.float({ min: 0, max: stabilityGainedAmount!, precision: 0.0001 }),
      totalDepositedStability: parseFloat(faker.finance.amount(1000, 5000, 2)),
      totalReserve,
      totalReserve24hAgo: parseFloat(faker.finance.amount(totalReserve * 0.9, totalReserve * 1.2, 2)),
      totalSupplyUSD,
      totalSupplyUSD24hAgo: parseFloat(faker.finance.amount(totalSupplyUSD * 0.9, totalSupplyUSD * 1.2, 2)),
      stabilityDepositAPY: faker.number.float({ min: 0, max: 10, precision: 0.0001 }) / 100,
    };
  });

// Generate pools once for each pair of tokens
const pools: Pool[] = [];

for (let i = 0; i < tokens.length; i++) {
  for (let j = i + 1; j < tokens.length; j++) {
    const sortedPair = [tokens[i], tokens[j]];

    pools.push({
      id: faker.string.uuid(),
      openingFee: faker.number.float({ min: -0.05, max: 0.05, precision: 0.0001 }),
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
        min: (token.priceUSD / JUSD.priceUSD) * size * 0.3,
        max: (token.priceUSD / JUSD.priceUSD) * size * 5.5,
        precision: 0.00001,
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
      min: (token.priceUSD / JUSD.priceUSD) * size * 0.01,
      max: (token.priceUSD / JUSD.priceUSD) * size * 5.5,
      precision: 0.00001,
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

const generateTokenValues = (maxValue: number, tokens: Token[]) => {
  let leftValue = maxValue;

  return tokens.map((token, index) => {
    const value = parseFloat(faker.finance.amount(0, leftValue, 2));
    // Last token gets all the left value
    const amount = index === tokens.length - 1 ? leftValue : value / token.priceUSD;
    leftValue -= value;

    return {
      token,
      amount,
    };
  });
};

const borrowerHistory: BorrowerHistory[] = Array(faker.number.int({ min: 0, max: 90 }))
  .fill(null)
  .map(() => {
    const type = faker.helpers.enumValue(BorrowerHistoryType);

    const lostAmount = parseFloat(faker.finance.amount(1, 1000, 2));
    const gainedAmount = parseFloat(
      faker.finance.amount(lostAmount, faker.number.int({ min: lostAmount, max: lostAmount * 1.1 }), 2),
    );

    // negative amount and only on lost token for claimed rewards
    const lostToken =
      type === BorrowerHistoryType.ClaimedRewards
        ? generateTokenValues(lostAmount, faker.helpers.arrayElements(tokens, { min: 1, max: 5 })).map((token) => ({
            ...token,
            amount: token.amount * -1,
          }))
        : [];
    // positive amount and always bigger than any potential lost amount
    const gainedToken = generateTokenValues(gainedAmount, faker.helpers.arrayElements(tokens, { min: 1, max: 5 }));
    return {
      id: faker.string.uuid(),
      timestamp: now - faker.number.int({ min: 0, max: 29 }) * oneDayInMs,
      type,
      values: [...lostToken, ...gainedToken],
      resultInUSD: gainedAmount,
      claimInUSD: type === BorrowerHistoryType.ClaimedRewards ? lostAmount : null,
    };
  })
  .sort((a, b) => b.timestamp - a.timestamp);
const totalBorrowerHistory = borrowerHistory.length;

export const handlers = [
  // GetDebtTokens
  graphql.query<{ getDebtTokens: Query['getDebtTokens'] }, QueryGetDebtTokensArgs>(
    GET_ALL_DEBT_TOKENS,
    (req, res, ctx) => {
      const result: Query['getDebtTokens'] = tokens.map((token) => {
        const shouldHaveReserve = faker.datatype.boolean();

        return {
          token: token,
          walletAmount: null,
          troveMintedAmount: null,
          stabilityLostAmount: null,
          totalDepositedStability: parseFloat(faker.finance.amount(1000, 5000, 2)),
          totalReserve: shouldHaveReserve ? parseFloat(faker.finance.amount(1000, 5000, 2)) : 0,
          totalReserve24hAgo: shouldHaveReserve ? parseFloat(faker.finance.amount(1000, 5000, 2)) : 0,
          totalSupplyUSD: parseFloat(faker.finance.amount(10000, 50000, 2)),
          totalSupplyUSD24hAgo: parseFloat(faker.finance.amount(10000, 50000, 2)),
          stabilityDepositAPY: faker.number.float({ min: 0.01, max: 0.1, precision: 0.01 }),
        };
      });

      return res(ctx.data({ getDebtTokens: result }));
    },
  ),
  // GET_ALL_POOLS
  graphql.query<{ getPools: Query['getPools'] }, QueryGetDebtTokensArgs>(GET_ALL_POOLS, (req, res, ctx) => {
    const result: Query['getPools'] = pools;
    return res(ctx.data({ getPools: result }));
  }),
  // // GetBorrowerRewards
  // graphql.query<{ getPools: Query['getPools'] }, QueryGetDebtTokensArgs>(GET_BORROWER_REWARDS, (req, res, ctx) => {
  //   const result: Query['getPools'] = pools;
  //   return res(ctx.data({ getPools: result }));
  // }),

  // GetBorrowerDebtTokens
  graphql.query<{ getDebtTokens: Query['getDebtTokens'] }, QueryGetDebtTokensArgs>(
    GET_BORROWER_DEBT_TOKENS,
    (req, res, ctx) => {
      const { borrower } = req.variables;
      if (!borrower) {
        throw new Error('Borrower address is required');
      }

      // All the usual tokens and the borrower specific debt tokens
      const borrowerAddresses = debtTokens.map(({ token }) => token.address);
      const tokensWithBorrowerDebtTokens: Query['getDebtTokens'] = debtTokens.concat(
        tokens
          .filter(({ address }) => !borrowerAddresses.includes(address))
          .map<DebtTokenMeta>((token) => {
            return {
              token: token,
              walletAmount: null,
              troveMintedAmount: null,
              stabilityLostAmount: null,
              totalDepositedStability: parseFloat(faker.finance.amount(1000, 5000, 2)),
              totalReserve: parseFloat(faker.finance.amount(1000, 5000, 2)),
              totalReserve24hAgo: parseFloat(faker.finance.amount(1000, 5000, 2)),
              totalSupplyUSD: parseFloat(faker.finance.amount(10000, 50000, 2)),
              totalSupplyUSD24hAgo: parseFloat(faker.finance.amount(10000, 50000, 2)),
              stabilityDepositAPY: faker.number.float({ min: 0, max: 10, precision: 0.0001 }) / 100,
            };
          }),
      );

      return res(ctx.data({ getDebtTokens: tokensWithBorrowerDebtTokens }));
    },
  ),

  // GetBorrowerCollateralTokens
  graphql.query<{ getCollateralTokens: Query['getCollateralTokens'] }, QueryGetCollateralTokensArgs>(
    GET_BORROWER_COLLATERAL_TOKENS,
    (req, res, ctx) => {
      const { borrower } = req.variables;

      if (!borrower) {
        const result: Query['getCollateralTokens'] = tokens.map((token) => {
          const totalValueLockedUSD = parseFloat(faker.finance.amount(10000, 50000, 2));

          return {
            token: token,
            totalValueLockedUSD,
            totalValueLockedUSD24hAgo: parseFloat(
              faker.finance.amount(totalValueLockedUSD * 0.9, totalValueLockedUSD * 1.2, 2),
            ),
            walletAmount: null,
            troveLockedAmount: null,
            stabilityGainedAmount: null,
          };
        });

        return res(ctx.data({ getCollateralTokens: result }));
      } else {
        // All the usual tokens and the borrower specific debt tokens
        const borrowerAddresses = collateralTokens.map(({ token }) => token.address);
        const tokensWithCollateralTokens: Query['getCollateralTokens'] = collateralTokens.concat(
          tokens
            .filter(({ address }) => !borrowerAddresses.includes(address))
            .map<CollateralTokenMeta>((token) => {
              const totalValueLockedUSD = parseFloat(faker.finance.amount(10000, 50000, 2));

              return {
                token: token,
                totalValueLockedUSD,
                totalValueLockedUSD24hAgo: parseFloat(
                  faker.finance.amount(totalValueLockedUSD * 0.9, totalValueLockedUSD * 1.2, 2),
                ),
                walletAmount: null,
                troveLockedAmount: null,
                stabilityGainedAmount: null,
              };
            }),
        );

        return res(ctx.data({ getCollateralTokens: tokensWithCollateralTokens }));
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

  // GetCollateralUSDHistory
  graphql.query<{ getCollateralUSDHistory: Query['getCollateralUSDHistory'] }>(
    GET_COLLATERAL_USD_HISTORY,
    (req, res, ctx) => {
      const result = generatePoolPriceHistory();

      return res(ctx.data({ getCollateralUSDHistory: result }));
    },
  ),
  // GetDebtUSDHistory
  graphql.query<{ getDebtUSDHistory: Query['getDebtUSDHistory'] }>(GET_DEBT_USD_HISTORY, (req, res, ctx) => {
    const result = generatePoolPriceHistory();

    return res(ctx.data({ getDebtUSDHistory: result }));
  }),
  // GetBorrowerStabilityHistory
  graphql.query<
    { getBorrowerStabilityHistory: Query['getBorrowerStabilityHistory'] },
    QueryGetBorrowerStabilityHistoryArgs
  >(GET_BORROWER_STABILITY_HISTORY, (req, res, ctx) => {
    // For this mock, we ignore the actual poolId and just generate mock data
    const { borrower, cursor } = req.variables;
    if (!borrower) {
      throw new Error('Borrower address is required');
    }

    if (cursor) {
      // find the open position with the id === cursor and return the next 30 entries from that position
      const cursorPositionIndex = borrowerHistory.findIndex(({ id }) => id === cursor);
      const history = borrowerHistory.slice(cursorPositionIndex + 1, cursorPositionIndex + 31);
      const hasNextPage = cursorPositionIndex + 31 < totalBorrowerHistory;
      const endCursor = history[history.length - 1].id;

      const result: Query['getBorrowerStabilityHistory'] = {
        history,
        pageInfo: {
          totalCount: totalBorrowerHistory,
          hasNextPage,
          endCursor,
        },
      };
      return res(ctx.data({ getBorrowerStabilityHistory: result }));
    } else {
      // return the first 30 open positions
      const history = borrowerHistory.slice(0, 30);
      const hasNextPage = totalBorrowerHistory > 30;
      const endCursor = history[history.length - 1].id;

      const result: Query['getBorrowerStabilityHistory'] = {
        history,
        pageInfo: {
          totalCount: totalBorrowerHistory,
          hasNextPage,
          endCursor,
        },
      };
      return res(ctx.data({ getBorrowerStabilityHistory: result }));
    }
  }),
  // GetCollateralRatioHistory
  graphql.query<{ getCollateralRatioHistory: Query['getCollateralRatioHistory'] }>(
    GET_COLLATERAL_RATIO_HISTORY,
    (req, res, ctx) => {
      const result = generatePoolPriceHistory();

      return res(ctx.data({ getCollateralRatioHistory: result }));
    },
  ),
  // GetReserveUSDHistory
  graphql.query<{ getReserveUSDHistory: Query['getReserveUSDHistory'] }>(GET_RESERVE_USD_HISTORY, (req, res, ctx) => {
    const result = generatePoolPriceHistory();

    return res(ctx.data({ getReserveUSDHistory: result }));
  }),

  // TODO: Are they needed??

  // GetPoolPriceHistory
  graphql.query<{ getPoolPriceHistory: Query['getPoolPriceHistory'] }, QueryGetPoolPriceHistoryArgs>(
    'GetPoolPriceHistory',
    (req, res, ctx) => {
      // For this mock, we ignore the actual poolId and just generate mock data
      const result = generatePoolPriceHistory();

      return res(ctx.data({ getPoolPriceHistory: result }));
    },
  ),

  // GetBorrowerPoolHistory
  // graphql.query<{ getBorrowerPoolHistory: Query['getBorrowerPoolHistory'] }, QueryGetBorrowerPoolHistoryArgs>(
  //   'GetBorrowerPoolHistory',
  //   (req, res, ctx) => {
  //     // For this mock, we ignore the actual poolId and just generate mock data
  //     const result = generateBorrowerHistory();

  //     return res(ctx.data({ getBorrowerPoolHistory: result }));
  //   },
  // ),
];
