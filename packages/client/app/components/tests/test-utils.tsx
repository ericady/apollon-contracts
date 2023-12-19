import { ApolloClient, ApolloProvider, InMemoryCache } from '@apollo/client';
import { ThemeProvider } from '@emotion/react';
import { SnackbarProvider } from 'notistack';
import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import 'whatwg-fetch';
import { EthersContext, useEthers } from '../../context/EthersProvider';
import SelectedTokenProvider, { useSelectedToken } from '../../context/SelectedTokenProvider';
import buildTheme from '../../theme';
import MockedPositionsWithoutBorrower from './mockedResponses/GetDebtTokens.mocked.json';

// This is just the default client config when testing against the dev server
export const client = new ApolloClient({
  // TODO: replace with your own graphql server
  uri: 'https://flyby-router-demo.herokuapp.com/',
  cache: new InMemoryCache(),
});

type Props = {
  shouldPreselectTokens?: boolean;
  shouldConnectWallet?: boolean;
  shouldConnectWalletDelayed?: boolean;
  mockEthers?: {
    contractMock?: Partial<
      Record<keyof ReturnType<typeof useEthers>['contracts'], jest.Mock | Record<string, jest.Mock>>
    >;
    connectWalletMock?: jest.Mock;
  };
};

export const IntegrationWrapper = ({ children, ...stateProps }: PropsWithChildren<Props>) => {
  const theme = useMemo(() => buildTheme('dark'), []);

  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider>
        {/* Not using MockedProvider as we are using the same dev server for mocking */}
        <ApolloProvider client={client}>
          <SelectedTokenProvider>
            <SetupState {...stateProps}>{children}</SetupState>
          </SelectedTokenProvider>
        </ApolloProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
};

export const PreselectedTestToken = MockedPositionsWithoutBorrower.data.getDebtTokens[0].token;

/**
 * This component is used as a wrapper to mock library Providers and other Context state.
 * Actual calls to the modules of these libraries (ethers) must be made as a unit test because jest provides excellent module mocking.
 */
function SetupState({
  children,
  shouldPreselectTokens,
  shouldConnectWallet,
  shouldConnectWalletDelayed,
  mockEthers,
}: PropsWithChildren<Props>) {
  const { setSelectedToken, selectedToken } = useSelectedToken();

  useEffect(() => {
    if (shouldPreselectTokens && !selectedToken) {
      const { address, priceUSD, priceUSD24hAgo, symbol } = PreselectedTestToken;
      setSelectedToken({
        address,
        change: 0.01,
        isFavorite: true,
        swapFee: 0.05,
        priceUSD,
        symbol,
        priceUSD24hAgo,
        volume30dUSD: 1000,
        pool: {
          id: '0xbE8F15C2db5Fc2AFc4e17B4Dd578Fbc6e5aA9592',
          liqudityPair: [1000, 1000],
        },
      });
    }
  });

  const [address, setAddress] = useState<string>('');
  if (shouldConnectWallet && !address) {
    setAddress('0xbE8F15C2db5Fc2AFc4e17B4Dd578Fbc6e5aA9591');
  }

  if (shouldConnectWalletDelayed && !address) {
    setTimeout(() => {
      setAddress('0xbE8F15C2db5Fc2AFc4e17B4Dd578Fbc6e5aA9591');
    }, 500);
  }

  return (
    <EthersContext.Provider
      value={{
        contracts: mockEthers?.contractMock ? mockEthers.contractMock : ({} as any),
        provider: {} as any,
        signer: {} as any,
        address,
        connectWallet: () => mockEthers?.connectWalletMock?.(),
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
