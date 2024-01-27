'use client';

import { useQuery } from '@apollo/client';
import { createContext, useContext, useState } from 'react';
import { GetCollateralTokensQuery, GetCollateralTokensQueryVariables } from '../generated/gql-types';
import { GET_BORROWER_COLLATERAL_TOKENS } from '../queries';
import { divBigIntsToFloat } from '../utils/math';
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
    id: string;
    liqudityPair: bigint[];
  };
};

export const SelectedTokenContext = createContext<{
  JUSDToken: GetCollateralTokensQuery['collateralTokenMetas'][number]['token'] | undefined;
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
  const JUSDToken = data?.collateralTokenMetas.find(({ token }) => token.address === Contracts.ERC20.JUSD)?.token;
  const tokenRatio =
    JUSDToken === undefined || selectedToken === null
      ? 0
      : divBigIntsToFloat(selectedToken!.priceUSD, BigInt(JUSDToken!.priceUSD), 5);

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
