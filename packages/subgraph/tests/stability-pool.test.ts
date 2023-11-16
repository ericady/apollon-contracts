import { Address, BigInt, ethereum, log } from '@graphprotocol/graph-ts';
import { afterAll, assert, clearStore, createMockedFunction, describe, test } from 'matchstick-as/assembly/index';
import { UserDebtTokenMeta } from '../generated/schema';
import { handleUserClaimedRewards } from '../src/stability-pool';
import { MockDebtTokenAddress, MockStabilityPoolAddress, MockUserAddress } from './debt-token-utils';
import {
  mockDebtTokenBalanceOf,
  mockDebtTokenStabilityPoolManagerAddress,
  mockDebtTokenTroveManagerAddress,
} from './debt-token.test';
import { mockStabilityPoolManagerGetStabilityPool } from './stability-pool-manager.test';
import { createUserClaimedRewardsEvent } from './stability-pool-utils';
import { mockTroveManagerGetTroveDebt } from './trove-manager.test';

export const mockStabilityPoolGetDepositToken = (): void => {
  createMockedFunction(MockStabilityPoolAddress, 'getDepositToken', 'getDepositToken():(address)').returns([
    ethereum.Value.fromAddress(MockDebtTokenAddress),
  ]);
};
export const mockStabilityPoolDeposits = (): void => {
  createMockedFunction(MockStabilityPoolAddress, 'deposits', 'deposits(address):(uint256)')
    .withArgs([ethereum.Value.fromAddress(MockUserAddress)])
    .returns([ethereum.Value.fromSignedBigInt(BigInt.fromI32(10))]);
};
export const mockStabilityPoolGetCompoundedDebtDeposit = (): void => {
  createMockedFunction(
    MockStabilityPoolAddress,
    'getCompoundedDebtDeposit',
    'getCompoundedDebtDeposit(address):(uint256)',
  )
    .withArgs([ethereum.Value.fromAddress(MockUserAddress)])
    .returns([ethereum.Value.fromSignedBigInt(BigInt.fromI32(1))]);
};

describe('handleUserClaimedRewards()', () => {
  afterAll(() => {
    clearStore();
  });

  test('UserDebtTokenMeta entity is created', () => {
    const newUserClaimedRewardsEvent = createUserClaimedRewardsEvent(
      Address.fromString('0x1000000000000000000000000000000000000000'),
    );

    mockStabilityPoolGetDepositToken();
    mockStabilityPoolDeposits();
    mockDebtTokenBalanceOf();
    mockDebtTokenTroveManagerAddress();
    mockTroveManagerGetTroveDebt();
    mockDebtTokenStabilityPoolManagerAddress();
    mockStabilityPoolManagerGetStabilityPool();
    mockStabilityPoolGetCompoundedDebtDeposit();

    handleUserClaimedRewards(newUserClaimedRewardsEvent);

    assert.entityCount('UserDebtTokenMeta', 1);
    const entityId = `UserDebtTokenMeta-${MockDebtTokenAddress.toHexString()}-${MockUserAddress.toHexString()}`;

    assert.fieldEquals('UserDebtTokenMeta', entityId, 'borrower', MockUserAddress.toHexString());
    assert.fieldEquals('UserDebtTokenMeta', entityId, 'token', MockDebtTokenAddress.toHexString());
    assert.fieldEquals('UserDebtTokenMeta', entityId, 'walletAmount', BigInt.fromI32(10).toString());
    assert.fieldEquals('UserDebtTokenMeta', entityId, 'troveMintedAmount', BigInt.fromI32(1234).toString());
    assert.fieldEquals(
      'UserDebtTokenMeta',
      entityId,
      'providedStablitySinceLastCollClaim',
      BigInt.fromI32(10).toString(),
    );
    assert.fieldEquals('UserDebtTokenMeta', entityId, 'stabilityCompoundAmount', BigInt.fromI32(1).toString());
  });

  test('existing UserDebtTokenMeta entity is updated', () => {
    // save a dummy entity and make sure that its updating all fields of this existing entity
    const entityId = `UserDebtTokenMeta-${MockDebtTokenAddress.toHexString()}-${MockUserAddress.toHexString()}`;
    log.info('My entityId is: {}', [entityId]);
    const userDebtTokenMeta = new UserDebtTokenMeta(entityId);
    userDebtTokenMeta.token = MockDebtTokenAddress;
    userDebtTokenMeta.borrower = MockUserAddress;
    userDebtTokenMeta.walletAmount = BigInt.fromI32(1000);
    userDebtTokenMeta.troveMintedAmount = BigInt.fromI32(1000);
    userDebtTokenMeta.providedStablitySinceLastCollClaim = BigInt.fromI32(1000);
    userDebtTokenMeta.stabilityCompoundAmount = BigInt.fromI32(1000);
    userDebtTokenMeta.save();

    const newUserClaimedRewardsEvent = createUserClaimedRewardsEvent(
      Address.fromString('0x1000000000000000000000000000000000000000'),
    );

    mockStabilityPoolGetDepositToken();
    mockStabilityPoolDeposits();
    mockDebtTokenBalanceOf();
    mockDebtTokenTroveManagerAddress();
    mockTroveManagerGetTroveDebt();
    mockDebtTokenStabilityPoolManagerAddress();
    mockStabilityPoolManagerGetStabilityPool();
    mockStabilityPoolGetCompoundedDebtDeposit();

    handleUserClaimedRewards(newUserClaimedRewardsEvent);

    assert.entityCount('UserDebtTokenMeta', 1);

    assert.fieldEquals('UserDebtTokenMeta', entityId, 'borrower', MockUserAddress.toHexString());
    assert.fieldEquals('UserDebtTokenMeta', entityId, 'token', MockDebtTokenAddress.toHexString());
    assert.fieldEquals('UserDebtTokenMeta', entityId, 'walletAmount', BigInt.fromI32(10).toString());
    assert.fieldEquals('UserDebtTokenMeta', entityId, 'troveMintedAmount', BigInt.fromI32(1234).toString());
    assert.fieldEquals(
      'UserDebtTokenMeta',
      entityId,
      'providedStablitySinceLastCollClaim',
      BigInt.fromI32(10).toString(),
    );
    assert.fieldEquals('UserDebtTokenMeta', entityId, 'stabilityCompoundAmount', BigInt.fromI32(1).toString());
  });
});
