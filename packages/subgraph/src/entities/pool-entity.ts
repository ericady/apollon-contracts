import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { SwapPair } from '../../generated/SwapPair/SwapPair';
import { Pool, PoolLiquidity, PoolVolume30d, PoolVolumeChunk } from '../../generated/schema';
// import { log } from '@graphprotocol/graph-ts';

// 15 minutes
const chunkSize = 60;
const thirtyDays = BigInt.fromI32(30 * 24 * 60 * 60);
const totalChunks = 30 * 24;

export function handleCreatePool(event: ethereum.Event, token0: Address, token1: Address, swapPair: Address): void {
  const poolEntity = new Pool(`Pool-${token0.toHexString()}-${token1.toHexString()}`);
  poolEntity.address = swapPair;

  const swapPairContract = SwapPair.bind(swapPair);
  const reserves = swapPairContract.getReserves();

  const liquidity0 = new PoolLiquidity(token0.concat(token1));
  liquidity0.token = token0;
  liquidity0.totalAmount = reserves.value0;
  liquidity0.save();

  const liquidity1 = new PoolLiquidity(token1.concat(token0));
  liquidity1.token = token1;
  liquidity1.totalAmount = reserves.value1;
  liquidity1.save();

  poolEntity.liquidity = [liquidity0.id, liquidity1.id];

  const totalSupply = swapPairContract.totalSupply();
  poolEntity.totalSupply = totalSupply;
  poolEntity.liquidityDepositAPY = BigInt.fromI32(0);

  //   Aggregator for recent Volume
  const poolVolume = new PoolVolume30d(event.transaction.hash.concatI32(event.logIndex.toI32()));
  poolVolume.lastIndex = 0;
  poolVolume.leadingIndex = 0;
  poolVolume.value = BigInt.fromI32(0);
  poolVolume.feeUSD = BigInt.fromI32(0);
  poolVolume.save();
  poolEntity.volume30dUSD = poolVolume.id;

  const poolVolume30dAgo = new PoolVolume30d(event.transaction.hash.concatI32(event.logIndex.toI32()));
  poolVolume30dAgo.lastIndex = 0;
  poolVolume30dAgo.leadingIndex = 0;
  poolVolume30dAgo.value = BigInt.fromI32(0);
  poolVolume30dAgo.feeUSD = BigInt.fromI32(0);
  poolVolume30dAgo.save();
  poolEntity.volume30dUSD30dAgo = poolVolume30dAgo.id;

  //   Add first PoolChunk
  const poolVolumeChunk = new PoolVolumeChunk(`PoolVolumeChunk-${token0.toHexString()}-${token1.toHexString()}-0`);
  poolVolumeChunk.timestamp = event.block.timestamp;
  poolVolumeChunk.value = BigInt.fromI32(0);
  poolVolumeChunk.save();

  poolEntity.save();
}

export function handleUpdatePool_volume30dUSD(
  event: ethereum.Event,
  token0: Address,
  token1: Address,
  value: BigInt,
): void {
  const poolEntity = Pool.load(`Pool-${token0.toHexString()}-${token1.toHexString()}`)!;

  //   load last VolumeChunk and check if its outdated
  const recentVolume = PoolVolume30d.load(poolEntity.volume30dUSD)!;

  const leadingVolumeChunk = PoolVolumeChunk.load(
    `PoolVolumeChunk-${token0.toHexString()}-${token1.toHexString()}-${recentVolume.leadingIndex}`,
  )!;
  const leadingChunkIsOutdated = leadingVolumeChunk.timestamp.plus(BigInt.fromI32(chunkSize)).lt(event.block.timestamp);

  // create a new chunk
  if (leadingChunkIsOutdated) {
    const newVolumeChunk = new PoolVolumeChunk(
      `PoolVolumeChunk-${token0.toHexString()}-${token1.toHexString()}-${recentVolume.leadingIndex + 1}`,
    )!;
    // increase timestamp by exactly chunksize
    newVolumeChunk.timestamp = leadingVolumeChunk.timestamp.plus(BigInt.fromI32(chunkSize));
    newVolumeChunk.value = value;
    newVolumeChunk.save();

    recentVolume.leadingIndex += 1;
  } else {
    // just add it to the leading chunk
    leadingVolumeChunk.value = leadingVolumeChunk.value.plus(value);
    leadingVolumeChunk.save();
  }

  // add new volume
  recentVolume.value = recentVolume.value.plus(value);

  const lastVolumeChunk = PoolVolumeChunk.load(
    `PoolVolumeChunk-${token0.toHexString()}-${token1.toHexString()}-${recentVolume.lastIndex}`,
  )!;
  const lastChunkIsOutdated = lastVolumeChunk.timestamp.plus(thirtyDays).lt(event.block.timestamp);
  if (lastChunkIsOutdated) {
    recentVolume.value = recentVolume.value.minus(lastVolumeChunk.value);
    recentVolume.lastIndex += 1;

    const volume30DaysAgo = PoolVolume30d.load(poolEntity.volume30dUSD30dAgo)!;

    // add new chunk that is just older than 30 days
    volume30DaysAgo.leadingIndex += 1;
    volume30DaysAgo.value = volume30DaysAgo.value.plus(lastVolumeChunk.value);

    // remove chunk that is older than 60 days
    const lastVolumeChunk30DaysAgo = PoolVolumeChunk.load(
      `PoolVolumeChunk-${token0.toHexString()}-${token1.toHexString()}-${volume30DaysAgo.lastIndex}`,
    )!;
    const lastChunkIsOutdated = lastVolumeChunk30DaysAgo.timestamp
      .plus(thirtyDays.times(BigInt.fromI32(2)))
      .lt(event.block.timestamp);
    if (lastChunkIsOutdated) {
      volume30DaysAgo.value = volume30DaysAgo.value.minus(lastVolumeChunk30DaysAgo.value);
      volume30DaysAgo.lastIndex += 1;
    }

    volume30DaysAgo.save();
  }

  recentVolume.save();
}

export function handleUpdatePool_totalSupply(event: ethereum.Event, token0: Address, token1: Address): void {
  const poolEntity = Pool.load(`Pool-${token0.toHexString()}-${token1.toHexString()}`)!;

  const swapPairContract = SwapPair.bind(event.address);
  const totalSupply = swapPairContract.totalSupply();
  poolEntity.totalSupply = totalSupply;

  poolEntity.save();
}

export function handleUpdateLiquidity_totalAmount(
  event: ethereum.Event,
  token0: Address,
  token1: Address,
  reserve0: BigInt,
  reserve1: BigInt,
): void {
  const liquidity0 = PoolLiquidity.load(token0.concat(token1))!;
  liquidity0.totalAmount = reserve0;
  liquidity0.save();

  const liquidity1 = PoolLiquidity.load(token1.concat(token0))!;
  liquidity1.totalAmount = reserve1;
  liquidity1.save();
}
