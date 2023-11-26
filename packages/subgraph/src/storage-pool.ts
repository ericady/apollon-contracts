import {
  CollateralTokenUpdated as CollateralTokenUpdatedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  StoragePoolInitialized as StoragePoolInitializedEvent,
  StoragePoolValueUpdated as StoragePoolValueUpdatedEvent,
} from '../generated/StoragePool/StoragePool';
import { handleUpdateUserCollateralTokenMeta_walletAmount } from './entities/user-collateral-token-meta-entity';

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handleStoragePoolInitialized(event: StoragePoolInitializedEvent): void {}

export function handleStoragePoolValueUpdated(event: StoragePoolValueUpdatedEvent): void {}

export function handleCollateralTokenUpdated(event: CollateralTokenUpdatedEvent): void {
  // because IERC20.transfer happened
  handleUpdateUserCollateralTokenMeta_walletAmount(event, event.params._collateralTokenAddress, event.params._owner);
  handleUpdateUserCollateralTokenMeta_walletAmount(event, event.params._collateralTokenAddress, event.params._receiver);
}
