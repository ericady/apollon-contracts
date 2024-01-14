import {
  OwnershipTransferred as OwnershipTransferredEvent,
  ReserveCapChanged as ReserveCapChangedEvent,
  ReservePoolInitialized as ReservePoolInitializedEvent,
  WithdrewReserves as WithdrewReservesEvent,
} from '../generated/ReservePool/ReservePool';
import {
  govToken,
  handleCreateUpdateDebtTokenMeta,
  handleUpdateDebtTokenMeta_totalReserve30dAverage,
  stableDebtToken,
} from './entities/debt-token-meta-entity';

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handleReserveCapChanged(event: ReserveCapChangedEvent): void {
  handleCreateUpdateDebtTokenMeta(event, stableDebtToken, event.params.newGovReserveCap);
  handleUpdateDebtTokenMeta_totalReserve30dAverage(event, stableDebtToken, event.params.newGovReserveCap);

  handleCreateUpdateDebtTokenMeta(event, govToken, event.params.newGovReserveCap);
  handleUpdateDebtTokenMeta_totalReserve30dAverage(event, govToken, event.params.newGovReserveCap);
}

export function handleReservePoolInitialized(event: ReservePoolInitializedEvent): void {}

export function handleWithdrewReserves(event: WithdrewReservesEvent): void {
  handleCreateUpdateDebtTokenMeta(event, stableDebtToken);
  handleUpdateDebtTokenMeta_totalReserve30dAverage(event, stableDebtToken, event.params.stableAmount);

  handleCreateUpdateDebtTokenMeta(event, govToken);
  handleUpdateDebtTokenMeta_totalReserve30dAverage(event, govToken, event.params.govAmount);
}
