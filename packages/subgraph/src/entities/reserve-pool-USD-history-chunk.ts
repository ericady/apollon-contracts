import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { PriceFeed } from '../../generated/PriceFeed/PriceFeed';
import { ReservePool } from '../../generated/ReservePool/ReservePool';
import { ReservePoolUSDHistoryChunk, SystemInfo } from '../../generated/schema';
import { DebtToken } from '../../generated/templates/DebtTokenTemplate/DebtToken';

const chunkSize = BigInt.fromI32(24 * 60 * 60); // 24 hours in seconds

/**
 * We only have 2 tokens with reserves. The stable and the gov token.
 */
export function handleCreateReservePoolUSDHistoryChunk(event: ethereum.Event, reservePoolAddress: Address): void {
  const systemInfo = SystemInfo.load(`SystemInfo`)!;

  const currentIndex = systemInfo.reservePoolUSDHistoryIndex;
  const stableCoin = Address.fromBytes(systemInfo.stableCoin);
  const govToken = Address.fromBytes(systemInfo.govToken);

  let lastChunk = ReservePoolUSDHistoryChunk.load(`ReservePoolUSDHistoryChunk-${currentIndex.toString()}`);

  const priceFeedContract = PriceFeed.bind(Address.fromBytes(systemInfo.priceFeed));
  const govTokenAmount = ReservePool.bind(reservePoolAddress).govReserveCap();
  const govTokenPriceUSD = priceFeedContract.getUSDValue2(govToken, govTokenAmount);
  const stableCoinAmount = DebtToken.bind(stableCoin).balanceOf(reservePoolAddress);
  const stableCoinPriceUSD = priceFeedContract.getUSDValue2(stableCoin, stableCoinAmount);
  const totalValueReservesUSD = govTokenPriceUSD.plus(stableCoinPriceUSD);

  if (lastChunk === null) {
    lastChunk = new ReservePoolUSDHistoryChunk(`ReservePoolUSDHistoryChunk-0`);
    lastChunk.timestamp = event.block.timestamp;
    lastChunk.size = chunkSize.toI32();
    lastChunk.value = totalValueReservesUSD;
    lastChunk.save();
  } else {
    // check if last chunk is older that 1d
    if (lastChunk.timestamp.plus(chunkSize) < event.block.timestamp) {
      // FIXME: We disregard that we have to fill up complete chunk in between because the size is 24h

      // create new chunk and update index
      const newChunk = new ReservePoolUSDHistoryChunk(`ReservePoolUSDHistoryChunk-${currentIndex + 1}`);
      systemInfo.reservePoolUSDHistoryIndex = currentIndex + 1;
      systemInfo.save();

      newChunk.timestamp = lastChunk!.timestamp.plus(chunkSize);
      newChunk.size = chunkSize.toI32();
      newChunk.value = totalValueReservesUSD;
      newChunk.save();
    } else {
      // update tvl

      lastChunk.value = totalValueReservesUSD;
      lastChunk.save();
    }
  }
}
