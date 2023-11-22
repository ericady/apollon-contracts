import {
  OwnershipTransferred as OwnershipTransferredEvent,
  StoragePoolInitialized as StoragePoolInitializedEvent,
  StoragePoolValueUpdated as StoragePoolValueUpdatedEvent,
} from '../generated/StoragePool/StoragePool';

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handleStoragePoolInitialized(event: StoragePoolInitializedEvent): void {}

export function handleStoragePoolValueUpdated(event: StoragePoolValueUpdatedEvent): void {}
