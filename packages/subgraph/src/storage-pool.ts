import {
  BorrowerOperationsAddressChanged as BorrowerOperationsAddressChangedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  PoolValueUpdated as PoolValueUpdatedEvent,
  PriceFeedAddressChanged as PriceFeedAddressChangedEvent,
  StabilityPoolManagerAddressChanged as StabilityPoolManagerAddressChangedEvent,
  TroveManagerAddressChanged as TroveManagerAddressChangedEvent,
} from '../generated/StoragePool/StoragePool';

export function handleBorrowerOperationsAddressChanged(event: BorrowerOperationsAddressChangedEvent): void {}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handlePoolValueUpdated(event: PoolValueUpdatedEvent): void {}

export function handlePriceFeedAddressChanged(event: PriceFeedAddressChangedEvent): void {}

export function handleStabilityPoolManagerAddressChanged(event: StabilityPoolManagerAddressChangedEvent): void {}

export function handleTroveManagerAddressChanged(event: TroveManagerAddressChangedEvent): void {}
