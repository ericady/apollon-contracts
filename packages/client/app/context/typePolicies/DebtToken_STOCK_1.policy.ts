import { makeVar } from '@apollo/client';
import { AddressLike } from 'ethers';
import { Contracts, isStableCoinAddress } from '../../../config';
import { DebtToken, PriceFeed, StabilityPoolManager, TroveManager } from '../../../generated/types';
import { getCheckSum } from '../../utils/crypto';
import { ContractDataFreshnessManager, SchemaDataFreshnessManager } from '../CustomApolloProvider';

const defaultFieldValue = BigInt(0);

const DebtToken_STOCK_1 = {
  [Contracts.DebtToken.STOCK_1]: {
    priceUSDOracle: {
      fetch: async (priceFeedContract: PriceFeed) => {
        SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].priceUSDOracle.lastFetched = Date.now();

        const tokenPrice = (await priceFeedContract.getPrice(Contracts.DebtToken.STOCK_1)).price;

        SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].priceUSDOracle.value(tokenPrice);
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    borrowingRate: {
      fetch: async (troveManagerContract: TroveManager) => {
        SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].borrowingRate.lastFetched = Date.now();

        const borrowingRate = await troveManagerContract.getBorrowingRate(
          isStableCoinAddress(Contracts.DebtToken.STOCK_1),
        );

        SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].borrowingRate.value(borrowingRate);
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    decimals: {
      fetch: async (debtTokenContract: DebtToken) => {
        SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].decimals.lastFetched = Date.now();

        const decimals = await debtTokenContract.decimals();

        SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].decimals.value(Number(decimals) as any);
      },
      value: makeVar(Number(defaultFieldValue) as any),
      lastFetched: 0,
      timeout: 1000 * 3600,
    },

    walletAmount: {
      fetch: async (debtTokenContract: DebtToken, borrower: AddressLike) => {
        SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].walletAmount.lastFetched = Date.now();

        const borrowerBalance = await debtTokenContract.balanceOf(borrower);

        SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].walletAmount.value(borrowerBalance);
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    troveMintedAmount: {
      fetch: async (fetchSource?: { troveManagerContract: TroveManager; borrower: AddressLike }) => {
        SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].troveMintedAmount.lastFetched = Date.now();

        if (fetchSource) {
          await ContractDataFreshnessManager.TroveManager.getTroveDebt.fetch(
            fetchSource.troveManagerContract,
            fetchSource.borrower,
          );
        }

        const tokenAmount = ContractDataFreshnessManager.TroveManager.getTroveDebt.value.find(
          ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.DebtToken.STOCK_1),
        )?.amount;
        if (tokenAmount) {
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].troveMintedAmount.value(tokenAmount);
        }
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    troveDebtAmount: {
      fetch: async (fetchSource?: { troveManagerContract: TroveManager; borrower: AddressLike }) => {
        SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].troveDebtAmount.lastFetched = Date.now();

        if (fetchSource) {
          await ContractDataFreshnessManager.TroveManager.getTroveRepayableDebts.fetch(
            fetchSource.troveManagerContract,
            fetchSource.borrower,
          );
        }

        const repayableDebt = ContractDataFreshnessManager.TroveManager.getTroveRepayableDebts.value.find(
          ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.DebtToken.STOCK_1),
        )?.amount;
        if (repayableDebt) {
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].troveDebtAmount.value(repayableDebt);
        }
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    troveRepableDebtAmount: {
      fetch: async (fetchSource?: { troveManagerContract: TroveManager; borrower: AddressLike }) => {
        SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].troveRepableDebtAmount.lastFetched =
          Date.now();

        if (fetchSource) {
          await ContractDataFreshnessManager.TroveManager.getTroveRepayableDebts.fetch(
            fetchSource.troveManagerContract,
            fetchSource.borrower,
          );
        }

        const repayableDebt = ContractDataFreshnessManager.TroveManager.getTroveRepayableDebts.value.find(
          ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.DebtToken.STOCK_1),
        )?.amount;
        if (repayableDebt) {
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].troveRepableDebtAmount.value(repayableDebt);
        }
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    providedStability: {
      fetch: async (fetchSource?: { stabilityPoolManagerContract: StabilityPoolManager; depositor: AddressLike }) => {
        SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].providedStability.lastFetched = Date.now();

        if (fetchSource) {
          await ContractDataFreshnessManager.StabilityPoolManager.getDepositorDeposits.fetch(
            fetchSource.stabilityPoolManagerContract,
            fetchSource.depositor,
          );
        }

        const tokenAmount = ContractDataFreshnessManager.StabilityPoolManager.getDepositorDeposits.value.find(
          ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.DebtToken.STOCK_1),
        )?.amount;
        if (tokenAmount) {
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].providedStability.value(tokenAmount);
        }
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    compoundedDeposit: {
      fetch: async (fetchSource?: { stabilityPoolManagerContract: StabilityPoolManager; depositor: AddressLike }) => {
        SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].compoundedDeposit.lastFetched = Date.now();

        if (fetchSource) {
          await ContractDataFreshnessManager.StabilityPoolManager.getDepositorCompoundedDeposits.fetch(
            fetchSource.stabilityPoolManagerContract,
            fetchSource.depositor,
          );
        }

        const compoundedDeposit =
          ContractDataFreshnessManager.StabilityPoolManager.getDepositorCompoundedDeposits.value.find(
            ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.DebtToken.STOCK_1),
          )?.amount;

        if (compoundedDeposit) {
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].compoundedDeposit.value(compoundedDeposit);
        }
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },
  },
};

export default DebtToken_STOCK_1;
