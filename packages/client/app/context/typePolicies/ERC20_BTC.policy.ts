import { makeVar } from '@apollo/client';
import { AddressLike } from 'ethers';
import { Contracts, isStableCoinAddress } from '../../../config';
import { CollSurplusPool, ERC20, PriceFeed, StabilityPoolManager, TroveManager } from '../../../generated/types';
import { getCheckSum } from '../../utils/crypto';
import { ContractDataFreshnessManager, SchemaDataFreshnessManager } from '../CustomApolloProvider';

const defaultFieldValue = BigInt(0);

const ERC20_BTC = {
  [Contracts.ERC20.BTC]: {
    priceUSDOracle: {
      fetch: async (priceFeedContract: PriceFeed) => {
        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.BTC].priceUSDOracle.lastFetched = Date.now();

        const tokenPrice = (await priceFeedContract.getPrice(Contracts.ERC20.BTC)).price;

        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.BTC].priceUSDOracle.value(tokenPrice);
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    borrowingRate: {
      fetch: async (troveManagerContract: TroveManager) => {
        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.BTC].borrowingRate.lastFetched = Date.now();

        const borrowingRate = await troveManagerContract.getBorrowingRate(isStableCoinAddress(Contracts.ERC20.BTC));

        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.BTC].borrowingRate.value(borrowingRate);
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    decimals: {
      fetch: async (collTokenContract: ERC20) => {
        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.BTC].decimals.lastFetched = Date.now();

        const decimals = await collTokenContract.decimals();

        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.BTC].decimals.value(Number(decimals) as any);
      },
      value: makeVar(Number(defaultFieldValue) as any),
      lastFetched: 0,
      timeout: 1000 * 3600,
    },

    walletAmount: {
      fetch: async (collTokenContract: ERC20, depositor: AddressLike) => {
        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.BTC].walletAmount.lastFetched = Date.now();

        const walletAmount = await collTokenContract.balanceOf(depositor);

        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.BTC].walletAmount.value(walletAmount);
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    troveLockedAmount: {
      fetch: async (fetchSource?: { troveManagerContract: TroveManager; borrower: AddressLike }) => {
        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.BTC].troveLockedAmount.lastFetched = Date.now();

        if (fetchSource) {
          await ContractDataFreshnessManager.TroveManager.getTroveWithdrawableColls.fetch(
            fetchSource.troveManagerContract,
            fetchSource.borrower,
          );
        }

        const tokenAmount = ContractDataFreshnessManager.TroveManager.getTroveWithdrawableColls.value.find(
          ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.ERC20.BTC),
        )?.amount;
        if (tokenAmount) {
          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.BTC].troveLockedAmount.value(tokenAmount);
        }
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    stabilityGainedAmount: {
      fetch: async (fetchSource?: { stabilityPoolManagerContract: StabilityPoolManager; depositor: AddressLike }) => {
        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.BTC].stabilityGainedAmount.lastFetched = Date.now();

        if (fetchSource) {
          await ContractDataFreshnessManager.StabilityPoolManager.getDepositorCollGains.fetch(
            fetchSource.stabilityPoolManagerContract,
            fetchSource.depositor,
          );
        }

        const tokenAmount = ContractDataFreshnessManager.StabilityPoolManager.getDepositorCollGains.value.find(
          ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.ERC20.BTC),
        )?.amount;
        if (tokenAmount) {
          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.BTC].stabilityGainedAmount.value(tokenAmount);
        }
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    collSurplusAmount: {
      fetch: async (fetchSource?: { collSurplusContract: CollSurplusPool; depositor: AddressLike }) => {
        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.BTC].collSurplusAmount.lastFetched = Date.now();

        if (fetchSource) {
          await ContractDataFreshnessManager.CollSurplusPool.getCollateral.fetch(
            fetchSource.collSurplusContract,
            fetchSource.depositor,
          );
        }

        const tokenAmount = ContractDataFreshnessManager.CollSurplusPool.getCollateral.value.find(
          ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.ERC20.BTC),
        )?.amount;
        if (tokenAmount) {
          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.BTC].collSurplusAmount.value(tokenAmount);
        }
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },
  },
};

export default ERC20_BTC;
