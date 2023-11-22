import { Address, ethereum } from '@graphprotocol/graph-ts';
import { newMockEvent } from 'matchstick-as';
import {
  OwnershipTransferred,
  StabilityPoolAdded,
  StabilityPoolManagerInitiated,
} from '../generated/StabilityPoolManager/StabilityPoolManager';

export function createOwnershipTransferredEvent(previousOwner: Address, newOwner: Address): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(newMockEvent());

  ownershipTransferredEvent.parameters = new Array();

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam('previousOwner', ethereum.Value.fromAddress(previousOwner)),
  );
  ownershipTransferredEvent.parameters.push(new ethereum.EventParam('newOwner', ethereum.Value.fromAddress(newOwner)));

  return ownershipTransferredEvent;
}

export function createStabilityPoolAddedEvent(stabilityPoolAddress: Address): StabilityPoolAdded {
  let stabilityPoolAddedEvent = changetype<StabilityPoolAdded>(newMockEvent());

  stabilityPoolAddedEvent.parameters = new Array();

  stabilityPoolAddedEvent.parameters.push(
    new ethereum.EventParam('stabilityPoolAddress', ethereum.Value.fromAddress(stabilityPoolAddress)),
  );

  return stabilityPoolAddedEvent;
}

export function createStabilityPoolManagerInitiatedEvent(
  troveManagerAddress: Address,
  storgePoolAddress: Address,
  debtTokenManagerAddress: Address,
  priceFeedAddress: Address,
): StabilityPoolManagerInitiated {
  let stabilityPoolManagerInitiatedEvent = changetype<StabilityPoolManagerInitiated>(newMockEvent());

  stabilityPoolManagerInitiatedEvent.parameters = new Array();

  stabilityPoolManagerInitiatedEvent.parameters.push(
    new ethereum.EventParam('troveManagerAddress', ethereum.Value.fromAddress(troveManagerAddress)),
  );
  stabilityPoolManagerInitiatedEvent.parameters.push(
    new ethereum.EventParam('storgePoolAddress', ethereum.Value.fromAddress(storgePoolAddress)),
  );
  stabilityPoolManagerInitiatedEvent.parameters.push(
    new ethereum.EventParam('debtTokenManagerAddress', ethereum.Value.fromAddress(debtTokenManagerAddress)),
  );
  stabilityPoolManagerInitiatedEvent.parameters.push(
    new ethereum.EventParam('priceFeedAddress', ethereum.Value.fromAddress(priceFeedAddress)),
  );

  return stabilityPoolManagerInitiatedEvent;
}
