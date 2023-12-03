import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { TroveManager } from '../../generated/TroveManager/TroveManager';
import { CollateralTokenMeta } from '../../generated/schema';

export function handleCreateCollateralTokenMeta(
  event: ethereum.Event,
  tokenAddress: Address,
  troveManagerAddress: Address,
): void {
  const collateralTokenMeta = new CollateralTokenMeta(event.transaction.hash.concatI32(event.logIndex.toI32()));

  collateralTokenMeta.token = tokenAddress;
  collateralTokenMeta.timestamp = event.block.timestamp;

  const troveManagerContract = TroveManager.bind(troveManagerAddress);

  // TODO: Implement when ReservePool is implemented
  const reservePoolCollUSD = BigInt.fromI32(0);
  // const allTroveCollsUSD = troveManagerContract.getAllTroveCollUSD(tokenAddress);

  // collateralTokenMeta.totalValueLockedUSD = allTroveCollsUSD.plus(reservePoolCollUSD);
  // troves total coll + reserve pool value
  // TODO: Link to event when ReservePool is implemented
  collateralTokenMeta.totalValueLockedUSD = reservePoolCollUSD;

  collateralTokenMeta.save();
}
