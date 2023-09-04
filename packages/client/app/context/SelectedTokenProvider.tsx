'use client';

import { useQuery } from '@apollo/client';
import { createContext, useContext, useState } from 'react';
import { JUSD_SYMBOL } from '../components/Features/Assets/Assets';
import { GetDebtTokensQuery, GetDebtTokensQueryVariables } from '../generated/gql-types';
import { GET_ALL_DEBT_TOKENS } from '../queries';

export type SelectedToken = {
  openingFee: number;
  change: number;
  isFavorite: boolean;
  address: string;
  symbol: string;
  priceUSD: number;
  priceUSD24hAgo: number;
};

export const SelectedTokenContext = createContext<{
  JUSDToken: GetDebtTokensQuery['getDebtTokens'][number]['token'] | undefined;
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
  const [selectedToken, setSelectedToken] = useState<SelectedToken | null>(null);

  const { data } = useQuery<GetDebtTokensQuery, GetDebtTokensQueryVariables>(GET_ALL_DEBT_TOKENS);
  const JUSDToken = data?.getDebtTokens.find(({ token }) => token.symbol === JUSD_SYMBOL)?.token;
  const tokenRatio =
    JUSDToken === undefined || selectedToken === null ? 0 : JUSDToken!.priceUSD / selectedToken!.priceUSD;

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
  selectedToken: SelectedToken | null;
  setSelectedToken: (asset: SelectedToken) => void;
  JUSDToken: GetDebtTokensQuery['getDebtTokens'][number]['token'] | undefined;
  tokenRatio: number;
} {
  const context = useContext(SelectedTokenContext);
  if (context === undefined) {
    throw new Error('useSelectedToken must be used within an SelectedTokenProvider');
  }
  return context;
}
