import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { Address as EventAddress } from '@graphprotocol/graph-ts/common/numbers';
import { newMockEvent } from 'matchstick-as';
import {
  Approval,
  BorrowerOperationsAddressChanged,
  PriceFeedAddressChanged,
  StabilityPoolManagerAddressChanged,
  Transfer,
  TroveManagerAddressChanged,
} from '../generated/DebtToken/DebtToken';

export const MockDebtTokenAddress = EventAddress.fromString('0x0000000000000000000000000000000000000100');
export const MockStabilityPoolManagerAddress = EventAddress.fromString('0x0000000000000000000000000000000000000200');
export const MockStabilityPoolAddress = EventAddress.fromString('0x0000000000000000000000000000000000000300');
export const MockTroveManagerAddress = EventAddress.fromString('0x0000000000000000000000000000000000000400');
export const MockCollateralToken1Address = EventAddress.fromString('0x0000000000000000000000000000000000000500');
export const MockCollateralToken2Address = EventAddress.fromString('0x0000000000000000000000000000000000000501');
export const MockUserAddress = EventAddress.fromString('0x1000000000000000000000000000000000000000');

// TODO: Remove me later. This is how to log in AssemblyScript
// import { Address, BigInt, Bytes, ethereum, log } from '@graphprotocol/graph-ts';
// log.info('My value is: {}', [newProvidedStablitySinceLastCollClaim!.toString()]);

export function createApprovalEvent(owner: Address, spender: Address, value: BigInt): Approval {
  let approvalEvent = changetype<Approval>(newMockEvent());

  approvalEvent.parameters = new Array();

  approvalEvent.parameters.push(new ethereum.EventParam('owner', ethereum.Value.fromAddress(owner)));
  approvalEvent.parameters.push(new ethereum.EventParam('spender', ethereum.Value.fromAddress(spender)));
  approvalEvent.parameters.push(new ethereum.EventParam('value', ethereum.Value.fromUnsignedBigInt(value)));

  return approvalEvent;
}

export function createBorrowerOperationsAddressChangedEvent(
  _newBorrowerOperationsAddress: Address,
): BorrowerOperationsAddressChanged {
  let borrowerOperationsAddressChangedEvent = changetype<BorrowerOperationsAddressChanged>(newMockEvent());

  borrowerOperationsAddressChangedEvent.parameters = new Array();

  borrowerOperationsAddressChangedEvent.parameters.push(
    new ethereum.EventParam('_newBorrowerOperationsAddress', ethereum.Value.fromAddress(_newBorrowerOperationsAddress)),
  );

  return borrowerOperationsAddressChangedEvent;
}

export function createPriceFeedAddressChangedEvent(_newPriceFeedAddress: Address): PriceFeedAddressChanged {
  let priceFeedAddressChangedEvent = changetype<PriceFeedAddressChanged>(newMockEvent());
  priceFeedAddressChangedEvent.address = MockDebtTokenAddress;
  priceFeedAddressChangedEvent.parameters = new Array();

  priceFeedAddressChangedEvent.parameters.push(
    new ethereum.EventParam('_newPriceFeedAddress', ethereum.Value.fromAddress(_newPriceFeedAddress)),
  );

  return priceFeedAddressChangedEvent;
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

export function createTransferEvent(from: Address, to: Address, value: BigInt): Transfer {
  let transferEvent = changetype<Transfer>(newMockEvent());
  transferEvent.address = MockDebtTokenAddress;

  transferEvent.parameters = new Array();

  transferEvent.parameters.push(new ethereum.EventParam('from', ethereum.Value.fromAddress(from)));
  transferEvent.parameters.push(new ethereum.EventParam('to', ethereum.Value.fromAddress(to)));
  transferEvent.parameters.push(new ethereum.EventParam('value', ethereum.Value.fromUnsignedBigInt(value)));

  return transferEvent;
}

export function createTroveManagerAddressChangedEvent(_newTroveManagerAddress: Address): TroveManagerAddressChanged {
  let troveManagerAddressChangedEvent = changetype<TroveManagerAddressChanged>(newMockEvent());

  troveManagerAddressChangedEvent.parameters = new Array();

  troveManagerAddressChangedEvent.parameters.push(
    new ethereum.EventParam('_newTroveManagerAddress', ethereum.Value.fromAddress(_newTroveManagerAddress)),
  );

  return troveManagerAddressChangedEvent;
}
