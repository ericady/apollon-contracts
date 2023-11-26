import {
  DepositSnapshotUpdated as DepositSnapshotUpdatedEvent,
  EpochUpdated as EpochUpdatedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  P_Updated as P_UpdatedEvent,
  S_Updated as S_UpdatedEvent,
  ScaleUpdated as ScaleUpdatedEvent,
  StabilityGainsWithdrawn as StabilityGainsWithdrawnEvent,
  StabilityOffset as StabilityOffsetEvent,
  StabilityPoolInitialized as StabilityPoolInitializedEvent,
  StabilityProvided as StabilityProvidedEvent,
  StabilityWithdrawn as StabilityWithdrawnEvent,
} from '../generated/StabilityPool/StabilityPool';
import { handleCreateDebtTokenMeta, handleUpdateStabilityDepositAPY } from './entities/debt-token-meta-entity';
import { handleUpdateUserCollateralTokenMeta_walletAmount } from './entities/user-collateral-token-meta-entity';
import {
  handleResetUserDebtTokenMeta_providedStablitySinceLastCollClaim,
  handleUpdateUserDebtTokenMeta_providedStablitySinceLastCollClaim_stabilityCompoundAmount,
} from './entities/user-debt-token-meta-entity';

export function handleDepositSnapshotUpdated(event: DepositSnapshotUpdatedEvent): void {}

export function handleEpochUpdated(event: EpochUpdatedEvent): void {}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handleP_Updated(event: P_UpdatedEvent): void {}

export function handleS_Updated(event: S_UpdatedEvent): void {}

export function handleScaleUpdated(event: ScaleUpdatedEvent): void {}

export function handleStabilityGainsWithdrawn(event: StabilityGainsWithdrawnEvent): void {
  // Maybe this is fired from the Manager? Then I need to loop over all Stability Pools and set them to the current deposit.

  handleResetUserDebtTokenMeta_providedStablitySinceLastCollClaim(event.address, event.params.user);

  // because IERC20.transfer happened
  for (let i = 0; i < event.params.gainsWithdrawn.length; i++) {
    handleUpdateUserCollateralTokenMeta_walletAmount(
      event,
      event.params.gainsWithdrawn[i].tokenAddress,
      event.params.user,
    );

    // TODO: Also update for the pools tokens? Ask @sambP
    handleUpdateUserCollateralTokenMeta_walletAmount(event, event.params.gainsWithdrawn[i].tokenAddress, event.address);
  }
}

export function handleStabilityOffset(event: StabilityOffsetEvent): void {
  handleUpdateStabilityDepositAPY(event, event.address, event.params.removedDeposit, event.params.addedGains);
  // stabilityDepositAPY changed
  handleCreateDebtTokenMeta(event, event.address);
}

export function handleStabilityPoolInitialized(event: StabilityPoolInitializedEvent): void {}

export function handleStabilityProvided(event: StabilityProvidedEvent): void {
  // totalDepositedStability changed
  handleCreateDebtTokenMeta(event, event.address);

  handleUpdateUserDebtTokenMeta_providedStablitySinceLastCollClaim_stabilityCompoundAmount(
    event.address,
    event.params.user,
  );
}

export function handleStabilityWithdrawn(event: StabilityWithdrawnEvent): void {
  // totalDepositedStability changed
  handleCreateDebtTokenMeta(event, event.address);

  handleUpdateUserDebtTokenMeta_providedStablitySinceLastCollClaim_stabilityCompoundAmount(
    event.address,
    event.params.user,
  );
}
