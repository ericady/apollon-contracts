import {
  DepositSnapshotUpdated as DepositSnapshotUpdatedEvent,
  EpochUpdated as EpochUpdatedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  P_Updated as P_UpdatedEvent,
  S_Updated as S_UpdatedEvent,
  ScaleUpdated as ScaleUpdatedEvent,
  StabilityGainsWithdrawn as StabilityGainsWithdrawnEvent,
  StabilityOffset as StabilityOffsetEvent,
  StabilityPool,
  StabilityPoolInitialized as StabilityPoolInitializedEvent,
  StabilityProvided as StabilityProvidedEvent,
  StabilityWithdrawn as StabilityWithdrawnEvent,
} from '../generated/StabilityPool/StabilityPool';
import { handleCreateUpdateUserDebtTokenMeta } from './entities/user-debt-token-meta-entity';

export function handleDepositSnapshotUpdated(event: DepositSnapshotUpdatedEvent): void {}

export function handleEpochUpdated(event: EpochUpdatedEvent): void {}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handleP_Updated(event: P_UpdatedEvent): void {}

export function handleS_Updated(event: S_UpdatedEvent): void {}

export function handleScaleUpdated(event: ScaleUpdatedEvent): void {}

export function handleStabilityGainsWithdrawn(event: StabilityGainsWithdrawnEvent): void {
  // Maybe this is fired from the Manager? Then I need to loop over all Stability Pools and set them to the current deposit.

  const StabilityPoolContract = StabilityPool.bind(event.address);
  const tokenAddress = StabilityPoolContract.getDepositToken();
  const depositAfterClaim = StabilityPoolContract.deposits(event.params.user);

  handleCreateUpdateUserDebtTokenMeta(tokenAddress, event.params.user, depositAfterClaim);
}

export function handleStabilityOffset(event: StabilityOffsetEvent): void {}

export function handleStabilityPoolInitialized(event: StabilityPoolInitializedEvent): void {}

export function handleStabilityProvided(event: StabilityProvidedEvent): void {}

export function handleStabilityWithdrawn(event: StabilityWithdrawnEvent): void {}
