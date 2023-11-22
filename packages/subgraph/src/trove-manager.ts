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
  TroveIndexUpdated as TroveIndexUpdatedEvent,
  TroveManagerInitialized as TroveManagerInitializedEvent,
  TroveSnapshotsUpdated as TroveSnapshotsUpdatedEvent,
} from '../generated/TroveManager/TroveManager';

export function handleBaseRateUpdated(event: BaseRateUpdatedEvent): void {}

export function handleLTermsUpdated(event: LTermsUpdatedEvent): void {}

export function handleLastFeeOpTimeUpdated(event: LastFeeOpTimeUpdatedEvent): void {}

export function handleLiquidationSummary(event: LiquidationSummaryEvent): void {}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handleSystemSnapshotsUpdated(event: SystemSnapshotsUpdatedEvent): void {}

export function handleTotalStakesUpdated(event: TotalStakesUpdatedEvent): void {}

export function handleTroveAppliedRewards(event: TroveAppliedRewardsEvent): void {}

export function handleTroveClosed(event: TroveClosedEvent): void {}

export function handleTroveIndexUpdated(event: TroveIndexUpdatedEvent): void {}

export function handleTroveManagerInitialized(event: TroveManagerInitializedEvent): void {}

export function handleTroveSnapshotsUpdated(event: TroveSnapshotsUpdatedEvent): void {}

// export function handleCollateralUpdated(event: CollateralUpdatedEvent): void {
//   for (let i = 0; i < event.params._collTokens.length; i++) {
//     handleCreateCollateralTokenMeta(event, event.params._collTokens[i], event.address);
//   }
// }
