import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { Address as EventAddress } from '@graphprotocol/graph-ts/common/numbers';
import { BorrowerOperations } from '../../generated/BorrowerOperations/BorrowerOperations';
import { DebtToken } from '../../generated/DebtToken/DebtToken';
import { ReservePool } from '../../generated/ReservePool/ReservePool';
import { StabilityOffsetAddedGainsStruct, StabilityPool } from '../../generated/StabilityPool/StabilityPool';
import { StabilityPoolManager } from '../../generated/StabilityPoolManager/StabilityPoolManager';
import { DebtTokenMeta, StabilityDepositAPY, StabilityDepositChunk, Token } from '../../generated/schema';

export const stableDebtToken = EventAddress.fromString('0x6c3f90f043a72fa612cbac8115ee7e52bde6e490');
export const govToken = EventAddress.fromString('0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2');

export function handleCreateDebtTokenMeta(
  event: ethereum.Event,
  tokenAddress: Address,
  govReserveCap: BigInt | null = null,
): void {
  const debtTokenMeta = new DebtTokenMeta(event.transaction.hash.concatI32(event.logIndex.toI32()));

  const tokenContract = DebtToken.bind(tokenAddress);
  const debtTokenStabilityPoolManagerContract = StabilityPoolManager.bind(tokenContract.stabilityPoolManagerAddress());
  const debtTokenStabilityPoolContract = StabilityPool.bind(
    debtTokenStabilityPoolManagerContract.getStabilityPool(tokenAddress),
  );

  debtTokenMeta.token = tokenAddress;
  debtTokenMeta.timestamp = event.block.timestamp;

  const totalSupply = tokenContract.totalSupply();
  const tokenPrice = Token.load(tokenAddress)!.priceUSD;
  debtTokenMeta.totalSupplyUSD = totalSupply.times(tokenPrice);

  if (tokenAddress === stableDebtToken || tokenAddress === govToken) {
    const borrowerOperationsAddress = tokenContract.borrowerOperationsAddress();
    const borrowerOperationsContract = BorrowerOperations.bind(borrowerOperationsAddress);

    const reservePoolAddress = borrowerOperationsContract.reservePool();
    const reservePoolContract = ReservePool.bind(reservePoolAddress);

    if (tokenAddress === stableDebtToken) {
      debtTokenMeta.totalReserve = tokenContract.balanceOf(event.address);
    } else if (tokenAddress === govToken) {
      debtTokenMeta.totalReserve = govReserveCap ? govReserveCap : reservePoolContract.govReserveCap();
    }
  }

  // TODO: Implement
  debtTokenMeta.stabilityDepositAPY = 1;
  debtTokenMeta.totalDepositedStability = debtTokenStabilityPoolContract.getTotalDeposit();

  debtTokenMeta.save();
}

export function handleUpdateStabilityDepositAPY(
  event: ethereum.Event,
  tokenAddress: Address,
  lostDeposit: BigInt,
  collGain: StabilityOffsetAddedGainsStruct[],
): void {
  let stabilityDepositAPYEntity = StabilityDepositAPY.load(`StabilityDepositAPY-${tokenAddress.toHexString()}`);

  // Calculate Profit from gained colls and lost debts
  const tokenContract = DebtToken.bind(tokenAddress);
  const tokenPrice = tokenContract.getPrice();
  const loss = lostDeposit.times(tokenPrice);

  let allGains = BigInt.fromI32(0);

  for (let i = 0; i < collGain.length; i++) {
    const tokenAddress = collGain[i].tokenAddress;
    const amount = collGain[i].amount;
    const tokenContract = DebtToken.bind(tokenAddress);
    const tokenPrice = tokenContract.getPrice();

    allGains.plus(tokenPrice.times(amount));
  }

  const profit = allGains.minus(loss);

  // If there is no chunk at all create a new one and a new APY
  if (stabilityDepositAPYEntity === null) {
    // create new chunk
    const firstStabilityDepositChunk = new StabilityDepositChunk(
      `StabilityDepositChunk-${tokenAddress.toHexString()}-0`,
    );
    firstStabilityDepositChunk.timestamp = event.block.timestamp;
    firstStabilityDepositChunk.profit = profit;
    firstStabilityDepositChunk.volume = lostDeposit;
    firstStabilityDepositChunk.save();

    // create new APY
    stabilityDepositAPYEntity = new StabilityDepositAPY(`StabilityDepositAPY-${tokenAddress.toHexString()}`);
    stabilityDepositAPYEntity.index = 0;
    firstStabilityDepositChunk.profit = profit;
    firstStabilityDepositChunk.volume = lostDeposit;
  } else {
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
  }

  stabilityDepositAPYEntity.save();
}
