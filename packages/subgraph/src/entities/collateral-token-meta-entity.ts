import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { StoragePool } from '../../generated/StoragePool/StoragePool';
import {
  CollateralTokenMeta,
  SystemInfo,
  TotalValueLockedAverage,
  TotalValueLockedChunk,
} from '../../generated/schema';

export function handleCreateUpdateCollateralTokenMeta(event: ethereum.Event, tokenAddress: Address): void {
  let collateralTokenMeta = CollateralTokenMeta.load(`CollateralTokenMeta-${tokenAddress.toHexString()}`);

  if (collateralTokenMeta === null) {
    collateralTokenMeta = new CollateralTokenMeta(`CollateralTokenMeta-${tokenAddress.toHexString()}`);
  }

  collateralTokenMeta.token = tokenAddress;
  collateralTokenMeta.timestamp = event.block.timestamp;

  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const storagePoolContract = StoragePool.bind(Address.fromBytes(systemInfo.storagePool));

  collateralTokenMeta.totalValueLockedUSD = storagePoolContract.getTokenTotalAmount(tokenAddress, true);

  // Load Avergae or intialise it
  let tvlAverage = TotalValueLockedAverage.load(`TotalValueLockedAverage-${tokenAddress.toHexString()}`);

  if (tvlAverage === null) {
    tvlAverage = new TotalValueLockedAverage(`TotalValueLockedAverage-${tokenAddress.toHexString()}`);
    tvlAverage.value = collateralTokenMeta.totalValueLockedUSD;
    tvlAverage.index = 0;

    // "TotalValueLockedChunk" + token + index
    const tvlAverageFirstChunk = new TotalValueLockedChunk(`TotalValueLockedChunk-${tokenAddress.toHexString()}-0`);
    tvlAverageFirstChunk.timestamp = event.block.timestamp;
    tvlAverageFirstChunk.value = collateralTokenMeta.totalValueLockedUSD;
    tvlAverageFirstChunk.save();
  } else {
    //  Add additional chunks the average has not been recalculated in the last 60 mins with last value (because there has been no update).
    let lastChunk = TotalValueLockedChunk.load(
      `TotalValueLockedChunk-${tokenAddress.toHexString()}-${tvlAverage.index.toString()}`,
    )!;
    let moreThanOneChunkOutdated = lastChunk.timestamp.lt(event.block.timestamp.minus(BigInt.fromI32(2 * 60 * 60)));

    while (moreThanOneChunkOutdated) {
      tvlAverage.index = tvlAverage.index + 1;
      const tvlAverageNewChunk = new TotalValueLockedChunk(
        `TotalValueLockedChunk-${tokenAddress.toHexString()}-${tvlAverage.index.toString()}`,
      );
      tvlAverageNewChunk.timestamp = lastChunk.timestamp.plus(BigInt.fromI32(60 * 60));
      tvlAverageNewChunk.value = lastChunk.value;
      tvlAverageNewChunk.save();

      lastChunk = tvlAverageNewChunk;
      moreThanOneChunkOutdated = lastChunk.timestamp.lt(event.block.timestamp.minus(BigInt.fromI32(2 * 60 * 60)));
    }

    // Add the last chunk.
    if (lastChunk.timestamp.lt(event.block.timestamp.minus(BigInt.fromI32(60 * 60)))) {
      // Add a new chunk anyway
      tvlAverage.index = tvlAverage.index + 1;

      const tvlAverageNewChunk = new TotalValueLockedChunk(
        `TotalValueLockedChunk-${tokenAddress.toHexString()}-${tvlAverage.index.toString()}`,
      );
      tvlAverageNewChunk.timestamp = lastChunk.timestamp.plus(BigInt.fromI32(60 * 60));
      tvlAverageNewChunk.value = collateralTokenMeta.totalValueLockedUSD;
      tvlAverageNewChunk.save();

      // recalculate average based on if its the first 30 days or not
      if (tvlAverage.index < 24 * 30) {
        tvlAverage.value = tvlAverage.value
          .div(BigInt.fromI32(tvlAverage.index - 1 / tvlAverage.index))
          .plus(tvlAverageNewChunk.value.div(BigInt.fromI32(tvlAverage.index)));
      } else {
        // Otherwise remove last chunk and add new chunk and recalculate average
        const dividedByChunks = BigInt.fromI32(30 * 24);
        tvlAverage.value = tvlAverage.value
          .plus(tvlAverageNewChunk.value.div(dividedByChunks))
          .minus(lastChunk.value.div(dividedByChunks));
      }
    }
  }

  tvlAverage.save();

  collateralTokenMeta.totalValueLockedUSD30dAverage = tvlAverage.id;
  collateralTokenMeta.save();
}
