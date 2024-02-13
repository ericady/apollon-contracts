import { Address } from '@graphprotocol/graph-ts';
import { afterAll, assert, beforeAll, clearStore, describe, test } from 'matchstick-as/assembly/index';
import { handleCollTokenAdded } from '../src/token-manager';
import { createCollTokenAddedEvent } from './token-manager-utils';

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe('Describe entity assertions', () => {
  beforeAll(() => {
    let _tokenAddress = Address.fromString('0x0000000000000000000000000000000000000001');
    let _isGovToken = 'boolean Not implemented';
    let newCollTokenAddedEvent = createCollTokenAddedEvent(_tokenAddress, _isGovToken);
    handleCollTokenAdded(newCollTokenAddedEvent);
  });

  afterAll(() => {
    clearStore();
  });

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test('CollTokenAdded created and stored', () => {
    assert.entityCount('CollTokenAdded', 1);

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      'CollTokenAdded',
      '0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1',
      '_tokenAddress',
      '0x0000000000000000000000000000000000000001',
    );
    assert.fieldEquals(
      'CollTokenAdded',
      '0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1',
      '_isGovToken',
      'boolean Not implemented',
    );

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  });
});
