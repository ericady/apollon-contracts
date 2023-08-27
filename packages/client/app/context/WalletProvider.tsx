'use client';

import { ethers } from 'ethers';
import { createContext, useContext, useEffect, useState } from 'react';
import { useEthers } from './EthersProvider';

export const WalletContext = createContext<{
  etherAmount: number;
}>({
  etherAmount: 0,
});

export default function WalletProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [etherAmount, setEtherAmount] = useState<number>(0);

  const { address, provider } = useEthers();

  useEffect(() => {
    async function fetchBorrowerBalance() {
      const balance = await provider!.getBalance(address);
      const amount = ethers.formatEther(balance);
      console.log('amount: ', amount);
      setEtherAmount(parseFloat(amount));
    }

    if (address && provider) {
      fetchBorrowerBalance();
    }
  }, [address, provider, setEtherAmount]);

  return <WalletContext.Provider value={{ etherAmount }}>{children}</WalletContext.Provider>;
}

export function useWallet(): {
  etherAmount: number;
} {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within an WalletProvider');
  }
  return context;
}
