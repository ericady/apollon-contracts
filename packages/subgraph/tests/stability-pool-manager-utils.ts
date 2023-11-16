import { Address, ethereum } from '@graphprotocol/graph-ts';
import { newMockEvent } from 'matchstick-as';
import { UserClaimedRewards } from '../generated/StabilityPool/StabilityPool';
import {
  DebtTokenManagerAddressChanged,
  OwnershipTransferred,
  PriceFeedAddressChanged,
  StabilityPoolAdded,
  StoragePoolAddressChanged,
  TroveManagerAddressChanged,
} from '../generated/StabilityPoolManager/StabilityPoolManager';
import { MockStabilityPoolAddress } from './debt-token-utils';

export function createDebtTokenManagerAddressChangedEvent(
  _debtTokenManagerAddress: Address,
): DebtTokenManagerAddressChanged {
  let debtTokenManagerAddressChangedEvent = changetype<DebtTokenManagerAddressChanged>(newMockEvent());

  debtTokenManagerAddressChangedEvent.parameters = new Array();

  debtTokenManagerAddressChangedEvent.parameters.push(
    new ethereum.EventParam('_debtTokenManagerAddress', ethereum.Value.fromAddress(_debtTokenManagerAddress)),
  );

  return debtTokenManagerAddressChangedEvent;
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

export function createPriceFeedAddressChangedEvent(_newPriceFeedAddress: Address): PriceFeedAddressChanged {
  let priceFeedAddressChangedEvent = changetype<PriceFeedAddressChanged>(newMockEvent());

  priceFeedAddressChangedEvent.parameters = new Array();

  priceFeedAddressChangedEvent.parameters.push(
    new ethereum.EventParam('_newPriceFeedAddress', ethereum.Value.fromAddress(_newPriceFeedAddress)),
  );

  return priceFeedAddressChangedEvent;
}

export function createStabilityPoolAddedEvent(_stabilityPool: Address): StabilityPoolAdded {
  let stabilityPoolAddedEvent = changetype<StabilityPoolAdded>(newMockEvent());

  stabilityPoolAddedEvent.parameters = new Array();

  stabilityPoolAddedEvent.parameters.push(
    new ethereum.EventParam('_stabilityPool', ethereum.Value.fromAddress(_stabilityPool)),
  );

  return stabilityPoolAddedEvent;
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
  let userClaimedRewardsEvent = changetype<UserClaimedRewards>(newMockEvent());

  userClaimedRewardsEvent.address = MockStabilityPoolAddress;

  userClaimedRewardsEvent.parameters = new Array();

  userClaimedRewardsEvent.parameters.push(new ethereum.EventParam('user', ethereum.Value.fromAddress(user)));

  return userClaimedRewardsEvent;
}
