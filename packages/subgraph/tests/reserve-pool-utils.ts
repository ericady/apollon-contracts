import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { newMockEvent } from 'matchstick-as';
import {
  OwnershipTransferred,
  ReserveCapChanged,
  ReservePoolInitialized,
  WithdrewReserves,
} from '../generated/ReservePool/ReservePool';

export function createOwnershipTransferredEvent(previousOwner: Address, newOwner: Address): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(newMockEvent());

  ownershipTransferredEvent.parameters = new Array();

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam('previousOwner', ethereum.Value.fromAddress(previousOwner)),
  );
  ownershipTransferredEvent.parameters.push(new ethereum.EventParam('newOwner', ethereum.Value.fromAddress(newOwner)));

  return ownershipTransferredEvent;
}

export function createReserveCapChangedEvent(newReserveCap: BigInt, newGovReserveCap: BigInt): ReserveCapChanged {
  let reserveCapChangedEvent = changetype<ReserveCapChanged>(newMockEvent());

  reserveCapChangedEvent.parameters = new Array();

  reserveCapChangedEvent.parameters.push(
    new ethereum.EventParam('newReserveCap', ethereum.Value.fromSignedBigInt(newReserveCap)),
  );
  reserveCapChangedEvent.parameters.push(
    new ethereum.EventParam('newGovReserveCap', ethereum.Value.fromSignedBigInt(newGovReserveCap)),
  );

  return reserveCapChangedEvent;
}

export function createReservePoolInitializedEvent(
  _stabilityPoolManager: Address,
  _priceFeed: Address,
  _stableDebtTokenAddress: Address,
  _govTokenAddress: Address,
): ReservePoolInitialized {
  let reservePoolInitializedEvent = changetype<ReservePoolInitialized>(newMockEvent());

  reservePoolInitializedEvent.parameters = new Array();

  reservePoolInitializedEvent.parameters.push(
    new ethereum.EventParam('_stabilityPoolManager', ethereum.Value.fromAddress(_stabilityPoolManager)),
  );
  reservePoolInitializedEvent.parameters.push(
    new ethereum.EventParam('_priceFeed', ethereum.Value.fromAddress(_priceFeed)),
  );
  reservePoolInitializedEvent.parameters.push(
    new ethereum.EventParam('_stableDebtTokenAddress', ethereum.Value.fromAddress(_stableDebtTokenAddress)),
  );
  reservePoolInitializedEvent.parameters.push(
    new ethereum.EventParam('_govTokenAddress', ethereum.Value.fromAddress(_govTokenAddress)),
  );

  return reservePoolInitializedEvent;
}

export function createWithdrewReservesEvent(govAmount: BigInt, stableAmount: BigInt): WithdrewReserves {
  let withdrewReservesEvent = changetype<WithdrewReserves>(newMockEvent());

  withdrewReservesEvent.parameters = new Array();

  withdrewReservesEvent.parameters.push(
    new ethereum.EventParam('govAmount', ethereum.Value.fromSignedBigInt(govAmount)),
  );
  withdrewReservesEvent.parameters.push(
    new ethereum.EventParam('stableAmount', ethereum.Value.fromSignedBigInt(stableAmount)),
  );

  return withdrewReservesEvent;
}
