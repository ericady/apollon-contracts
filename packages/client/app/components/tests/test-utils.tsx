import { ApolloProvider } from '@apollo/client';
import { ThemeProvider } from '@emotion/react';
import { SnackbarProvider } from 'notistack';
import { PropsWithChildren, useState } from 'react';
import 'whatwg-fetch';
import { tokens } from '../../../mocks/handlers';
import { client } from '../../client';
import { EthersContext } from '../../context/EthersProvider';
import SelectedTokenProvider, { useSelectedToken } from '../../context/SelectedTokenProvider';
import WalletProvider from '../../context/WalletProvider';
import theme from '../../theme';

type Props = {
  shouldPreselectTokens?: boolean;
  shouldConnectWallet?: boolean;
};

export const IntegrationWrapper = ({ children, ...stateProps }: PropsWithChildren<Props>) => (
  <ThemeProvider theme={theme}>
    <SnackbarProvider>
      <WalletProvider>
        {/* Not using MockedProvider as we are using the same dev server for mocking */}
        <ApolloProvider client={client}>
          <SelectedTokenProvider>
            <SetupState {...stateProps}>{children}</SetupState>
          </SelectedTokenProvider>
        </ApolloProvider>
      </WalletProvider>
    </SnackbarProvider>
  </ThemeProvider>
);

/**
 * This component is used as a wrapper to mock library Providers and other Context state.
 * Actual calls to the modules of these libraries (ethers) must be made as a unit test because jest provides excellent module mocking.
 */
function SetupState({ children, shouldPreselectTokens, shouldConnectWallet }: PropsWithChildren<Props>) {
  const { setSelectedToken, selectedToken } = useSelectedToken();
  if (shouldPreselectTokens && !selectedToken) {
    const { address, priceUSD, priceUSD24hAgo, symbol } = tokens[0];
    setSelectedToken({
      address,
      change: 0.01,
      isFavorite: true,
      openingFee: 0.05,
      priceUSD,
      symbol,
      priceUSD24hAgo,
      volume24hUSD: 1000,
    });
  }

  const [address, setAddress] = useState<string>('');
  if (shouldConnectWallet && !address) {
    setAddress('0x1234');
  }

  return (
    <EthersContext.Provider
      value={{
        provider: {} as any,
        signer: {} as any,
        loginError: null,
        address,
        connectWallet: () => console.log('connectWallet was called'),
      }}
    >
      {children}
    </EthersContext.Provider>
  );
}

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
