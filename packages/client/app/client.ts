import { ApolloClient, InMemoryCache } from '@apollo/client';
import { RetryLink } from '@apollo/client/link/retry';

const link = new RetryLink();
export const client = new ApolloClient({
  uri: 'localhost:3000/',
  cache: new InMemoryCache(),
  link,
});
