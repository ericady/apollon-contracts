import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { SwapPair } from '../../generated/SwapPair/SwapPair';
import { Pool, PoolLiquidity, PoolVolume30d, PoolVolumeChunk } from '../../generated/schema';

// 15 minutes
const chunkSize = 15 * 60 * 1000;
const thirtyDays = BigInt.fromI32(30 * 24 * 60 * 60 * 1000);
const totalChunks = 30 * 24 * 4;

export function handleCreatePool(event: ethereum.Event, token0: Address, token1: Address): void {
  const poolEntity = new Pool(`Pool-${token0.toHexString()}-${token1.toHexString()}`);

  const swapPairContract = SwapPair.bind(event.address);
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
  poolVolume.index = 0;
  poolVolume.value = BigInt.fromI32(0);
  poolVolume.feeUSD = BigInt.fromI32(0);
  poolVolume.save();
  poolEntity.volume30dUSD = poolVolume.id;

  const poolVolume30dAgo = new PoolVolume30d(event.transaction.hash.concatI32(event.logIndex.toI32()));
  poolVolume30dAgo.index = 0;
  poolVolume30dAgo.value = BigInt.fromI32(0);
  poolVolume30dAgo.feeUSD = BigInt.fromI32(0);
  poolVolume30dAgo.save();
  poolEntity.volume30dUSD30dAgo = poolVolume30dAgo.id;

  //   Add first PoolChunk
  const poolVolumeChunk = new PoolVolumeChunk(`PoolVolumeChunk-${token0.toHexString()}-${token1.toHexString()}-0`);
  poolVolumeChunk.timestamp = event.block.timestamp;
  poolVolumeChunk.value = BigInt.fromI32(0);
  poolVolumeChunk.save();
}

export function handleUpdatePoolVolume(event: ethereum.Event, token0: Address, token1: Address, value: BigInt) {
  const poolEntity = Pool.load(`Pool-${token0.toHexString()}-${token1.toHexString()}`)!;

  //   load last VolumeChunk and check if its outdated
  const recentVolume = PoolVolume30d.load(poolEntity.volume30dUSD)!;
  const lastIndex = recentVolume.index;

  const lastVolumeChunk = PoolVolumeChunk.load(
    `PoolVolumeChunk-${token0.toHexString()}-${token1.toHexString()}-${lastIndex}`,
  )!;
  const isOutdated = lastVolumeChunk.timestamp.plus(thirtyDays).lt(BigInt.fromI32(Date.now()));

  if (isOutdated) {
    // create new chunk
    const newVolumeChunk = new PoolVolumeChunk(
      `PoolVolumeChunk-${token0.toHexString()}-${token1.toHexString()}-${lastIndex}`,
    )!;
    newVolumeChunk.timestamp = event.block.timestamp;
    newVolumeChunk.value = value;

    newVolumeChunk.save();

    // remove old chunk and add new chunk
    recentVolume.index = lastIndex + 1;
    recentVolume.value = recentVolume.value.minus(lastVolumeChunk.value).plus(value);
  } else {
    lastVolumeChunk.value = lastVolumeChunk.value.plus(value);
    lastVolumeChunk.save();

    recentVolume.value = recentVolume.value.minus(lastVolumeChunk.value).plus(value);
  }

  recentVolume.save();
}

export function handleUpdatePoolTotalSupply(event: ethereum.Event, token0: Address, token1: Address) {
  const poolEntity = Pool.load(`Pool-${token0.toHexString()}-${token1.toHexString()}`)!;

  const swapPairContract = SwapPair.bind(event.address);
  const totalSupply = swapPairContract.totalSupply();
  poolEntity.totalSupply = totalSupply;

  poolEntity.save();
}
