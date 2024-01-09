import {
  OwnershipTransferred as OwnershipTransferredEvent,
  ReserveCapChanged as ReserveCapChangedEvent,
  ReservePoolInitialized as ReservePoolInitializedEvent,
  WithdrewReserves as WithdrewReservesEvent,
} from '../generated/ReservePool/ReservePool';
import { govToken, handleCreateDebtTokenMeta, stableDebtToken } from './entities/debt-token-meta-entity';

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handleReserveCapChanged(event: ReserveCapChangedEvent): void {
  handleCreateDebtTokenMeta(event, stableDebtToken, event.params.newGovReserveCap);
  handleCreateDebtTokenMeta(event, govToken, event.params.newGovReserveCap);
}

export function handleReservePoolInitialized(event: ReservePoolInitializedEvent): void {}

export function handleWithdrewReserves(event: WithdrewReservesEvent): void {
  handleCreateDebtTokenMeta(event, stableDebtToken);
  handleCreateDebtTokenMeta(event, govToken);
}
