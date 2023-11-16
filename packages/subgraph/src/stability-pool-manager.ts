import {
  DebtTokenManagerAddressChanged as DebtTokenManagerAddressChangedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  PriceFeedAddressChanged as PriceFeedAddressChangedEvent,
  StabilityPoolAdded as StabilityPoolAddedEvent,
  StoragePoolAddressChanged as StoragePoolAddressChangedEvent,
  TroveManagerAddressChanged as TroveManagerAddressChangedEvent,
} from '../generated/StabilityPoolManager/StabilityPoolManager';

export function handleDebtTokenManagerAddressChanged(event: DebtTokenManagerAddressChangedEvent): void {}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handlePriceFeedAddressChanged(event: PriceFeedAddressChangedEvent): void {}

export function handleStabilityPoolAdded(event: StabilityPoolAddedEvent): void {}

export function handleStoragePoolAddressChanged(event: StoragePoolAddressChangedEvent): void {}

export function handleTroveManagerAddressChanged(event: TroveManagerAddressChangedEvent): void {}
