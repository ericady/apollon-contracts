import {
  OwnershipTransferred as OwnershipTransferredEvent,
  StabilityPoolAdded as StabilityPoolAddedEvent,
  StabilityPoolManagerInitiated as StabilityPoolManagerInitiatedEvent,
} from '../generated/StabilityPoolManager/StabilityPoolManager';

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handleStabilityPoolAdded(event: StabilityPoolAddedEvent): void {}

export function handleStabilityPoolManagerInitiated(event: StabilityPoolManagerInitiatedEvent): void {}
