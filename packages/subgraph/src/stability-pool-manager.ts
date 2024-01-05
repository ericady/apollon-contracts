import {
  OwnershipTransferred as OwnershipTransferredEvent,
  StabilityPoolAdded as StabilityPoolAddedEvent,
} from '../generated/StabilityPoolManager/StabilityPoolManager';

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handleStabilityPoolAdded(event: StabilityPoolAddedEvent): void {}
