import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { newMockEvent } from 'matchstick-as';
import {
  DepositSnapshotUpdated,
  DepositTokenAddressChanged,
  EpochUpdated,
  OwnershipTransferred,
  P_Updated,
  PriceFeedAddressChanged,
  S_Updated,
  ScaleUpdated,
  StabilityPoolCollBalanceUpdated,
  StabilityPoolDepositBalanceUpdated,
  StabilityPoolManagerAddressChanged,
  StoragePoolAddressChanged,
  TroveManagerAddressChanged,
  UserClaimedRewards,
  UserDepositChanged,
} from '../generated/StabilityPool/StabilityPool';
import { MockStabilityPoolAddress } from './debt-token-utils';

export function createDepositSnapshotUpdatedEvent(_depositor: Address, _P: BigInt, _S: BigInt): DepositSnapshotUpdated {
  let depositSnapshotUpdatedEvent = changetype<DepositSnapshotUpdated>(newMockEvent());

  depositSnapshotUpdatedEvent.parameters = new Array();

  depositSnapshotUpdatedEvent.parameters.push(
    new ethereum.EventParam('_depositor', ethereum.Value.fromAddress(_depositor)),
  );
  depositSnapshotUpdatedEvent.parameters.push(new ethereum.EventParam('_P', ethereum.Value.fromUnsignedBigInt(_P)));
  depositSnapshotUpdatedEvent.parameters.push(new ethereum.EventParam('_S', ethereum.Value.fromUnsignedBigInt(_S)));

  return depositSnapshotUpdatedEvent;
}

export function createDepositTokenAddressChangedEvent(_newDepositTokenAddress: Address): DepositTokenAddressChanged {
  let depositTokenAddressChangedEvent = changetype<DepositTokenAddressChanged>(newMockEvent());

  depositTokenAddressChangedEvent.parameters = new Array();

  depositTokenAddressChangedEvent.parameters.push(
    new ethereum.EventParam('_newDepositTokenAddress', ethereum.Value.fromAddress(_newDepositTokenAddress)),
  );

  return depositTokenAddressChangedEvent;
}

export function createEpochUpdatedEvent(_currentEpoch: BigInt): EpochUpdated {
  let epochUpdatedEvent = changetype<EpochUpdated>(newMockEvent());

  epochUpdatedEvent.parameters = new Array();

  epochUpdatedEvent.parameters.push(
    new ethereum.EventParam('_currentEpoch', ethereum.Value.fromUnsignedBigInt(_currentEpoch)),
  );

  return epochUpdatedEvent;
}

export function createOwnershipTransferredEvent(previousOwner: Address, newOwner: Address): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(newMockEvent());

  ownershipTransferredEvent.parameters = new Array();

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam('previousOwner', ethereum.Value.fromAddress(previousOwner)),
  );
  ownershipTransferredEvent.parameters.push(new ethereum.EventParam('newOwner', ethereum.Value.fromAddress(newOwner)));

  return ownershipTransferredEvent;
}

export function createP_UpdatedEvent(_P: BigInt): P_Updated {
  let pUpdatedEvent = changetype<P_Updated>(newMockEvent());

  pUpdatedEvent.parameters = new Array();

  pUpdatedEvent.parameters.push(new ethereum.EventParam('_P', ethereum.Value.fromUnsignedBigInt(_P)));

  return pUpdatedEvent;
}

export function createPriceFeedAddressChangedEvent(_newPriceFeedAddress: Address): PriceFeedAddressChanged {
  let priceFeedAddressChangedEvent = changetype<PriceFeedAddressChanged>(newMockEvent());

  priceFeedAddressChangedEvent.parameters = new Array();

  priceFeedAddressChangedEvent.parameters.push(
    new ethereum.EventParam('_newPriceFeedAddress', ethereum.Value.fromAddress(_newPriceFeedAddress)),
  );

  return priceFeedAddressChangedEvent;
}

export function createS_UpdatedEvent(_tokenAddress: Address, _S: BigInt, _epoch: BigInt, _scale: BigInt): S_Updated {
  let sUpdatedEvent = changetype<S_Updated>(newMockEvent());

  sUpdatedEvent.parameters = new Array();

  sUpdatedEvent.parameters.push(new ethereum.EventParam('_tokenAddress', ethereum.Value.fromAddress(_tokenAddress)));
  sUpdatedEvent.parameters.push(new ethereum.EventParam('_S', ethereum.Value.fromUnsignedBigInt(_S)));
  sUpdatedEvent.parameters.push(new ethereum.EventParam('_epoch', ethereum.Value.fromUnsignedBigInt(_epoch)));
  sUpdatedEvent.parameters.push(new ethereum.EventParam('_scale', ethereum.Value.fromUnsignedBigInt(_scale)));

  return sUpdatedEvent;
}

export function createScaleUpdatedEvent(_currentScale: BigInt): ScaleUpdated {
  let scaleUpdatedEvent = changetype<ScaleUpdated>(newMockEvent());

  scaleUpdatedEvent.parameters = new Array();

  scaleUpdatedEvent.parameters.push(
    new ethereum.EventParam('_currentScale', ethereum.Value.fromUnsignedBigInt(_currentScale)),
  );

  return scaleUpdatedEvent;
}

export function createStabilityPoolCollBalanceUpdatedEvent(_tokenAddress: Address): StabilityPoolCollBalanceUpdated {
  let stabilityPoolCollBalanceUpdatedEvent = changetype<StabilityPoolCollBalanceUpdated>(newMockEvent());

  stabilityPoolCollBalanceUpdatedEvent.parameters = new Array();

  stabilityPoolCollBalanceUpdatedEvent.parameters.push(
    new ethereum.EventParam('_tokenAddress', ethereum.Value.fromAddress(_tokenAddress)),
  );

  return stabilityPoolCollBalanceUpdatedEvent;
}

export function createStabilityPoolDepositBalanceUpdatedEvent(): StabilityPoolDepositBalanceUpdated {
  let stabilityPoolDepositBalanceUpdatedEvent = changetype<StabilityPoolDepositBalanceUpdated>(newMockEvent());

  stabilityPoolDepositBalanceUpdatedEvent.parameters = new Array();

  return stabilityPoolDepositBalanceUpdatedEvent;
}

export function createStabilityPoolManagerAddressChangedEvent(
  _newStabilityPoolManagerAddress: Address,
): StabilityPoolManagerAddressChanged {
  let stabilityPoolManagerAddressChangedEvent = changetype<StabilityPoolManagerAddressChanged>(newMockEvent());

  stabilityPoolManagerAddressChangedEvent.parameters = new Array();

  stabilityPoolManagerAddressChangedEvent.parameters.push(
    new ethereum.EventParam(
      '_newStabilityPoolManagerAddress',
      ethereum.Value.fromAddress(_newStabilityPoolManagerAddress),
    ),
  );

  return stabilityPoolManagerAddressChangedEvent;
}

export function createStoragePoolAddressChangedEvent(_newStoragePoolAddress: Address): StoragePoolAddressChanged {
  let storagePoolAddressChangedEvent = changetype<StoragePoolAddressChanged>(newMockEvent());

  storagePoolAddressChangedEvent.parameters = new Array();

  storagePoolAddressChangedEvent.parameters.push(
    new ethereum.EventParam('_newStoragePoolAddress', ethereum.Value.fromAddress(_newStoragePoolAddress)),
  );

  return storagePoolAddressChangedEvent;
}

export function createTroveManagerAddressChangedEvent(_newTroveManagerAddress: Address): TroveManagerAddressChanged {
  let troveManagerAddressChangedEvent = changetype<TroveManagerAddressChanged>(newMockEvent());

  troveManagerAddressChangedEvent.parameters = new Array();

  troveManagerAddressChangedEvent.parameters.push(
    new ethereum.EventParam('_newTroveManagerAddress', ethereum.Value.fromAddress(_newTroveManagerAddress)),
  );

  return troveManagerAddressChangedEvent;
}

export function createUserClaimedRewardsEvent(user: Address): UserClaimedRewards {
  let UserClaimedRewardsEvent = changetype<UserClaimedRewards>(newMockEvent());
  UserClaimedRewardsEvent.address = MockStabilityPoolAddress;
  UserClaimedRewardsEvent.parameters = new Array();

  UserClaimedRewardsEvent.parameters.push(new ethereum.EventParam('user', ethereum.Value.fromAddress(user)));

  return UserClaimedRewardsEvent;
}

export function createUserDepositChangedEvent(user: Address): UserDepositChanged {
  let userDepositChangedEvent = changetype<UserDepositChanged>(newMockEvent());

  userDepositChangedEvent.parameters = new Array();

  userDepositChangedEvent.parameters.push(new ethereum.EventParam('user', ethereum.Value.fromAddress(user)));

  return userDepositChangedEvent;
}
