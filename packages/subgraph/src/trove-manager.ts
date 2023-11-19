import {
  BaseRateUpdated as BaseRateUpdatedEvent,
  BorrowerOperationsAddressChanged as BorrowerOperationsAddressChangedEvent,
  CollTokenManagerAddressChanged as CollTokenManagerAddressChangedEvent,
  CollateralUpdated as CollateralUpdatedEvent,
  DebtTokenManagerAddressChanged as DebtTokenManagerAddressChangedEvent,
  LTermsUpdated as LTermsUpdatedEvent,
  LastFeeOpTimeUpdated as LastFeeOpTimeUpdatedEvent,
  Liquidation as LiquidationEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  PriceFeedAddressChanged as PriceFeedAddressChangedEvent,
  Redemption as RedemptionEvent,
  StabilityPoolManagerAddressChanged as StabilityPoolManagerAddressChangedEvent,
  StoragePoolAddressChanged as StoragePoolAddressChangedEvent,
  SystemSnapshotsUpdated as SystemSnapshotsUpdatedEvent,
  TotalStakesUpdated as TotalStakesUpdatedEvent,
  TroveIndexUpdated as TroveIndexUpdatedEvent,
  TroveLiquidated as TroveLiquidatedEvent,
  TroveSnapshotsUpdated as TroveSnapshotsUpdatedEvent,
  TroveUpdated as TroveUpdatedEvent,
} from '../generated/TroveManager/TroveManager';
import { handleNewCollateralTokenMeta } from './entities/collateral-token-entity';

export function handleBaseRateUpdated(event: BaseRateUpdatedEvent): void {}

export function handleBorrowerOperationsAddressChanged(event: BorrowerOperationsAddressChangedEvent): void {}

export function handleCollTokenManagerAddressChanged(event: CollTokenManagerAddressChangedEvent): void {}

export function handleDebtTokenManagerAddressChanged(event: DebtTokenManagerAddressChangedEvent): void {}

export function handleLTermsUpdated(event: LTermsUpdatedEvent): void {}

export function handleLastFeeOpTimeUpdated(event: LastFeeOpTimeUpdatedEvent): void {}

export function handleLiquidation(event: LiquidationEvent): void {}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handlePriceFeedAddressChanged(event: PriceFeedAddressChangedEvent): void {}

export function handleRedemption(event: RedemptionEvent): void {}

export function handleStabilityPoolManagerAddressChanged(event: StabilityPoolManagerAddressChangedEvent): void {}

export function handleStoragePoolAddressChanged(event: StoragePoolAddressChangedEvent): void {}

export function handleSystemSnapshotsUpdated(event: SystemSnapshotsUpdatedEvent): void {}

export function handleTotalStakesUpdated(event: TotalStakesUpdatedEvent): void {}

export function handleTroveIndexUpdated(event: TroveIndexUpdatedEvent): void {}

export function handleTroveLiquidated(event: TroveLiquidatedEvent): void {}

export function handleTroveSnapshotsUpdated(event: TroveSnapshotsUpdatedEvent): void {}

export function handleTroveUpdated(event: TroveUpdatedEvent): void {}

export function handleCollateralUpdated(event: CollateralUpdatedEvent): void {
  for (let i = 0; i < event.params._collTokens.length; i++) {
    handleNewCollateralTokenMeta(event, event.params._collTokens[i], event.address);
  }
}
