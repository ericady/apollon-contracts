import { ApolloProvider } from '@apollo/client';
import { PropsWithChildren } from 'react';
import { client } from '../../client';

export const IntegrationWrapper = ({ children }: PropsWithChildren<{}>) => (
  <ApolloProvider client={client}>{children}</ApolloProvider>
);
