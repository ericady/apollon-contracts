import { ApolloClient, ApolloProvider, InMemoryCache, ReactiveVar, makeVar } from '@apollo/client';
import { AddressLike } from 'ethers';
import { PropsWithChildren, useEffect } from 'react';
import { DebtToken } from '../../types/ethers-contracts';
import { Contracts, useEthers } from './EthersProvider';

const someVar = makeVar(0);

export const ContractDataFreshness: Record<
  string,
  { [key: string]: { fetch: Function; value: ReactiveVar<number>; lastFetched: number; timeout: number } }
> = {
  [Contracts.DebtToken.JUSD]: {
    priceUSD: {
      fetch: async (debtTokenContract: DebtToken, borrower: AddressLike) => {
        // const balance = debtTokenContract.balanceOf(borrower);
        const balance = Math.random() * 1000;
        ContractDataFreshness[Contracts.DebtToken.JUSD].priceUSD.lastFetched = Date.now();
        ContractDataFreshness[Contracts.DebtToken.JUSD].priceUSD.value(balance);
      },
      value: makeVar(0),
      lastFetched: 0,
      timeout: 1000 * 5,
    },
  },
};

// FIXME: The cache needs to be initialized with the contracts data.

function isFieldOutdated<T extends keyof typeof ContractDataFreshness>(
  contract: T,
  field: keyof (typeof ContractDataFreshness)[T],
) {
  return (
    ContractDataFreshness[contract][field].lastFetched < Date.now() - ContractDataFreshness[contract][field].timeout
  );
}

export function CustomApolloProvider({ children }: PropsWithChildren<{}>) {
  const { debtTokenContract, address: borrower } = useEthers();

  const client = new ApolloClient({
    // TODO: replace with your own graphql server
    uri: 'https://flyby-router-demo.herokuapp.com/',

    connectToDevTools: true,
    cache: new InMemoryCache({
      typePolicies: {
        Token: {
          fields: {
            priceUSD: {
              read(existing, { readField }) {
                const address = readField('address');
                if (address && isFieldOutdated(Contracts.DebtToken.JUSD, 'priceUSD')) {
                  // Make smart contract call using the address
                  ContractDataFreshness[Contracts.DebtToken.JUSD].priceUSD.fetch(debtTokenContract!, borrower);
                }

                return ContractDataFreshness[Contracts.DebtToken.JUSD].priceUSD.value();
              },
            },
          },
        },

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
    const intervall = setInterval(() => {
      ContractDataFreshness[Contracts.DebtToken.JUSD].priceUSD.fetch(debtTokenContract!, borrower);
    }, 1000 * 10);

    return () => {
      clearInterval(intervall);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
