import { ApolloClient, InMemoryCache } from '@apollo/client';

export const client = new ApolloClient({
  // TODO: replace with your own graphql server
  uri: 'https://flyby-router-demo.herokuapp.com/',
  cache: new InMemoryCache({
    typePolicies: {
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
