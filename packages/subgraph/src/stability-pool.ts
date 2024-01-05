import {
  DepositSnapshotUpdated as DepositSnapshotUpdatedEvent,
  EpochUpdated as EpochUpdatedEvent,
  P_Updated as P_UpdatedEvent,
  S_Updated as S_UpdatedEvent,
  ScaleUpdated as ScaleUpdatedEvent,
  StabilityGainsWithdrawn as StabilityGainsWithdrawnEvent,
  StabilityOffset as StabilityOffsetEvent,
  StabilityProvided as StabilityProvidedEvent,
  StabilityWithdrawn as StabilityWithdrawnEvent,
} from '../generated/StabilityPool/StabilityPool';
import { handleCreateBorrowerHistory } from './entities/borrower-history-entity';
import { handleCreateDebtTokenMeta, handleUpdateStabilityDepositAPY } from './entities/debt-token-meta-entity';

export function handleDepositSnapshotUpdated(event: DepositSnapshotUpdatedEvent): void {}

export function handleEpochUpdated(event: EpochUpdatedEvent): void {}

export function handleP_Updated(event: P_UpdatedEvent): void {}

export function handleS_Updated(event: S_UpdatedEvent): void {}

export function handleScaleUpdated(event: ScaleUpdatedEvent): void {}

export function handleStabilityGainsWithdrawn(event: StabilityGainsWithdrawnEvent): void {
  handleCreateBorrowerHistory(event, event.address);
}

export function handleStabilityOffset(event: StabilityOffsetEvent): void {
  handleUpdateStabilityDepositAPY(event, event.address, event.params.removedDeposit, event.params.addedGains);
  // stabilityDepositAPY changed
  handleCreateDebtTokenMeta(event, event.address);
}

export function handleStabilityProvided(event: StabilityProvidedEvent): void {
  // totalDepositedStability changed
  handleCreateDebtTokenMeta(event, event.address);
  handleCreateBorrowerHistory(event, event.address);
}

export function handleStabilityWithdrawn(event: StabilityWithdrawnEvent): void {
  // totalDepositedStability changed
  handleCreateDebtTokenMeta(event, event.address);
  handleCreateBorrowerHistory(event, event.address);
}
