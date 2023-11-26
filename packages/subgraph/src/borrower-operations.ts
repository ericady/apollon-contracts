import {
  BorrowerOperationsInitialized as BorrowerOperationsInitializedEvent,
  CollateralTokenUpdated as CollateralTokenUpdatedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  TroveCreated as TroveCreatedEvent,
} from '../generated/BorrowerOperations/BorrowerOperations';
import { handleUpdateUserCollateralTokenMeta_walletAmount } from './entities/user-collateral-token-meta-entity';

export function handleBorrowerOperationsInitialized(event: BorrowerOperationsInitializedEvent): void {}

export function handleCollateralTokenUpdated(event: CollateralTokenUpdatedEvent): void {
  handleUpdateUserCollateralTokenMeta_walletAmount(event, event.params._collateralTokenAddress, event.params._owner);
  handleUpdateUserCollateralTokenMeta_walletAmount(event, event.params._collateralTokenAddress, event.params._receiver);
}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handleTroveCreated(event: TroveCreatedEvent): void {}
