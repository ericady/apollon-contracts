import { Address, BigInt, Int8, ethereum } from '@graphprotocol/graph-ts';
import { DebtToken } from '../../generated/DebtToken/DebtToken';
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
  token: { pairPosition: number; address: Address },
): BigInt {
  for (let i = 0; i < CandleSizes.length; i++) {
    const candleSingleton = TokenCandleSingleton.load(
      `TokenCandleSingleton-${token.address.toHexString()}-${CandleSizes[i].toString()}`,
    )!;

    if (candleSingleton.timestamp.plus(BigInt.fromI32(CandleSizes[i] * 1000)) < event.block.timestamp) {
      return handleCloseCandle(event, swapPair, token, CandleSizes[i]);
    } else {
      // calculate price from ratio to stable and oraclePrice
      const systemInfo = SystemInfo.load(`SystemInfo`)!;
      const stableCoinContract = DebtToken.bind(systemInfo.stableCoin);
      const stablePrice = stableCoinContract.getPrice();
      const swapPairReserves = SwapPair.bind(swapPair).getReserves();
      const tokenPriceInStable =
        token.pairPosition === 0
          ? swapPairReserves.get_reserve0().div(swapPairReserves.get_reserve1())
          : swapPairReserves.get_reserve1().div(swapPairReserves.get_reserve0());
      const tokenPriceUSD = tokenPriceInStable.times(stablePrice);

      if (candleSingleton.low.gt(tokenPriceUSD)) {
        candleSingleton.low = tokenPriceUSD;
      } else if (candleSingleton.high.lt(tokenPriceUSD)) {
        candleSingleton.high = tokenPriceUSD;
      }

      candleSingleton.save();

      return tokenPriceUSD;
    }
  }
}

/**
 * Updates the Singleton and creates new Candles if candle is closed
 */
export function handleUpdateTokenCandle_volume(
  event: ethereum.Event,
  swapPair: Address,
  token: { pairPosition: number; address: Address },
  additionalTradeVolume: BigInt,
): void {
  for (let i = 0; i < CandleSizes.length; i++) {
    const candleSingleton = TokenCandleSingleton.load(
      `TokenCandleSingleton-${token.address.toHexString()}-${CandleSizes[i].toString()}`,
    )!;

    if (candleSingleton.timestamp.plus(BigInt.fromI32(CandleSizes[i] * 1000)) < event.block.timestamp) {
      handleCloseCandle(event, swapPair, token, CandleSizes[i], additionalTradeVolume);
    } else {
      candleSingleton.volume = candleSingleton.volume.plus(additionalTradeVolume);
      candleSingleton.save();
    }
  }
}

export function handleCloseCandle(
  event: ethereum.Event,
  swapPair: Address,
  token: { pairPosition: number; address: Address },
  candleSize: Int8,
  initialTradeVolume?: BigInt,
): BigInt {
  const candleSingleton = TokenCandleSingleton.load(
    `TokenCandleSingleton-${token.address.toHexString()}-${candleSize.toString()}`,
  )!;

  // calculate price from ratio to stable and oraclePrice
  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const stableCoinContract = DebtToken.bind(systemInfo.stableCoin);
  const stablePrice = stableCoinContract.getPrice();
  const swapPairReserves = SwapPair.bind(swapPair).getReserves();
  const tokenPriceInStable =
    token.pairPosition === 0
      ? swapPairReserves.get_reserve0().div(swapPairReserves.get_reserve1())
      : swapPairReserves.get_reserve1().div(swapPairReserves.get_reserve0());
  const tokenPriceUSD = tokenPriceInStable.times(stablePrice);

  // Save away new closed candle
  const newClosedCandle = new TokenCandle(event.transaction.hash.concatI32(event.logIndex.toI32()));
  newClosedCandle.token = token.address;
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
  candleSingleton.volume = initialTradeVolume ? initialTradeVolume : BigInt.fromI32(0);

  candleSingleton.save();

  return tokenPriceUSD;
}
