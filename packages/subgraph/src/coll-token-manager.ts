import {
  CollTokenAdded as CollTokenAddedEvent,
  CollTokenManagerInitialized as CollTokenManagerInitializedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
} from '../generated/CollTokenManager/CollTokenManager';
import { ERC20Template } from '../generated/templates';
import {
  handleCreateCollateralTokenMeta_totalValueLockedUSD30dAverage,
  handleCreateUpdateCollateralTokenMeta,
} from './entities/collateral-token-meta-entity';
import { handleCreateToken } from './entities/token-entity';

export function handleCollTokenAdded(event: CollTokenAddedEvent): void {
  ERC20Template.create(event.params._collTokenAddress);
  handleCreateToken(event, event.params._collTokenAddress, false);

  handleCreateUpdateCollateralTokenMeta(event, event.params._collTokenAddress);
  handleCreateCollateralTokenMeta_totalValueLockedUSD30dAverage(event, event.params._collTokenAddress);
}

export function handleCollTokenManagerInitialized(event: CollTokenManagerInitializedEvent): void {}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}
