import {
  OwnershipTransferred as OwnershipTransferredEvent,
  StoragePoolValueUpdated as StoragePoolValueUpdatedEvent,
} from '../generated/StoragePool/StoragePool';
import { handleUpdateSystemInfo_storagePool } from './entities/system-info-entity';

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {
  handleUpdateSystemInfo_storagePool(event, event.params.newOwner);
}

export function handleStoragePoolValueUpdated(event: StoragePoolValueUpdatedEvent): void {}
