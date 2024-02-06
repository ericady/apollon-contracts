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
import { AddressLike } from 'ethers';
import { PropsWithChildren } from 'react';
import { DebtToken, ERC20, StabilityPoolManager, StoragePool, SwapPair, TroveManager } from '../../generated/types';
import { SystemInfo, TokenFragmentFragment, TroveManager as TroveManagerType } from '../generated/gql-types';
import { TOKEN_FRAGMENT } from '../queries';
import { getCheckSum } from '../utils/crypto';
import { floatToBigInt } from '../utils/math';
import { CustomApolloProvider_DevMode } from './CustomApolloProvider_dev';
import { Contracts, isCollateralTokenAddress, isDebtTokenAddress, isPoolAddress, useEthers } from './EthersProvider';

const defaultFieldValue = BigInt(0);

export function CustomApolloProvider({ children }: PropsWithChildren<{}>) {
  const {
    provider,
    contracts: {
      debtTokenContracts,
      troveManagerContract,
      swapPairContracts,
      stabilityPoolManagerContract,
      storagePoolContract,
      collateralTokenContracts,
    },
    address: borrower,
  } = useEthers();

  if (process.env.NEXT_PUBLIC_CONTRACT_MOCKING === 'enabled') {
    return <CustomApolloProvider_DevMode>{children}</CustomApolloProvider_DevMode>;
  }

  const cacheConfig = getProductionCacheConfig({
    provider,
    borrower,
    debtTokenContracts,
    collateralTokenContracts,
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
        ...cacheConfig.fields,

        Query: {
          fields: {
            ...cacheConfig.Query.fields,

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
  // useEffect(() => {
  //   if (process.env.NEXT_PUBLIC_CONTRACT_MOCKING !== 'enabled') {
  //     const priceUSDIntervall = setInterval(() => {
  //       if (
  //         isFieldOutdated(SchemaDataFreshnessManager.SwapPairs['0x687E100f79ceD7Cc8b2BD19Eb326a28885F5b371'], 'swapFee')
  //       ) {
  //         console.log('isFieldOutdated');
  //         SchemaDataFreshnessManager.SwapPairs['0x687E100f79ceD7Cc8b2BD19Eb326a28885F5b371'].swapFee.fetch(
  //           swapPairContracts['STOCK_1'],
  //         );
  //       }

  //       // This can be any interval you want but it guarantees data freshness if its not already fresh.
  //     }, 1000 * 5);

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
  collateralTokenContracts,
  troveManagerContract,
  stabilityPoolManagerContract,
  swapPairContracts,
  storagePoolContract,
}: {
  provider: ReturnType<typeof useEthers>['provider'];
  borrower: AddressLike;
  debtTokenContracts: ReturnType<typeof useEthers>['contracts']['debtTokenContracts'];
  collateralTokenContracts: ReturnType<typeof useEthers>['contracts']['collateralTokenContracts'];
  troveManagerContract: ReturnType<typeof useEthers>['contracts']['troveManagerContract'];
  stabilityPoolManagerContract: ReturnType<typeof useEthers>['contracts']['stabilityPoolManagerContract'];
  swapPairContracts: ReturnType<typeof useEthers>['contracts']['swapPairContracts'];
  storagePoolContract: ReturnType<typeof useEthers>['contracts']['storagePoolContract'];
}): { fields: TypePolicies; Query: TypePolicy } => ({
  fields: {
    Token: {
      fields: {
        priceUSDOracle: {
          read(_, { readField }) {
            const address = readField('address') as Readonly<string>;
            if (address) {
              if (isDebtTokenAddress(address)) {
                if (isFieldOutdated(SchemaDataFreshnessManager.DebtToken[address], 'priceUSDOracle')) {
                  SchemaDataFreshnessManager.DebtToken[address].priceUSDOracle.fetch(debtTokenContracts[address]);
                }
                return SchemaDataFreshnessManager.DebtToken[address].priceUSDOracle.value();
              } else if (isCollateralTokenAddress(address)) {
                if (isFieldOutdated(SchemaDataFreshnessManager.ERC20[address], 'priceUSDOracle')) {
                  SchemaDataFreshnessManager.ERC20[address].priceUSDOracle.fetch(collateralTokenContracts[address]);
                }
                return SchemaDataFreshnessManager.ERC20[address].priceUSDOracle.value();
              }
            }
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

            if (tokenData?.address && isDebtTokenAddress(tokenData.address)) {
              if (
                isFieldOutdated(SchemaDataFreshnessManager.DebtToken[tokenData.address], 'walletAmount') &&
                borrower
              ) {
                SchemaDataFreshnessManager.DebtToken[tokenData.address].walletAmount.fetch(
                  debtTokenContracts[tokenData.address],
                  borrower,
                );
              }

              return SchemaDataFreshnessManager.DebtToken[tokenData.address].walletAmount.value();
            }
          },
        },

        troveMintedAmount: {
          read(_, { readField, cache }) {
            const token = readField('token') as Readonly<Reference>;

            const tokenData = cache.readFragment<TokenFragmentFragment>({
              id: token.__ref,
              fragment: TOKEN_FRAGMENT,
            });

            if (tokenData?.address && isDebtTokenAddress(tokenData.address)) {
              if (
                isFieldOutdated(SchemaDataFreshnessManager.DebtToken[tokenData.address], 'troveMintedAmount') &&
                borrower
              ) {
                SchemaDataFreshnessManager.DebtToken[tokenData.address].troveMintedAmount.fetch({
                  troveManagerContract,
                  borrower,
                });
              }
              return SchemaDataFreshnessManager.DebtToken[tokenData.address].troveMintedAmount.value();
            }
          },
        },

        troveRepableDebtAmount: {
          read(_, { readField, cache }) {
            const token = readField('token') as Readonly<Reference>;

            const tokenData = cache.readFragment<TokenFragmentFragment>({
              id: token.__ref,
              fragment: TOKEN_FRAGMENT,
            });

            if (tokenData?.address && isDebtTokenAddress(tokenData.address)) {
              if (
                isFieldOutdated(SchemaDataFreshnessManager.DebtToken[tokenData.address], 'troveRepableDebtAmount') &&
                borrower
              ) {
                SchemaDataFreshnessManager.DebtToken[tokenData.address].troveRepableDebtAmount.fetch({
                  troveManagerContract,
                  borrower,
                });
              }
              return SchemaDataFreshnessManager.DebtToken[tokenData.address].troveRepableDebtAmount.value();
            }
          },
        },

        providedStability: {
          read(_, { readField, cache }) {
            const token = readField('token') as Readonly<Reference>;

            const tokenData = cache.readFragment<TokenFragmentFragment>({
              id: token.__ref,
              fragment: TOKEN_FRAGMENT,
            });

            if (tokenData?.address && isDebtTokenAddress(tokenData.address)) {
              if (
                isFieldOutdated(SchemaDataFreshnessManager.DebtToken[tokenData.address], 'providedStability') &&
                borrower
              ) {
                SchemaDataFreshnessManager.DebtToken[tokenData.address].providedStability.fetch({
                  stabilityPoolManagerContract,
                  depositor: borrower,
                });
              }
              return SchemaDataFreshnessManager.DebtToken[tokenData.address].providedStability.value();
            }
          },
        },

        compoundedDeposit: {
          read(_, { readField, cache }) {
            const token = readField('token') as Readonly<Reference>;

            const tokenData = cache.readFragment<TokenFragmentFragment>({
              id: token.__ref,
              fragment: TOKEN_FRAGMENT,
            });

            if (tokenData?.address && isDebtTokenAddress(tokenData.address)) {
              if (
                isFieldOutdated(SchemaDataFreshnessManager.DebtToken[tokenData.address], 'compoundedDeposit') &&
                borrower
              ) {
                SchemaDataFreshnessManager.DebtToken[tokenData.address].compoundedDeposit.fetch({
                  stabilityPoolManagerContract,
                  depositor: borrower,
                });
              }

              return SchemaDataFreshnessManager.DebtToken[tokenData.address].compoundedDeposit.value();
            }
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

            if (tokenData?.address && borrower && isCollateralTokenAddress(tokenData.address)) {
              if (isFieldOutdated(SchemaDataFreshnessManager.ERC20[tokenData.address], 'walletAmount')) {
                SchemaDataFreshnessManager.ERC20[tokenData.address].walletAmount.fetch(
                  collateralTokenContracts[tokenData.address],
                  borrower,
                );
              }

              return SchemaDataFreshnessManager.ERC20[tokenData.address].walletAmount.value();
            }
          },
        },

        troveLockedAmount: {
          read(_, { readField, cache }) {
            const token = readField('token') as Readonly<Reference>;

            const tokenData = cache.readFragment<TokenFragmentFragment>({
              id: token.__ref,
              fragment: TOKEN_FRAGMENT,
            });

            if (tokenData?.address && borrower && isCollateralTokenAddress(tokenData.address)) {
              if (isFieldOutdated(SchemaDataFreshnessManager.ERC20[tokenData.address], 'troveLockedAmount')) {
                SchemaDataFreshnessManager.ERC20[tokenData.address].troveLockedAmount.fetch({
                  troveManagerContract: troveManagerContract,
                  borrower,
                });
              }

              return SchemaDataFreshnessManager.ERC20[tokenData.address].troveLockedAmount.value();
            }
          },
        },

        stabilityGainedAmount: {
          read(_, { readField, cache }) {
            const token = readField('token') as Readonly<Reference>;

            const tokenData = cache.readFragment<TokenFragmentFragment>({
              id: token.__ref,
              fragment: TOKEN_FRAGMENT,
            });

            if (tokenData?.address && borrower && isCollateralTokenAddress(tokenData.address)) {
              if (isFieldOutdated(SchemaDataFreshnessManager.ERC20[tokenData.address], 'stabilityGainedAmount')) {
                SchemaDataFreshnessManager.ERC20[tokenData.address].stabilityGainedAmount.fetch({
                  stabilityPoolManagerContract,
                  depositor: borrower,
                });
              }

              return SchemaDataFreshnessManager.ERC20[tokenData.address].stabilityGainedAmount.value();
            }
          },
        },
      },
    },

    Pool: {
      fields: {
        swapFee: {
          read(_, { readField }) {
            const poolAddress = readField('address') as Readonly<string>;

            if (poolAddress && isPoolAddress(poolAddress)) {
              if (isFieldOutdated(SchemaDataFreshnessManager.SwapPairs[poolAddress], 'swapFee')) {
                SchemaDataFreshnessManager.SwapPairs[poolAddress].swapFee.fetch(swapPairContracts[poolAddress]);
              }

              return SchemaDataFreshnessManager.SwapPairs[poolAddress].swapFee.value();
            }
          },
        },

        borrowerAmount: {
          read(_, { readField }) {
            const poolAddress = readField('address') as Readonly<string>;

            if (poolAddress && isPoolAddress(poolAddress) && borrower) {
              if (isFieldOutdated(SchemaDataFreshnessManager.SwapPairs[poolAddress], 'borrowerAmount')) {
                SchemaDataFreshnessManager.SwapPairs[poolAddress].borrowerAmount.fetch(
                  swapPairContracts[poolAddress],
                  borrower,
                );
              }

              return SchemaDataFreshnessManager.SwapPairs[poolAddress].borrowerAmount.value();
            }
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
          if (isFieldOutdated(SchemaDataFreshnessManager.StoragePool as any, 'totalCollateralRatio')) {
            SchemaDataFreshnessManager.StoragePool.totalCollateralRatio.fetch({ storagePoolContract });
          } else if (isFieldOutdated(SchemaDataFreshnessManager.StoragePool as any, 'recoveryModeActive')) {
            SchemaDataFreshnessManager.StoragePool.recoveryModeActive.fetch({ storagePoolContract });
          }

          return {
            __typename: 'SystemInfo',
            id: 'SystemInfo',
            totalCollateralRatio: SchemaDataFreshnessManager.StoragePool.totalCollateralRatio.value(),
            recoveryModeActive: SchemaDataFreshnessManager.StoragePool.recoveryModeActive.value() as unknown as boolean,
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
    ? { [Address in T[P][keyof T[P]]]: ContractData<bigint> }
    : T[P] extends Record<string, object>
    ? ContractData<T[P]['value']>
    : ContractData<bigint>;
};

type ResolvedType<T> = T extends Promise<infer R> ? R : T;
type ContractValue<T> = {
  fetch: Function;
  value: ResolvedType<T>;
  lastFetched: number;
  timeout: number;
};

type TokenAmount = {
  tokenAddress: string;
  amount: bigint;
};

/**
 * This manages the data fetching from the contracts if the data is reused. E.g.: get many debts from the trovemanager isntead of making individual calls.
 */
export const ContractDataFreshnessManager: {
  TroveManager: Pick<
    {
      [K in keyof TroveManager]: ContractValue<TokenAmount[]>;
    },
    'getTroveDebt' | 'getTroveRepayableDebts' | 'getTroveWithdrawableColls'
  >;
  StabilityPoolManager: Pick<
    {
      [K in keyof StabilityPoolManager]: ContractValue<TokenAmount[]>;
    },
    'getDepositorDeposits' | 'getDepositorCollGains' | 'getDepositorCompoundedDeposits'
  >;
  StoragePool: Pick<
    {
      [K in keyof StoragePool]: ContractValue<{
        isInRecoveryMode: boolean;
        TCR: bigint;
        entireSystemColl: bigint;
        entireSystemDebt: bigint;
      }>;
    },
    'checkRecoveryMode'
  >;
} = {
  TroveManager: {
    getTroveDebt: {
      fetch: async (troveManagerContract: TroveManager, borrower: AddressLike) => {
        ContractDataFreshnessManager.TroveManager.getTroveDebt.lastFetched = Date.now();
        const troveDebt = await troveManagerContract.getTroveDebt(borrower);

        const tokenAmounts = troveDebt.map(([tokenAddress, amount]) => ({
          tokenAddress,
          amount,
        }));

        ContractDataFreshnessManager.TroveManager.getTroveDebt.value = tokenAmounts;

        // Update the values of all tokens after fetching.
        Object.values(Contracts.DebtToken).forEach((tokenAddress) => {
          if (isDebtTokenAddress(tokenAddress)) {
            SchemaDataFreshnessManager.DebtToken[tokenAddress].troveMintedAmount.fetch();
          }
        });
      },
      value: [],
      lastFetched: 0,
      timeout: 1000 * 5,
    },
    getTroveRepayableDebts: {
      fetch: async (troveManagerContract: TroveManager, borrower: AddressLike) => {
        ContractDataFreshnessManager.TroveManager.getTroveRepayableDebts.lastFetched = Date.now();
        const troveRepayableDebts = await troveManagerContract.getTroveRepayableDebts(borrower);

        const tokenAmounts = troveRepayableDebts.map(([tokenAddress, amount]) => ({
          tokenAddress,
          amount,
        }));

        ContractDataFreshnessManager.TroveManager.getTroveRepayableDebts.value = tokenAmounts;

        // Update the values of all tokens after fetching.
        Object.values(Contracts.DebtToken).forEach((tokenAddress) => {
          if (isDebtTokenAddress(tokenAddress)) {
            SchemaDataFreshnessManager.DebtToken[tokenAddress].troveRepableDebtAmount.fetch();
          }
        });
      },
      value: [],
      lastFetched: 0,
      timeout: 1000 * 5,
    },
    getTroveWithdrawableColls: {
      fetch: async (troveManagerContract: TroveManager, borrower: AddressLike) => {
        ContractDataFreshnessManager.TroveManager.getTroveWithdrawableColls.lastFetched = Date.now();
        const troveColl = await troveManagerContract.getTroveWithdrawableColls(borrower);

        const tokenAmounts = troveColl.map(([tokenAddress, amount]) => ({
          tokenAddress,
          amount,
        }));

        ContractDataFreshnessManager.TroveManager.getTroveWithdrawableColls.value = tokenAmounts;

        // Update the values of all tokens after fetching.
        Object.values(Contracts.ERC20).forEach((tokenAddress) => {
          if (isCollateralTokenAddress(tokenAddress)) {
            SchemaDataFreshnessManager.ERC20[tokenAddress].troveLockedAmount.fetch();
          }
        });
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
        const depositorDeposits = await stabilityPoolManagerContract.getDepositorDeposits(depositor);

        const tokenAmounts = depositorDeposits.map(([tokenAddress, amount]) => ({
          tokenAddress,
          amount,
        }));

        ContractDataFreshnessManager.StabilityPoolManager.getDepositorDeposits.value = tokenAmounts;

        // Update the values of all tokens after fetching.
        Object.values(Contracts.DebtToken).forEach((tokenAddress) => {
          if (isDebtTokenAddress(tokenAddress)) {
            SchemaDataFreshnessManager.DebtToken[tokenAddress].providedStability.fetch();
          }
        });
      },
      value: [],
      lastFetched: 0,
      timeout: 1000 * 5,
    },

    getDepositorCollGains: {
      fetch: async (stabilityPoolManagerContract: StabilityPoolManager, depositor: AddressLike) => {
        ContractDataFreshnessManager.StabilityPoolManager.getDepositorCollGains.lastFetched = Date.now();
        const depositorCollGains = await stabilityPoolManagerContract.getDepositorCollGains(
          depositor,
          Object.values(Contracts.ERC20),
        );

        const tokenAmounts = depositorCollGains.map(([tokenAddress, amount]) => ({
          tokenAddress,
          amount,
        }));

        ContractDataFreshnessManager.StabilityPoolManager.getDepositorCollGains.value = tokenAmounts;

        // Update the values of all tokens after fetching.
        Object.values(Contracts.ERC20).forEach((tokenAddress) => {
          if (isCollateralTokenAddress(tokenAddress)) {
            SchemaDataFreshnessManager.ERC20[tokenAddress].stabilityGainedAmount.fetch();
          }
        });
      },
      value: [],
      lastFetched: 0,
      timeout: 1000 * 5,
    },

    getDepositorCompoundedDeposits: {
      fetch: async (stabilityPoolManagerContract: StabilityPoolManager, depositor: AddressLike) => {
        ContractDataFreshnessManager.StabilityPoolManager.getDepositorCompoundedDeposits.lastFetched = Date.now();
        const depositorCompoundedDeposits =
          await stabilityPoolManagerContract.getDepositorCompoundedDeposits(depositor);

        const tokenAmounts = depositorCompoundedDeposits.map(([tokenAddress, amount]) => ({
          tokenAddress,
          amount,
        }));

        ContractDataFreshnessManager.StabilityPoolManager.getDepositorCompoundedDeposits.value = tokenAmounts;

        // Update the values of all tokens after fetching.
        Object.values(Contracts.DebtToken).forEach((tokenAddress) => {
          if (isDebtTokenAddress(tokenAddress)) {
            SchemaDataFreshnessManager.DebtToken[tokenAddress].compoundedDeposit.fetch();
          }
        });
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
        };

        // Update the values of all tokens after fetching.
        SchemaDataFreshnessManager.StoragePool.totalCollateralRatio.fetch();
        SchemaDataFreshnessManager.StoragePool.recoveryModeActive.fetch();
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
    [Contracts.ERC20.BTC]: {
      priceUSDOracle: {
        fetch: async (collTokenContract: ERC20) => {
          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.BTC].priceUSDOracle.lastFetched = Date.now();

          // FIXME: Implement Coll Oracle Prices
          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.BTC].priceUSDOracle.value(defaultFieldValue);
        },
        value: makeVar(defaultFieldValue),
        lastFetched: 0,
        timeout: 1000 * 5,
      },

      walletAmount: {
        fetch: async (collTokenContract: ERC20, depositor: AddressLike) => {
          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.BTC].walletAmount.lastFetched = Date.now();

          // Only for native Token
          // const balanceWei = await provider.getBalance(Contracts.ERC20.BTC);
          const walletAmount = await collTokenContract.balanceOf(depositor);

          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.BTC].walletAmount.value(walletAmount);
        },
        value: makeVar(defaultFieldValue),
        lastFetched: 0,
        timeout: 1000 * 5,
      },

      troveLockedAmount: {
        fetch: async (fetchSource?: { troveManagerContract: TroveManager; borrower: AddressLike }) => {
          if (fetchSource) {
            await ContractDataFreshnessManager.TroveManager.getTroveWithdrawableColls.fetch(
              fetchSource.troveManagerContract,
              fetchSource.borrower,
            );
          }

          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.BTC].troveLockedAmount.lastFetched = Date.now();

          const tokenAmount = ContractDataFreshnessManager.TroveManager.getTroveWithdrawableColls.value.find(
            ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.ERC20.BTC),
          )?.amount;
          if (tokenAmount) {
            SchemaDataFreshnessManager.ERC20[Contracts.ERC20.BTC].troveLockedAmount.value(tokenAmount);
          }
        },
        value: makeVar(defaultFieldValue),
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

          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.BTC].stabilityGainedAmount.lastFetched = Date.now();

          const tokenAmount = ContractDataFreshnessManager.StabilityPoolManager.getDepositorCollGains.value.find(
            ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.ERC20.BTC),
          )?.amount;
          if (tokenAmount) {
            SchemaDataFreshnessManager.ERC20[Contracts.ERC20.BTC].stabilityGainedAmount.value(tokenAmount);
          }
        },
        value: makeVar(defaultFieldValue),
        lastFetched: 0,
        timeout: 1000 * 5,
      },
    },

    [Contracts.ERC20.DFI]: {
      priceUSDOracle: {
        fetch: async (collTokenContract: ERC20) => {
          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.DFI].priceUSDOracle.lastFetched = Date.now();

          // FIXME: Implement Coll Oracle Prices
          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.DFI].priceUSDOracle.value(defaultFieldValue);
        },
        value: makeVar(defaultFieldValue),
        lastFetched: 0,
        timeout: 1000 * 5,
      },

      walletAmount: {
        fetch: async (collTokenContract: ERC20, depositor: AddressLike) => {
          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.DFI].walletAmount.lastFetched = Date.now();

          const walletAmount = await collTokenContract.balanceOf(depositor);

          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.DFI].walletAmount.value(walletAmount);
        },
        value: makeVar(defaultFieldValue),
        lastFetched: 0,
        timeout: 1000 * 5,
      },

      troveLockedAmount: {
        fetch: async (fetchSource?: { troveManagerContract: TroveManager; borrower: AddressLike }) => {
          if (fetchSource) {
            await ContractDataFreshnessManager.TroveManager.getTroveWithdrawableColls.fetch(
              fetchSource.troveManagerContract,
              fetchSource.borrower,
            );
          }

          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.DFI].troveLockedAmount.lastFetched = Date.now();

          const tokenAmount = ContractDataFreshnessManager.TroveManager.getTroveWithdrawableColls.value.find(
            ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.ERC20.DFI),
          )?.amount;
          if (tokenAmount) {
            SchemaDataFreshnessManager.ERC20[Contracts.ERC20.DFI].troveLockedAmount.value(tokenAmount);
          }
        },
        value: makeVar(defaultFieldValue),
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

          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.DFI].stabilityGainedAmount.lastFetched = Date.now();

          const tokenAmount = ContractDataFreshnessManager.StabilityPoolManager.getDepositorCollGains.value.find(
            ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.ERC20.DFI),
          )?.amount;
          if (tokenAmount) {
            SchemaDataFreshnessManager.ERC20[Contracts.ERC20.DFI].stabilityGainedAmount.value(tokenAmount);
          }
        },
        value: makeVar(defaultFieldValue),
        lastFetched: 0,
        timeout: 1000 * 5,
      },
    },

    [Contracts.ERC20.USDT]: {
      priceUSDOracle: {
        fetch: async (collTokenContract: ERC20) => {
          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.USDT].priceUSDOracle.lastFetched = Date.now();

          // FIXME: Implement Coll Oracle Prices
          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.USDT].priceUSDOracle.value(defaultFieldValue);
        },
        value: makeVar(defaultFieldValue),
        lastFetched: 0,
        timeout: 1000 * 5,
      },

      walletAmount: {
        fetch: async (collTokenContract: ERC20, depositor: AddressLike) => {
          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.USDT].walletAmount.lastFetched = Date.now();

          const walletAmount = await collTokenContract.balanceOf(depositor);

          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.USDT].walletAmount.value(walletAmount);
        },
        value: makeVar(defaultFieldValue),
        lastFetched: 0,
        timeout: 1000 * 5,
      },

      troveLockedAmount: {
        fetch: async (fetchSource?: { troveManagerContract: TroveManager; borrower: AddressLike }) => {
          if (fetchSource) {
            await ContractDataFreshnessManager.TroveManager.getTroveWithdrawableColls.fetch(
              fetchSource.troveManagerContract,
              fetchSource.borrower,
            );
          }

          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.USDT].troveLockedAmount.lastFetched = Date.now();

          const tokenAmount = ContractDataFreshnessManager.TroveManager.getTroveWithdrawableColls.value.find(
            ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.ERC20.USDT),
          )?.amount;
          if (tokenAmount) {
            SchemaDataFreshnessManager.ERC20[Contracts.ERC20.USDT].troveLockedAmount.value(tokenAmount);
          }
        },
        value: makeVar(defaultFieldValue),
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

          SchemaDataFreshnessManager.ERC20[Contracts.ERC20.USDT].stabilityGainedAmount.lastFetched = Date.now();

          const tokenAmount = ContractDataFreshnessManager.StabilityPoolManager.getDepositorCollGains.value.find(
            ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.ERC20.USDT),
          )?.amount;
          if (tokenAmount) {
            SchemaDataFreshnessManager.ERC20[Contracts.ERC20.USDT].stabilityGainedAmount.value(tokenAmount);
          }
        },
        value: makeVar(defaultFieldValue),
        lastFetched: 0,
        timeout: 1000 * 5,
      },
    },
  },

  DebtToken: {
    [Contracts.DebtToken.STABLE]: {
      priceUSDOracle: {
        fetch: async (debtTokenContract: DebtToken) => {
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].priceUSDOracle.lastFetched = Date.now();
          const oraclePrice = await debtTokenContract.getPrice();

          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].priceUSDOracle.value(oraclePrice);
        },
        value: makeVar(defaultFieldValue),
        lastFetched: 0,
        timeout: 1000 * 5,
      },

      walletAmount: {
        fetch: async (debtTokenContract: DebtToken, borrower: AddressLike) => {
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].walletAmount.lastFetched = Date.now();
          const borrowerBalance = await debtTokenContract.balanceOf(borrower);
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].walletAmount.value(borrowerBalance);
        },
        value: makeVar(defaultFieldValue),
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

          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].troveMintedAmount.lastFetched = Date.now();

          const tokenAmount = ContractDataFreshnessManager.TroveManager.getTroveDebt.value.find(
            ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.DebtToken.STABLE),
          )?.amount;
          if (tokenAmount) {
            SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].troveMintedAmount.value(tokenAmount);
          }
        },
        value: makeVar(defaultFieldValue),
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
            ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.DebtToken.STABLE),
          )?.amount;
          if (repayableDebt) {
            SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].troveRepableDebtAmount.value(
              repayableDebt,
            );
          }
        },
        value: makeVar(defaultFieldValue),
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

          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].providedStability.lastFetched = Date.now();

          const tokenAmount = ContractDataFreshnessManager.StabilityPoolManager.getDepositorDeposits.value.find(
            ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.DebtToken.STABLE),
          )?.amount;
          if (tokenAmount) {
            SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].providedStability.value(tokenAmount);
          }
        },
        value: makeVar(defaultFieldValue),
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

          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STABLE].compoundedDeposit.lastFetched = Date.now();

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
        timeout: 1000 * 5,
      },
    },

    [Contracts.DebtToken.STOCK_1]: {
      priceUSDOracle: {
        fetch: async (debtTokenContract: DebtToken) => {
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].priceUSDOracle.lastFetched = Date.now();
          const oraclePrice = await debtTokenContract.getPrice();

          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].priceUSDOracle.value(oraclePrice);
        },
        value: makeVar(defaultFieldValue),
        lastFetched: 0,
        timeout: 1000 * 5,
      },

      walletAmount: {
        fetch: async (debtTokenContract: DebtToken, borrower: AddressLike) => {
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].walletAmount.lastFetched = Date.now();
          const borrowerBalance = await debtTokenContract.balanceOf(borrower);

          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].walletAmount.value(borrowerBalance);
        },
        value: makeVar(defaultFieldValue),
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

          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].troveMintedAmount.lastFetched = Date.now();

          const tokenAmount = ContractDataFreshnessManager.TroveManager.getTroveDebt.value.find(
            ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.DebtToken.STOCK_1),
          )?.amount;
          if (tokenAmount) {
            SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].troveMintedAmount.value(tokenAmount);
          }
        },
        value: makeVar(defaultFieldValue),
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

          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].troveRepableDebtAmount.lastFetched =
            Date.now();

          const repayableDebt = ContractDataFreshnessManager.TroveManager.getTroveRepayableDebts.value.find(
            ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.DebtToken.STOCK_1),
          )?.amount;
          if (repayableDebt) {
            SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].troveRepableDebtAmount.value(
              repayableDebt,
            );
          }
        },
        value: makeVar(defaultFieldValue),
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

          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].providedStability.lastFetched = Date.now();

          const tokenAmount = ContractDataFreshnessManager.StabilityPoolManager.getDepositorDeposits.value.find(
            ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.DebtToken.STOCK_1),
          )?.amount;
          if (tokenAmount) {
            SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].providedStability.value(tokenAmount);
          }
        },
        value: makeVar(defaultFieldValue),
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

          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].compoundedDeposit.lastFetched = Date.now();

          const compoundedDeposit =
            ContractDataFreshnessManager.StabilityPoolManager.getDepositorCompoundedDeposits.value.find(
              ({ tokenAddress }) => getCheckSum(tokenAddress) === getCheckSum(Contracts.DebtToken.STOCK_1),
            )?.amount;

          if (compoundedDeposit) {
            SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.STOCK_1].compoundedDeposit.value(
              compoundedDeposit,
            );
          }
        },
        value: makeVar(defaultFieldValue),
        lastFetched: 0,
        timeout: 1000 * 5,
      },
    },
  },
  TroveManager: {
    borrowingRate: {
      fetch: async (troveManagerContract: TroveManager) => {
        SchemaDataFreshnessManager.TroveManager.borrowingRate.lastFetched = Date.now();
        const borrowingRate = await troveManagerContract.getBorrowingRate();

        SchemaDataFreshnessManager.TroveManager.borrowingRate.value(borrowingRate);
      },
      value: makeVar(defaultFieldValue),
      lastFetched: 0,
      timeout: 1000 * 5,
    },
  },
  StabilityPoolManager: {},
  SwapOperations: {},
  SwapPairs: {
    [Contracts.SwapPairs.BTC]: {
      borrowerAmount: {
        fetch: async (swapPairContract: SwapPair, borrower: AddressLike, totalAmount: number, totalReserve: number) => {
          SchemaDataFreshnessManager.SwapPairs[Contracts.SwapPairs.BTC].borrowerAmount.lastFetched = Date.now();
          const userPoolBalance = await swapPairContract.balanceOf(borrower);

          const amount = userPoolBalance / (floatToBigInt(totalReserve) * floatToBigInt(totalAmount));

          SchemaDataFreshnessManager.SwapPairs[Contracts.SwapPairs.BTC].borrowerAmount.value(amount);
        },
        value: makeVar(defaultFieldValue),
        lastFetched: 0,
        timeout: 1000 * 5,
      },
      swapFee: {
        fetch: async (swapPairContract: SwapPair) => {
          SchemaDataFreshnessManager.SwapPairs[Contracts.SwapPairs.BTC].swapFee.lastFetched = Date.now();

          const swapFee = await swapPairContract.getSwapFee();

          SchemaDataFreshnessManager.SwapPairs[Contracts.SwapPairs.BTC].swapFee.value(swapFee);
        },
        value: makeVar(defaultFieldValue),
        lastFetched: 0,
        timeout: 1000 * 5,
      },
    },
    [Contracts.SwapPairs.USDT]: {
      borrowerAmount: {
        fetch: async (swapPairContract: SwapPair, borrower: AddressLike, totalAmount: number, totalReserve: number) => {
          SchemaDataFreshnessManager.SwapPairs[Contracts.SwapPairs.USDT].borrowerAmount.lastFetched = Date.now();
          const userPoolBalance = await swapPairContract.balanceOf(borrower);

          const amount = userPoolBalance / (floatToBigInt(totalReserve) * floatToBigInt(totalAmount));

          SchemaDataFreshnessManager.SwapPairs[Contracts.SwapPairs.USDT].borrowerAmount.value(amount);
        },
        value: makeVar(defaultFieldValue),
        lastFetched: 0,
        timeout: 1000 * 5,
      },
      swapFee: {
        fetch: async (swapPairContract: SwapPair) => {
          SchemaDataFreshnessManager.SwapPairs[Contracts.SwapPairs.USDT].swapFee.lastFetched = Date.now();
          const swapFee = await swapPairContract.getSwapFee();

          SchemaDataFreshnessManager.SwapPairs[Contracts.SwapPairs.USDT].swapFee.value(swapFee);
        },
        value: makeVar(defaultFieldValue),
        lastFetched: 0,
        timeout: 1000 * 5,
      },
    },
    [Contracts.SwapPairs.DFI]: {
      borrowerAmount: {
        fetch: async (swapPairContract: SwapPair, borrower: AddressLike, totalAmount: number, totalReserve: number) => {
          SchemaDataFreshnessManager.SwapPairs[Contracts.SwapPairs.DFI].borrowerAmount.lastFetched = Date.now();
          const userPoolBalance = await swapPairContract.balanceOf(borrower);

          const amount = userPoolBalance / (floatToBigInt(totalReserve) * floatToBigInt(totalAmount));

          SchemaDataFreshnessManager.SwapPairs[Contracts.SwapPairs.DFI].borrowerAmount.value(amount);
        },
        value: makeVar(defaultFieldValue),
        lastFetched: 0,
        timeout: 1000 * 5,
      },
      swapFee: {
        fetch: async (swapPairContract: SwapPair) => {
          SchemaDataFreshnessManager.SwapPairs[Contracts.SwapPairs.DFI].swapFee.lastFetched = Date.now();
          const swapFee = await swapPairContract.getSwapFee();

          SchemaDataFreshnessManager.SwapPairs[Contracts.SwapPairs.DFI].swapFee.value(swapFee);
        },
        value: makeVar(defaultFieldValue),
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
        SchemaDataFreshnessManager.StoragePool.totalCollateralRatio.value(TCR);
      },
      value: makeVar(defaultFieldValue),
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
