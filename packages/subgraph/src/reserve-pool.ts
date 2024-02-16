import { Address, log } from '@graphprotocol/graph-ts';
import {
  OwnershipTransferred as OwnershipTransferredEvent,
  ReserveCapChanged as ReserveCapChangedEvent,
  ReservePoolInitialized as ReservePoolInitializedEvent,
  WithdrewReserves as WithdrewReservesEvent,
} from '../generated/ReservePool/ReservePool';
import { SystemInfo } from '../generated/schema';
import {
  handleCreateUpdateCollateralTokenMeta,
  handleUpdateCollateralTokenMeta_totalReserve30dAverage,
} from './entities/collateral-token-meta-entity';
import {
  handleCreateUpdateDebtTokenMeta,
  handleUpdateDebtTokenMeta_totalReserve30dAverage,
} from './entities/debt-token-meta-entity';
import { handleCreateReservePoolUSDHistoryChunk } from './entities/reserve-pool-USD-history-chunk';
import { handleUpdateSystemInfo_reservePool } from './entities/system-info-entity';

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handleReserveCapChanged(event: ReserveCapChangedEvent): void {
  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const stableCoin = Address.fromBytes(systemInfo.stableCoin);
  const govToken = Address.fromBytes(systemInfo.govToken);

  handleCreateUpdateDebtTokenMeta(event, stableCoin);
  handleUpdateDebtTokenMeta_totalReserve30dAverage(event, stableCoin, event.params.newReserveCap);

  handleCreateUpdateCollateralTokenMeta(event, govToken, event.params.newGovReserveCap);
  handleUpdateCollateralTokenMeta_totalReserve30dAverage(event, govToken, event.params.newGovReserveCap);

  handleCreateReservePoolUSDHistoryChunk(event, event.address);
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

  handleCreateUpdateCollateralTokenMeta(event, govToken, event.params.govAmount);
  handleUpdateCollateralTokenMeta_totalReserve30dAverage(event, govToken, event.params.govAmount);

  handleCreateReservePoolUSDHistoryChunk(event, event.address);
}
