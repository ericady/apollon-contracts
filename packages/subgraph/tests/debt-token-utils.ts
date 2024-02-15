import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { createMockedFunction, newMockEvent } from 'matchstick-as';
import { Approval, Transfer } from '../generated/templates/DebtTokenTemplate/DebtToken';
import { MockDebtTokenAddress, MockStabilityPoolManagerAddress } from './utils';
import { oneEther } from '../src/entities/token-candle-entity';

// TODO: Remove me later. This is how to log in AssemblyScript
// import { Address, BigInt, Bytes, ethereum, log } from '@graphprotocol/graph-ts';
// log.info('My value is: {}', [newProvidedStablitySinceLastCollClaim!.toString()]);

export const mockDebtToken_stabilityPoolManagerAddress = (): void => {
  createMockedFunction(
    MockDebtTokenAddress,
    'stabilityPoolManagerAddress',
    'stabilityPoolManagerAddress():(address)',
  ).returns([ethereum.Value.fromAddress(MockStabilityPoolManagerAddress)]);
};
export const mockDebtToken_totalSupply = (): void => {
  createMockedFunction(MockDebtTokenAddress, 'totalSupply', 'totalSupply():(uint256)').returns([
    ethereum.Value.fromSignedBigInt(oneEther.times(BigInt.fromI32(100))),
  ]);
};

export function createApprovalEvent(owner: Address, spender: Address, value: BigInt): Approval {
  let approvalEvent = changetype<Approval>(newMockEvent());
  approvalEvent.address = MockDebtTokenAddress;

  approvalEvent.parameters = new Array();

  approvalEvent.parameters.push(new ethereum.EventParam('owner', ethereum.Value.fromAddress(owner)));
  approvalEvent.parameters.push(new ethereum.EventParam('spender', ethereum.Value.fromAddress(spender)));
  approvalEvent.parameters.push(new ethereum.EventParam('value', ethereum.Value.fromSignedBigInt(value)));

  return approvalEvent;
}

export function createTransferEvent(from: Address, to: Address, value: BigInt): Transfer {
  let transferEvent = changetype<Transfer>(newMockEvent());
  transferEvent.address = MockDebtTokenAddress;

  transferEvent.parameters = new Array();

  transferEvent.parameters.push(new ethereum.EventParam('from', ethereum.Value.fromAddress(from)));
  transferEvent.parameters.push(new ethereum.EventParam('to', ethereum.Value.fromAddress(to)));
  transferEvent.parameters.push(new ethereum.EventParam('value', ethereum.Value.fromSignedBigInt(value)));

  return transferEvent;
}
