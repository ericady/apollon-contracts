import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { Address as EventAddress } from '@graphprotocol/graph-ts/common/numbers';
import { newMockEvent } from 'matchstick-as';
import { Approval, DebtTokenCreated, Transfer } from '../generated/DebtToken/DebtToken';

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
  approvalEvent.address = MockDebtTokenAddress;

  approvalEvent.parameters = new Array();

  approvalEvent.parameters.push(new ethereum.EventParam('owner', ethereum.Value.fromAddress(owner)));
  approvalEvent.parameters.push(new ethereum.EventParam('spender', ethereum.Value.fromAddress(spender)));
  approvalEvent.parameters.push(new ethereum.EventParam('value', ethereum.Value.fromUnsignedBigInt(value)));

  return approvalEvent;
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

export function createDebtTokenCreatedEvent(): DebtTokenCreated {
  let debtTokenCreatedEvent = changetype<DebtTokenCreated>(newMockEvent());
  debtTokenCreatedEvent.address = MockDebtTokenAddress;

  debtTokenCreatedEvent.parameters = new Array();

  return debtTokenCreatedEvent;
}
