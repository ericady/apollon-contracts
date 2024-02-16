import {
  OwnershipTransferred as OwnershipTransferredEvent,
  StabilityPoolAdded as StabilityPoolAddedEvent,
  StabilityPoolManagerInitiated as StabilityPoolManagerInitiatedEvent,
} from '../generated/StabilityPoolManager/StabilityPoolManager';
import { StabilityPoolTemplate } from '../generated/templates';
import { handleUpdateSystemInfo_stabilityPoolManager } from './entities/system-info-entity';

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handleStabilityPoolAdded(event: StabilityPoolAddedEvent): void {
  StabilityPoolTemplate.create(event.params.stabilityPoolAddress);
}

export function handleStabilityPoolInitiated(event: StabilityPoolManagerInitiatedEvent): void {
  handleUpdateSystemInfo_stabilityPoolManager(event, event.address);
}
