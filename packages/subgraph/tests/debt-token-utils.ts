import { Address, BigInt, Bytes, bigDecimal, ethereum } from '@graphprotocol/graph-ts';
import { newMockEvent } from 'matchstick-as';
import {
  Approval,
  BorrowerOperationsAddressChanged,
  DebtToken,
  PriceFeedAddressChanged,
  Registered,
  Registered as RegisteredEvent,
  StabilityPoolManagerAddressChanged,
  Transfer,
  Transfer as TransferEvent,
  TroveManagerAddressChanged,
} from '../generated/DebtToken/DebtToken';
import { DebtTokenMeta, Token, UserDebtTokenMeta } from '../generated/schema';
import { convertToDecimal } from './utils';

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

  priceFeedAddressChangedEvent.parameters = new Array();

  priceFeedAddressChangedEvent.parameters.push(
    new ethereum.EventParam('_newPriceFeedAddress', ethereum.Value.fromAddress(_newPriceFeedAddress)),
  );

  return priceFeedAddressChangedEvent;
}

export function createRegisteredEvent(): Registered {
  let registeredEvent = changetype<Registered>(newMockEvent());

  registeredEvent.parameters = new Array();

  return registeredEvent;
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

// When a Token is created
export function handleNewToken(event: RegisteredEvent, tokenAddress: Bytes): void {
  let newToken = new Token(tokenAddress);

  const contract = DebtToken.bind(tokenAddress);

  newToken.address = tokenAddress;
  newToken.symbol = contract.symbol();
  newToken.createdAt = event.block.timestamp;
  newToken.priceUSD = convertToDecimal(contract.getPrice());

  // FIXME: When is this false?
  newToken.isPoolToken = true;

  newToken.save();
}

export function updateTokenPrice(tokenAddress: Bytes): void {
  const contract = DebtToken.bind(tokenAddress);

  const token = Token.load(tokenAddress)!;
  token.priceUSD = convertToDecimal(contract.getPrice());
  token.save();
}

export function handleNewDebtTokenMeta(event: TransferEvent, tokenAddress: Bytes): void {
  const debtTokenMeta = new DebtTokenMeta(event.transaction.hash.concatI32(event.logIndex.toI32()));

  const contract = DebtToken.bind(tokenAddress);

  debtTokenMeta.token = tokenAddress;
  debtTokenMeta.timestamp = event.block.timestamp;
  debtTokenMeta.totalSupplyUSD = convertToDecimal(contract.totalSupply().times(contract.getPrice()));

  // TODO: Find the right contracts for it and implement getters
  debtTokenMeta.stabilityDepositAPY = bigDecimal.fromString('0');
  debtTokenMeta.totalDepositedStability = bigDecimal.fromString('0');
  debtTokenMeta.totalReserve = bigDecimal.fromString('0');

  debtTokenMeta.save();
}

export function handleNewUserDebtTokenMeta(event: TransferEvent, tokenAddress: Bytes, borrower: Bytes): void {
  const userDebtTokenMeta = new UserDebtTokenMeta(`UserDebtTokenMeta-${tokenAddress}-${borrower}`);

  const contract = DebtToken.bind(tokenAddress);

  userDebtTokenMeta.token = tokenAddress;

  // TODO: Find the right contracts for it and implement getters
  userDebtTokenMeta.borrower = borrower;
  userDebtTokenMeta.walletAmount = bigDecimal.fromString('0');
  userDebtTokenMeta.troveMintedAmount = bigDecimal.fromString('0');
  userDebtTokenMeta.stabilityLostAmount = bigDecimal.fromString('0');
  userDebtTokenMeta.stabilityCompoundAmount = bigDecimal.fromString('0');

  userDebtTokenMeta.save();
}
