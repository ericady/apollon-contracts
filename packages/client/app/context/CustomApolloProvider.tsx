import { ApolloClient, ApolloProvider, InMemoryCache } from '@apollo/client';
import { PropsWithChildren } from 'react';
import { useEthers } from './EthersProvider';

export function CustomApolloProvider({ children }: PropsWithChildren<{}>) {
  const { debtTokenContract, address } = useEthers();

  const client = new ApolloClient({
    // TODO: replace with your own graphql server
    uri: 'https://flyby-router-demo.herokuapp.com/',

    connectToDevTools: true,
    cache: new InMemoryCache({
      typePolicies: {
        Token: {
          fields: {
            priceUSD: {
              read() {
                console.log('priceUSD read function is called');
                return 100;
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

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
