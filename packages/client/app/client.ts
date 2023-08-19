import { ApolloClient, InMemoryCache } from '@apollo/client';

export const client = new ApolloClient({
  // TODO: replace with your own graphql server
  uri: 'https://flyby-router-demo.herokuapp.com/',
  cache: new InMemoryCache(),
});
