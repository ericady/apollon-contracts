import { faker } from '@faker-js/faker';
import { ethers } from 'ethers';
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
  Query,
  QueryCollateralTokenMetasArgs,
  QueryDebtTokenMetasArgs,
  QueryGetBorrowerStabilityHistoryArgs,
  QueryGetPoolPriceHistoryArgs,
  QueryGetPoolsArgs,
  QuerySwapEventsArgs,
  QueryTokenArgs,
  QueryTokenCandleSingletonArgs,
  QueryTokenCandlesArgs,
  SwapEvent,
  Token,
  TokenAmount,
  TokenCandle,
  TokenCandleSingleton,
} from '../app/generated/gql-types';
import {
  GET_ALL_DEBT_TOKENS,
  GET_ALL_POOLS,
  GET_BORROWER_COLLATERAL_TOKENS,
  GET_BORROWER_DEBT_TOKENS,
  GET_BORROWER_LIQUIDITY_POOLS,
  GET_BORROWER_STABILITY_HISTORY,
  GET_BORROWER_SWAPS,
  GET_COLLATERAL_USD_HISTORY,
  GET_DEBT_USD_HISTORY,
  GET_RESERVE_USD_HISTORY,
  GET_SELECTED_TOKEN,
  GET_SYSTEMINFO,
  GET_TRADING_VIEW_CANDLES,
  GET_TRADING_VIEW_LATEST_CANDLE,
  GET_TROVEMANAGER,
} from '../app/queries';
import { bigIntStringToFloat, floatToBigInt } from '../app/utils/math';

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
  createdAt: (faker.date.past().getTime() / 1000).toString(),
  priceUSD: floatToBigInt(faker.number.float({ min: 1, max: 5000, precision: 0.01 })).toString(),
  priceUSD24hAgo: floatToBigInt(faker.number.float({ min: 1, max: 5000, precision: 0.01 })).toString(),
  priceUSDOracle: faker.number.float({ min: 1, max: 5000, precision: 0.01 }),
  isPoolToken: faker.datatype.boolean(),
};

export const tokens: Token[] = Array(10)
  .fill(null)
  .map<Token>((_, index) => ({
    id: faker.string.uuid(),
    __typename: 'Token',
    address: index <= favoritedAssets.length - 1 ? favoritedAssets[index] : faker.finance.ethereumAddress(),
    symbol: faker.finance.currencyCode(),
    // Unix timestamp in seconds like the API returns it.
    createdAt: (faker.date.past().getTime() / 1000).toString(),
    priceUSD: floatToBigInt(faker.number.float({ min: 1, max: 5000, precision: 0.01 })).toString(),
    priceUSD24hAgo: floatToBigInt(faker.number.float({ min: 1, max: 5000, precision: 0.01 })).toString(),
    priceUSDOracle: faker.number.float({ min: 1, max: 5000, precision: 0.01 }),
    isPoolToken: faker.datatype.boolean(),
  }));

// 5 hard tokens always with JUSD
const collateralTokens: Token[] = Object.entries(Contracts.ERC20)
  .map<Token>(([symbol, address]) => ({
    id: faker.string.uuid(),
    __typename: 'Token',
    address,
    symbol,
    createdAt: (faker.date.past().getTime() / 1000).toString(),
    priceUSD: floatToBigInt(faker.number.float({ min: 1, max: 5000, precision: 0.01 })).toString(),
    priceUSD24hAgo: floatToBigInt(faker.number.float({ min: 1, max: 5000, precision: 0.01 })).toString(),
    priceUSDOracle: faker.number.float({ min: 1, max: 5000, precision: 0.01 }),
    isPoolToken: faker.datatype.boolean(),
  }))
  .concat(JUSD);

collateralTokens.shift();

const collateralTokenMeta: CollateralTokenMeta[] = collateralTokens.map<CollateralTokenMeta>((collToken) => {
  const totalValueLockedUSD = parseFloat(faker.finance.amount(10000, 50000, 2));

  return {
    __typename: 'CollateralTokenMeta',
    id: faker.string.uuid(),
    timestamp: (now / 1000).toString(),
    token: collToken,
    totalValueLockedUSD: floatToBigInt(faker.number.float({ min: 10000, max: 50000, precision: 0.01 })).toString(),
    totalValueLockedUSD30dAverage: {
      __typename: 'TotalValueLockedAverage',
      id: faker.string.uuid(),
      index: 0,
      value: floatToBigInt(faker.number.float({ min: 10000, max: 50000, precision: 0.01 })).toString(),
    },
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
    timestamp: (now / 1000).toString(),
    token: token,
    walletAmount: 0,
    troveMintedAmount: 0,
    providedStability: 0,
    compoundedDeposit: 0,
    stabilityCompoundAmount: 0,
    troveRepableDebtAmount: 0,

    totalDepositedStability: floatToBigInt(faker.number.float({ min: 1000, max: 5000, precision: 0.0001 })).toString(),
    totalReserve: floatToBigInt(
      isGovOrStableDebtToken ? faker.number.float({ min: 1000, max: 5000, precision: 0.0001 }) : 0,
    ).toString(),
    totalReserve30dAverage: isGovOrStableDebtToken
      ? {
          __typename: 'TotalReserveAverage',
          id: faker.string.uuid(),
          index: 0,
          value: floatToBigInt(faker.number.float({ min: 1000, max: 5000, precision: 0.0001 })).toString(),
        }
      : null,
    totalSupplyUSD: floatToBigInt(faker.number.float({ min: 10000, max: 50000, precision: 0.0001 })).toString(),
    totalSupplyUSD30dAverage: {
      __typename: 'TotalSupplyAverage',
      id: faker.string.uuid(),
      index: 0,
      value: floatToBigInt(faker.number.float({ min: 10000, max: 50000, precision: 0.0001 })).toString(),
    },
    stabilityDepositAPY: {
      __typename: 'StabilityDepositAPY',
      id: faker.string.uuid(),
      index: 0,
      profit: floatToBigInt(faker.number.float({ min: 1, max: 100, precision: 0.0001 })).toString(),
      volume: floatToBigInt(faker.number.float({ min: 100, max: 200, precision: 0.0001 })).toString(),
    },
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
      address: faker.finance.ethereumAddress(),
      swapFee: floatToBigInt(faker.number.float({ min: -0.05, max: 0.05, precision: 0.0001 }), 6).toString(),
      liquidity: sortedPair.map((token) => ({
        id: faker.string.uuid(),
        __typename: 'PoolLiquidity',
        token,
        totalAmount: floatToBigInt(faker.number.float({ min: 100000, max: 500000, precision: 0.0001 })).toString(),
      })),
      liquidityDepositAPY: floatToBigInt(faker.number.float({ min: 0.01, max: 0.3, precision: 0.0001 })).toString(),
      volume30dUSD: {
        __typename: 'PoolVolume30d',
        id: faker.string.uuid(),
        lastIndex: 0,
        leadingIndex: 0,
        value: floatToBigInt(faker.number.float({ min: 100000, max: 500000, precision: 0.0001 })).toString(),
        feeUSD: floatToBigInt(faker.number.float({ min: 1000, max: 5000, precision: 0.0001 })).toString(),
      },
      volume30dUSD30dAgo: {
        __typename: 'PoolVolume30d',
        id: faker.string.uuid(),
        lastIndex: 0,
        leadingIndex: 0,
        value: floatToBigInt(faker.number.float({ min: 100000, max: 500000, precision: 0.0001 })).toString(),
        feeUSD: floatToBigInt(faker.number.float({ min: 1000, max: 5000, precision: 0.0001 })).toString(),
      },
      borrowerAmount: 0,
      totalSupply: floatToBigInt(faker.number.float({ min: 100000, max: 500000, precision: 0.0001 })).toString(),
    });
  }
}

const liquidityPools = pools;

const pastSwapEventsLength = faker.number.int({ min: 5, max: 90 });
const pastSwapEvents = Array(pastSwapEventsLength)
  .fill(null)
  .map<SwapEvent>(() => {
    const timestamp = (faker.date.past({ years: 1 }).getTime() / 1000).toString();
    const size = floatToBigInt(faker.number.float({ min: 1, max: 1000, precision: 0.0001 })).toString();
    const token = faker.helpers.arrayElement(tokens);

    return {
      __typename: 'SwapEvent',
      id: faker.string.uuid(),
      timestamp,
      borrower: faker.finance.ethereumAddress(),
      totalPriceInStable: floatToBigInt(
        (bigIntStringToFloat(size) * bigIntStringToFloat(token.priceUSD)) / bigIntStringToFloat(JUSD.priceUSD),
      ).toString(),
      direction: faker.helpers.enumValue(LongShortDirection),
      size,
      swapFee: floatToBigInt(faker.number.float({ min: 0.01, max: 0.1, precision: 0.0001 }), 6).toString(),
      token,
    };
  })
  .sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));

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
    const amount = index === tokens.length - 1 ? leftValue : value / bigIntStringToFloat(token.priceUSD);
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
      faker.finance.amount(lostAmount, faker.number.int({ min: lostAmount, max: lostAmount * 1.1 }), 2),
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
      claimInUSD: type === BorrowerHistoryType.ClaimedRewards ? gainedAmount : null,
      lostDepositInUSD: type === BorrowerHistoryType.ClaimedRewards ? lostAmount : null,
    };
  })
  .sort((a, b) => b.timestamp - a.timestamp);
const totalBorrowerHistory = borrowerHistory.length;

// --------------- HANDLER ----------------

export const handlers = [
  // GetDebtTokens
  graphql.query<{ debtTokenMetas: Query['debtTokenMetas'] }, QueryDebtTokenMetasArgs>(
    GET_ALL_DEBT_TOKENS,
    (req, res, ctx) => {
      return res(ctx.data({ debtTokenMetas: debtTokenMeta }));
    },
  ),
  // GetAllPools
  graphql.query<{ getPools: Query['getPools'] }, QueryDebtTokenMetasArgs>(GET_ALL_POOLS, (req, res, ctx) => {
    const result: Query['getPools'] = pools;
    return res(ctx.data({ getPools: result }));
  }),
  // // GetBorrowerRewards
  // graphql.query<{ getPools: Query['getPools'] }, QueryDebtTokenMetasArgs>(GET_BORROWER_REWARDS, (req, res, ctx) => {
  //   const result: Query['getPools'] = pools;
  //   return res(ctx.data({ getPools: result }));
  // }),

  // GetBorrowerDebtTokens
  graphql.query<{ debtTokenMetas: Query['debtTokenMetas'] }, QueryDebtTokenMetasArgs>(
    GET_BORROWER_DEBT_TOKENS,
    (req, res, ctx) => {
      const { borrower } = req.variables;

      if (borrower) {
        return res(ctx.data({ debtTokenMetas: userDebtTokenMeta }));
      } else {
        return res(ctx.data({ debtTokenMetas: debtTokenMeta }));
      }
    },
  ),

  // GetSelectedToken
  graphql.query<{ token: Query['token'] }, QueryTokenArgs>(GET_SELECTED_TOKEN, (req, res, ctx) => {
    const { address } = req.variables;

    const token = tokens.find((token) => token.address === address)!;

    return res(ctx.data({ token }));
  }),

  // GetCollateralTokens
  graphql.query<{ collateralTokenMetas: Query['collateralTokenMetas'] }, QueryCollateralTokenMetasArgs>(
    GET_BORROWER_COLLATERAL_TOKENS,
    (req, res, ctx) => {
      const { borrower } = req.variables;

      if (borrower) {
        return res(ctx.data({ collateralTokenMetas: userCollateralTokenMeta }));
      } else {
        return res(ctx.data({ collateralTokenMetas: collateralTokenMeta }));
      }
    },
  ),

  // GetBorrowerSwapEvents
  graphql.query<{ swapEvents: Query['swapEvents'] }, QuerySwapEventsArgs>(GET_BORROWER_SWAPS, (req, res, ctx) => {
    const { first, skip, where } = req.variables;
    if (!where?.borrower || !skip || !first) {
      throw new Error('Required parameter not supplied');
    }
    const positions = pastSwapEvents.slice(skip, skip + first);

    return res(ctx.data({ swapEvents: positions }));
  }),

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
        borrowerAmount: faker.number.float({
          min: 10,
          max: bigIntStringToFloat(pool.totalSupply) / 100,
          precision: 0.0001,
        }),
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

  // GetTradingViewCandles
  graphql.query<{ tokenCandles: Query['tokenCandles'] }, QueryTokenCandlesArgs>(
    GET_TRADING_VIEW_CANDLES,
    (req, res, ctx) => {
      const { orderBy, orderDirection, where } = req.variables;

      const resolutionMultiplier = {
        1: 60 * 1000, // 1 minute in milliseconds
        10: 10 * 60 * 1000, // 5 minutes
        60: 60 * 60 * 1000, // 1 hour
        360: 6 * 60 * 60 * 1000, // 6 hour
        1440: 24 * 60 * 60 * 1000, // 1 day
        10080: 7 * 24 * 60 * 60 * 1000, // 1 day
        // Add more resolutions as needed
      };

      let bars = [];
      let timestamp = where!.timestamp_gte! * 1000; // Convert from seconds to milliseconds

      // Generate bars up to 'periodParams.to' or 'periodParams.countBack' number of bars
      while (timestamp < where!.timestamp_lte! * 1000) {
        // Randomly generate OHLC values (modify logic as needed)
        let open = Math.random() * 100 + 100; // Random value between 100 and 200
        let close = Math.random() * 100 + 100;
        let high = Math.max(open, close) + Math.random() * 10;
        let low = Math.min(open, close) - Math.random() * 10;
        let volume = Math.random() * 1000; // Random volume

        // Add the bar to the array
        bars.push({
          timestamp,
          open: ethers.parseEther(open.toString()).toString(),
          high: ethers.parseEther(open.toString()).toString(),
          low: ethers.parseEther(low.toString()).toString(),
          close: ethers.parseEther(close.toString()).toString(),
          volume: ethers.parseEther(volume.toString()).toString(),
        });

        // Increment time by the resolution interval
        // @ts-ignore
        timestamp += resolutionMultiplier[where?.candleSize];
      }

      return res(
        ctx.data({
          tokenCandles: bars.map<TokenCandle>((bar) => ({
            ...bar,
            __typename: 'TokenCandle',
            candleSize: where!.candleSize!,
            token: tokens[0],
            id: faker.string.uuid(),
          })),
        }),
      );
    },
  ),

  // GetTradingViewCandles
  graphql.query<{ tokenCandleSingleton: Query['tokenCandleSingleton'] }, QueryTokenCandleSingletonArgs>(
    GET_TRADING_VIEW_LATEST_CANDLE,
    (req, res, ctx) => {
      const { id } = req.variables;

      let open = Math.random() * 100 + 100; // Random value between 100 and 200
      let close = Math.random() * 100 + 100;
      let high = Math.max(open, close) + Math.random() * 10;
      let low = Math.min(open, close) - Math.random() * 10;
      let volume = Math.random() * 1000; // Random volume

      const randomCandle: TokenCandleSingleton = {
        id,
        __typename: 'TokenCandleSingleton',
        timestamp: Date.now(),
        token: tokens[0].address,
        candleSize: 60,
        open: ethers.parseEther(open.toString()).toString(),
        close: ethers.parseEther(close.toString()).toString(),
        high: ethers.parseEther(high.toString()).toString(),
        low: ethers.parseEther(low.toString()).toString(),
        volume: ethers.parseEther(volume.toString()).toString(),
      };

      return res(
        ctx.data({
          tokenCandleSingleton: randomCandle,
        }),
      );
    },
  ),

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

  // GetTroveManager
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

  // GetSystemInfo
  graphql.query<{ getSystemInfo: Query['getSystemInfo'] }>(GET_SYSTEMINFO, (req, res, ctx) => {
    const totalCollateralRatio = faker.number.float({ min: 0.9, max: 2.5, precision: 0.0001 });

    return res(
      ctx.data({
        getSystemInfo: {
          __typename: 'SystemInfo',
          id: faker.string.uuid(),
          recoveryModeActive: totalCollateralRatio < 1.5,
          totalCollateralRatio,
        },
      }),
    );
  }),
];
