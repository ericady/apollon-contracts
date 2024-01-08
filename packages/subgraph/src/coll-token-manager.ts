import {
  CollTokenAdded as CollTokenAddedEvent,
  CollTokenManagerInitialized as CollTokenManagerInitializedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
} from '../generated/CollTokenManager/CollTokenManager';
import { handleCreateToken } from './entities/token-entity';

export function handleCollTokenAdded(event: CollTokenAddedEvent): void {
  handleCreateToken(event, event.params._collTokenAddress, false);
  // TODO:
  // implement CollateralTokenMeta
}

export function handleCollTokenManagerInitialized(event: CollTokenManagerInitializedEvent): void {}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}
