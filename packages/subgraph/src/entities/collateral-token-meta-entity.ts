import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { ReservePool } from '../../generated/ReservePool/ReservePool';
import { StoragePool } from '../../generated/StoragePool/StoragePool';
import {
  CollateralTokenMeta,
  SystemInfo,
  TotalReserveAverage,
  TotalReserveAverageChunk,
  TotalValueLockedAverage,
  TotalValueLockedChunk,
} from '../../generated/schema';
// import { log } from '@graphprotocol/graph-ts';

export function handleCreateUpdateCollateralTokenMeta(
  event: ethereum.Event,
  tokenAddress: Address,
  govReserveCap: BigInt | null = null,
): void {
  let collateralTokenMeta = CollateralTokenMeta.load(`CollateralTokenMeta-${tokenAddress.toHexString()}`);

  if (collateralTokenMeta === null) {
    collateralTokenMeta = new CollateralTokenMeta(`CollateralTokenMeta-${tokenAddress.toHexString()}`);
    createCollateralTokenMeta_totalReserve30dAverage(event, tokenAddress);
  }

  collateralTokenMeta.token = tokenAddress;
  collateralTokenMeta.timestamp = event.block.timestamp;

  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const storagePoolContract = StoragePool.bind(Address.fromBytes(systemInfo.storagePool));
  const govToken = Address.fromBytes(systemInfo.govToken);

  if (tokenAddress == govToken) {
    const reservePoolContract = ReservePool.bind(Address.fromBytes(systemInfo.reservePool));

    if (govReserveCap === null) {
      const try_govReserveCap = reservePoolContract.try_govReserveCap();
      collateralTokenMeta.totalReserve = try_govReserveCap.reverted ? BigInt.fromI32(0) : try_govReserveCap.value;
    } else {
      collateralTokenMeta.totalReserve = govReserveCap;
    }
    collateralTokenMeta.totalReserve30dAverage = `TotalReserveAverage-${tokenAddress.toHexString()}`;
  } else {
    collateralTokenMeta.totalReserve = BigInt.fromI32(0);
  }

  // FIXME: Should not be optional but coll Token only exists in storage pool after trove has been opened.
  const tryTotalAmount = storagePoolContract.try_getTokenTotalAmount(tokenAddress, true);

  collateralTokenMeta.totalValueLockedUSD = tryTotalAmount.reverted ? BigInt.fromI32(0) : tryTotalAmount.value;

  collateralTokenMeta.totalValueLockedUSD30dAverage = `TotalValueLockedAverage-${tokenAddress.toHexString()}`;
  collateralTokenMeta.save();
}

export const handleCreateCollateralTokenMeta_totalValueLockedUSD30dAverage = (
  event: ethereum.Event,
  tokenAddress: Address,
): void => {
  const collateralTokenMeta = CollateralTokenMeta.load(`CollateralTokenMeta-${tokenAddress.toHexString()}`)!;

  const tvlAverage = new TotalValueLockedAverage(`TotalValueLockedAverage-${tokenAddress.toHexString()}`);
  tvlAverage.value = collateralTokenMeta.totalValueLockedUSD;
  tvlAverage.index = 0;
  tvlAverage.save();

  // "TotalValueLockedChunk" + token + index
  const tvlAverageFirstChunk = new TotalValueLockedChunk(`TotalValueLockedChunk-${tokenAddress.toHexString()}-0`);
  tvlAverageFirstChunk.timestamp = event.block.timestamp;
  tvlAverageFirstChunk.value = collateralTokenMeta.totalValueLockedUSD;
  tvlAverageFirstChunk.save();
};

export const handleUpdateCollateralTokenMeta_totalValueLockedUSD30dAverage = (
  event: ethereum.Event,
  tokenAddress: Address,
  collateralTokenMeta: CollateralTokenMeta | null = null,
): void => {
  if (collateralTokenMeta === null) {
    collateralTokenMeta = CollateralTokenMeta.load(`CollateralTokenMeta-${tokenAddress.toHexString()}`)!;
  }

  // Load Avergae or intialise it
  const tvlAverage = TotalValueLockedAverage.load(`TotalValueLockedAverage-${tokenAddress.toHexString()}`)!;
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

  tvlAverage.save();
};

function createCollateralTokenMeta_totalReserve30dAverage(event: ethereum.Event, tokenAddress: Address): void {
  const totalReserveAverage = new TotalReserveAverage(`TotalReserveAverage-${tokenAddress.toHexString()}`);
  totalReserveAverage.value = BigInt.fromI32(0);
  totalReserveAverage.index = 1;
  totalReserveAverage.save();

  // "TotalReserveAverageChunk" + token + index
  const totalReserveAverageFirstChunk = new TotalReserveAverageChunk(
    `TotalReserveAverageChunk-${tokenAddress.toHexString()}-1`,
  );
  totalReserveAverageFirstChunk.timestamp = event.block.timestamp;
  totalReserveAverageFirstChunk.value = BigInt.fromI32(0);
  totalReserveAverageFirstChunk.save();
}

export const handleUpdateCollateralTokenMeta_totalReserve30dAverage = (
  event: ethereum.Event,
  tokenAddress: Address,
  totalReserve: BigInt,
): void => {
  // Load Avergae or intialise it
  const totalReserveAverage = TotalReserveAverage.load(`TotalReserveAverage-${tokenAddress.toHexString()}`)!;

  //  Add additional chunks the average has not been recalculated in the last 60 mins with last value (because there has been no update).
  let lastChunk = TotalReserveAverageChunk.load(
    `TotalReserveAverageChunk-${tokenAddress.toHexString()}-${totalReserveAverage.index.toString()}`,
  )!;
  let moreThanOneChunkOutdated = lastChunk.timestamp.lt(event.block.timestamp.minus(BigInt.fromI32(2 * 60 * 60)));

  while (moreThanOneChunkOutdated) {
    totalReserveAverage.index = totalReserveAverage.index + 1;
    const totalReserveAverageNewChunk = new TotalReserveAverageChunk(
      `TotalReserveAverageChunk-${tokenAddress.toHexString()}-${totalReserveAverage.index.toString()}`,
    );
    totalReserveAverageNewChunk.timestamp = lastChunk.timestamp.plus(BigInt.fromI32(60 * 60));
    totalReserveAverageNewChunk.value = lastChunk.value;
    totalReserveAverageNewChunk.save();

    lastChunk = totalReserveAverageNewChunk;
    moreThanOneChunkOutdated = lastChunk.timestamp.lt(event.block.timestamp.minus(BigInt.fromI32(2 * 60 * 60)));
  }

  // Add the last chunk.
  if (lastChunk.timestamp.lt(event.block.timestamp.minus(BigInt.fromI32(60 * 60)))) {
    // Add a new chunk anyway
    totalReserveAverage.index = totalReserveAverage.index + 1;

    const totalReserveAverageNewChunk = new TotalReserveAverageChunk(
      `TotalReserveAverageChunk-${tokenAddress.toHexString()}-${totalReserveAverage.index.toString()}`,
    );
    totalReserveAverageNewChunk.timestamp = lastChunk.timestamp.plus(BigInt.fromI32(60 * 60));
    totalReserveAverageNewChunk.value = totalReserve;
    totalReserveAverageNewChunk.save();

    // recalculate average based on if its the first 30 days or not
    if (totalReserveAverage.index < 24 * 30) {
      totalReserveAverage.value = totalReserveAverage.value
        .div(BigInt.fromI32(totalReserveAverage.index - 1 / totalReserveAverage.index))
        .plus(totalReserveAverageNewChunk.value.div(BigInt.fromI32(totalReserveAverage.index)));
    } else {
      // Otherwise remove last chunk and add new chunk and recalculate average
      const dividedByChunks = BigInt.fromI32(30 * 24);
      totalReserveAverage.value = totalReserveAverage.value
        .plus(totalReserveAverageNewChunk.value.div(dividedByChunks))
        .minus(lastChunk.value.div(dividedByChunks));
    }
  }

  totalReserveAverage.save();
};
