import {
  OwnershipTransferred as OwnershipTransferredEvent,
  TroveCreated as TroveCreatedEvent,
} from '../generated/BorrowerOperations/BorrowerOperations';

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handleTroveCreated(event: TroveCreatedEvent): void {}
