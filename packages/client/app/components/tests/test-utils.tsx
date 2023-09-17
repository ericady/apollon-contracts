import { ApolloProvider } from '@apollo/client';
import { ThemeProvider } from '@emotion/react';
import { SnackbarProvider } from 'notistack';
import { PropsWithChildren } from 'react';
import { client } from '../../client';
import EthersProvider from '../../context/EthersProvider';
import SelectedTokenProvider from '../../context/SelectedTokenProvider';
import WalletProvider from '../../context/WalletProvider';
import theme from '../../theme';

export const IntegrationWrapper = ({ children }: PropsWithChildren<{}>) => (
  <ThemeProvider theme={theme}>
    <SnackbarProvider>
      <EthersProvider>
        <WalletProvider>
          {/* Not using MockedProvider as we are using the same dev server for mocking */}
          <ApolloProvider client={client}>
            <SelectedTokenProvider>{children}</SelectedTokenProvider>
          </ApolloProvider>
        </WalletProvider>
      </EthersProvider>
    </SnackbarProvider>
  </ThemeProvider>
);

// https://playwright.dev/docs/test-fixtures#creating-a-fixture
// https://github.com/microsoft/playwright/issues/27137
// TODO: Not yet implemented
// export const test = base.extend<{ testHook: void }>({
//   testHook: [
//     async ({}, use) => {
//       console.log('BEFORE EACH HOOK FROM FIXTURE');
//       // Any code here will be run as a before each hook

//       await use();

//       console.log('AFTER EACH HOOK FROM FIXTURE');
//       // Put any code you want run automatically after each test here
//     },
//     { auto: true },
//   ],
// });
