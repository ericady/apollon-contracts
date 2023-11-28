import { Address, ethereum } from '@graphprotocol/graph-ts';
import { newMockEvent } from 'matchstick-as';
import {
  DebtTokenAdded,
  DebtTokenManagerInitialized,
  OwnershipTransferred,
} from '../generated/DebtTokenManager/DebtTokenManager';

export function createDebtTokenAddedEvent(_debtTokenAddress: Address): DebtTokenAdded {
  let debtTokenAddedEvent = changetype<DebtTokenAdded>(newMockEvent());

  debtTokenAddedEvent.parameters = new Array();

  debtTokenAddedEvent.parameters.push(
    new ethereum.EventParam('_debtTokenAddress', ethereum.Value.fromAddress(_debtTokenAddress)),
  );

  return debtTokenAddedEvent;
}

export function createDebtTokenManagerInitializedEvent(
  _stabilityPoolManagerAddress: Address,
): DebtTokenManagerInitialized {
  let debtTokenManagerInitializedEvent = changetype<DebtTokenManagerInitialized>(newMockEvent());

  debtTokenManagerInitializedEvent.parameters = new Array();

  debtTokenManagerInitializedEvent.parameters.push(
    new ethereum.EventParam('_stabilityPoolManagerAddress', ethereum.Value.fromAddress(_stabilityPoolManagerAddress)),
  );

  return debtTokenManagerInitializedEvent;
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
