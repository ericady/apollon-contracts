import {
  BorrowerOperationsInitialized as BorrowerOperationsInitializedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  TroveCreated as TroveCreatedEvent,
} from '../generated/BorrowerOperations/BorrowerOperations';

export function handleBorrowerOperationsInitialized(event: BorrowerOperationsInitializedEvent): void {}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handleTroveCreated(event: TroveCreatedEvent): void {}
