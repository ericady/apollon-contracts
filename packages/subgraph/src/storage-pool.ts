import {
  OwnershipTransferred as OwnershipTransferredEvent,
  StoragePoolValueUpdated as StoragePoolValueUpdatedEvent,
} from '../generated/StoragePool/StoragePool';

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handleStoragePoolValueUpdated(event: StoragePoolValueUpdatedEvent): void {}
