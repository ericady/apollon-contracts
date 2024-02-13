import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { createMockedFunction, newMockEvent } from 'matchstick-as';
import {
  DepositSnapshotUpdated,
  EpochUpdated,
  P_Updated,
  S_Updated,
  ScaleUpdated,
  StabilityGainsWithdrawn,
  StabilityOffset,
  StabilityPoolInitialized,
  StabilityProvided,
  StabilityWithdrawn,
} from '../generated/templates/StabilityPoolTemplate/StabilityPool';
import {
  MockDebtTokenAddress,
  MockStabilityPoolAddress,
  MockStabilityPoolManagerAddress,
  MockUserAddress,
  oneEther,
} from './utils';

export const mockStabilityPool_depositToken = (): void => {
  createMockedFunction(MockStabilityPoolAddress, 'depositToken', 'depositToken():(address)').returns([
    ethereum.Value.fromAddress(MockDebtTokenAddress),
  ]);
};
export const mockStabilityPool_getTotalDeposit = (): void => {
  createMockedFunction(MockStabilityPoolAddress, 'getTotalDeposit', 'getTotalDeposit():(uint256)').returns([
    ethereum.Value.fromSignedBigInt(oneEther.times(BigInt.fromI32(10))),
  ]);
};
export const mockStabilityPool_stabilityPoolManagerAddress = (): void => {
  createMockedFunction(
    MockStabilityPoolAddress,
    'stabilityPoolManagerAddress',
    'stabilityPoolManagerAddress():(address)',
  ).returns([ethereum.Value.fromAddress(MockStabilityPoolManagerAddress)]);
};
export const mockStabilityPool_deposits = (): void => {
  createMockedFunction(MockStabilityPoolAddress, 'deposits', 'deposits(address):(uint256)')
    .withArgs([ethereum.Value.fromAddress(MockUserAddress)])
    .returns([ethereum.Value.fromSignedBigInt(oneEther.times(BigInt.fromI32(10)))]);
};
export const mockStabilityPool_getCompoundedDebtDeposit = (): void => {
  createMockedFunction(
    MockStabilityPoolAddress,
    'getCompoundedDebtDeposit',
    'getCompoundedDebtDeposit(address):(uint256)',
  )
    .withArgs([ethereum.Value.fromAddress(MockUserAddress)])
    .returns([ethereum.Value.fromSignedBigInt(oneEther)]);
};

// EVENTS

export function createDepositSnapshotUpdatedEvent(_depositor: Address): DepositSnapshotUpdated {
  let depositSnapshotUpdatedEvent = changetype<DepositSnapshotUpdated>(newMockEvent());

  depositSnapshotUpdatedEvent.parameters = new Array();

  depositSnapshotUpdatedEvent.parameters.push(
    new ethereum.EventParam('_depositor', ethereum.Value.fromAddress(_depositor)),
  );

  return depositSnapshotUpdatedEvent;
}

export function createEpochUpdatedEvent(_currentEpoch: BigInt): EpochUpdated {
  let epochUpdatedEvent = changetype<EpochUpdated>(newMockEvent());

  epochUpdatedEvent.parameters = new Array();

  epochUpdatedEvent.parameters.push(
    new ethereum.EventParam('_currentEpoch', ethereum.Value.fromSignedBigInt(_currentEpoch)),
  );

  return epochUpdatedEvent;
}

// export function createOwnershipTransferredEvent(previousOwner: Address, newOwner: Address): OwnershipTransferred {
//   let ownershipTransferredEvent = changetype<OwnershipTransferred>(newMockEvent());

//   ownershipTransferredEvent.parameters = new Array();

//   ownershipTransferredEvent.parameters.push(
//     new ethereum.EventParam('previousOwner', ethereum.Value.fromAddress(previousOwner)),
//   );
//   ownershipTransferredEvent.parameters.push(new ethereum.EventParam('newOwner', ethereum.Value.fromAddress(newOwner)));

//   return ownershipTransferredEvent;
// }

export function createP_UpdatedEvent(_P: BigInt): P_Updated {
  let pUpdatedEvent = changetype<P_Updated>(newMockEvent());

  pUpdatedEvent.parameters = new Array();

  pUpdatedEvent.parameters.push(new ethereum.EventParam('_P', ethereum.Value.fromSignedBigInt(_P)));

  return pUpdatedEvent;
}

export function createS_UpdatedEvent(_tokenAddress: Address, _S: BigInt, _epoch: BigInt, _scale: BigInt): S_Updated {
  let sUpdatedEvent = changetype<S_Updated>(newMockEvent());

  sUpdatedEvent.parameters = new Array();

  sUpdatedEvent.parameters.push(new ethereum.EventParam('_tokenAddress', ethereum.Value.fromAddress(_tokenAddress)));
  sUpdatedEvent.parameters.push(new ethereum.EventParam('_S', ethereum.Value.fromSignedBigInt(_S)));
  sUpdatedEvent.parameters.push(new ethereum.EventParam('_epoch', ethereum.Value.fromSignedBigInt(_epoch)));
  sUpdatedEvent.parameters.push(new ethereum.EventParam('_scale', ethereum.Value.fromSignedBigInt(_scale)));

  return sUpdatedEvent;
}

export function createScaleUpdatedEvent(_currentScale: BigInt): ScaleUpdated {
  let scaleUpdatedEvent = changetype<ScaleUpdated>(newMockEvent());

  scaleUpdatedEvent.parameters = new Array();

  scaleUpdatedEvent.parameters.push(
    new ethereum.EventParam('_currentScale', ethereum.Value.fromSignedBigInt(_currentScale)),
  );

  return scaleUpdatedEvent;
}

export function createStabilityGainsWithdrawnEvent(
  user: Address,
  depositLost: BigInt,
  gainsWithdrawn: Array<ethereum.Tuple>,
): StabilityGainsWithdrawn {
  let stabilityGainsWithdrawnEvent = changetype<StabilityGainsWithdrawn>(newMockEvent());
  stabilityGainsWithdrawnEvent.address = MockStabilityPoolAddress;

  stabilityGainsWithdrawnEvent.parameters = new Array();

  stabilityGainsWithdrawnEvent.parameters.push(new ethereum.EventParam('user', ethereum.Value.fromAddress(user)));
  stabilityGainsWithdrawnEvent.parameters.push(
    new ethereum.EventParam('depositLost', ethereum.Value.fromSignedBigInt(depositLost)),
  );
  stabilityGainsWithdrawnEvent.parameters.push(
    new ethereum.EventParam('gainsWithdrawn', ethereum.Value.fromTupleArray(gainsWithdrawn)),
  );

  return stabilityGainsWithdrawnEvent;
}

export function createStabilityOffsetEvent(removedDeposit: BigInt, addedGains: Array<ethereum.Tuple>): StabilityOffset {
  let stabilityOffsetEvent = changetype<StabilityOffset>(newMockEvent());

  stabilityOffsetEvent.parameters = new Array();

  stabilityOffsetEvent.parameters.push(
    new ethereum.EventParam('removedDeposit', ethereum.Value.fromSignedBigInt(removedDeposit)),
  );
  stabilityOffsetEvent.parameters.push(
    new ethereum.EventParam('addedGains', ethereum.Value.fromTupleArray(addedGains)),
  );

  return stabilityOffsetEvent;
}

export function createStabilityPoolInitializedEvent(
  stabilityPoolManagerAddress: Address,
  troveManagerAddress: Address,
  storagePoolAddress: Address,
  priceFeedAddress: Address,
  depositTokenAddress: Address,
): StabilityPoolInitialized {
  let stabilityPoolInitializedEvent = changetype<StabilityPoolInitialized>(newMockEvent());

  stabilityPoolInitializedEvent.parameters = new Array();

  stabilityPoolInitializedEvent.parameters.push(
    new ethereum.EventParam('stabilityPoolManagerAddress', ethereum.Value.fromAddress(stabilityPoolManagerAddress)),
  );
  stabilityPoolInitializedEvent.parameters.push(
    new ethereum.EventParam('troveManagerAddress', ethereum.Value.fromAddress(troveManagerAddress)),
  );
  stabilityPoolInitializedEvent.parameters.push(
    new ethereum.EventParam('storagePoolAddress', ethereum.Value.fromAddress(storagePoolAddress)),
  );
  stabilityPoolInitializedEvent.parameters.push(
    new ethereum.EventParam('priceFeedAddress', ethereum.Value.fromAddress(priceFeedAddress)),
  );
  stabilityPoolInitializedEvent.parameters.push(
    new ethereum.EventParam('depositTokenAddress', ethereum.Value.fromAddress(depositTokenAddress)),
  );

  return stabilityPoolInitializedEvent;
}

export function createStabilityProvidedEvent(user: Address, amount: BigInt): StabilityProvided {
  let stabilityProvidedEvent = changetype<StabilityProvided>(newMockEvent());

  stabilityProvidedEvent.address = MockStabilityPoolAddress;
  stabilityProvidedEvent.parameters = new Array();

  stabilityProvidedEvent.parameters.push(new ethereum.EventParam('user', ethereum.Value.fromAddress(user)));
  stabilityProvidedEvent.parameters.push(new ethereum.EventParam('amount', ethereum.Value.fromSignedBigInt(amount)));

  return stabilityProvidedEvent;
}

export function createStabilityWithdrawnEvent(user: Address, amount: BigInt): StabilityWithdrawn {
  let stabilityWithdrawnEvent = changetype<StabilityWithdrawn>(newMockEvent());

  stabilityWithdrawnEvent.parameters = new Array();

  stabilityWithdrawnEvent.parameters.push(new ethereum.EventParam('user', ethereum.Value.fromAddress(user)));
  stabilityWithdrawnEvent.parameters.push(new ethereum.EventParam('amount', ethereum.Value.fromSignedBigInt(amount)));

  return stabilityWithdrawnEvent;
}
