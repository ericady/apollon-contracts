import { makeVar } from '@apollo/client';
import { AddressLike } from 'ethers';
import { Contracts, isStableCoinAddress } from '../../../config';
import { DebtToken, PriceFeed, StabilityPoolManager, TroveManager } from '../../../generated/types';
import { getCheckSum } from '../../utils/crypto';
import { ContractDataFreshnessManager, SchemaDataFreshnessManager, defaultFieldValue } from '../CustomApolloProvider';

const DebtToken_STABLE = {
  [Contracts.DebtToken.STABLE]: {
    priceUSDOracle: {
      fetch: async (priceFeedContract: PriceFeed) => {
        SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].priceUSDOracle.lastFetched = Date.now();

        const tokenPrice = (await priceFeedContract.getPrice(Contracts.DebtToken.STABLE)).price;

        SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].priceUSDOracle.value(tokenPrice);
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    borrowingRate: {
      fetch: async (troveManagerContract: TroveManager) => {
        SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].borrowingRate.lastFetched = Date.now();

        const borrowingRate = await troveManagerContract.getBorrowingRate(
          isStableCoinAddress(Contracts.DebtToken.STABLE),
        );

        SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].borrowingRate.value(borrowingRate);
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    decimals: {
      fetch: async (debtTokenContract: DebtToken) => {
        SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].decimals.lastFetched = Date.now();

        const decimals = await debtTokenContract.decimals();

        SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].decimals.value(Number(decimals) as any);
      },
      value: makeVar(Number(defaultFieldValue) as any),
      lastFetched: 0,
      timeout: 1000 * 3600,
    },

    walletAmount: {
      fetch: async (debtTokenContract: DebtToken, borrower: AddressLike) => {
        SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].walletAmount.lastFetched = Date.now();

        const borrowerBalance = await debtTokenContract.balanceOf(borrower);

        SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].walletAmount.value(borrowerBalance);
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    troveMintedAmount: {
      fetch: async (fetchSource?: { troveManagerContract: TroveManager; borrower: AddressLike }) => {
        SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].troveMintedAmount.lastFetched = Date.now();

        if (fetchSource) {
          await ContractDataFreshnessManager.TroveManager.getTroveDebt.fetch(
            fetchSource.troveManagerContract,
            fetchSource.borrower,
          );
        }

        const tokenAmount = ContractDataFreshnessManager.TroveManager.getTroveDebt.value.find(
          ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.DebtToken.STABLE),
        )?.amount;
        if (tokenAmount) {
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].troveMintedAmount.value(tokenAmount);
        }
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    troveDebtAmount: {
      fetch: async (fetchSource?: { troveManagerContract: TroveManager; borrower: AddressLike }) => {
        if (fetchSource) {
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].troveDebtAmount.lastFetched = Date.now();
          // Here we get the debt without the non-repayable debts, only applies to STABLE for now
          const troveRepayableDebts = await fetchSource.troveManagerContract['getTroveRepayableDebts(address,bool)'](
            fetchSource.borrower,
            true,
          );

          const tokenAmounts = troveRepayableDebts.map(([tokenAddress, amount]) => ({
            tokenAddress,
            amount,
          }));

          const debtAmount = tokenAmounts.find(
            ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.DebtToken.STABLE),
          )?.amount;

          if (debtAmount) {
            SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].troveDebtAmount.value(debtAmount);
          }
        }
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    troveRepableDebtAmount: {
      fetch: async (fetchSource?: { troveManagerContract: TroveManager; borrower: AddressLike }) => {
        SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].troveRepableDebtAmount.lastFetched =
          Date.now();

        if (fetchSource) {
          await ContractDataFreshnessManager.TroveManager.getTroveRepayableDebts.fetch(
            fetchSource.troveManagerContract,
            fetchSource.borrower,
          );
        }

        const repayableDebt = ContractDataFreshnessManager.TroveManager.getTroveRepayableDebts.value.find(
          ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.DebtToken.STABLE),
        )?.amount;
        if (repayableDebt) {
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].troveRepableDebtAmount.value(repayableDebt);
        }
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    providedStability: {
      fetch: async (fetchSource?: { stabilityPoolManagerContract: StabilityPoolManager; depositor: AddressLike }) => {
        SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].providedStability.lastFetched = Date.now();

        if (fetchSource) {
          await ContractDataFreshnessManager.StabilityPoolManager.getDepositorDeposits.fetch(
            fetchSource.stabilityPoolManagerContract,
            fetchSource.depositor,
          );
        }

        const tokenAmount = ContractDataFreshnessManager.StabilityPoolManager.getDepositorDeposits.value.find(
          ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.DebtToken.STABLE),
        )?.amount;
        if (tokenAmount) {
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].providedStability.value(tokenAmount);
        }
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },

    compoundedDeposit: {
      fetch: async (fetchSource?: { stabilityPoolManagerContract: StabilityPoolManager; depositor: AddressLike }) => {
        SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].compoundedDeposit.lastFetched = Date.now();

        if (fetchSource) {
          await ContractDataFreshnessManager.StabilityPoolManager.getDepositorCompoundedDeposits.fetch(
            fetchSource.stabilityPoolManagerContract,
            fetchSource.depositor,
          );
        }

        const compoundedDeposit =
          ContractDataFreshnessManager.StabilityPoolManager.getDepositorCompoundedDeposits.value.find(
            ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.DebtToken.STABLE),
          )?.amount;

        if (compoundedDeposit) {
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].compoundedDeposit.value(compoundedDeposit);
        }
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 2,
    },
  },
};

export default DebtToken_STABLE;
