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

  const stabilityPoolContract = StabilityPool.bind(event.address);
  const depositToken = stabilityPoolContract.depositToken();

  handleCreateUpdateDebtTokenMeta(event, depositToken);
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
  // FIXME: re-add me!
  // ERRO Subgraph error 1/1, code: SubgraphSyncingFailure, error: transaction dfc900524095ebdd4577e295ba53e53cb853457350ec1ae041f16308f9781cad: Mapping aborted at ~lib/@graphprotocol/graph-ts/chain/ethereum.ts, line 675, column 7, with message: Call reverted, probably because an `assert` or `require` in the contract failed, consider using `try_getStabilityPool` to handle this in the mapping.	wasm backtrace:	    0: 0x3a4d - <unknown>!~lib/@graphprotocol/graph-ts/chain/ethereum/ethereum.SmartContract#call	    1: 0x584a - <unknown>!src/entities/debt-token-meta-entity/handleCreateUpdateDebtTokenMeta	    2: 0x5ed7 - <unknown>!src/stability-pool/handleStabilityWithdrawn	 in handler `handleStabilityWithdrawn` at block #128 (074509709c775c95ceb60e72913390d2330e1e8d75e92e9c70d8e939fc1a835f), block_hash: 0x074509709c775c95ceb60e72913390d2330e1e8d75e92e9c70d8e939fc1a835f, block_number: 128, sgd: 1, subgraph_id: QmPcZR4hQWTjXCwb9U3wZREMt3kSfsD7HecqX8WbWTYB2w, component: SubgraphInstanceManage
  // handleCreateUpdateDebtTokenMeta(event, event.address);

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
