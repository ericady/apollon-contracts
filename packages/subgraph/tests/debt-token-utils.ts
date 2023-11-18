import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { Address as EventAddress } from '@graphprotocol/graph-ts/common/numbers';
import { newMockEvent } from 'matchstick-as';
import {
  Approval,
  BorrowerOperationsAddressChanged,
  DebtToken,
  PriceFeedAddressChanged,
  StabilityPoolManagerAddressChanged,
  Transfer,
  Transfer as TransferEvent,
  TroveManagerAddressChanged,
} from '../generated/DebtToken/DebtToken';
import { StabilityPool } from '../generated/StabilityPool/StabilityPool';
import { StabilityPoolManager } from '../generated/StabilityPoolManager/StabilityPoolManager';
import { TroveManager } from '../generated/TroveManager/TroveManager';
import { DebtTokenMeta, Token, UserDebtTokenMeta } from '../generated/schema';

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

// When a Token is created
export function handleNewToken(event: PriceFeedAddressChanged, tokenAddress: Address): void {
  let newToken = new Token(tokenAddress);

  const contract = DebtToken.bind(tokenAddress);

  newToken.address = tokenAddress;
  newToken.symbol = contract.symbol();
  newToken.createdAt = event.block.timestamp;
  newToken.priceUSD = contract.getPrice();

  // FIXME: When is this false?
  newToken.isPoolToken = true;

  newToken.save();
}

// FIXME: Still needs event implementation
export function updateTokenPrice(tokenAddress: Address): void {
  const contract = DebtToken.bind(tokenAddress);

  const token = Token.load(tokenAddress)!;
  token.priceUSD = contract.getPrice();
  token.save();
}

export function handleNewDebtTokenMeta(event: TransferEvent, tokenAddress: Address): void {
  const debtTokenMeta = new DebtTokenMeta(event.transaction.hash.concatI32(event.logIndex.toI32()));

  const tokenContract = DebtToken.bind(tokenAddress);
  const debtTokenStabilityPoolManagerContract = StabilityPoolManager.bind(tokenContract.stabilityPoolManagerAddress());
  const debtTokenStabilityPoolContract = StabilityPool.bind(
    debtTokenStabilityPoolManagerContract.getStabilityPool(tokenAddress),
  );

  debtTokenMeta.token = tokenAddress;
  debtTokenMeta.timestamp = event.block.timestamp;
  debtTokenMeta.totalSupplyUSD = tokenContract.totalSupply().times(tokenContract.getPrice());

  debtTokenMeta.stabilityDepositAPY = debtTokenStabilityPoolContract.getStabilityAPY();
  debtTokenMeta.totalDepositedStability = debtTokenStabilityPoolContract.getTotalDeposit();
  // TODO: Find the right contracts for it and implement getters
  debtTokenMeta.totalReserve = BigInt.fromI32(0);

  debtTokenMeta.save();
}

export function updateUserDebtTokenMeta(
  tokenAddress: Address,
  borrower: Address,
  newProvidedStablitySinceLastCollClaim?: BigInt,
): void {
  let userDebtTokenMeta = UserDebtTokenMeta.load(
    `UserDebtTokenMeta-${tokenAddress.toHexString()}-${borrower.toHexString()}`,
  );
  if (!userDebtTokenMeta) {
    userDebtTokenMeta = new UserDebtTokenMeta(
      `UserDebtTokenMeta-${tokenAddress.toHexString()}-${borrower.toHexString()}`,
    );
  }

  const tokenContract = DebtToken.bind(tokenAddress);
  const troveManagerContract = TroveManager.bind(tokenContract.troveManagerAddress());

  userDebtTokenMeta.token = tokenAddress;

  userDebtTokenMeta.borrower = borrower;
  userDebtTokenMeta.walletAmount = tokenContract.balanceOf(borrower);

  const trove = troveManagerContract.getTroveDebt(borrower);

  // Clossure not supported yet
  let troveIndex = -1;
  const targetAddress = tokenAddress;
  for (let i = 0; i < trove.length; i++) {
    if (trove[i].tokenAddress.toHexString() == targetAddress.toHexString()) {
      troveIndex = i;
      break;
    }
  }
  const troveMintedAmount = trove[troveIndex].amount;

  userDebtTokenMeta.troveMintedAmount = troveMintedAmount;

  if (newProvidedStablitySinceLastCollClaim) {
    userDebtTokenMeta.providedStablitySinceLastCollClaim = newProvidedStablitySinceLastCollClaim;
  } else {
    userDebtTokenMeta.providedStablitySinceLastCollClaim = userDebtTokenMeta.providedStablitySinceLastCollClaim;
  }

  const stabilityPoolManagerContract = StabilityPoolManager.bind(tokenContract.stabilityPoolManagerAddress());
  const stabilityPoolContract = StabilityPool.bind(stabilityPoolManagerContract.getStabilityPool(tokenAddress));
  userDebtTokenMeta.stabilityCompoundAmount = stabilityPoolContract.getCompoundedDebtDeposit(borrower);

  userDebtTokenMeta.save();
}
