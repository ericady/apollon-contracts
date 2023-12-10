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
import { DebtToken } from '../../types/ethers-contracts';
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
        if (isFieldOutdated(ContractDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD], 'priceUSD')) {
          ContractDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD].priceUSD.fetch(
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
          if (
            address &&
            isFieldOutdated(ContractDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD], 'priceUSD')
          ) {
            // Make smart contract call using the address
            ContractDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD].priceUSD.fetch(
              debtTokenContract[Contracts.DebtToken.JUSD],
              borrower,
            );
          }

          return ContractDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD].priceUSD.value();
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

          console.log('tokenData?.address: ', tokenData?.address);

          if (
            tokenData?.address &&
            isFieldOutdated(ContractDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD], 'walletAmount')
          ) {
            // Make smart contract call using the address
            ContractDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD].walletAmount.fetch(
              debtTokenContract[Contracts.DebtToken.JUSD],
              borrower,
            );
          }

          return ContractDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD].walletAmount.value();
        },
      },
    },
  },
});

type ContractData = Record<
  string,
  {
    fetch: Function;
    value: ReactiveVar<number>;
    lastFetched: number;
    timeout: number;
  }
>;

// Type that mirros the Contracts object with literal access to the contract addresses
type ContractDataFreshnessManager<T> = {
  [P in keyof T]: T[P] extends Record<string, string> ? { [Address in T[P][keyof T[P]]]: ContractData } : ContractData;
};

// FIXME: This is also not perfectly typesafe. The keys are not required.
export const ContractDataFreshnessManager: ContractDataFreshnessManager<typeof Contracts> = {
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
          ContractDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD]!.priceUSD.lastFetched = Date.now();
          const priceUSD = await debtTokenContract.getPrice();
          ContractDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD]!.priceUSD.value(ethers.toNumber(priceUSD));
        },
        value: makeVar(0),
        lastFetched: 0,
        timeout: 1000 * 5,
      },
      walletAmount: {
        fetch: async (debtTokenContract: DebtToken, borrower: AddressLike) => {
          ContractDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD]!.walletAmount.lastFetched = Date.now();
          const borrowerBalance = await debtTokenContract.balanceOf(borrower);
          ContractDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD]!.walletAmount.value(
            ethers.toNumber(borrowerBalance),
          );
        },
        value: makeVar(0),
        lastFetched: 0,
        timeout: 1000 * 5,
      },
    },
  },
};

// FIXME: The cache needs to be initialized with the contracts data.

// FIXME: I am too stupid to make this typesafe for now. I must pass the exact Contract Data literally.
function isFieldOutdated(contract: ContractData, field: string) {
  return contract[field].lastFetched < Date.now() - contract[field].timeout;
}
