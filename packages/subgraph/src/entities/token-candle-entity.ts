import { Address, BigInt, Int8, ethereum } from '@graphprotocol/graph-ts';
import { DebtToken } from '../../generated/DebtToken/DebtToken';
import { TokenCandle, TokenCandleSingleton } from '../../generated/schema';

const CandleSizes = [1, 5, 15, 30, 60, 240, 1440];

/**
 * Initializes the Singleton once for a new Token
 */
export function handleCreateTokenCandleSingleton(event: ethereum.Event, tokenAddress: Address): void {
  let candleSingleton: TokenCandleSingleton | null;
  const debtTokenContract = DebtToken.bind(tokenAddress);
  const tokenPrice = debtTokenContract.getPrice();

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
      // TODO: Implement with swap pools
      candleSingleton.volume = BigInt.fromI32(0);

      candleSingleton.save();
    }
  }
}

/**
 * Updates the Singleton and creates new Candles if candle is closed
 */
export function handleUpdateTokenCandle_low_high(event: ethereum.Event, tokenAddress: Address): void {
  for (let i = 0; i < CandleSizes.length; i++) {
    const candleSingleton = TokenCandleSingleton.load(
      `TokenCandleSingleton-${tokenAddress.toHexString()}-${CandleSizes[i].toString()}`,
    )!;

    if (candleSingleton.timestamp.plus(BigInt.fromI32(CandleSizes[i] * 1000)) < event.block.timestamp) {
      handleCloseCandle(event, tokenAddress, CandleSizes[i]);
    } else {
      const debtTokenContract = DebtToken.bind(tokenAddress);
      const tokenPrice = debtTokenContract.getPrice();

      if (candleSingleton.low.gt(tokenPrice)) {
        candleSingleton.low = tokenPrice;
      } else if (candleSingleton.high.lt(tokenPrice)) {
        candleSingleton.high = tokenPrice;
      }

      candleSingleton.save();
    }
  }
}

/**
 * Updates the Singleton and creates new Candles if candle is closed
 */
export function handleUpdateTokenCandle_volume(
  event: ethereum.Event,
  tokenAddress: Address,
  tradeVolume: BigInt,
): void {
  for (let i = 0; i < CandleSizes.length; i++) {
    const candleSingleton = TokenCandleSingleton.load(
      `TokenCandleSingleton-${tokenAddress.toHexString()}-${CandleSizes[i].toString()}`,
    )!;

    if (candleSingleton.timestamp.plus(BigInt.fromI32(CandleSizes[i] * 1000)) < event.block.timestamp) {
      handleCloseCandle(event, tokenAddress, CandleSizes[i], tradeVolume);
    } else {
      candleSingleton.volume = candleSingleton.volume.plus(tradeVolume);
      candleSingleton.save();
    }
  }
}

export function handleCloseCandle(
  event: ethereum.Event,
  tokenAddress: Address,
  candleSize: Int8,
  tradeVolume?: BigInt,
): void {
  const candleSingleton = TokenCandleSingleton.load(
    `TokenCandleSingleton-${tokenAddress.toHexString()}-${candleSize.toString()}`,
  )!;

  const debtTokenContract = DebtToken.bind(tokenAddress);
  const tokenPrice = debtTokenContract.getPrice();

  // Save away new closed candle
  const newClosedCandle = new TokenCandle(event.transaction.hash.concatI32(event.logIndex.toI32()));
  newClosedCandle.token = tokenAddress;
  newClosedCandle.candleSize = candleSize;
  newClosedCandle.timestamp = candleSingleton.timestamp;
  newClosedCandle.open = candleSingleton.open;
  newClosedCandle.high = candleSingleton.high;
  newClosedCandle.low = candleSingleton.low;
  newClosedCandle.close = tokenPrice;
  newClosedCandle.volume = candleSingleton.volume;
  newClosedCandle.save();

  // Prepare new candle to be populated
  candleSingleton.timestamp = event.block.timestamp;
  candleSingleton.open = tokenPrice;
  candleSingleton.high = tokenPrice;
  candleSingleton.low = tokenPrice;
  candleSingleton.close = BigInt.fromI32(0);
  candleSingleton.volume = tradeVolume ? tradeVolume : BigInt.fromI32(0);

  candleSingleton.save();
}
