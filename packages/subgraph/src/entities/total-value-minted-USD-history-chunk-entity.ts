import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { StoragePool } from '../../generated/StoragePool/StoragePool';
import { SystemInfo, TotalValueMintedUSDHistoryChunk } from '../../generated/schema';

const chunkSize = BigInt.fromI32(24 * 60 * 60); // 24 hours in seconds

export function handleCreateTotalValueMintedUSDHistoryChunk(event: ethereum.Event): void {
  const systemInfo = SystemInfo.load(`SystemInfo`)!;

  const currentIndex = systemInfo.totalValueMintedUSDHistoryIndex;

  let lastChunk = TotalValueMintedUSDHistoryChunk.load(`TotalValueMintedUSDHistoryChunk-${currentIndex.toString()}`);

  const storagePoolContract = StoragePool.bind(Address.fromBytes(systemInfo.storagePool));
  const systemMintedUSD = storagePoolContract.checkRecoveryMode1().getEntireSystemDebt();

  if (lastChunk === null) {
    lastChunk = new TotalValueMintedUSDHistoryChunk(`TotalValueMintedUSDHistoryChunk-0`);
    lastChunk.timestamp = event.block.timestamp;
    lastChunk.size = chunkSize.toI32();
    lastChunk.value = systemMintedUSD;
    lastChunk.save();
  } else {
    // check if last chunk is older that 1d
    if (lastChunk.timestamp.plus(chunkSize) < event.block.timestamp) {
      // FIXME: We disregard that we have to fill up complete chunk in between because the size is 24h

      // create new chunk and update index
      const newChunk = new TotalValueMintedUSDHistoryChunk(`TotalValueMintedUSDHistoryChunk-${currentIndex + 1}`);
      systemInfo.totalValueMintedUSDHistoryIndex = currentIndex + 1;
      systemInfo.save();

      newChunk.timestamp = lastChunk.timestamp.plus(chunkSize);
      newChunk.size = chunkSize.toI32();
      newChunk.value = systemMintedUSD;
      newChunk.save();
    } else if (lastChunk.value < systemMintedUSD) {
      // update tvl

      lastChunk.value = systemMintedUSD;
      lastChunk.save();
    }
  }
}
