'use client';

import { ApolloProvider } from '@apollo/client';
import CssBaseline from '@mui/material/CssBaseline';
import ThemeProvider from '@mui/material/styles/ThemeProvider';
import { SnackbarProvider } from 'notistack';
import { PropsWithChildren } from 'react';
import { client } from '../client';
import MockServer from '../components/MockServer';
import NavigationBar from '../components/NavigationBar/NavigationBar';
import theme from '../theme';
import DeviceFallbackController from './DeviceFallbackController';
import EthersProvider from './EthersProvider';
import SelectedTokenProvider from './SelectedTokenProvider';
import WalletProvider from './WalletProvider';

function ContextWrapper({ children }: PropsWithChildren<{}>) {
  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider>
        <CssBaseline enableColorScheme />

        <DeviceFallbackController>
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
        </DeviceFallbackController>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default ContextWrapper;
