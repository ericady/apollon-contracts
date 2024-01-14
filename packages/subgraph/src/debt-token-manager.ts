import {
  DebtTokenAdded as DebtTokenAddedEvent,
  DebtTokenManager,
  DebtTokenManagerInitialized as DebtTokenManagerInitializedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
} from '../generated/DebtTokenManager/DebtTokenManager';
import { handleCreateUpdateDebtTokenMeta } from './entities/debt-token-meta-entity';
import { handleUpdateSystemInfo_stableCoin } from './entities/system-info-entity';
import { handleCreateToken } from './entities/token-entity';

export function handleDebtTokenAdded(event: DebtTokenAddedEvent): void {
  const debtTokenManagerContract = DebtTokenManager.bind(event.address);
  const stableCoin = debtTokenManagerContract.getStableCoin();
  handleUpdateSystemInfo_stableCoin(event, stableCoin);

  handleCreateToken(event, event.params._debtTokenAddress, false);
  handleCreateUpdateDebtTokenMeta(event, event.params._debtTokenAddress);
}

export function handleDebtTokenManagerInitialized(event: DebtTokenManagerInitializedEvent): void {}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}
