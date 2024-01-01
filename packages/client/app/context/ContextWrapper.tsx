'use client';

import { PaletteMode } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import ThemeProvider from '@mui/material/styles/ThemeProvider';
import { SnackbarProvider } from 'notistack';
import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { ThemeModeLocalStorageKey } from '../components/Buttons/ThemeSwitch';
import MockServer from '../components/MockServer';
import NavigationBar from '../components/NavigationBar/NavigationBar';
import buildTheme from '../theme';
import { CustomApolloProvider } from './CustomApolloProvider';
import DeviceFallbackController from './DeviceFallbackController';
import EthersProvider from './EthersProvider';
import SelectedTokenProvider from './SelectedTokenProvider';
import TransactionDialogProvider from './TransactionDialogProvider';

function ContextWrapper({ children }: PropsWithChildren<{}>) {
  // The initial mode will be taken from LS or from the browser if the user didnt select any before.
  const [themeMode, setThemeMode] = useState<PaletteMode>('dark');

  // FIXME: Cant access LS in useState initializer because of page pre-rendering.
  useEffect(() => {
    const storedThemeMode = localStorage.getItem(ThemeModeLocalStorageKey) as PaletteMode | null;

    if (storedThemeMode) {
      setThemeMode(storedThemeMode);
    } else {
      setThemeMode(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
  }, []);

  const theme = useMemo(() => buildTheme(themeMode), [themeMode]);

  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider>
        <CssBaseline enableColorScheme />

        <DeviceFallbackController>
          <MockServer>
            <EthersProvider>
              <NavigationBar themeMode={themeMode} setThemeMode={setThemeMode} />

              <CustomApolloProvider>
                <SelectedTokenProvider>
                  <TransactionDialogProvider>{children}</TransactionDialogProvider>
                </SelectedTokenProvider>
              </CustomApolloProvider>
            </EthersProvider>
          </MockServer>
        </DeviceFallbackController>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default ContextWrapper;
