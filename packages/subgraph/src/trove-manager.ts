import {
  BaseRateUpdated as BaseRateUpdatedEvent,
  LTermsUpdated as LTermsUpdatedEvent,
  LastFeeOpTimeUpdated as LastFeeOpTimeUpdatedEvent,
  LiquidationSummary as LiquidationSummaryEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  SystemSnapshotsUpdated as SystemSnapshotsUpdatedEvent,
  TotalStakesUpdated as TotalStakesUpdatedEvent,
  TroveAppliedRewards as TroveAppliedRewardsEvent,
  TroveClosed as TroveClosedEvent,
  TroveCollChanged as TroveCollChangedEvent,
  TroveDebtChanged as TroveDebtChangedEvent,
  TroveIndexUpdated as TroveIndexUpdatedEvent,
  TroveManagerInitialized as TroveManagerInitializedEvent,
  TroveSnapshotsUpdated as TroveSnapshotsUpdatedEvent,
} from '../generated/TroveManager/TroveManager';
import { handleCreateCollateralTokenMeta } from './entities/collateral-token-meta-entity';
import { handleUpdateUserCollateralTokenMeta_troveLockedAmount } from './entities/user-collateral-token-meta-entity';
import { handleUpdateUserDebtTokenMeta_troveMintedAmount_stabilityCompoundAmount } from './entities/user-debt-token-meta-entity';

export function handleBaseRateUpdated(event: BaseRateUpdatedEvent): void {}

export function handleLTermsUpdated(event: LTermsUpdatedEvent): void {}

export function handleLastFeeOpTimeUpdated(event: LastFeeOpTimeUpdatedEvent): void {}

export function handleLiquidationSummary(event: LiquidationSummaryEvent): void {}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handleSystemSnapshotsUpdated(event: SystemSnapshotsUpdatedEvent): void {}

export function handleTotalStakesUpdated(event: TotalStakesUpdatedEvent): void {}

export function handleTroveAppliedRewards(event: TroveAppliedRewardsEvent): void {
  // Both Trove debt/coll are updated
  for (let i = 0; i < event.params._appliedRewards.length; i++) {
    handleUpdateUserDebtTokenMeta_troveMintedAmount_stabilityCompoundAmount(
      event.params._appliedRewards[i].tokenAddress,
      event.params._borrower,
    );
    handleUpdateUserCollateralTokenMeta_troveLockedAmount(
      event,
      event.params._appliedRewards[i].tokenAddress,
      event.params._borrower,
    );
  }
}

export function handleTroveClosed(event: TroveClosedEvent): void {
  // Both Trove debt/coll are set to 0
  // TODO: Alternative way is to only get the borrower and guess all the tokens as a workaround
  for (let i = 0; i < event.params._collTokenAddresses.length; i++) {
    handleUpdateUserCollateralTokenMeta_troveLockedAmount(
      event,
      event.params._collTokenAddresses[i],
      event.params._borrower,
    );
  }
  for (let i = 0; i < event.params._debtTokenAddresses.length; i++) {
    handleUpdateUserDebtTokenMeta_troveMintedAmount_stabilityCompoundAmount(
      event.params._debtTokenAddresses[i],
      event.params._borrower,
    );
  }
}

export function handleTroveIndexUpdated(event: TroveIndexUpdatedEvent): void {}

export function handleTroveManagerInitialized(event: TroveManagerInitializedEvent): void {}

export function handleTroveSnapshotsUpdated(event: TroveSnapshotsUpdatedEvent): void {}

export function handleCollChanged(event: TroveCollChangedEvent): void {
  for (let i = 0; i < event.params._collTokenAddresses.length; i++) {
    // TODO: Loop over troves from the troveManager to get totalValueLockedUSD for any single collToken
    handleCreateCollateralTokenMeta(event, event.params._collTokenAddresses[i], event.address);
    handleUpdateUserCollateralTokenMeta_troveLockedAmount(
      event,
      event.params._collTokenAddresses[i],
      event.params._borrower,
    );
  }
}

export function handleDebtChanged(event: TroveDebtChangedEvent): void {
  for (let i = 0; i < event.params._debtTokenAddresses.length; i++) {
    handleUpdateUserDebtTokenMeta_troveMintedAmount_stabilityCompoundAmount(
      event.params._debtTokenAddresses[i],
      event.params._borrower,
    );
  }
}
