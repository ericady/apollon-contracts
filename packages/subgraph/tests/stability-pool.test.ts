import { BigInt } from '@graphprotocol/graph-ts';
import { assert, beforeAll, test } from 'matchstick-as';
import { afterAll, clearStore, describe } from 'matchstick-as/assembly/index';
import { handleStabilityProvided } from '../src/stability-pool';
import { handleStabilityPoolAdded } from '../src/stability-pool-manager';
import { mockDebtToken_stabilityPoolManagerAddress, mockDebtToken_totalSupply } from './debt-token-utils';
import {
  createStabilityPoolAddedEvent,
  mockStabilityPoolManager_getStabilityPool,
} from './stability-pool-manager-utils';
import {
  createStabilityProvidedEvent,
  mockStabilityPool_depositToken,
  mockStabilityPool_getTotalDeposit,
  mockStabilityPool_stabilityPoolManagerAddress,
} from './stability-pool-utils';
import { MockDebtTokenAddress, MockUserAddress, initSystemInfo, initToken } from './utils';

describe('handleStabilityProvided()', () => {
  beforeAll(() => {
    initSystemInfo();
  });

  afterAll(() => {
    clearStore();
  });

  test('handleCreateUpdateDebtTokenMeta is called successfully', () => {
    initToken();

    const event = createStabilityProvidedEvent(MockUserAddress, BigInt.fromI32(10));

    // create Stability pool first
    const addStabilityPoolEvent = createStabilityPoolAddedEvent(event.address);
    handleStabilityPoolAdded(addStabilityPoolEvent);

    mockStabilityPool_depositToken();
    mockStabilityPool_stabilityPoolManagerAddress();
    mockStabilityPool_getTotalDeposit();
    mockStabilityPoolManager_getStabilityPool();
    mockDebtToken_stabilityPoolManagerAddress();
    mockDebtToken_totalSupply();

    handleStabilityProvided(event);

    const entityId = `DebtTokenMeta-${MockDebtTokenAddress.toHexString()}`;
    assert.entityCount('DebtTokenMeta', 1);
    assert.fieldEquals('DebtTokenMeta', entityId, 'token', MockDebtTokenAddress.toHexString());
    assert.fieldEquals('DebtTokenMeta', entityId, 'totalDepositedStability', '10000000000000000000');
    assert.fieldEquals('DebtTokenMeta', entityId, 'totalReserve', '0');
    assert.fieldEquals('DebtTokenMeta', entityId, 'totalSupplyUSD', '200000000000000000000');
  });

  test('borrower history event entity is created', () => {
    const event = createStabilityProvidedEvent(MockUserAddress, BigInt.fromI32(10));

    // create Stability pool first
    const addStabilityPoolEvent = createStabilityPoolAddedEvent(event.address);
    handleStabilityPoolAdded(addStabilityPoolEvent);

    mockStabilityPool_depositToken();

    handleStabilityProvided(event);

    assert.entityCount('BorrowerHistory', 1);
    assert.fieldEquals(
      'BorrowerHistory',
      event.transaction.hash.concatI32(event.logIndex.toI32()).toHexString(),
      'pool',
      event.address.toHexString(),
    );
    assert.fieldEquals(
      'BorrowerHistory',
      event.transaction.hash.concatI32(event.logIndex.toI32()).toHexString(),
      'borrower',
      MockUserAddress.toHexString(),
    );
    assert.fieldEquals(
      'BorrowerHistory',
      event.transaction.hash.concatI32(event.logIndex.toI32()).toHexString(),
      'type',
      'DEPOSITED',
    );
    const linkedTokenAmount = event.transaction.hash
      .concatI32(event.logIndex.toI32())
      .concat(MockDebtTokenAddress)
      .toHexString();
    assert.fieldEquals(
      'BorrowerHistory',
      event.transaction.hash.concatI32(event.logIndex.toI32()).toHexString(),
      'values',
      `[${linkedTokenAmount}]`,
    );

    assert.entityCount('TokenAmount', 1);
    assert.fieldEquals('TokenAmount', linkedTokenAmount, 'token', MockDebtTokenAddress.toHexString());
    assert.fieldEquals('TokenAmount', linkedTokenAmount, 'amount', BigInt.fromI32(10).toString());
  });
});
