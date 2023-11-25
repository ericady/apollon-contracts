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
import { handleUpdateUserDebtTokenMeta_troveMintedAmount_stabilityCompoundAmount } from './entities/user-debt-token-meta-entity';

export function handleBaseRateUpdated(event: BaseRateUpdatedEvent): void {}

export function handleLTermsUpdated(event: LTermsUpdatedEvent): void {}

export function handleLastFeeOpTimeUpdated(event: LastFeeOpTimeUpdatedEvent): void {}

export function handleLiquidationSummary(event: LiquidationSummaryEvent): void {}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handleSystemSnapshotsUpdated(event: SystemSnapshotsUpdatedEvent): void {}

export function handleTotalStakesUpdated(event: TotalStakesUpdatedEvent): void {}

export function handleTroveAppliedRewards(event: TroveAppliedRewardsEvent): void {}

export function handleTroveClosed(event: TroveClosedEvent): void {
  // FIXME: implement real token address
  const tokenAddress = event.address;
  handleUpdateUserDebtTokenMeta_troveMintedAmount_stabilityCompoundAmount(event.address, event.params._borrower);
}

export function handleTroveIndexUpdated(event: TroveIndexUpdatedEvent): void {}

export function handleTroveManagerInitialized(event: TroveManagerInitializedEvent): void {}

export function handleTroveSnapshotsUpdated(event: TroveSnapshotsUpdatedEvent): void {}

export function handleCollChanged(event: TroveCollChangedEvent): void {
  // TODO: Loop over event.params._collTokenAddresses and update all affected tokens for the user
  handleUpdateUserDebtTokenMeta_troveMintedAmount_stabilityCompoundAmount(event.address, event.params._borrower);
}

export function handleDebtChanged(event: TroveDebtChangedEvent): void {
  // TODO: Loop over event.params._collTokenAddresses and update all affected tokens for the user
  handleUpdateUserDebtTokenMeta_troveMintedAmount_stabilityCompoundAmount(event.address, event.params._borrower);
}

// handleCollateralUpdated(event: CollateralUpdatedEvent): void {
//   for (let i = 0; i < event.params._collTokens.length; i++) {
//     handleCreateCollateralTokenMeta(event, event.params._collTokens[i], event.address);
//   }
// }
