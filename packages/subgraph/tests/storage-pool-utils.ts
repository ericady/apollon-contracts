import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { newMockEvent } from 'matchstick-as';
import {
  OwnershipTransferred,
  StoragePoolInitialized,
  StoragePoolValueUpdated,
} from '../generated/StoragePool/StoragePool';

export function createOwnershipTransferredEvent(previousOwner: Address, newOwner: Address): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(newMockEvent());

  ownershipTransferredEvent.parameters = new Array();

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam('previousOwner', ethereum.Value.fromAddress(previousOwner)),
  );
  ownershipTransferredEvent.parameters.push(new ethereum.EventParam('newOwner', ethereum.Value.fromAddress(newOwner)));

  return ownershipTransferredEvent;
}

export function createStoragePoolInitializedEvent(
  _borrowerOperationsAddress: Address,
  _troveManagerAddress: Address,
  _redemptionOperationsAddress: Address,
  _stabilityPoolManagerAddress: Address,
  _priceFeedAddress: Address,
): StoragePoolInitialized {
  let storagePoolInitializedEvent = changetype<StoragePoolInitialized>(newMockEvent());

  storagePoolInitializedEvent.parameters = new Array();

  storagePoolInitializedEvent.parameters.push(
    new ethereum.EventParam('_borrowerOperationsAddress', ethereum.Value.fromAddress(_borrowerOperationsAddress)),
  );
  storagePoolInitializedEvent.parameters.push(
    new ethereum.EventParam('_troveManagerAddress', ethereum.Value.fromAddress(_troveManagerAddress)),
  );
  storagePoolInitializedEvent.parameters.push(
    new ethereum.EventParam('_redemptionOperationsAddress', ethereum.Value.fromAddress(_redemptionOperationsAddress)),
  );
  storagePoolInitializedEvent.parameters.push(
    new ethereum.EventParam('_stabilityPoolManagerAddress', ethereum.Value.fromAddress(_stabilityPoolManagerAddress)),
  );
  storagePoolInitializedEvent.parameters.push(
    new ethereum.EventParam('_priceFeedAddress', ethereum.Value.fromAddress(_priceFeedAddress)),
  );

  return storagePoolInitializedEvent;
}

export function createStoragePoolValueUpdatedEvent(
  _tokenAddress: Address,
  _isColl: boolean,
  _poolType: i32,
  _updatedAmount: BigInt,
): StoragePoolValueUpdated {
  let storagePoolValueUpdatedEvent = changetype<StoragePoolValueUpdated>(newMockEvent());

  storagePoolValueUpdatedEvent.parameters = new Array();

  storagePoolValueUpdatedEvent.parameters.push(
    new ethereum.EventParam('_tokenAddress', ethereum.Value.fromAddress(_tokenAddress)),
  );
  storagePoolValueUpdatedEvent.parameters.push(new ethereum.EventParam('_isColl', ethereum.Value.fromBoolean(_isColl)));
  storagePoolValueUpdatedEvent.parameters.push(
    new ethereum.EventParam('_poolType', ethereum.Value.fromSignedBigInt(BigInt.fromI32(_poolType))),
  );
  storagePoolValueUpdatedEvent.parameters.push(
    new ethereum.EventParam('_updatedAmount', ethereum.Value.fromSignedBigInt(_updatedAmount)),
  );

  return storagePoolValueUpdatedEvent;
}
