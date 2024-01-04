import {
  DebtTokenAdded as DebtTokenAddedEvent,
  DebtTokenManagerInitialized as DebtTokenManagerInitializedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
} from '../generated/DebtTokenManager/DebtTokenManager';
import { handleCreateDebtTokenMeta } from './entities/debt-token-meta-entity';
import { handleCreateToken } from './entities/token-entity';

export function handleDebtTokenAdded(event: DebtTokenAddedEvent): void {
  handleCreateToken(event, event.params._debtTokenAddress, false);
  handleCreateDebtTokenMeta(event, event.params._debtTokenAddress);
}

export function handleDebtTokenManagerInitialized(event: DebtTokenManagerInitializedEvent): void {}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}
