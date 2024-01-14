import {
  BaseRateUpdated as BaseRateUpdatedEvent,
  LTermsUpdated as LTermsUpdatedEvent,
  LastFeeOpTimeUpdated as LastFeeOpTimeUpdatedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  SystemSnapshotsUpdated as SystemSnapshotsUpdatedEvent,
  TotalStakesUpdated as TotalStakesUpdatedEvent,
  TroveAppliedRewards as TroveAppliedRewardsEvent,
  TroveClosed as TroveClosedEvent,
  TroveCollChanged as TroveCollChangedEvent,
  TroveIndexUpdated as TroveIndexUpdatedEvent,
  TroveSnapshotsUpdated as TroveSnapshotsUpdatedEvent,
} from '../generated/TroveManager/TroveManager';
import { handleCreateUpdateCollateralTokenMeta } from './entities/collateral-token-meta-entity';

export function handleBaseRateUpdated(event: BaseRateUpdatedEvent): void {}

export function handleLTermsUpdated(event: LTermsUpdatedEvent): void {}

export function handleLastFeeOpTimeUpdated(event: LastFeeOpTimeUpdatedEvent): void {}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handleSystemSnapshotsUpdated(event: SystemSnapshotsUpdatedEvent): void {}

export function handleTotalStakesUpdated(event: TotalStakesUpdatedEvent): void {}

export function handleTroveAppliedRewards(event: TroveAppliedRewardsEvent): void {}

export function handleTroveClosed(event: TroveClosedEvent): void {}

export function handleTroveIndexUpdated(event: TroveIndexUpdatedEvent): void {}

export function handleTroveSnapshotsUpdated(event: TroveSnapshotsUpdatedEvent): void {}

export function handleCollChanged(event: TroveCollChangedEvent): void {
  for (let i = 0; i < event.params._collTokenAddresses.length; i++) {
    // TODO: Loop over troves from the troveManager to get totalValueLockedUSD for any single collToken
    handleCreateUpdateCollateralTokenMeta(event, event.params._collTokenAddresses[i]);
  }
}
