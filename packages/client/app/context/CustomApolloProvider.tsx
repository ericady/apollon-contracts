import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  ReactiveVar,
  Reference,
  TypePolicies,
  TypePolicy,
  makeVar,
} from '@apollo/client';
import { AddressLike, ethers } from 'ethers';
import { PropsWithChildren, useEffect } from 'react';
import { DebtToken, StabilityPoolManager, StoragePool, SwapPair, TroveManager } from '../../generated/types';
import {
  QueryTokenArgs,
  SystemInfo,
  TokenFragmentFragment,
  TroveManager as TroveManagerType,
} from '../generated/gql-types';
import { TOKEN_FRAGMENT } from '../queries';
import { floatToBigInt } from '../utils/math';
import { Contracts, useEthers } from './EthersProvider';

export function CustomApolloProvider({ children }: PropsWithChildren<{}>) {
  const {
    provider,
    contracts: {
      debtTokenContracts,
      troveManagerContract,
      swapPairContracts,
      stabilityPoolManagerContract,
      storagePoolContract,
    },
    address: borrower,
  } = useEthers();

  const cacheConfig =
    process.env.NEXT_PUBLIC_CONTRACT_MOCKING === 'enabled'
      ? { fields: {}, Query: {} }
      : getProductionCacheConfig({
          provider,
          borrower,
          debtTokenContracts,
          troveManagerContract,
          stabilityPoolManagerContract,
          swapPairContracts,
          storagePoolContract,
        });

  const client = new ApolloClient({
    // TODO: replace with our deployed graphql endpoint
    uri: 'http://localhost:8000/subgraphs/name/subgraph',

    connectToDevTools: true,
    cache: new InMemoryCache({
      typePolicies: {
        ...cacheConfig,

        Query: {
          fields: {
            swapEvents: {
              // Don't cache separate results based on
              // any of this field's arguments.
              keyArgs: [],
              // Concatenate the incoming list items with
              // the existing list items.
              merge(existing = [], incoming) {
                return [...existing, ...incoming];
              },
              read: (existing) => {
                return existing;
              },
            },

            borrowerHistories: {
              // Don't cache separate results based on
              // any of this field's arguments.
              keyArgs: [],
              // Concatenate the incoming list items with
              // the existing list items.
              merge(existing = [], incoming) {
                return [...existing, ...incoming];
              },
              read: (existing) => {
                return existing;
              },
            },
          },
        },
      },
    }),
  });

  // TODO: Implement periodic Updates
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_CONTRACT_MOCKING !== 'enabled') {

      SchemaDataFreshnessManager.SwapPairs['0x687E100f79ceD7Cc8b2BD19Eb326a28885F5b371']
      const priceUSDIntervall = setInterval(() => {
        console.log("priceUSDIntervall")
        if (isFieldOutdated(SchemaDataFreshnessManager.SwapPairs['0x687E100f79ceD7Cc8b2BD19Eb326a28885F5b371'], 'swapFee')) {
          console.log("isFieldOutdated")
          SchemaDataFreshnessManager.SwapPairs['0x687E100f79ceD7Cc8b2BD19Eb326a28885F5b371'].swapFee.fetch(
            swapPairContracts["STOCK_1"],
          );
        }
        // This can be any interval you want but it guarantees data freshness if its not already fresh.
      }, 1000 * 5);

      return () => {
        clearInterval(priceUSDIntervall);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}

const getProductionCacheConfig = ({
  provider,
  borrower,
  debtTokenContracts,
  troveManagerContract,
  stabilityPoolManagerContract,
  swapPairContracts,
  storagePoolContract,
}: {
  provider: ReturnType<typeof useEthers>['provider'];
  borrower: AddressLike;
  debtTokenContracts: ReturnType<typeof useEthers>['contracts']['debtTokenContracts'];
  troveManagerContract: ReturnType<typeof useEthers>['contracts']['troveManagerContract'];
  stabilityPoolManagerContract: ReturnType<typeof useEthers>['contracts']['stabilityPoolManagerContract'];
  swapPairContracts: ReturnType<typeof useEthers>['contracts']['swapPairContracts'];
  storagePoolContract: ReturnType<typeof useEthers>['contracts']['storagePoolContract'];
}): { fields: TypePolicies; Query: TypePolicy } => ({
  fields: {
    Token: {
      fields: {
        priceUSD24hAgo: {
          read() {
            // FIXME: Do this is a separate query later
            return 100;
          }
        },

        priceUSDOracle: {
          read(_, { args }) {
            if (
              isFieldOutdated(SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE], 'priceUSDOracle')
            ) {
              const address = (args as QueryTokenArgs).address;
              SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].priceUSDOracle.fetch(
                // FIXME: use address insteadof hardcoded contract
                debtTokenContracts[Contracts.DebtToken.STABLE],
              );
            }

            return SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].priceUSDOracle.value();
          },
        },
      },
    },

    DebtTokenMeta: {
      fields: {
        walletAmount: {
          read(_, { readField, cache }) {
            const token = readField('token') as Readonly<Reference>;

            const tokenData = cache.readFragment<TokenFragmentFragment>({
              id: token.__ref,
              fragment: TOKEN_FRAGMENT,
            });

            if (
              tokenData?.address &&
              isFieldOutdated(SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE], 'walletAmount')
            ) {
              // Make smart contract call using the address
              SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].walletAmount.fetch(
                debtTokenContracts[Contracts.DebtToken.STABLE],
                borrower,
              );
            }

            return SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].walletAmount.value();
          },
        },

        troveMintedAmount: {
          read(_, { readField, cache }) {
            const token = readField('token') as Readonly<Reference>;

            const tokenData = cache.readFragment<TokenFragmentFragment>({
              id: token.__ref,
              fragment: TOKEN_FRAGMENT,
            });

            if (
              tokenData?.address &&
              isFieldOutdated(SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE], 'troveMintedAmount')
            ) {
              SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].troveMintedAmount.fetch({
                troveManagerContract: troveManagerContract,
                borrower,
              });
            }

            return SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].troveMintedAmount.value();
          },
        },

        troveRepableDebtAmount: {
          read(_, { readField, cache }) {
            const token = readField('token') as Readonly<Reference>;

            const tokenData = cache.readFragment<TokenFragmentFragment>({
              id: token.__ref,
              fragment: TOKEN_FRAGMENT,
            });

            if (
              tokenData?.address &&
              isFieldOutdated(
                SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE],
                'troveRepableDebtAmount',
              )
            ) {
              SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].troveRepableDebtAmount.fetch(
                troveManagerContract,
                borrower,
              );
            }

            return SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].troveRepableDebtAmount.value();
          },
        },

        providedStability: {
          read(_, { readField, cache }) {
            const token = readField('token') as Readonly<Reference>;

            const tokenData = cache.readFragment<TokenFragmentFragment>({
              id: token.__ref,
              fragment: TOKEN_FRAGMENT,
            });

            if (
              tokenData?.address &&
              isFieldOutdated(SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE], 'providedStability')
            ) {
              SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].providedStability.fetch({
                stabilityPoolManagerContract,
                depositor: borrower,
              });
            }

            return SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].providedStability.value();
          },
        },

        compoundedDeposit: {
          read(_, { readField, cache }) {
            const token = readField('token') as Readonly<Reference>;

            const tokenData = cache.readFragment<TokenFragmentFragment>({
              id: token.__ref,
              fragment: TOKEN_FRAGMENT,
            });

            if (
              tokenData?.address &&
              isFieldOutdated(SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE], 'compoundedDeposit')
            ) {
              SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].compoundedDeposit.fetch({
                stabilityPoolManagerContract,
                depositor: borrower,
              });
            }

            return SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].compoundedDeposit.value();
          },
        },
      },
    },

    CollateralTokenMeta: {
      fields: {
        walletAmount: {
          read(_, { readField, cache }) {
            const token = readField('token') as Readonly<Reference>;

            const tokenData = cache.readFragment<TokenFragmentFragment>({
              id: token.__ref,
              fragment: TOKEN_FRAGMENT,
            });

            // FIXME: Change for dynamic address later

            if (
              tokenData?.address &&
              isFieldOutdated(SchemaDataFreshnessManager.ERC20[Contracts.ERC20.ETH], 'walletAmount')
            ) {
              SchemaDataFreshnessManager.ERC20[Contracts.ERC20.ETH].walletAmount.fetch(provider, tokenData.address);
            }

            return SchemaDataFreshnessManager.ERC20[Contracts.ERC20.ETH].walletAmount.value();
          },
        },

        troveLockedAmount: {
          read(_, { readField, cache }) {
            const token = readField('token') as Readonly<Reference>;

            const tokenData = cache.readFragment<TokenFragmentFragment>({
              id: token.__ref,
              fragment: TOKEN_FRAGMENT,
            });

            // FIXME: Change for dynamic address later

            if (
              tokenData?.address &&
              isFieldOutdated(SchemaDataFreshnessManager.ERC20[Contracts.ERC20.ETH], 'walletAmount')
            ) {
              SchemaDataFreshnessManager.ERC20[Contracts.ERC20.ETH].troveLockedAmount.fetch({
                troveManagerContract: troveManagerContract,
                borrower,
              });
            }

            return SchemaDataFreshnessManager.ERC20[Contracts.ERC20.ETH].troveLockedAmount.value();
          },
        },

        stabilityGainedAmount: {
          read(_, { readField, cache }) {
            const token = readField('token') as Readonly<Reference>;

            const tokenData = cache.readFragment<TokenFragmentFragment>({
              id: token.__ref,
              fragment: TOKEN_FRAGMENT,
            });

            // FIXME: Change for dynamic address later

            if (
              tokenData?.address &&
              isFieldOutdated(SchemaDataFreshnessManager.ERC20[Contracts.ERC20.ETH], 'stabilityGainedAmount')
            ) {
              SchemaDataFreshnessManager.ERC20[Contracts.ERC20.ETH].stabilityGainedAmount.fetch({
                stabilityPoolManagerContract,
                depositor: borrower,
              });
            }

            return SchemaDataFreshnessManager.ERC20[Contracts.ERC20.ETH].stabilityGainedAmount.value();
          },
        },
      },
    },

    Pool: {
      fields: {
        swapFee: {
          read(_, { readField }) {
            console.log('EXISTING: ', _);
            const poolAddress = readField('address') as Readonly<string>;
            console.log('poolAddress: ', poolAddress);

            // FIXME: Change for dynamic address later
            if (
              poolAddress &&
              isFieldOutdated(
                SchemaDataFreshnessManager.SwapPairs['0x687E100f79ceD7Cc8b2BD19Eb326a28885F5b371'],
                'swapFee',
              )
            ) {
              SchemaDataFreshnessManager.SwapPairs['0x687E100f79ceD7Cc8b2BD19Eb326a28885F5b371'].swapFee.fetch(
                swapPairContracts,
              );
            }

            return SchemaDataFreshnessManager.SwapPairs['0x687E100f79ceD7Cc8b2BD19Eb326a28885F5b371'].swapFee.value();
          },
        },

        borrowerAmount: {
          read(_, { readField }) {
            const poolAddress = readField('address') as Readonly<string>;

            // FIXME: Change for dynamic address later
            if (
              poolAddress &&
              borrower &&
              isFieldOutdated(
                SchemaDataFreshnessManager.SwapPairs['0x687E100f79ceD7Cc8b2BD19Eb326a28885F5b371'],
                'borrowerAmount',
              )
            ) {
              SchemaDataFreshnessManager.SwapPairs['0x687E100f79ceD7Cc8b2BD19Eb326a28885F5b371'].borrowerAmount.fetch(
                swapPairContracts,
                borrower,
              );
            }

            return SchemaDataFreshnessManager.SwapPairs[
              '0x687E100f79ceD7Cc8b2BD19Eb326a28885F5b371'
            ].borrowerAmount.value();
          },
        },
      },
    },
  },

  Query: {
    fields: {
      getTroveManager: {
        read: () => {
          if (isFieldOutdated(SchemaDataFreshnessManager.TroveManager, 'borrowingRate')) {
            SchemaDataFreshnessManager.TroveManager.borrowingRate.fetch(troveManagerContract);
          }

          return {
            __typename: 'TroveManager',
            id: Contracts.TroveManager,
            borrowingRate: SchemaDataFreshnessManager.TroveManager.borrowingRate.value(),
          } as TroveManagerType;
        },
      },

      getSystemInfo: {
        read: () => {
          if (isFieldOutdated(ContractDataFreshnessManager.StoragePool as any, 'getDepositorDeposits')) {
            SchemaDataFreshnessManager.StoragePool.totalCollateralRatio.fetch({ storagePoolContract });
          }

          return {
            __typename: 'SystemInfo',
            id: 'SystemInfo',
            totalCollateralRatio: SchemaDataFreshnessManager.StoragePool.totalCollateralRatio.value(),
            recoveryModeActive: false,
          } as SystemInfo;
        },
      },
    },
  },
});

type ContractData<T> = Record<
  string,
  {
    fetch: Function;
    value: ReactiveVar<T>;
    lastFetched: number;
    timeout: number;
  }
>;

// Type that mirros the Contracts object with literal access to the contract addresses
type ContractDataFreshnessManager<T> = {
  [P in keyof T]: T[P] extends Record<string, string>
    ? { [Address in T[P][keyof T[P]]]: ContractData<number> }
    : T[P] extends Record<string, object>
    ? ContractData<T[P]['value']>
    : ContractData<number>;
};

type ResolvedType<T> = T extends Promise<infer R> ? R : T;
type ContractValue<T> = {
  fetch: Function;
  value: ResolvedType<T>;
  lastFetched: number;
  timeout: number;
};

/**
 * This manages the data fetching from the contracts if the data is reused. E.g.: get many debts from the trovemanager isntead of making individual calls.
 */
export const ContractDataFreshnessManager: {
  TroveManager: Pick<
    {
      [K in keyof TroveManager]: ContractValue<ReturnType<TroveManager[K]>>;
    },
    'getTroveDebt' | 'getTroveRepayableDebts' | 'getTroveWithdrawableColls'
  >;
  StabilityPoolManager: Pick<
    {
      [K in keyof StabilityPoolManager]: ContractValue<ReturnType<StabilityPoolManager[K]>>;
    },
    'getDepositorDeposits' | 'getDepositorCollGains' | 'getDepositorCompoundedDeposits'
  >;
  StoragePool: Pick<
    {
      [K in keyof StoragePool]: ContractValue<ReturnType<StoragePool[K]>>;
    },
    'checkRecoveryMode'
  >;
} = {
  TroveManager: {
    getTroveDebt: {
      fetch: async (troveManagerContract: TroveManager, borrower: AddressLike) => {
        ContractDataFreshnessManager.TroveManager.getTroveDebt.lastFetched = Date.now();
        const troveDebt = await troveManagerContract.getTroveDebt(borrower);

        ContractDataFreshnessManager.TroveManager.getTroveDebt.value = troveDebt;
      },
      value: [],
      lastFetched: 0,
      timeout: 1000 * 5,
    },
    getTroveRepayableDebts: {
      fetch: async (troveManagerContract: TroveManager, borrower: AddressLike) => {
        ContractDataFreshnessManager.TroveManager.getTroveRepayableDebts.lastFetched = Date.now();
        const troveRepayableDebt = await troveManagerContract.getTroveRepayableDebts(borrower);

        ContractDataFreshnessManager.TroveManager.getTroveRepayableDebts.value = troveRepayableDebt;
      },
      value: [],
      lastFetched: 0,
      timeout: 1000 * 5,
    },
    getTroveWithdrawableColls: {
      fetch: async (troveManagerContract: TroveManager, borrower: AddressLike) => {
        ContractDataFreshnessManager.TroveManager.getTroveWithdrawableColls.lastFetched = Date.now();
        const troveColl = await troveManagerContract.getTroveWithdrawableColls(borrower);

        ContractDataFreshnessManager.TroveManager.getTroveWithdrawableColls.value = troveColl;
      },
      value: [],
      lastFetched: 0,
      timeout: 1000 * 5,
    },
  },

  StabilityPoolManager: {
    getDepositorDeposits: {
      fetch: async (stabilityPoolManagerContract: StabilityPoolManager, depositor: AddressLike) => {
        ContractDataFreshnessManager.StabilityPoolManager.getDepositorDeposits.lastFetched = Date.now();
        const tokenAmount = await stabilityPoolManagerContract.getDepositorDeposits(depositor);

        ContractDataFreshnessManager.StabilityPoolManager.getDepositorDeposits.value = tokenAmount;
      },
      value: [],
      lastFetched: 0,
      timeout: 1000 * 5,
    },

    getDepositorCollGains: {
      fetch: async (stabilityPoolManagerContract: StabilityPoolManager, depositor: AddressLike) => {
        ContractDataFreshnessManager.StabilityPoolManager.getDepositorCollGains.lastFetched = Date.now();
        const tokenAmount = await stabilityPoolManagerContract.getDepositorCollGains(
          depositor,
          Object.values(Contracts.ERC20),
        );

        ContractDataFreshnessManager.StabilityPoolManager.getDepositorCollGains.value = tokenAmount;
      },
      value: [],
      lastFetched: 0,
      timeout: 1000 * 5,
    },

    getDepositorCompoundedDeposits: {
      fetch: async (stabilityPoolManagerContract: StabilityPoolManager, depositor: AddressLike) => {
        ContractDataFreshnessManager.StabilityPoolManager.getDepositorCompoundedDeposits.lastFetched = Date.now();
        const tokenAmount = await stabilityPoolManagerContract.getDepositorCompoundedDeposits(depositor);

        ContractDataFreshnessManager.StabilityPoolManager.getDepositorCompoundedDeposits.value = tokenAmount;
      },
      value: [],
      lastFetched: 0,
      timeout: 1000 * 5,
    },
  },

  StoragePool: {
    checkRecoveryMode: {
      fetch: async (storagePoolContract: StoragePool) => {
        ContractDataFreshnessManager.StoragePool.checkRecoveryMode.lastFetched = Date.now();
        const [isInRecoveryMode, systemTCR, entireSystemColl, entireSystemDebt] =
          await storagePoolContract.checkRecoveryMode();

        ContractDataFreshnessManager.StoragePool.checkRecoveryMode.value = {
          isInRecoveryMode,
          TCR: systemTCR,
          entireSystemColl,
          entireSystemDebt,
        } as any;
      },
      value: {
        isInRecoveryMode: false,
        TCR: BigInt(0),
        entireSystemColl: BigInt(0),
        entireSystemDebt: BigInt(0),
      } as any,
      lastFetched: 0,
      timeout: 1000 * 5,
    },
  },
};

// FIXME: This is also not perfectly typesafe. The keys are not required.

/**
 * This manages the data, fetching and freshness on each client side field in the schema
 */
export const SchemaDataFreshnessManager: ContractDataFreshnessManager<typeof Contracts> = {
  ERC20: {
    [Contracts.ERC20.ETH]: {
      walletAmount: {
        fetch: async (provider: ethers.JsonRpcProvider, address: AddressLike) => {
          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.ETH].walletAmount.lastFetched = Date.now();
          const balanceWei = await provider.getBalance(address);
          const balanceEther = ethers.formatEther(balanceWei);

          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.ETH].walletAmount.value(parseInt(balanceEther));
        },
        value: makeVar(0),
        lastFetched: 0,
        timeout: 1000 * 5,
      },
      // TODO: Maybe add another field for TroveManager.getTroveWithdrawableColl => Balance Page => Collateral Table => Your Trove
      troveLockedAmount: {
        fetch: async (fetchSource?: { troveManagerContract: TroveManager; borrower: AddressLike }) => {
          if (fetchSource) {
            await ContractDataFreshnessManager.TroveManager.getTroveWithdrawableColls.fetch(
              fetchSource.troveManagerContract,
              fetchSource.borrower,
            );
          }

          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.ETH].troveLockedAmount.lastFetched = Date.now();

          const tokenAmount = ContractDataFreshnessManager.TroveManager.getTroveWithdrawableColls.value.find(
            ({ tokenAddress }) => tokenAddress === Contracts.ERC20.ETH,
          )?.amount;
          if (tokenAmount) {
            SchemaDataFreshnessManager.ERC20[Contracts.ERC20.ETH].troveLockedAmount.value(ethers.toNumber(tokenAmount));
          }
        },
        value: makeVar(0),
        lastFetched: 0,
        timeout: 1000 * 5,
      },

      stabilityGainedAmount: {
        fetch: async (fetchSource?: { stabilityPoolManagerContract: StabilityPoolManager; depositor: AddressLike }) => {
          if (fetchSource) {
            await ContractDataFreshnessManager.StabilityPoolManager.getDepositorCollGains.fetch(
              fetchSource.stabilityPoolManagerContract,
              fetchSource.depositor,
            );
          }

          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.ETH].stabilityGainedAmount.lastFetched = Date.now();

          const tokenAmount = ContractDataFreshnessManager.StabilityPoolManager.getDepositorCollGains.value.find(
            ({ tokenAddress }) => tokenAddress === Contracts.ERC20.ETH,
          )?.amount;
          if (tokenAmount) {
            SchemaDataFreshnessManager.ERC20[Contracts.ERC20.ETH].stabilityGainedAmount.value(
              ethers.toNumber(tokenAmount),
            );
          }
        },
        value: makeVar(0),
        lastFetched: 0,
        timeout: 1000 * 5,
      },
    },
    [Contracts.ERC20.JUSD]: {},
    [Contracts.ERC20.DFI]: {},
    [Contracts.ERC20.USDT]: {},
  },
  DebtToken: {
    [Contracts.DebtToken.STABLE]: {
      priceUSDOracle: {
        fetch: async (debtTokenContract: DebtToken) => {
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE]!.priceUSDOracle.lastFetched = Date.now();
          const oraclePrice = await debtTokenContract.getPrice();

          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE]!.priceUSDOracle.value(
            ethers.toNumber(oraclePrice),
          );
        },
        value: makeVar(0),
        lastFetched: 0,
        timeout: 1000 * 5,
      },

      walletAmount: {
        fetch: async (debtTokenContract: DebtToken, borrower: AddressLike) => {
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].walletAmount.lastFetched = Date.now();
          const borrowerBalance = await debtTokenContract.balanceOf(borrower);
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].walletAmount.value(
            ethers.toNumber(borrowerBalance),
          );
        },
        value: makeVar(0),
        lastFetched: 0,
        timeout: 1000 * 5,
      },

      troveMintedAmount: {
        fetch: async (fetchSource?: { troveManagerContract: TroveManager; borrower: AddressLike }) => {
          if (fetchSource) {
            await ContractDataFreshnessManager.TroveManager.getTroveDebt.fetch(
              fetchSource.troveManagerContract,
              fetchSource.borrower,
            );
          }

          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].troveMintedAmount.lastFetched =
            Date.now();

          const tokenAmount = ContractDataFreshnessManager.TroveManager.getTroveDebt.value.find(
            ({ tokenAddress }) => tokenAddress === Contracts.DebtToken.STABLE,
          )?.amount;
          if (tokenAmount) {
            SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].troveMintedAmount.value(
              ethers.toNumber(tokenAmount),
            );
          }
        },
        value: makeVar(0),
        lastFetched: 0,
        timeout: 1000 * 5,
      },

      troveRepableDebtAmount: {
        fetch: async (fetchSource?: { troveManagerContract: TroveManager; borrower: AddressLike }) => {
          if (fetchSource) {
            await ContractDataFreshnessManager.TroveManager.getTroveRepayableDebts.fetch(
              fetchSource.troveManagerContract,
              fetchSource.borrower,
            );
          }

          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].troveRepableDebtAmount.lastFetched =
            Date.now();

          const repayableDebt = ContractDataFreshnessManager.TroveManager.getTroveRepayableDebts.value.find(
            ({ tokenAddress }) => tokenAddress === Contracts.DebtToken.STABLE,
          )?.amount;
          if (repayableDebt) {
            SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].troveRepableDebtAmount.value(
              ethers.toNumber(repayableDebt),
            );
          }
        },
        value: makeVar(0),
        lastFetched: 0,
        timeout: 1000 * 5,
      },

      providedStability: {
        fetch: async (fetchSource?: { stabilityPoolManagerContract: StabilityPoolManager; depositor: AddressLike }) => {
          if (fetchSource) {
            await ContractDataFreshnessManager.StabilityPoolManager.getDepositorDeposits.fetch(
              fetchSource.stabilityPoolManagerContract,
              fetchSource.depositor,
            );
          }

          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].providedStability.lastFetched =
            Date.now();

          const tokenAmount = ContractDataFreshnessManager.StabilityPoolManager.getDepositorDeposits.value.find(
            ({ tokenAddress }) => tokenAddress === Contracts.DebtToken.STABLE,
          )?.amount;
          if (tokenAmount) {
            SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].providedStability.value(
              ethers.toNumber(tokenAmount),
            );
          }
        },
        value: makeVar(0),
        lastFetched: 0,
        timeout: 1000 * 5,
      },

      compoundedDeposit: {
        fetch: async (fetchSource?: { stabilityPoolManagerContract: StabilityPoolManager; depositor: AddressLike }) => {
          if (fetchSource) {
            await ContractDataFreshnessManager.StabilityPoolManager.getDepositorCompoundedDeposits.fetch(
              fetchSource.stabilityPoolManagerContract,
              fetchSource.depositor,
            );
          }

          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].compoundedDeposit.lastFetched =
            Date.now();

          const compoundedDeposit =
            ContractDataFreshnessManager.StabilityPoolManager.getDepositorCompoundedDeposits.value.find(
              ({ tokenAddress }) => tokenAddress === Contracts.DebtToken.STABLE,
            )?.amount!;

          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].compoundedDeposit.value(
            ethers.toNumber(compoundedDeposit),
          );
        },
        value: makeVar(0),
        lastFetched: 0,
        timeout: 1000 * 5,
      },
    },
    [Contracts.DebtToken.STOCK_1]: {},
  },
  TroveManager: {
    borrowingRate: {
      fetch: async (troveManagerContract: TroveManager) => {
        SchemaDataFreshnessManager.TroveManager.borrowingRate.lastFetched = Date.now();
        const borrowingRate = await troveManagerContract.getBorrowingRate();

        SchemaDataFreshnessManager.TroveManager.borrowingRate.value(ethers.toNumber(borrowingRate));
      },
      value: makeVar(0),
      lastFetched: 0,
      timeout: 1000 * 5,
    },
  },
  StabilityPoolManager: {},
  SwapOperations: {},
  SwapPairs: {
    '0x687E100f79ceD7Cc8b2BD19Eb326a28885F5b371': {
      borrowerAmount: {
        fetch: async (swapPairContract: SwapPair, borrower: AddressLike, totalAmount: number, totalReserve: number) => {
          SchemaDataFreshnessManager.SwapPairs[
            '0x687E100f79ceD7Cc8b2BD19Eb326a28885F5b371'
          ].borrowerAmount.lastFetched = Date.now();
          const userPoolBalance = await swapPairContract.balanceOf(borrower);

          const amount = userPoolBalance / (floatToBigInt(totalReserve) * floatToBigInt(totalAmount));

          SchemaDataFreshnessManager.SwapPairs['0x687E100f79ceD7Cc8b2BD19Eb326a28885F5b371'].borrowerAmount.value(
            ethers.toNumber(amount),
          );
        },
        value: makeVar(0),
        lastFetched: 0,
        timeout: 1000 * 5,
      },
      swapFee: {
        fetch: async (swapPairContract: SwapPair) => {
          console.log("ACTUALLY FETCHING")
          SchemaDataFreshnessManager.SwapPairs['0x687E100f79ceD7Cc8b2BD19Eb326a28885F5b371'].swapFee.lastFetched =
            Date.now();
            console.log('swapPairContract.getSwapFee: ', swapPairContract.getSwapFee);
          const swapFee = await swapPairContract.getSwapFee();
          console.log('swapFee: ', swapFee);
          const swapFeeInPercent = parseFloat(ethers.formatUnits(swapFee, 6));

          SchemaDataFreshnessManager.SwapPairs['0x687E100f79ceD7Cc8b2BD19Eb326a28885F5b371'].swapFee.value(
            Math.random(),
          );
        },
        value: makeVar(0),
        lastFetched: 0,
        timeout: 1000 * 5,
      },
    },
  },
  BorrowerOperations: {},
  StoragePool: {
    totalCollateralRatio: {
      fetch: async (fetchSource?: { storagePoolContract: StoragePool }) => {
        if (fetchSource) {
          await ContractDataFreshnessManager.StoragePool.checkRecoveryMode.fetch(fetchSource.storagePoolContract);
        }

        SchemaDataFreshnessManager.StoragePool.totalCollateralRatio.lastFetched = Date.now();
        const { TCR } = ContractDataFreshnessManager.StoragePool.checkRecoveryMode.value;

        SchemaDataFreshnessManager.StoragePool.totalCollateralRatio.value(ethers.toNumber(TCR));
      },
      value: makeVar(0),
      lastFetched: 0,
      timeout: 1000 * 5,
    },
    recoveryModeActive: {
      fetch: async (fetchSource?: { storagePoolContract: StoragePool }) => {
        if (fetchSource) {
          await ContractDataFreshnessManager.StoragePool.checkRecoveryMode.fetch(fetchSource.storagePoolContract);
        }

        SchemaDataFreshnessManager.StoragePool.recoveryModeActive.lastFetched = Date.now();
        const { isInRecoveryMode } = ContractDataFreshnessManager.StoragePool.checkRecoveryMode.value;

        SchemaDataFreshnessManager.StoragePool.recoveryModeActive.value(isInRecoveryMode as any);
      },
      value: makeVar(false as any),
      lastFetched: 0,
      timeout: 1000 * 5,
    },
  },
};

// FIXME: The cache needs to be initialized with the contracts data.

// FIXME: I am too stupid to make this typesafe for now. I must pass the exact Contract Data literally.
function isFieldOutdated(contract: ContractData<any>, field: string) {
  return contract[field].lastFetched < Date.now() - contract[field].timeout;
}
