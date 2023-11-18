import { afterAll, assert, clearStore, describe, test } from 'matchstick-as/assembly/index';
import { handleCollateralUpdated } from '../src/trove-manager';
import { MockCollateralToken1Address, MockCollateralToken2Address, MockUserAddress } from './debt-token-utils';
import { createCollateralUpdatedEvent } from './trove-manager-utils';
import { mockTroveManagerGetAllTroveCollUSD } from './trove-manager.test';

describe('handleNewCollateralTokenMeta()', () => {
  afterAll(() => {
    clearStore();
  });

  test('CollateralTokenMeta entity created and stored when a single collateral token has been changed', () => {
    const newCollateralUpdatedEvent = createCollateralUpdatedEvent(MockUserAddress, [MockCollateralToken1Address]);

    mockTroveManagerGetAllTroveCollUSD(MockCollateralToken1Address);

    handleCollateralUpdated(newCollateralUpdatedEvent);

    assert.entityCount('CollateralTokenMeta', 1);
  });

  test('2 CollateralTokenMeta entity created and stored when a two collateral token have been changed', () => {
    const newCollateralUpdatedEvent = createCollateralUpdatedEvent(MockUserAddress, [
      MockCollateralToken1Address,
      MockCollateralToken2Address,
    ]);

    mockTroveManagerGetAllTroveCollUSD(MockCollateralToken1Address);
    mockTroveManagerGetAllTroveCollUSD(MockCollateralToken2Address);

    handleCollateralUpdated(newCollateralUpdatedEvent);

    assert.entityCount('CollateralTokenMeta', 2);
  });
});
