import {
  OwnershipTransferred as OwnershipTransferredEvent,
  StabilityPoolAdded as StabilityPoolAddedEvent,
} from '../generated/StabilityPoolManager/StabilityPoolManager';
import { StabilityPoolTemplate } from '../generated/templates';

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handleStabilityPoolAdded(event: StabilityPoolAddedEvent): void {
  StabilityPoolTemplate.create(event.params.stabilityPoolAddress);
}
