import {
  CollTokenAdded as CollTokenAddedEvent,
  DebtTokenAdded as DebtTokenAddedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  TokenManager,
  TokenManagerInitialized as TokenManagerInitializedEvent,
} from '../generated/TokenManager/TokenManager';
import { DebtTokenTemplate, ERC20Template } from '../generated/templates';
import {
  handleCreateCollateralTokenMeta_totalValueLockedUSD30dAverage,
  handleCreateUpdateCollateralTokenMeta,
} from './entities/collateral-token-meta-entity';
import { handleCreateUpdateDebtTokenMeta } from './entities/debt-token-meta-entity';
import { handleUpdateSystemInfo_stableCoin } from './entities/system-info-entity';
import { handleCreateToken } from './entities/token-entity';

export function handleCollTokenAdded(event: CollTokenAddedEvent): void {
  ERC20Template.create(event.params._tokenAddress);
  handleCreateToken(event, event.params._tokenAddress, false);

  handleCreateUpdateCollateralTokenMeta(event, event.params._tokenAddress);
  handleCreateCollateralTokenMeta_totalValueLockedUSD30dAverage(event, event.params._tokenAddress);
}

export function handleDebtTokenAdded(event: DebtTokenAddedEvent): void {
  DebtTokenTemplate.create(event.params._debtTokenAddress);
  const debtTokenManagerContract = TokenManager.bind(event.address);
  const stableCoin = debtTokenManagerContract.getStableCoin();
  handleUpdateSystemInfo_stableCoin(event, stableCoin);

  handleCreateToken(event, event.params._debtTokenAddress, false);
  handleCreateUpdateDebtTokenMeta(event, event.params._debtTokenAddress);
}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handleTokenManagerInitialized(event: TokenManagerInitializedEvent): void {}
