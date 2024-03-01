import { makeVar } from '@apollo/client';
import { AddressLike } from 'ethers';
import { Contracts, isStableCoinAddress } from '../../../config';
import { CollSurplusPool, ERC20, PriceFeed, StabilityPoolManager, TroveManager } from '../../../generated/types';
import { getCheckSum } from '../../utils/crypto';
import { ContractDataFreshnessManager, SchemaDataFreshnessManager } from '../CustomApolloProvider';

const defaultFieldValue = BigInt(0);

const ERC20_USDT = {
  [Contracts.ERC20.USDT]: {
    priceUSDOracle: {
      fetch: async (priceFeedContract: PriceFeed) => {
        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.USDT].priceUSDOracle.lastFetched = Date.now();

        const tokenPrice = (await priceFeedContract.getPrice(Contracts.ERC20.USDT)).price;

        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.USDT].priceUSDOracle.value(tokenPrice);
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    borrowingRate: {
      fetch: async (troveManagerContract: TroveManager) => {
        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.USDT].borrowingRate.lastFetched = Date.now();

        const borrowingRate = await troveManagerContract.getBorrowingRate(isStableCoinAddress(Contracts.ERC20.USDT));

        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.USDT].borrowingRate.value(borrowingRate);
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    decimals: {
      fetch: async (collTokenContract: ERC20) => {
        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.USDT].decimals.lastFetched = Date.now();

        const decimals = await collTokenContract.decimals();

        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.USDT].decimals.value(Number(decimals) as any);
      },
      value: makeVar(Number(defaultFieldValue) as any),
      lastFetched: 0,
      timeout: 1000 * 3600,
    },

    walletAmount: {
      fetch: async (collTokenContract: ERC20, depositor: AddressLike) => {
        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.USDT].walletAmount.lastFetched = Date.now();

        const walletAmount = await collTokenContract.balanceOf(depositor);

        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.USDT].walletAmount.value(walletAmount);
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    troveLockedAmount: {
      fetch: async (fetchSource?: { troveManagerContract: TroveManager; borrower: AddressLike }) => {
        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.USDT].troveLockedAmount.lastFetched = Date.now();

        if (fetchSource) {
          await ContractDataFreshnessManager.TroveManager.getTroveWithdrawableColls.fetch(
            fetchSource.troveManagerContract,
            fetchSource.borrower,
          );
        }

        const tokenAmount = ContractDataFreshnessManager.TroveManager.getTroveWithdrawableColls.value.find(
          ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.ERC20.USDT),
        )?.amount;
        if (tokenAmount) {
          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.USDT].troveLockedAmount.value(tokenAmount);
        }
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    stabilityGainedAmount: {
      fetch: async (fetchSource?: { stabilityPoolManagerContract: StabilityPoolManager; depositor: AddressLike }) => {
        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.USDT].stabilityGainedAmount.lastFetched = Date.now();

        if (fetchSource) {
          await ContractDataFreshnessManager.StabilityPoolManager.getDepositorCollGains.fetch(
            fetchSource.stabilityPoolManagerContract,
            fetchSource.depositor,
          );
        }

        const tokenAmount = ContractDataFreshnessManager.StabilityPoolManager.getDepositorCollGains.value.find(
          ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.ERC20.USDT),
        )?.amount;
        if (tokenAmount) {
          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.USDT].stabilityGainedAmount.value(tokenAmount);
        }
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    collSurplusAmount: {
      fetch: async (fetchSource?: { collSurplusContract: CollSurplusPool; depositor: AddressLike }) => {
        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.USDT].collSurplusAmount.lastFetched = Date.now();

        if (fetchSource) {
          await ContractDataFreshnessManager.CollSurplusPool.getCollateral.fetch(
            fetchSource.collSurplusContract,
            fetchSource.depositor,
          );
        }

        const tokenAmount = ContractDataFreshnessManager.CollSurplusPool.getCollateral.value.find(
          ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.ERC20.USDT),
        )?.amount;
        if (tokenAmount) {
          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.USDT].collSurplusAmount.value(tokenAmount);
        }
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },
  },
};

export default ERC20_USDT;
