import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { DebtToken } from '../../generated/DebtToken/DebtToken';
import { StabilityOffsetAddedGainsStruct, StabilityPool } from '../../generated/StabilityPool/StabilityPool';
import { StabilityPoolManager } from '../../generated/StabilityPoolManager/StabilityPoolManager';
import { DebtTokenMeta } from '../../generated/schema';

export function handleCreateDebtTokenMeta(event: ethereum.Event, tokenAddress: Address): void {
  const debtTokenMeta = new DebtTokenMeta(event.transaction.hash.concatI32(event.logIndex.toI32()));

  const tokenContract = DebtToken.bind(tokenAddress);
  const debtTokenStabilityPoolManagerContract = StabilityPoolManager.bind(tokenContract.stabilityPoolManagerAddress());
  const debtTokenStabilityPoolContract = StabilityPool.bind(
    debtTokenStabilityPoolManagerContract.getStabilityPool(tokenAddress),
  );

  debtTokenMeta.token = tokenAddress;
  debtTokenMeta.timestamp = event.block.timestamp;
  debtTokenMeta.totalSupplyUSD = tokenContract.totalSupply().times(tokenContract.getPrice());

  debtTokenMeta.stabilityDepositAPY = debtTokenStabilityPoolContract.getStabilityAPY();
  debtTokenMeta.totalDepositedStability = debtTokenStabilityPoolContract.getTotalDeposit();
  // TODO: Find the right contracts for it and implement getters
  debtTokenMeta.totalReserve = BigInt.fromI32(0);

  debtTokenMeta.save();
}

export function handleUpdateStabilityDepositAPY(
  event: ethereum.Event,
  tokenAddress: Address,
  lostDeposit: BigInt,
  collGain: StabilityOffsetAddedGainsStruct[],
): void {
  // # "StabilityDepositAPY" + token
}
