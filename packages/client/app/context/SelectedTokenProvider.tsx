'use client';

import { useQuery } from '@apollo/client';
import { ethers } from 'ethers';
import { createContext, useContext, useState } from 'react';
import {
  GetBorrowerDebtTokensQuery,
  GetBorrowerDebtTokensQueryVariables,
  GetCollateralTokensQuery,
} from '../generated/gql-types';
import { GET_BORROWER_DEBT_TOKENS } from '../queries';
import { Contracts, useEthers } from './EthersProvider';

export type SelectedToken = {
  swapFee: bigint;
  change: number;
  isFavorite: boolean;
  address: string;
  symbol: string;
  priceUSD: bigint;
  priceUSD24hAgo: bigint;
  volume30dUSD: bigint;
  pool: {
    // id to fetch from API
    id: string;
    // Contract address of SwapPair
    address: string;
    liqudityPair: bigint[];
  };
};

export const SelectedTokenContext = createContext<{
  JUSDToken: GetCollateralTokensQuery['collateralTokenMetas'][number]['token'] | undefined;
  tokenRatio: bigint;
  selectedToken: SelectedToken | null;
  setSelectedToken: (asset: SelectedToken) => void;
}>({
  JUSDToken: undefined,
  tokenRatio: BigInt(0),
  selectedToken: null,
  setSelectedToken: () => {},
});

export default function SelectedTokenProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const { address } = useEthers();

  const [selectedToken, setSelectedToken] = useState<SelectedToken | null>(null);

  const { data } = useQuery<GetBorrowerDebtTokensQuery, GetBorrowerDebtTokensQueryVariables>(GET_BORROWER_DEBT_TOKENS, {
    fetchPolicy: 'cache-first',
    variables: {
      borrower: address,
    },
  });

  const JUSDToken = data?.debtTokenMetas.find(({ token }) => token.address === Contracts.DebtToken.STABLE)?.token;
  const tokenRatio =
    JUSDToken === undefined || selectedToken === null
      ? ethers.parseEther('1')
      : (selectedToken!.priceUSD * ethers.parseEther('1')) / BigInt(JUSDToken!.priceUSD);

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
  JUSDToken: GetCollateralTokensQuery['collateralTokenMetas'][number]['token'] | undefined;
  tokenRatio: bigint;
  selectedToken: SelectedToken | null;
  setSelectedToken: (asset: SelectedToken) => void;
} {
  const context = useContext(SelectedTokenContext);
  if (context === undefined) {
    throw new Error('useSelectedToken must be used within an SelectedTokenProvider');
  }
  return context;
}
