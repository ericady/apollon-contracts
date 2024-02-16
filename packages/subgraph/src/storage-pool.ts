import {
  OwnershipTransferred as OwnershipTransferredEvent,
  StoragePoolValueUpdated as StoragePoolValueUpdatedEvent,
} from '../generated/StoragePool/StoragePool';
import { handleUpdateSystemInfo_storagePool } from './entities/system-info-entity';
import { handleCreateTotalValueLockedUSDHistoryChunk } from './entities/total-value-locked-USD-history-chunk-entity';
import { handleCreateTotalValueMintedUSDHistoryChunk } from './entities/total-value-minted-USD-history-chunk-entity';

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {
  handleUpdateSystemInfo_storagePool(event, event.params.newOwner);
}

export function handleStoragePoolValueUpdated(event: StoragePoolValueUpdatedEvent): void {
  handleCreateTotalValueMintedUSDHistoryChunk(event)
  handleCreateTotalValueLockedUSDHistoryChunk(event)
}
