'use client';

import { useQuery } from '@apollo/client';
import { createContext, useContext, useState } from 'react';
import { GetCollateralTokensQuery, GetCollateralTokensQueryVariables } from '../generated/gql-types';
import { GET_BORROWER_COLLATERAL_TOKENS } from '../queries';
import { Contracts, useEthers } from './EthersProvider';
import { bigIntStringToFloat } from '../utils/math';

export type SelectedToken = {
  swapFee: number;
  change: number;
  isFavorite: boolean;
  address: string;
  symbol: string;
  priceUSD: number;
  priceUSD24hAgo: number;
  volume30dUSD: number;
  pool: {
    id: string;
    liqudityPair: number[];
  };
};

export const SelectedTokenContext = createContext<{
  JUSDToken: GetCollateralTokensQuery['getCollateralTokens'][number]['token'] | undefined;
  tokenRatio: number;
  selectedToken: SelectedToken | null;
  setSelectedToken: (asset: SelectedToken) => void;
}>({
  JUSDToken: undefined,
  tokenRatio: 0,
  selectedToken: null,
  setSelectedToken: () => {},
});

export default function SelectedTokenProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const { address } = useEthers();

  const [selectedToken, setSelectedToken] = useState<SelectedToken | null>(null);

  const { data } = useQuery<GetCollateralTokensQuery, GetCollateralTokensQueryVariables>(
    GET_BORROWER_COLLATERAL_TOKENS,
    {
      fetchPolicy: 'cache-first',
      variables: {
        borrower: address,
      },
    },
  );
  const JUSDToken = data?.getCollateralTokens.find(({ token }) => token.address === Contracts.ERC20.JUSD)?.token;
  const tokenRatio =
    JUSDToken === undefined || selectedToken === null ? 0 : selectedToken!.priceUSD / bigIntStringToFloat(JUSDToken!.priceUSD);

  return (
    <SelectedTokenContext.Provider
      value={{
        selectedToken,
        setSelectedToken,
        // TODO: Maybe use an env for the address instead
        JUSDToken,
        tokenRatio,
      }}
    >
      {children}
    </SelectedTokenContext.Provider>
  );
}

export function useSelectedToken(): {
  JUSDToken: GetCollateralTokensQuery['getCollateralTokens'][number]['token'] | undefined;
  tokenRatio: number;
  selectedToken: SelectedToken | null;
  setSelectedToken: (asset: SelectedToken) => void;
} {
  const context = useContext(SelectedTokenContext);
  if (context === undefined) {
    throw new Error('useSelectedToken must be used within an SelectedTokenProvider');
  }
  return context;
}
