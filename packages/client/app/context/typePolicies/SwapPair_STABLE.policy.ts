import { makeVar } from '@apollo/client';
import { AddressLike } from 'ethers';
import { Contracts } from '../../../config';
import { SwapPair } from '../../../generated/types';
import { SchemaDataFreshnessManager, defaultFieldValue } from '../CustomApolloProvider';

const SwapPair_STABLE = {
  [Contracts.SwapPairs.STABLE]: {
    borrowerAmount: {
      fetch: async (swapPairContract: SwapPair, borrower: AddressLike) => {
        SchemaDataFreshnessManager.SwapPairs[Contracts.SwapPairs.STABLE].borrowerAmount.lastFetched = Date.now();

        const userPoolBalance = await swapPairContract.balanceOf(borrower);

        SchemaDataFreshnessManager.SwapPairs[Contracts.SwapPairs.STABLE].borrowerAmount.value(userPoolBalance);
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },
    swapFee: {
      fetch: async (swapPairContract: SwapPair) => {
        SchemaDataFreshnessManager.SwapPairs[Contracts.SwapPairs.STABLE].swapFee.lastFetched = Date.now();

        const swapFee = await swapPairContract.getSwapFee();

        SchemaDataFreshnessManager.SwapPairs[Contracts.SwapPairs.STABLE].swapFee.value(swapFee);
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },
  },
};

export default SwapPair_STABLE;
