import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { PriceFeed } from '../../generated/PriceFeed/PriceFeed';
import { StabilityPoolManager } from '../../generated/StabilityPoolManager/StabilityPoolManager';
import {
  DebtTokenMeta,
  StabilityDepositAPY,
  StabilityDepositChunk,
  SystemInfo,
  TotalReserveAverage,
  TotalReserveAverageChunk,
  TotalSupplyAverage,
  TotalSupplyAverageChunk,
} from '../../generated/schema';
import { DebtToken } from '../../generated/templates/DebtTokenTemplate/DebtToken';
import {
  StabilityOffsetAddedGainsStruct,
  StabilityPool,
} from '../../generated/templates/StabilityPoolTemplate/StabilityPool';
// import { log } from '@graphprotocol/graph-ts';

export function handleCreateUpdateDebtTokenMeta(event: ethereum.Event, tokenAddress: Address): void {
  let debtTokenMeta = DebtTokenMeta.load(`DebtTokenMeta-${tokenAddress.toHexString()}`);
  const systemInfo = SystemInfo.load(`SystemInfo`)!;

  if (debtTokenMeta === null) {
    debtTokenMeta = new DebtTokenMeta(`DebtTokenMeta-${tokenAddress.toHexString()}`);
    createDebtTokenMeta_stabilityDepositAPY_totalReserve30dAverage_totalSupply30dAverage(event, tokenAddress);
  }

  const tokenContract = DebtToken.bind(tokenAddress);
  // FIXME: I need to add them all to the network.json
  // const stabilityManagerAddress = Address.fromString("0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9");

  debtTokenMeta.token = tokenAddress;
  debtTokenMeta.timestamp = event.block.timestamp;

  const totalSupply = tokenContract.totalSupply();
  const priceFeedContract = PriceFeed.bind(Address.fromBytes(systemInfo.priceFeed));
  const tokenPrice = priceFeedContract.getPrice(tokenAddress).getPrice();

  debtTokenMeta.totalSupplyUSD = totalSupply.times(tokenPrice).div(BigInt.fromI32(10).pow(18));

  const stableCoin = Address.fromBytes(systemInfo.stableCoin);

  if (tokenAddress == stableCoin) {
    debtTokenMeta.totalReserve = tokenContract.balanceOf(Address.fromBytes(systemInfo.reservePool));
  } else {
    debtTokenMeta.totalReserve = BigInt.fromI32(0);
  }

  const stabilityPoolManagerContract = StabilityPoolManager.bind(Address.fromBytes(systemInfo.stabilityPoolManager));
  const stabilityPool = stabilityPoolManagerContract.getStabilityPool(tokenAddress);

  const debtTokenStabilityPool = StabilityPool.bind(stabilityPool);
  debtTokenMeta.totalDepositedStability = debtTokenStabilityPool.getTotalDeposit();

  // Just link average but update them atomically.
  debtTokenMeta.stabilityDepositAPY = `StabilityDepositAPY-${tokenAddress.toHexString()}`;
  debtTokenMeta.totalSupplyUSD30dAverage = `TotalSupplyAverage-${tokenAddress.toHexString()}`;

  if (tokenAddress == stableCoin) {
    debtTokenMeta.totalReserve30dAverage = `TotalReserveAverage-${tokenAddress.toHexString()}`;
  }

  debtTokenMeta.save();
}

function createDebtTokenMeta_stabilityDepositAPY_totalReserve30dAverage_totalSupply30dAverage(
  event: ethereum.Event,
  tokenAddress: Address,
): void {
  // create new chunk
  const firstStabilityDepositChunk = new StabilityDepositChunk(`StabilityDepositChunk-${tokenAddress.toHexString()}-1`);
  firstStabilityDepositChunk.timestamp = event.block.timestamp;
  firstStabilityDepositChunk.profit = BigInt.fromI32(0);
  firstStabilityDepositChunk.volume = BigInt.fromI32(0);
  firstStabilityDepositChunk.save();

  // create new APY
  const stabilityDepositAPYEntity = new StabilityDepositAPY(`StabilityDepositAPY-${tokenAddress.toHexString()}`);
  stabilityDepositAPYEntity.index = 1;
  stabilityDepositAPYEntity.profit = BigInt.fromI32(0);
  stabilityDepositAPYEntity.volume = BigInt.fromI32(0);
  stabilityDepositAPYEntity.save();

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

  const totalSupplyAverage = new TotalSupplyAverage(`TotalSupplyAverage-${tokenAddress.toHexString()}`);
  totalSupplyAverage.value = BigInt.fromI32(0);
  totalSupplyAverage.index = 1;
  totalSupplyAverage.save();

  // "TotalSupplyAverageChunk" + token + index
  const totalSupplyAverageFirstChunk = new TotalSupplyAverageChunk(
    `TotalSupplyAverageChunk-${tokenAddress.toHexString()}-1`,
  );
  totalSupplyAverageFirstChunk.timestamp = event.block.timestamp;
  totalSupplyAverageFirstChunk.value = BigInt.fromI32(0);
  totalSupplyAverageFirstChunk.save();
}

export function handleUpdateDebtTokenMeta_stabilityDepositAPY(
  event: ethereum.Event,
  tokenAddress: Address,
  lostDeposit: BigInt,
  collGain: StabilityOffsetAddedGainsStruct[],
): void {
  const stabilityDepositAPYEntity = StabilityDepositAPY.load(`StabilityDepositAPY-${tokenAddress.toHexString()}`)!;

  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const priceFeedContract = PriceFeed.bind(Address.fromBytes(systemInfo.priceFeed));
  const tokenPrice = priceFeedContract.getPrice(tokenAddress).getPrice();

  const loss = lostDeposit.times(tokenPrice);

  let allGains = BigInt.fromI32(0);

  for (let i = 0; i < collGain.length; i++) {
    const tokenAddress = collGain[i].tokenAddress;
    const amount = collGain[i].amount;

    const systemInfo = SystemInfo.load(`SystemInfo`)!;
    const priceFeedContract = PriceFeed.bind(Address.fromBytes(systemInfo.priceFeed));
    const tokenPrice = priceFeedContract.getPrice(tokenAddress).getPrice();

    allGains.plus(tokenPrice.times(amount));
  }

  const profit = allGains.minus(loss);

  const lastIndex = stabilityDepositAPYEntity.index;
  const latestChunk = StabilityDepositChunk.load(`StabilityDepositChunk-${tokenAddress.toHexString()}-${lastIndex}`)!;

  // check if latest chunk is outdated after 60min
  const sixtyMin = BigInt.fromI32(60 * 60);
  const isOutdated = latestChunk.timestamp.gt(event.block.timestamp.plus(sixtyMin));

  if (isOutdated) {
    // create new chunk
    const newStabilityDepositChunk = new StabilityDepositChunk(
      `StabilityDepositChunk-${tokenAddress.toHexString()}-${lastIndex + 1}`,
    );
    newStabilityDepositChunk.timestamp = event.block.timestamp;
    newStabilityDepositChunk.profit = profit;
    newStabilityDepositChunk.volume = lostDeposit;
    newStabilityDepositChunk.save();

    // only remove last chunk from APY if it is older that 30d
    if (lastIndex > 30 * 24) {
      // remove last chunk from APY but add latest profit and volume too
      stabilityDepositAPYEntity.profit = stabilityDepositAPYEntity.profit.minus(latestChunk.profit).plus(profit);
      stabilityDepositAPYEntity.volume = stabilityDepositAPYEntity.volume.minus(latestChunk.volume).plus(lostDeposit);
    } else {
      // in the first 30d just add profit + volume
      stabilityDepositAPYEntity.profit = stabilityDepositAPYEntity.profit.plus(profit);
      stabilityDepositAPYEntity.volume = stabilityDepositAPYEntity.volume.plus(lostDeposit);
    }
    stabilityDepositAPYEntity.index = lastIndex + 1;
  } else {
    // just update profit + volume
    latestChunk.profit = latestChunk.profit.plus(profit);
    latestChunk.volume = latestChunk.volume.plus(lostDeposit);
    latestChunk.save();

    stabilityDepositAPYEntity.profit = stabilityDepositAPYEntity.profit.plus(profit);
    stabilityDepositAPYEntity.volume = stabilityDepositAPYEntity.volume.plus(lostDeposit);
  }

  stabilityDepositAPYEntity.save();
}

export const handleUpdateDebtTokenMeta_totalReserve30dAverage = (
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

export const handleUpdateDebtTokenMeta_totalSupply30dAverage = (event: ethereum.Event, tokenAddress: Address): void => {
  const debtTokenContract = DebtToken.bind(tokenAddress);
  const totalSupply = debtTokenContract.totalSupply();

  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const priceFeedContract = PriceFeed.bind(Address.fromBytes(systemInfo.priceFeed));
  const tokenPrice = priceFeedContract.getPrice(tokenAddress).getPrice();

  const totalSupplyUSD = totalSupply.times(tokenPrice);

  // Load Avergae or intialise it
  const totalSupplyAverage = TotalSupplyAverage.load(`TotalSupplyAverage-${tokenAddress.toHexString()}`)!;

  //  Add additional chunks the average has not been recalculated in the last 60 mins with last value (because there has been no update).
  let lastChunk = TotalSupplyAverageChunk.load(
    `TotalSupplyAverageChunk-${tokenAddress.toHexString()}-${totalSupplyAverage.index.toString()}`,
  )!;
  let moreThanOneChunkOutdated = lastChunk.timestamp.lt(event.block.timestamp.minus(BigInt.fromI32(2 * 60 * 60)));

  while (moreThanOneChunkOutdated) {
    totalSupplyAverage.index = totalSupplyAverage.index + 1;
    const totalSupplyAverageNewChunk = new TotalSupplyAverageChunk(
      `TotalSupplyAverageChunk-${tokenAddress.toHexString()}-${totalSupplyAverage.index.toString()}`,
    );
    totalSupplyAverageNewChunk.timestamp = lastChunk.timestamp.plus(BigInt.fromI32(60 * 60));
    totalSupplyAverageNewChunk.value = lastChunk.value;
    totalSupplyAverageNewChunk.save();

    lastChunk = totalSupplyAverageNewChunk;
    moreThanOneChunkOutdated = lastChunk.timestamp.lt(event.block.timestamp.minus(BigInt.fromI32(2 * 60 * 60)));
  }

  // Add the last chunk.
  if (lastChunk.timestamp.lt(event.block.timestamp.minus(BigInt.fromI32(60 * 60)))) {
    // Add a new chunk anyway
    totalSupplyAverage.index = totalSupplyAverage.index + 1;

    const totalSupplyAverageNewChunk = new TotalSupplyAverageChunk(
      `TotalSupplyAverageChunk-${tokenAddress.toHexString()}-${totalSupplyAverage.index.toString()}`,
    );
    totalSupplyAverageNewChunk.timestamp = lastChunk.timestamp.plus(BigInt.fromI32(60 * 60));
    totalSupplyAverageNewChunk.value = totalSupplyUSD;
    totalSupplyAverageNewChunk.save();

    // recalculate average based on if its the first 30 days or not
    if (totalSupplyAverage.index < 24 * 30) {
      totalSupplyAverage.value = totalSupplyAverage.value
        .div(BigInt.fromI32(totalSupplyAverage.index - 1 / totalSupplyAverage.index))
        .plus(totalSupplyAverageNewChunk.value.div(BigInt.fromI32(totalSupplyAverage.index)));
    } else {
      // Otherwise remove last chunk and add new chunk and recalculate average
      const dividedByChunks = BigInt.fromI32(30 * 24);
      totalSupplyAverage.value = totalSupplyAverage.value
        .plus(totalSupplyAverageNewChunk.value.div(dividedByChunks))
        .minus(lastChunk.value.div(dividedByChunks));
    }
  }

  totalSupplyAverage.save();
};
