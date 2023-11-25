import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { afterAll, assert, clearStore, createMockedFunction, describe, test } from 'matchstick-as/assembly/index';
import { Token } from '../generated/schema';
import { handleDebtTokenCreated, handleTransfer } from '../src/debt-token';
import {
  MockDebtTokenAddress,
  MockStabilityPoolAddress,
  MockStabilityPoolManagerAddress,
  MockTroveManagerAddress,
  MockUserAddress,
  createDebtTokenCreatedEvent,
  createTransferEvent,
} from './debt-token-utils';
import { mockStabilityPoolManagerGetStabilityPool } from './stability-pool-manager.test';

export const mockDebtTokenSymbol = (): void => {
  createMockedFunction(MockDebtTokenAddress, 'symbol', 'symbol():(string)').returns([
    ethereum.Value.fromString('JUSD'),
  ]);
};
export const mockDebtTokenPrice = (): void => {
  createMockedFunction(MockDebtTokenAddress, 'getPrice', 'getPrice():(uint256)').returns([
    ethereum.Value.fromSignedBigInt(BigInt.fromI32(1)),
  ]);
};
export const mockDebtTokenTotalSupply = (): void => {
  createMockedFunction(MockDebtTokenAddress, 'totalSupply', 'totalSupply():(uint256)').returns([
    ethereum.Value.fromSignedBigInt(BigInt.fromI32(1)),
  ]);
};
export const mockDebtTokenStabilityPoolManagerAddress = (): void => {
  createMockedFunction(
    MockDebtTokenAddress,
    'stabilityPoolManagerAddress',
    'stabilityPoolManagerAddress():(address)',
  ).returns([ethereum.Value.fromAddress(MockStabilityPoolManagerAddress)]);
};
export const mockDebtTokenTroveManagerAddress = (): void => {
  createMockedFunction(MockDebtTokenAddress, 'troveManagerAddress', 'troveManagerAddress():(address)').returns([
    ethereum.Value.fromAddress(MockTroveManagerAddress),
  ]);
};
export const mockDebtTokenBalanceOf = (): void => {
  createMockedFunction(MockDebtTokenAddress, 'balanceOf', 'balanceOf(address):(uint256)')
    .withArgs([ethereum.Value.fromAddress(MockUserAddress)])
    .returns([ethereum.Value.fromSignedBigInt(BigInt.fromI32(10))]);
};

export const mockStabilityPoolGetStabilityAPY = (): void => {
  createMockedFunction(MockStabilityPoolAddress, 'getStabilityAPY', 'getStabilityAPY():(uint256)').returns([
    ethereum.Value.fromSignedBigInt(BigInt.fromI32(10)),
  ]);
};
export const mockStabilityPoolGetTotalDeposit = (): void => {
  createMockedFunction(MockStabilityPoolAddress, 'getTotalDeposit', 'getTotalDeposit():(uint256)').returns([
    ethereum.Value.fromSignedBigInt(BigInt.fromI32(100)),
  ]);
};

describe('handlePriceFeedAddressChanged()', () => {
  afterAll(() => {
    clearStore();
  });

  test('Token entity created and stored', () => {
    const newCreatedEvent = createDebtTokenCreatedEvent();

    mockDebtTokenSymbol();
    mockDebtTokenPrice();

    handleDebtTokenCreated(newCreatedEvent);

    assert.entityCount('Token', 1);

    assert.fieldEquals(
      'Token',
      '0x0000000000000000000000000000000000000100',
      'address',
      '0x0000000000000000000000000000000000000100',
    );
    assert.fieldEquals('Token', '0x0000000000000000000000000000000000000100', 'priceUSD', '1');
  });
});

describe('handleTransfer()', () => {
  afterAll(() => {
    clearStore();
  });

  test(
    'Token entity priceUSD is updated',
    () => {
      const debtToken = new Token(MockDebtTokenAddress);
      debtToken.address = MockDebtTokenAddress;

      debtToken.createdAt = BigInt.fromI32(1);
      debtToken.symbol = 'JUSD';
      debtToken.isPoolToken = true;
      debtToken.priceUSD = BigInt.fromI32(1);
      debtToken.save();

      const newTransferEvent = createTransferEvent(
        Address.fromString('0x1000000000000000000000000000000000000000'),
        Address.fromString('0x2000000000000000000000000000000000000000'),
        BigInt.fromI32(1),
      );

      mockDebtTokenPrice();
      mockDebtTokenTotalSupply();
      mockDebtTokenStabilityPoolManagerAddress();
      mockStabilityPoolManagerGetStabilityPool();
      mockStabilityPoolGetStabilityAPY();
      mockStabilityPoolGetTotalDeposit();

      handleTransfer(newTransferEvent);

      assert.entityCount('DebtTokenMeta', 1);
    },
    true,
  );
});
