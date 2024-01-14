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
import { PropsWithChildren } from 'react';
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
            getSwaps: {
              // Don't cache separate results based on
              // any of this field's arguments.
              keyArgs: ['isOpen'],
              // Concatenate the incoming list items with
              // the existing list items.
              merge(existing = { swaps: [] }, incoming) {
                return {
                  ...incoming,
                  swaps: [...existing.swaps, ...incoming.swaps],
                };
              },
              read: (existing) => {
                return existing;
              },
            },

            getBorrowerStabilityHistory: {
              // Don't cache separate results based on
              // any of this field's arguments.
              keyArgs: [],
              // Concatenate the incoming list items with
              // the existing list items.
              merge(existing = { history: [] }, incoming) {
                return {
                  ...incoming,
                  history: [...existing.history, ...incoming.history],
                };
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
  // useEffect(() => {
  //   if (process.env.NEXT_PUBLIC_CONTRACT_MOCKING !== 'enabled') {
  //     const priceUSDIntervall = setInterval(() => {
  //       if (isFieldOutdated(SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1], 'priceUSD')) {
  //         SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1].priceUSD.fetch(
  //           debtTokenContracts[Contracts.DebtToken.DebtToken1],
  //         );
  //       }
  //       // This can be any interval you want but it guarantees data freshness if its not already fresh.
  //     }, 1000 * 10);

  //     return () => {
  //       clearInterval(priceUSDIntervall);
  //     };
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

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
        priceUSDOracle: {
          read(_, { args }) {
            if (
              isFieldOutdated(SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1], 'priceUSDOracle')
            ) {
              const address = (args as QueryTokenArgs).address;
              SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1].priceUSDOracle.fetch(
                // FIXME: use address insteadof hardcoded contract
                debtTokenContracts[Contracts.DebtToken.DebtToken1],
              );
            }

            return SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1].priceUSDOracle.value();
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
              isFieldOutdated(SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1], 'walletAmount')
            ) {
              // Make smart contract call using the address
              SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1].walletAmount.fetch(
                debtTokenContracts[Contracts.DebtToken.DebtToken1],
                borrower,
              );
            }

            return SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1].walletAmount.value();
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
              isFieldOutdated(SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1], 'troveMintedAmount')
            ) {
              SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1].troveMintedAmount.fetch({
                troveManagerContract: troveManagerContract,
                borrower,
              });
            }

            return SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1].troveMintedAmount.value();
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
                SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1],
                'troveRepableDebtAmount',
              )
            ) {
              SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1].troveRepableDebtAmount.fetch(
                troveManagerContract,
                borrower,
              );
            }

            return SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1].troveRepableDebtAmount.value();
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
              isFieldOutdated(SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1], 'providedStability')
            ) {
              SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1].providedStability.fetch({
                stabilityPoolManagerContract,
                depositor: borrower,
              });
            }

            return SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1].providedStability.value();
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
              isFieldOutdated(SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1], 'compoundedDeposit')
            ) {
              SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1].compoundedDeposit.fetch({
                stabilityPoolManagerContract,
                depositor: borrower,
              });
            }

            return SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1].compoundedDeposit.value();
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
            // FIXME: Needs to be implemented on SwapPair.sol https://www.notion.so/08d56d02a4c34590bbc9233f48fea2ab?v=ceb084e514cf4a60aa3f43dd58980ef3&p=4100448866dd45f5b10b93123271b604&pm=s
            return 0;
          },
        },

        borrowerAmount: {
          read(_, { readField }) {
            const poolAddress = readField('id') as Readonly<string>;

            // FIXME: Change for dynamic address later
            if (
              poolAddress &&
              borrower &&
              isFieldOutdated(
                SchemaDataFreshnessManager.SwapPairs['0x509ee0d083ddf8ac028f2a56731412edd63224b9'],
                'borrowerAmount',
              )
            ) {
              SchemaDataFreshnessManager.SwapPairs['0x509ee0d083ddf8ac028f2a56731412edd63224b9'].borrowerAmount.fetch(
                swapPairContracts,
                borrower,
              );
            }

            return SchemaDataFreshnessManager.SwapPairs[
              '0x509ee0d083ddf8ac028f2a56731412edd63224b9'
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
    'getTroveDebt' | 'getTroveColl'
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
    getTroveColl: {
      fetch: async (troveManagerContract: TroveManager, borrower: AddressLike) => {
        ContractDataFreshnessManager.TroveManager.getTroveColl.lastFetched = Date.now();
        const troveColl = await troveManagerContract.getTroveColl(borrower);

        ContractDataFreshnessManager.TroveManager.getTroveColl.value = troveColl;
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
            await ContractDataFreshnessManager.TroveManager.getTroveColl.fetch(
              fetchSource.troveManagerContract,
              fetchSource.borrower,
            );
          }

          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.ETH].troveLockedAmount.lastFetched = Date.now();

          const tokenAmount = ContractDataFreshnessManager.TroveManager.getTroveColl.value.find(
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
    [Contracts.DebtToken.DebtToken1]: {
      priceUSDOracle: {
        fetch: async (debtTokenContract: DebtToken) => {
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1]!.priceUSDOracle.lastFetched = Date.now();
          const oraclePrice = await debtTokenContract.getPrice();

          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1]!.priceUSDOracle.value(
            ethers.toNumber(oraclePrice),
          );
        },
        value: makeVar(0),
        lastFetched: 0,
        timeout: 1000 * 5,
      },

      walletAmount: {
        fetch: async (debtTokenContract: DebtToken, borrower: AddressLike) => {
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1].walletAmount.lastFetched = Date.now();
          const borrowerBalance = await debtTokenContract.balanceOf(borrower);
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1].walletAmount.value(
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

          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1].troveMintedAmount.lastFetched =
            Date.now();

          const tokenAmount = ContractDataFreshnessManager.TroveManager.getTroveDebt.value.find(
            ({ tokenAddress }) => tokenAddress === Contracts.DebtToken.DebtToken1,
          )?.amount;
          if (tokenAmount) {
            SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1].troveMintedAmount.value(
              ethers.toNumber(tokenAmount),
            );
          }
        },
        value: makeVar(0),
        lastFetched: 0,
        timeout: 1000 * 5,
      },

      troveRepableDebtAmount: {
        fetch: async (troveManagerContract: TroveManager, borrower: AddressLike) => {
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1].troveRepableDebtAmount.lastFetched =
            Date.now();

          // TODO: Make it more performant with aggregate call.
          const repayableDebt = await troveManagerContract.getTroveRepayableDebt(
            borrower,
            Contracts.DebtToken.DebtToken1,
          );

          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1].troveRepableDebtAmount.value(
            ethers.toNumber(repayableDebt),
          );
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

          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1].providedStability.lastFetched =
            Date.now();

          const tokenAmount = ContractDataFreshnessManager.StabilityPoolManager.getDepositorDeposits.value.find(
            ({ tokenAddress }) => tokenAddress === Contracts.DebtToken.DebtToken1,
          )?.amount;
          if (tokenAmount) {
            SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1].providedStability.value(
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

          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1].compoundedDeposit.lastFetched =
            Date.now();

          const compoundedDeposit =
            ContractDataFreshnessManager.StabilityPoolManager.getDepositorCompoundedDeposits.value.find(
              ({ tokenAddress }) => tokenAddress === Contracts.DebtToken.DebtToken1,
            )?.amount!;

          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.DebtToken1].compoundedDeposit.value(
            ethers.toNumber(compoundedDeposit),
          );
        },
        value: makeVar(0),
        lastFetched: 0,
        timeout: 1000 * 5,
      },
    },
    [Contracts.DebtToken.DebtToken2]: {},
    [Contracts.DebtToken.DebtToken3]: {},
    [Contracts.DebtToken.DebtToken4]: {},
    [Contracts.DebtToken.DebtToken5]: {},
    [Contracts.DebtToken.DebtToken6]: {},
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
    '0x509ee0d083ddf8ac028f2a56731412edd63224b9': {
      borrowerAmount: {
        fetch: async (swapPairContract: SwapPair, borrower: AddressLike, totalAmount: number, totalReserve: number) => {
          SchemaDataFreshnessManager.SwapPairs[
            '0x509ee0d083ddf8ac028f2a56731412edd63224b9'
          ].borrowerAmount.lastFetched = Date.now();
          const userPoolBalance = await swapPairContract.balanceOf(borrower);

          const amount = userPoolBalance / (floatToBigInt(totalReserve) * floatToBigInt(totalAmount));

          SchemaDataFreshnessManager.SwapPairs['0x509ee0d083ddf8ac028f2a56731412edd63224b9'].borrowerAmount.value(
            ethers.toNumber(amount),
          );
        },
        value: makeVar(0),
        lastFetched: 0,
        timeout: 1000 * 5,
      },
    },
    '0x509ee0d083ddf8ac028f2a56731412edd63225b9': {},
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
