import { Address } from '@graphprotocol/graph-ts';
import {
  OwnershipTransferred as OwnershipTransferredEvent,
  ReserveCapChanged as ReserveCapChangedEvent,
  ReservePoolInitialized as ReservePoolInitializedEvent,
  WithdrewReserves as WithdrewReservesEvent,
} from '../generated/ReservePool/ReservePool';
import { SystemInfo } from '../generated/schema';
import {
  handleCreateUpdateDebtTokenMeta,
  handleUpdateDebtTokenMeta_totalReserve30dAverage,
} from './entities/debt-token-meta-entity';
import { handleUpdateSystemInfo_reservePool } from './entities/system-info-entity';

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handleReserveCapChanged(event: ReserveCapChangedEvent): void {
  // handleCreateUpdateDebtTokenMeta(event, stableDebtToken);
  // FIXME: There is an exception still. Test it, fix it, then run it.
  // handleUpdateDebtTokenMeta_totalReserve30dAverage(event, stableDebtToken, event.params.newGovReserveCap);
  // handleCreateUpdateDebtTokenMeta(event, govToken, event.params.newGovReserveCap);
  // handleUpdateDebtTokenMeta_totalReserve30dAverage(event, govToken, event.params.newGovReserveCap);
}

export function handleReservePoolInitialized(event: ReservePoolInitializedEvent): void {
  handleUpdateSystemInfo_reservePool(event, event.address);
}

export function handleWithdrewReserves(event: WithdrewReservesEvent): void {
  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const stableCoin = Address.fromBytes(systemInfo.stableCoin);
  const govToken = Address.fromBytes(systemInfo.govToken);

  handleCreateUpdateDebtTokenMeta(event, stableCoin);
  handleUpdateDebtTokenMeta_totalReserve30dAverage(event, stableCoin, event.params.stableAmount);

  handleCreateUpdateDebtTokenMeta(event, govToken);
  handleUpdateDebtTokenMeta_totalReserve30dAverage(event, govToken, event.params.govAmount);
}
