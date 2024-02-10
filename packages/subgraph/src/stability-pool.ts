import { Address, BigInt } from '@graphprotocol/graph-ts';
import {
  DepositSnapshotUpdated as DepositSnapshotUpdatedEvent,
  EpochUpdated as EpochUpdatedEvent,
  P_Updated as P_UpdatedEvent,
  S_Updated as S_UpdatedEvent,
  ScaleUpdated as ScaleUpdatedEvent,
  StabilityGainsWithdrawn as StabilityGainsWithdrawnEvent,
  StabilityOffset as StabilityOffsetEvent,
  StabilityPool,
  StabilityProvided as StabilityProvidedEvent,
  StabilityWithdrawn as StabilityWithdrawnEvent,
} from '../generated/templates/StabilityPoolTemplate/StabilityPool';
import { handleCreateBorrowerHistory } from './entities/borrower-history-entity';
import {
  handleCreateUpdateDebtTokenMeta,
  handleUpdateDebtTokenMeta_stabilityDepositAPY,
} from './entities/debt-token-meta-entity';

export function handleDepositSnapshotUpdated(event: DepositSnapshotUpdatedEvent): void {}

export function handleEpochUpdated(event: EpochUpdatedEvent): void {}

export function handleP_Updated(event: P_UpdatedEvent): void {}

export function handleS_Updated(event: S_UpdatedEvent): void {}

export function handleScaleUpdated(event: ScaleUpdatedEvent): void {}

export function handleStabilityGainsWithdrawn(event: StabilityGainsWithdrawnEvent): void {
  const stabilityPoolContract = StabilityPool.bind(event.address);
  const depositToken = stabilityPoolContract.depositToken();

  const collGainAddresses: Address[] = [];
  const collGainAmounts: BigInt[] = [];
  for (let i = 0; i < event.params.gainsWithdrawn.length; i++) {
    const address = event.params.gainsWithdrawn[i].tokenAddress;
    collGainAddresses.push(address);
    const amount = event.params.gainsWithdrawn[i].amount;
    collGainAmounts.push(amount);
  }

  handleCreateBorrowerHistory(
    event,
    event.address,
    event.params.user,
    'CLAIMED_REWARDS',
    [depositToken],
    [event.params.depositLost],
    collGainAddresses,
    collGainAmounts,
  );
}

export function handleStabilityOffset(event: StabilityOffsetEvent): void {
  handleUpdateDebtTokenMeta_stabilityDepositAPY(
    event,
    event.address,
    event.params.removedDeposit,
    event.params.addedGains,
  );
  // stabilityDepositAPY changed
  handleCreateUpdateDebtTokenMeta(event, event.address);
}

export function handleStabilityProvided(event: StabilityProvidedEvent): void {
  // totalDepositedStability changed
  // FIXME: re-add me!
  // handleCreateUpdateDebtTokenMeta(event, event.address);

  const stabilityPoolContract = StabilityPool.bind(event.address);
  const depositToken = stabilityPoolContract.depositToken();

  handleCreateBorrowerHistory(
    event,
    event.address,
    event.params.user,
    'DEPOSITED',
    [],
    [],
    [depositToken],
    [event.params.amount],
  );
}

export function handleStabilityWithdrawn(event: StabilityWithdrawnEvent): void {
  // totalDepositedStability changed
  handleCreateUpdateDebtTokenMeta(event, event.address);

  const stabilityPoolContract = StabilityPool.bind(event.address);
  const depositToken = stabilityPoolContract.depositToken();

  handleCreateBorrowerHistory(
    event,
    event.address,
    event.params.user,
    'WITHDRAWN',
    [depositToken],
    [event.params.amount],
    [],
    [],
  );
}
