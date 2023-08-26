'use client';

import { ApolloProvider } from '@apollo/client';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import CssBaseline from '@mui/material/CssBaseline';
import ThemeProvider from '@mui/material/styles/ThemeProvider';
import { Inter } from 'next/font/google';
import { useEffect } from 'react';
import { client } from './client';
import NavigationBar from './components/NavigationBar/NavigationBar';
import EthersProvider from './context/EthersProvider';
import './globals.css';
import theme from './theme';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Initializes the service worker. TODO: Move it to a proper client-side location later.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
      import('../mocks').then((module) => {
        module.default();
      });
    }
  }, []);

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
      </head>
      <body className={inter.className}>
        <ThemeProvider theme={theme}>
          <CssBaseline enableColorScheme />

          <EthersProvider>
            <NavigationBar />

            <ApolloProvider client={client}>
              <main>{children}</main>
            </ApolloProvider>
          </EthersProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
