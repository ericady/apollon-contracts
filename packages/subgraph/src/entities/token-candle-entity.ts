import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { DebtToken } from '../../generated/DebtToken_STABLE/DebtToken';
import { SwapPair } from '../../generated/SwapPair/SwapPair';
import { SystemInfo, TokenCandle, TokenCandleSingleton } from '../../generated/schema';

// 1min, 10min, 1hour, 6hour, 1day, 1week
const CandleSizes = [1, 10, 60, 360, 1440, 10080];

/**
 * Initializes the Singleton once for a new Token
 */
export function handleCreateTokenCandleSingleton(event: ethereum.Event, tokenAddress: Address): void {
  let candleSingleton: TokenCandleSingleton | null;
  // TODO: How to get initialized price?
  const tokenPrice = BigInt.fromI64(0);

  for (let i = 0; i < CandleSizes.length; i++) {
    candleSingleton = TokenCandleSingleton.load(
      `TokenCandleSingleton-${tokenAddress.toHexString()}-${CandleSizes[i].toString()}`,
    );

    if (!candleSingleton) {
      candleSingleton = new TokenCandleSingleton(
        `TokenCandleSingleton-${tokenAddress.toHexString()}-${CandleSizes[i].toString()}`,
      );

      candleSingleton.token = tokenAddress;
      candleSingleton.candleSize = CandleSizes[i];
      candleSingleton.timestamp = event.block.timestamp;
      candleSingleton.open = tokenPrice;
      candleSingleton.high = tokenPrice;
      candleSingleton.low = tokenPrice;
      candleSingleton.close = BigInt.fromI32(0);
      candleSingleton.volume = BigInt.fromI32(0);

      candleSingleton.save();
    }
  }
}

/**
 * Updates the Singleton and creates new Candles if candle is closed
 */
export function handleUpdateTokenCandle_low_high(
  event: ethereum.Event,
  swapPair: Address,
  pairPosition: number,
  pairToken: Address,
): BigInt {
  // calculate price from ratio to stable and oraclePrice
  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const stableCoinContract = DebtToken.bind(systemInfo.stableCoin as Address);
  const stablePrice = stableCoinContract.getPrice();
  const swapPairReserves = SwapPair.bind(swapPair).getReserves();
  const tokenPriceInStable =
    pairPosition === 0
      ? swapPairReserves.get_reserve0().div(swapPairReserves.get_reserve1())
      : swapPairReserves.get_reserve1().div(swapPairReserves.get_reserve0());
  const tokenPriceUSD = tokenPriceInStable.times(stablePrice);

  for (let i = 0; i < CandleSizes.length; i++) {
    const candleSingleton = TokenCandleSingleton.load(
      `TokenCandleSingleton-${swapPair.toHexString()}-${CandleSizes[i].toString()}`,
    )!;

    if (candleSingleton.timestamp.plus(BigInt.fromI32(CandleSizes[i] * 60)) < event.block.timestamp) {
      handleCloseCandle(event, pairToken, CandleSizes[i], tokenPriceUSD);
    } else {
      if (candleSingleton.low.gt(tokenPriceUSD)) {
        candleSingleton.low = tokenPriceUSD;
      } else if (candleSingleton.high.lt(tokenPriceUSD)) {
        candleSingleton.high = tokenPriceUSD;
      }

      candleSingleton.save();
    }
  }

  return tokenPriceUSD;
}

/**
 * Updates the Singleton and creates new Candles if candle is closed
 */
export function handleUpdateTokenCandle_volume(
  event: ethereum.Event,
  swapPair: Address,
  pairPosition: number,
  pairToken: Address,
  additionalTradeVolume: BigInt,
): void {
  // calculate price from ratio to stable and oraclePrice
  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const stableCoinContract = DebtToken.bind(systemInfo.stableCoin as Address);
  const stablePrice = stableCoinContract.getPrice();
  const swapPairReserves = SwapPair.bind(swapPair).getReserves();
  const tokenPriceInStable =
    pairPosition === 0
      ? swapPairReserves.get_reserve0().div(swapPairReserves.get_reserve1())
      : swapPairReserves.get_reserve1().div(swapPairReserves.get_reserve0());
  const tokenPriceUSD = tokenPriceInStable.times(stablePrice);

  for (let i = 0; i < CandleSizes.length; i++) {
    const candleSingleton = TokenCandleSingleton.load(
      `TokenCandleSingleton-${pairToken.toHexString()}-${CandleSizes[i].toString()}`,
    )!;

    if (candleSingleton.timestamp.plus(BigInt.fromI32(CandleSizes[i] * 60)) < event.block.timestamp) {
      handleCloseCandle(event, pairToken, CandleSizes[i], tokenPriceUSD, additionalTradeVolume);
    } else {
      candleSingleton.volume = candleSingleton.volume.plus(additionalTradeVolume);
      candleSingleton.save();
    }
  }
}

export function handleCloseCandle(
  event: ethereum.Event,
  pairToken: Address,
  candleSize: i32,
  tokenPriceUSD: BigInt,
  initialTradeVolume: BigInt = BigInt.fromI32(0),
): void {
  const candleSingleton = TokenCandleSingleton.load(
    `TokenCandleSingleton-${pairToken.toHexString()}-${candleSize.toString()}`,
  )!;

  // Save away new closed candle
  const newClosedCandle = new TokenCandle(event.transaction.hash.concatI32(event.logIndex.toI32()));
  newClosedCandle.token = pairToken;
  newClosedCandle.candleSize = candleSize;
  newClosedCandle.timestamp = candleSingleton.timestamp;
  newClosedCandle.open = candleSingleton.open;
  newClosedCandle.high = candleSingleton.high;
  newClosedCandle.low = candleSingleton.low;
  newClosedCandle.close = tokenPriceUSD;
  newClosedCandle.volume = candleSingleton.volume;
  newClosedCandle.save();

  // Prepare new candle to be populated
  candleSingleton.timestamp = event.block.timestamp;
  candleSingleton.open = tokenPriceUSD;
  candleSingleton.high = tokenPriceUSD;
  candleSingleton.low = tokenPriceUSD;
  candleSingleton.close = BigInt.fromI32(0);
  candleSingleton.volume = initialTradeVolume;

  candleSingleton.save();
}
