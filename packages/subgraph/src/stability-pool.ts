import {
  DepositSnapshotUpdated as DepositSnapshotUpdatedEvent,
  DepositTokenAddressChanged as DepositTokenAddressChangedEvent,
  EpochUpdated as EpochUpdatedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  P_Updated as P_UpdatedEvent,
  PriceFeedAddressChanged as PriceFeedAddressChangedEvent,
  S_Updated as S_UpdatedEvent,
  ScaleUpdated as ScaleUpdatedEvent,
  StabilityPool,
  StabilityPoolCollBalanceUpdated as StabilityPoolCollBalanceUpdatedEvent,
  StabilityPoolDepositBalanceUpdated as StabilityPoolDepositBalanceUpdatedEvent,
  StabilityPoolManagerAddressChanged as StabilityPoolManagerAddressChangedEvent,
  StoragePoolAddressChanged as StoragePoolAddressChangedEvent,
  TroveManagerAddressChanged as TroveManagerAddressChangedEvent,
  UserClaimedRewards as UserClaimedRewardsEvent,
  UserDepositChanged as UserDepositChangedEvent,
} from '../generated/StabilityPool/StabilityPool';
import { updateUserDebtTokenMeta } from '../tests/debt-token-utils';

export function handleDepositSnapshotUpdated(event: DepositSnapshotUpdatedEvent): void {}

export function handleDepositTokenAddressChanged(event: DepositTokenAddressChangedEvent): void {}

export function handleEpochUpdated(event: EpochUpdatedEvent): void {}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handleP_Updated(event: P_UpdatedEvent): void {}

export function handlePriceFeedAddressChanged(event: PriceFeedAddressChangedEvent): void {}

export function handleS_Updated(event: S_UpdatedEvent): void {}

export function handleScaleUpdated(event: ScaleUpdatedEvent): void {}

export function handleStabilityPoolCollBalanceUpdated(event: StabilityPoolCollBalanceUpdatedEvent): void {}

export function handleStabilityPoolDepositBalanceUpdated(event: StabilityPoolDepositBalanceUpdatedEvent): void {}

export function handleStabilityPoolManagerAddressChanged(event: StabilityPoolManagerAddressChangedEvent): void {}

export function handleStoragePoolAddressChanged(event: StoragePoolAddressChangedEvent): void {}

export function handleTroveManagerAddressChanged(event: TroveManagerAddressChangedEvent): void {}

export function handleUserClaimedRewards(event: UserClaimedRewardsEvent): void {
  // Maybe this is fired from the Manager? Then I need to loop over all Stability Pools and set them to the current deposit.

  const StabilityPoolContract = StabilityPool.bind(event.address);
  const tokenAddress = StabilityPoolContract.getDepositToken();
  const depositAfterClaim = StabilityPoolContract.deposits(event.params.user);

  updateUserDebtTokenMeta(tokenAddress, event.params.user, depositAfterClaim);
}

export function handleUserDepositChanged(event: UserDepositChangedEvent): void {
  // I will probably need 2 events to track user real deposits
}
