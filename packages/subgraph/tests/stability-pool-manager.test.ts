import { ethereum } from '@graphprotocol/graph-ts';
import { createMockedFunction } from 'matchstick-as';
import { MockDebtTokenAddress, MockStabilityPoolAddress, MockStabilityPoolManagerAddress } from './debt-token-utils';

export const mockStabilityPoolManagerGetStabilityPool = (): void => {
  createMockedFunction(MockStabilityPoolManagerAddress, 'getStabilityPool', 'getStabilityPool(address):(address)')
    .withArgs([ethereum.Value.fromAddress(MockDebtTokenAddress)])
    .returns([ethereum.Value.fromAddress(MockStabilityPoolAddress)]);
};
