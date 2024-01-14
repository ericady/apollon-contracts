import { afterAll, assert, clearStore, describe, newMockEvent, test } from 'matchstick-as/assembly/index';
import { handleCreateUpdateCollateralTokenMeta } from '../src/entities/collateral-token-meta-entity';
import { MockCollateralToken1Address, MockTroveManagerAddress } from './debt-token-utils';

describe('handleNewCollateralTokenMeta()', () => {
  afterAll(() => {
    clearStore();
  });

  test('CollateralTokenMeta entity created and stored when a single collateral token has been changed', () => {
    const genericEvent = newMockEvent();

    handleCreateUpdateCollateralTokenMeta(genericEvent, MockCollateralToken1Address, MockTroveManagerAddress);

    // TODO: use event driven testing not entity function
    // handleCollateralUpdated(newCollateralUpdatedEvent);

    assert.entityCount('CollateralTokenMeta', 1);
  });
});
