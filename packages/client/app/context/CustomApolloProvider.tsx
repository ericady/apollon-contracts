import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  ReactiveVar,
  Reference,
  TypePolicies,
  makeVar,
} from '@apollo/client';
import { AddressLike, ethers } from 'ethers';
import { PropsWithChildren, useEffect } from 'react';
import { DebtToken, TroveManager } from '../../types/ethers-contracts';
import { TokenFragmentFragment } from '../generated/gql-types';
import { TOKEN_FRAGMENT } from '../queries';
import { Contracts, useEthers } from './EthersProvider';

export function CustomApolloProvider({ children }: PropsWithChildren<{}>) {
  const { debtTokenContract, address: borrower } = useEthers();

  const cacheConfig =
    process.env.NEXT_PUBLIC_CONTRACT_MOCKING === 'enabled'
      ? {}
      : getProductionCacheConfig({ borrower, debtTokenContract });

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
              read: (existing, args) => {
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
              read: (existing, args) => {
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
            debtTokenContract[Contracts.DebtToken.JUSD],
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
  debtTokenContract,
}: {
  borrower: AddressLike;
  debtTokenContract: ReturnType<typeof useEthers>['debtTokenContract'];
}): TypePolicies => ({
  Token: {
    fields: {
      // TODO: Make it address aware
      priceUSD: {
        read(_, { readField }) {
          const address = readField('address');
          if (address && isFieldOutdated(SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD], 'priceUSD')) {
            // Make smart contract call using the address
            SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD].priceUSD.fetch(
              debtTokenContract[Contracts.DebtToken.JUSD],
              borrower,
            );
          }

          return SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD].priceUSD.value();
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
              debtTokenContract[Contracts.DebtToken.JUSD],
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
              debtTokenContract[Contracts.DebtToken.JUSD],
              borrower,
            );
          }

          return SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD].troveMintedAmount.value();
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
    : undefined;
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
        fetch: async (debtTokenContract: DebtToken) => {
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD]!.priceUSD.lastFetched = Date.now();
          const priceUSD = await debtTokenContract.getPrice();
          SchemaDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD]!.priceUSD.value(ethers.toNumber(priceUSD));
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
  TroveManager: undefined,
};

// FIXME: The cache needs to be initialized with the contracts data.

// FIXME: I am too stupid to make this typesafe for now. I must pass the exact Contract Data literally.
function isFieldOutdated(contract: ContractData<any>, field: string) {
  return contract[field].lastFetched < Date.now() - contract[field].timeout;
}
