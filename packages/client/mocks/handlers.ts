import { faker } from '@faker-js/faker';
import { graphql } from 'msw';
import { FAVORITE_ASSETS_LOCALSTORAGE_KEY } from '../app/components/Features/Assets/Assets';
import { Contracts } from '../app/context/EthersProvider';
import {
  BorrowerHistory,
  BorrowerHistoryType,
  CollateralTokenMeta,
  DebtTokenMeta,
  LongShortDirection,
  Pool,
  Position,
  Query,
  QueryGetBorrowerStabilityHistoryArgs,
  QueryGetCollateralTokensArgs,
  QueryGetDebtTokensArgs,
  QueryGetPoolPriceHistoryArgs,
  QueryGetPoolsArgs,
  QueryGetPositionsArgs,
  QueryGetTokenArgs,
  Token,
  TokenAmount,
} from '../app/generated/gql-types';
import {
  GET_ALL_DEBT_TOKENS,
  GET_ALL_POOLS,
  GET_BORROWER_COLLATERAL_TOKENS,
  GET_BORROWER_DEBT_TOKENS,
  GET_BORROWER_LIQUIDITY_POOLS,
  GET_BORROWER_POSITIONS,
  GET_BORROWER_STABILITY_HISTORY,
  GET_COLLATERAL_USD_HISTORY,
  GET_DEBT_USD_HISTORY,
  GET_RESERVE_USD_HISTORY,
  GET_SELECTED_TOKEN,
  GET_TROVEMANAGER,
} from '../app/queries';

const getFavoritedAssetsFromLS = () => {
  return typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem(FAVORITE_ASSETS_LOCALSTORAGE_KEY) ?? '[]')
    : [];
};

const favoritedAssets: string[] = getFavoritedAssetsFromLS();
const now = Date.now();
const oneDayInMs = 24 * 60 * 60 * 1000;

const JUSD: Token = {
  id: faker.string.uuid(),
  __typename: 'Token',
  address: Contracts.ERC20.JUSD,
  symbol: 'JUSD',
  createdAt: faker.date.past().toISOString(),
  priceUSD: parseFloat(faker.finance.amount(1, 5000, 2)),
  priceUSD24hAgo: parseFloat(faker.finance.amount(1, 5000, 2)),
  priceUSDOracle: parseFloat(faker.finance.amount(1, 5000, 2)),
  isPoolToken: faker.datatype.boolean(),
};

export const tokens: Token[] = Array(10)
  .fill(null)
  .map<Token>((_, index) => ({
    id: faker.string.uuid(),
    __typename: 'Token',
    address: index <= favoritedAssets.length - 1 ? favoritedAssets[index] : faker.string.uuid(),
    symbol: faker.finance.currencyCode(),
    createdAt: faker.date.past().toISOString(),
    priceUSD: parseFloat(faker.finance.amount(1, 5000, 2)),
    priceUSD24hAgo: parseFloat(faker.finance.amount(1, 5000, 2)),
    priceUSDOracle: parseFloat(faker.finance.amount(1, 5000, 2)),
    isPoolToken: faker.datatype.boolean(),
  }));

// 5 hard tokens always with JUSD
const collateralTokens: Token[] = Object.entries(Contracts.ERC20)
  .map<Token>(([symbol, address]) => ({
    id: faker.string.uuid(),
    __typename: 'Token',
    address,
    symbol,
    createdAt: faker.date.past().toISOString(),
    priceUSD: parseFloat(faker.finance.amount(1, 5000, 2)),
    priceUSD24hAgo: parseFloat(faker.finance.amount(1, 5000, 2)),
    priceUSDOracle: parseFloat(faker.finance.amount(1, 5000, 2)),
    isPoolToken: faker.datatype.boolean(),
  }))
  .concat(JUSD);

collateralTokens.shift();

const collateralTokenMeta: CollateralTokenMeta[] = collateralTokens.map<CollateralTokenMeta>((collToken) => {
  const totalValueLockedUSD = parseFloat(faker.finance.amount(10000, 50000, 2));

  return {
    __typename: 'CollateralTokenMeta',
    id: faker.string.uuid(),
    token: collToken,
    totalValueLockedUSD,
    totalValueLockedUSD30dAverage: parseFloat(
      faker.finance.amount(totalValueLockedUSD * 0.9, totalValueLockedUSD * 1.2, 2),
    ),
    walletAmount: 0,
    troveLockedAmount: 0,
    stabilityGainedAmount: 0,
  };
});

const userColl = faker.helpers
  .arrayElements(collateralTokenMeta, { min: 0, max: collateralTokenMeta.length })
  .map((collTokenMeta) => {
    return {
      ...collTokenMeta,
      walletAmount: faker.number.float({ min: 500, max: 1000, precision: 0.0001 }),
      troveLockedAmount: faker.number.float({ min: 50000, max: 100000, precision: 0.0001 }),
      stabilityGainedAmount: faker.number.float({ min: 100, max: 500, precision: 0.0001 }),
    };
  });

// Merge userCollateralTokenMeta and collateralTokenMeta but remove duplicates
const userCollateralTokenMeta = [
  ...userColl,
  ...collateralTokenMeta.filter((token) => !userColl.find(({ id }) => id === token.id)),
];

const debtTokenMeta = tokens.map<DebtTokenMeta>((token, index) => {
  const isGovOrStableDebtToken = index === tokens.length - 1 || index === tokens.length - 2;

  return {
    __typename: 'DebtTokenMeta',
    id: faker.string.uuid(),
    token: token,
    walletAmount: 0,
    troveMintedAmount: 0,
    providedStability: 0,
    compoundedDeposit: 0,
    stabilityCompoundAmount: 0,
    troveRepableDebtAmount: 0,

    totalDepositedStability: faker.number.float({ min: 1000, max: 5000, precision: 0.0001 }),
    totalReserve: isGovOrStableDebtToken ? faker.number.float({ min: 1000, max: 5000, precision: 0.0001 }) : 0,
    totalReserve30dAverage: isGovOrStableDebtToken
      ? faker.number.float({ min: 1000, max: 5000, precision: 0.0001 })
      : 0,
    totalSupplyUSD: parseFloat(faker.finance.amount(10000, 50000, 2)),
    totalSupplyUSD30dAverage: parseFloat(faker.finance.amount(10000, 50000, 2)),
    stabilityDepositAPY: faker.number.float({ min: 0, max: 10, precision: 0.0001 }) / 100,
  };
});

const userDebt = faker.helpers
  .arrayElements(debtTokenMeta, { min: 0, max: debtTokenMeta.length })
  .map((debtTokenMeta) => {
    return {
      ...debtTokenMeta,
      walletAmount: faker.number.float({ min: 100, max: 500, precision: 0.0001 }),
      troveMintedAmount: faker.number.float({ min: 1000, max: 5000, precision: 0.0001 }),
      providedStability: faker.number.float({ min: 100, max: 500, precision: 0.0001 }),
      compoundedDeposit: faker.number.float({ min: 0, max: 100, precision: 0.0001 }),
      stabilityCompoundAmount: faker.number.float({ min: 100, max: 500, precision: 0.0001 }),
      troveRepableDebtAmount: faker.number.float({ min: 100, max: 500, precision: 0.0001 }),
    };
  });

// Merge userCollateralTokenMeta and collateralTokenMeta but remove duplicates
const userDebtTokenMeta = [
  ...userDebt,
  ...debtTokenMeta.filter((token) => !userDebt.find(({ id }) => id === token.id)),
];

// Generate pools once for each pair of tokens
export const pools: Pool[] = [];

const allTokens = tokens.concat(collateralTokens);

for (let i = 0; i < allTokens.length; i++) {
  for (let j = i + 1; j < allTokens.length; j++) {
    const sortedPair = [allTokens[i], allTokens[j]];

    pools.push({
      __typename: 'Pool',
      id: faker.string.uuid(),
      swapFee: faker.number.float({ min: -0.05, max: 0.05, precision: 0.0001 }),
      liquidity: sortedPair.map((token) => ({
        id: faker.string.uuid(),
        __typename: 'PoolLiquidity',
        token,
        totalAmount: parseFloat(faker.finance.amount(100000, 1000000, 2)),
      })),
      // Taking a subset of tokens for demonstration
      rewards: faker.datatype.boolean({ probability: 0.05 })
        ? faker.helpers.arrayElements(tokens, { min: 0, max: 3 }).map((token) => ({
            __typename: 'PoolReward',
            id: faker.string.uuid(),
            token,
            amount: parseFloat(faker.finance.amount(1, 50, 2)),
          }))
        : [],
      liquidityDepositAPY: faker.number.float({ min: 0, max: 0.5, precision: 0.0001 }),
      volume30dUSD: parseFloat(faker.finance.amount(10000, 50000, 2)),
      volume30dUSD30dAgo: parseFloat(faker.finance.amount(10000, 50000, 2)),

      borrowerAmount: 0,
      totalSupply: faker.number.float({ min: 100000, max: 1000000, precision: 0.0001 }),
    });
  }
}

const liquidityPools = pools;

const totalOpenPositions = faker.number.int({ min: 5, max: 90 });
const openPositions = Array(totalOpenPositions)
  .fill(null)
  .map<Position>(() => {
    const openedAt = faker.date.past({ years: 1 }).getTime();
    const size = parseFloat(faker.finance.amount(1, 1000, 2));
    const token = faker.helpers.arrayElement(tokens);
    return {
      __typename: 'Position',
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

const totalClosedPositions = faker.number.int({ min: 5, max: 90 });
const closedPositions = Array(totalClosedPositions)
  .fill(null)
  .map<Position>(() => {
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
      __typename: 'Position',
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

const borrowerHistory: BorrowerHistory[] = Array(faker.number.int({ min: 5, max: 90 }))
  .fill(null)
  .map<BorrowerHistory>(() => {
    const type = faker.helpers.enumValue(BorrowerHistoryType);

    const lostAmount = parseFloat(faker.finance.amount(1, 1000, 2));
    const gainedAmount = parseFloat(
      faker.finance.amount(lostAmount, faker.number.int({ min: lostAmount, max: (lostAmount + 1) * 1.1 }), 2),
    );

    // negative amount and only on lost token for claimed rewards
    const lostToken =
      type === BorrowerHistoryType.ClaimedRewards
        ? generateTokenValues(lostAmount, faker.helpers.arrayElements(tokens, { min: 1, max: 5 })).map<TokenAmount>(
            (token) => ({
              __typename: 'TokenAmount',
              ...token,
              amount: token.amount * -1,
            }),
          )
        : [];
    // positive amount and always bigger than any potential lost amount
    const gainedToken = generateTokenValues(
      gainedAmount,
      faker.helpers.arrayElements(tokens, { min: 1, max: 5 }),
    ).map<TokenAmount>((token) => ({
      __typename: 'TokenAmount',
      ...token,
    }));
    return {
      __typename: 'BorrowerHistory',
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

// --------------- HANDLER ----------------

export const handlers = [
  // GetDebtTokens
  graphql.query<{ getDebtTokens: Query['getDebtTokens'] }, QueryGetDebtTokensArgs>(
    GET_ALL_DEBT_TOKENS,
    (req, res, ctx) => {
      const result: Query['getDebtTokens'] = tokens.map((token) => {
        const shouldHaveReserve = faker.datatype.boolean();

        return {
          __typename: 'DebtTokenMeta',
          id: faker.string.uuid(),
          token: token,
          walletAmount: 0,
          troveMintedAmount: 0,
          providedStability: 0,
          compoundedDeposit: 0,
          stabilityCompoundAmount: 0,
          troveRepableDebtAmount: 0,

          totalDepositedStability: parseFloat(faker.finance.amount(1000, 5000, 2)),
          totalReserve: shouldHaveReserve ? parseFloat(faker.finance.amount(1000, 5000, 2)) : 0,
          totalReserve30dAverage: shouldHaveReserve ? parseFloat(faker.finance.amount(1000, 5000, 2)) : 0,
          totalSupplyUSD: parseFloat(faker.finance.amount(10000, 50000, 2)),
          totalSupplyUSD30dAverage: parseFloat(faker.finance.amount(10000, 50000, 2)),
          stabilityDepositAPY: faker.number.float({ min: 0.01, max: 0.1, precision: 0.01 }),
        };
      });

      return res(ctx.data({ getDebtTokens: result }));
    },
  ),
  // GetAllPools
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

      if (borrower) {
        return res(ctx.data({ getDebtTokens: userDebtTokenMeta }));
      } else {
        return res(ctx.data({ getDebtTokens: debtTokenMeta }));
      }
    },
  ),

  // GetSelectedToken
  graphql.query<{ getToken: Query['getToken'] }, QueryGetTokenArgs>(GET_SELECTED_TOKEN, (req, res, ctx) => {
    const { address } = req.variables;

    const getToken = tokens.find((token) => token.address === address)!;

    return res(ctx.data({ getToken }));
  }),

  // GetCollateralTokens
  graphql.query<{ getCollateralTokens: Query['getCollateralTokens'] }, QueryGetCollateralTokensArgs>(
    GET_BORROWER_COLLATERAL_TOKENS,
    (req, res, ctx) => {
      const { borrower } = req.variables;

      if (borrower) {
        return res(ctx.data({ getCollateralTokens: userCollateralTokenMeta }));
      } else {
        return res(ctx.data({ getCollateralTokens: collateralTokenMeta }));
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
            __typename: 'PositionsPage',
            positions,
            pageInfo: {
              __typename: 'PageInfo',
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
            __typename: 'PositionsPage',
            positions,
            pageInfo: {
              __typename: 'PageInfo',
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
            __typename: 'PositionsPage',
            positions,
            pageInfo: {
              __typename: 'PageInfo',
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
            __typename: 'PositionsPage',
            positions,
            pageInfo: {
              __typename: 'PageInfo',
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

  // GetBorrowerLiquidityPools
  graphql.query<{ getPools: Query['getPools'] }, QueryGetPoolsArgs>(GET_BORROWER_LIQUIDITY_POOLS, (req, res, ctx) => {
    const { borrower } = req.variables;
    if (!borrower) {
      const result: Query['getPools'] = liquidityPools;

      return res(ctx.data({ getPools: result }));
    }

    const borrowerLiquidityPools = faker.helpers.arrayElements(liquidityPools, { min: 1, max: 5 });

    const liqudityPoolsWithoutBorrower = liquidityPools.filter(
      (pool) => !borrowerLiquidityPools.find(({ id }) => id === pool.id),
    );

    const liqudityPoolsWithBorrower: Query['getPools'] = borrowerLiquidityPools.map<Pool>((pool) => {
      return {
        ...pool,
        liquidity: pool.liquidity.map((liquidity) => ({
          ...liquidity,
        })),
        borrowerAmount: faker.number.float({ min: 10, max: pool.totalSupply / 100, precision: 0.0001 }),
      };
    });

    return res(ctx.data({ getPools: liqudityPoolsWithoutBorrower.concat(liqudityPoolsWithBorrower) }));
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
        __typename: 'PoolHistoryPage',
        history,
        pageInfo: {
          __typename: 'PageInfo',
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
        __typename: 'PoolHistoryPage',
        history,
        pageInfo: {
          __typename: 'PageInfo',
          totalCount: totalBorrowerHistory,
          hasNextPage,
          endCursor,
        },
      };
      return res(ctx.data({ getBorrowerStabilityHistory: result }));
    }
  }),

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

  // -------------- Only resolved by local cache ---------------- only for local testing purposes

  // GetPoolPriceHistory
  graphql.query<{ getTroveManager: Query['getTroveManager'] }>(GET_TROVEMANAGER, (req, res, ctx) => {
    return res(
      ctx.data({
        getTroveManager: {
          __typename: 'TroveManager',
          id: faker.string.uuid(),
          borrowingRate: faker.number.float({ min: 0, max: 0.5, precision: 0.0001 }),
        },
      }),
    );
  }),
];
