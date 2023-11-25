import { Address, Int8 } from '@graphprotocol/graph-ts';

/**
 * Updates the Singleton and creates new Candles if candle is closed
 */
export function handleUpdateTokenCandle(tokenAddress: Address): void {
  //   # "TokenCandleSingleton" + token + candleSize
  //   calls different handleCloseCandle functions with most efficient logic
}

export function handleCloseCandle(tokenAddress: Address, candleSize: Int8): void {}
