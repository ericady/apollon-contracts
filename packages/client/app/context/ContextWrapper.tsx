'use client';

import { ApolloProvider } from '@apollo/client';
import { PaletteMode } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import ThemeProvider from '@mui/material/styles/ThemeProvider';
import { SnackbarProvider } from 'notistack';
import { PropsWithChildren, useMemo, useState } from 'react';
import { client } from '../client';
import { ThemeModeLocalStorageKey } from '../components/Buttons/ThemeSwitch';
import MockServer from '../components/MockServer';
import NavigationBar from '../components/NavigationBar/NavigationBar';
import buildTheme from '../theme';
import DeviceFallbackController from './DeviceFallbackController';
import EthersProvider from './EthersProvider';
import SelectedTokenProvider from './SelectedTokenProvider';
import WalletProvider from './WalletProvider';

function ContextWrapper({ children }: PropsWithChildren<{}>) {
  // The initial mode will be taken from LS or from the browser if the user didnt select any before.
  const [themeMode, setThemeMode] = useState<PaletteMode>(() => {
    const storedThemeMode = localStorage.getItem(ThemeModeLocalStorageKey) as PaletteMode | null;

    if (storedThemeMode) {
      return storedThemeMode;
    } else {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
  });

  const theme = useMemo(() => buildTheme(themeMode), [themeMode]);

  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider>
        <CssBaseline enableColorScheme />

        <DeviceFallbackController>
          <MockServer>
            <EthersProvider>
              <WalletProvider>
                <NavigationBar themeMode={themeMode} setThemeMode={setThemeMode} />

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
