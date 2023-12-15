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
import { DebtToken, SwapPair, TroveManager } from '../../generated/types';
import { QueryGetTokenArgs, TokenFragmentFragment } from '../generated/gql-types';
import { TOKEN_FRAGMENT } from '../queries';
import { Contracts, useEthers } from './EthersProvider';

export function CustomApolloProvider({ children }: PropsWithChildren<{}>) {
  const {
    contracts: { debtTokenContracts, troveManagerContract },
    address: borrower,
  } = useEthers();

  const cacheConfig =
    process.env.NEXT_PUBLIC_CONTRACT_MOCKING === 'enabled'
      ? { fields: {}, Query: {} }
      : getProductionCacheConfig({ borrower, debtTokenContracts, troveManagerContract });

  const client = new ApolloClient({
    // TODO: replace with our deployed graphql endpoint
    uri: 'http://localhost:8000/subgraphs/name/subgraph',

    connectToDevTools: true,
    cache: new InMemoryCache({
      typePolicies: {
        ...cacheConfig,

        Query: {
          fields: {
            getPositions: {
              // Don't cache separate results based on
              // any of this field's arguments.
              keyArgs: ['isOpen'],
              // Concatenate the incoming list items with
              // the existing list items.
              merge(existing = { positions: [] }, incoming) {
                return {
                  ...incoming,
                  positions: [...existing.positions, ...incoming.positions],
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

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_CONTRACT_MOCKING !== 'enabled') {
      const priceUSDIntervall = setInterval(() => {
        if (isFieldOutdated(SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD], 'priceUSD')) {
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD].priceUSD.fetch(
            debtTokenContracts[Contracts.DebtToken.JUSD],
          );
        }
        // This can be any interval you want but it guarantees data freshness if its not already fresh.
      }, 1000 * 10);

      return () => {
        clearInterval(priceUSDIntervall);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}

const getProductionCacheConfig = ({
  borrower,
  debtTokenContracts,
  troveManagerContract,
}: {
  borrower: AddressLike;
  debtTokenContracts: ReturnType<typeof useEthers>['contracts']['debtTokenContracts'];
  troveManagerContract: ReturnType<typeof useEthers>['contracts']['troveManagerContract'];
}): { fields: TypePolicies; Query: TypePolicy } => ({
  fields: {
    Token: {
      fields: {
        // TODO: Make it address aware
        priceUSD: {
          read(_, { readField }) {
            const address = readField('address');
            if (
              address &&
              isFieldOutdated(SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD], 'priceUSD')
            ) {
              // Make smart contract call using the address
              SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD].priceUSD.fetch(
                debtTokenContracts[Contracts.DebtToken.JUSD],
                borrower,
              );
            }

            return SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD].priceUSD.value();
          },
        },
        priceUSDOracle: {
          read(_, { args }) {
            if (isFieldOutdated(SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD], 'priceUSDOracle')) {
              const address = (args as QueryGetTokenArgs).address;
              SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD].priceUSDOracle.fetch(
                // FIXME: use address insteadof hardcoded contract
                debtTokenContracts[Contracts.DebtToken.JUSD],
              );
            }

            return SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD].priceUSDOracle.value();
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
              isFieldOutdated(SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD], 'walletAmount')
            ) {
              // Make smart contract call using the address
              SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD].walletAmount.fetch(
                debtTokenContracts[Contracts.DebtToken.JUSD],
                borrower,
              );
            }

            return SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD].walletAmount.value();
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
              isFieldOutdated(SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD], 'troveMintedAmount')
            ) {
              SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD].troveMintedAmount.fetch(
                debtTokenContracts[Contracts.DebtToken.JUSD],
                borrower,
              );
            }

            return SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD].troveMintedAmount.value();
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
          };
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
    'getTroveDebt'
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
  },
};

// FIXME: This is also not perfectly typesafe. The keys are not required.

/**
 * This manages the data, fetching and freshness on each client side field in the schema
 */
export const SchemaDataFreshnessManager: ContractDataFreshnessManager<typeof Contracts> = {
  ERC20: {
    [Contracts.ERC20.ETH]: {},
    [Contracts.ERC20.BTC]: {},
    [Contracts.ERC20.DEFI]: {},
    [Contracts.ERC20.USDT]: {},
  },
  DebtToken: {
    [Contracts.DebtToken.DebtToken1]: {},
    [Contracts.DebtToken.DebtToken2]: {},
    [Contracts.DebtToken.DebtToken3]: {},
    [Contracts.DebtToken.DebtToken4]: {},
    [Contracts.DebtToken.DebtToken5]: {},
    [Contracts.DebtToken.DebtToken6]: {},
    [Contracts.DebtToken.JUSD]: {
      priceUSD: {
        fetch: async (debtTokenContract: DebtToken, swapPairContract: SwapPair) => {
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD]!.priceUSD.lastFetched = Date.now();
          // FIXME: Refactor this to be more efficient => use query to fetch from cache
          const priceJUSD = await debtTokenContract.getPrice();

          const [reserveA, reserveB] = await swapPairContract.getReserves();
          const priceTokenInJUSD = (reserveA / reserveB) * priceJUSD;

          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD]!.priceUSD.value(
            ethers.toNumber(priceTokenInJUSD),
          );
        },
        value: makeVar(0),
        lastFetched: 0,
        timeout: 1000 * 5,
      },
      priceUSDOracle: {
        fetch: async (debtTokenContract: DebtToken) => {
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD]!.priceUSDOracle.lastFetched = Date.now();
          const oraclePrice = await debtTokenContract.getPrice();

          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD]!.priceUSDOracle.value(
            ethers.toNumber(oraclePrice),
          );
        },
        value: makeVar(0),
        lastFetched: 0,
        timeout: 1000 * 5,
      },

      walletAmount: {
        fetch: async (debtTokenContract: DebtToken, borrower: AddressLike) => {
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD]!.walletAmount.lastFetched = Date.now();
          const borrowerBalance = await debtTokenContract.balanceOf(borrower);
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD]!.walletAmount.value(
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

          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD]!.troveMintedAmount.lastFetched = Date.now();

          const tokenAmount = ContractDataFreshnessManager.TroveManager.getTroveDebt.value.find(
            ({ tokenAddress }) => tokenAddress === Contracts.DebtToken.JUSD,
          )?.amount;
          if (tokenAmount) {
            SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD]!.troveMintedAmount.value(
              ethers.toNumber(tokenAmount),
            );
          }
        },
        value: makeVar(0),
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

        SchemaDataFreshnessManager.TroveManager.borrowingRate.value(ethers.toNumber(borrowingRate));
      },
      value: makeVar(0),
      lastFetched: 0,
      timeout: 1000 * 5,
    },
  },
  SwapOperations: {},
  SwapPairs: {
    '0x509ee0d083ddf8ac028f2a56731412edd63224b9': {},
    '0x509ee0d083ddf8ac028f2a56731412edd63225b9': {},
  },
};

// FIXME: The cache needs to be initialized with the contracts data.

// FIXME: I am too stupid to make this typesafe for now. I must pass the exact Contract Data literally.
function isFieldOutdated(contract: ContractData<any>, field: string) {
  return contract[field].lastFetched < Date.now() - contract[field].timeout;
}
