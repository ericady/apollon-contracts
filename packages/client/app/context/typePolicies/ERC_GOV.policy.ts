import { makeVar } from '@apollo/client';
import { AddressLike } from 'ethers';
import { Contracts, isStableCoinAddress } from '../../../config';
import { CollSurplusPool, ERC20, PriceFeed, StabilityPoolManager, TroveManager } from '../../../generated/types';
import { getCheckSum } from '../../utils/crypto';
import { ContractDataFreshnessManager, SchemaDataFreshnessManager, defaultFieldValue } from '../CustomApolloProvider';

const ERC_GOV = {
  [Contracts.ERC20.GOV]: {
    priceUSDOracle: {
      fetch: async (priceFeedContract: PriceFeed) => {
        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.GOV].priceUSDOracle.lastFetched = Date.now();

        const tokenPrice = (await priceFeedContract.getPrice(Contracts.ERC20.GOV)).price;

        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.GOV].priceUSDOracle.value(tokenPrice);
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    borrowingRate: {
      fetch: async (troveManagerContract: TroveManager) => {
        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.GOV].borrowingRate.lastFetched = Date.now();

        const borrowingRate = await troveManagerContract.getBorrowingRate(isStableCoinAddress(Contracts.ERC20.GOV));

        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.GOV].borrowingRate.value(borrowingRate);
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    decimals: {
      fetch: async (collTokenContract: ERC20) => {
        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.GOV].decimals.lastFetched = Date.now();

        const decimals = await collTokenContract.decimals();

        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.GOV].decimals.value(Number(decimals) as any);
      },
      value: makeVar(Number(defaultFieldValue) as any),
      lastFetched: 0,
      timeout: 1000 * 3600,
    },

    walletAmount: {
      fetch: async (collTokenContract: ERC20, depositor: AddressLike) => {
        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.GOV].walletAmount.lastFetched = Date.now();

        const walletAmount = await collTokenContract.balanceOf(depositor);

        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.GOV].walletAmount.value(walletAmount);
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    troveLockedAmount: {
      fetch: async (fetchSource?: { troveManagerContract: TroveManager; borrower: AddressLike }) => {
        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.GOV].troveLockedAmount.lastFetched = Date.now();

        if (fetchSource) {
          await ContractDataFreshnessManager.TroveManager.getTroveWithdrawableColls.fetch(
            fetchSource.troveManagerContract,
            fetchSource.borrower,
          );
        }

        const tokenAmount = ContractDataFreshnessManager.TroveManager.getTroveWithdrawableColls.value.find(
          ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.ERC20.GOV),
        )?.amount;
        if (tokenAmount) {
          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.GOV].troveLockedAmount.value(tokenAmount);
        }
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    stabilityGainedAmount: {
      fetch: async (fetchSource?: { stabilityPoolManagerContract: StabilityPoolManager; depositor: AddressLike }) => {
        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.GOV].stabilityGainedAmount.lastFetched = Date.now();

        if (fetchSource) {
          await ContractDataFreshnessManager.StabilityPoolManager.getDepositorCollGains.fetch(
            fetchSource.stabilityPoolManagerContract,
            fetchSource.depositor,
          );
        }

        const tokenAmount = ContractDataFreshnessManager.StabilityPoolManager.getDepositorCollGains.value.find(
          ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.ERC20.GOV),
        )?.amount;
        if (tokenAmount) {
          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.GOV].stabilityGainedAmount.value(tokenAmount);
        }
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    collSurplusAmount: {
      fetch: async (fetchSource?: { collSurplusContract: CollSurplusPool; depositor: AddressLike }) => {
        SchemaDataFreshnessManager.ERC20[Contracts.ERC20.GOV].collSurplusAmount.lastFetched = Date.now();

        if (fetchSource) {
          await ContractDataFreshnessManager.CollSurplusPool.getCollateral.fetch(
            fetchSource.collSurplusContract,
            fetchSource.depositor,
          );
        }

        const tokenAmount = ContractDataFreshnessManager.CollSurplusPool.getCollateral.value.find(
          ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.ERC20.GOV),
        )?.amount;
        if (tokenAmount) {
          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.GOV].collSurplusAmount.value(tokenAmount);
        }
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },
  },
};

export default ERC_GOV;
