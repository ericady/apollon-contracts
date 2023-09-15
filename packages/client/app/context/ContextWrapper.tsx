'use client';

import { ApolloProvider } from '@apollo/client';
import CssBaseline from '@mui/material/CssBaseline';
import ThemeProvider from '@mui/material/styles/ThemeProvider';
import { useRouter } from 'next/navigation';
import { PropsWithChildren, useEffect } from 'react';
import { client } from '../client';
import MockServer from '../components/MockServer';
import NavigationBar from '../components/NavigationBar/NavigationBar';
import theme from '../theme';
import EthersProvider from './EthersProvider';
import SelectedTokenProvider from './SelectedTokenProvider';
import WalletProvider from './WalletProvider';

function ContextWrapper({ children }: PropsWithChildren<{}>) {
  const { push } = useRouter();

  useEffect(() => {
    if (window.innerWidth < 1500) {
      push('/fallback');
    }
  }, [push]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />

      <MockServer>
        <EthersProvider>
          <WalletProvider>
            <NavigationBar />

            <ApolloProvider client={client}>
              <SelectedTokenProvider>{children}</SelectedTokenProvider>
            </ApolloProvider>
          </WalletProvider>
        </EthersProvider>
      </MockServer>
    </ThemeProvider>
  );
}

export default ContextWrapper;
