'use client';

import { BrowserProvider, Eip1193Provider, JsonRpcSigner } from 'ethers';
import { createContext, useContext, useState } from 'react';

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export const EthersContext = createContext<{
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  loginError: LoginError | null;
  address: string | null;
  connectWallet: () => void;
}>({
  provider: null,
  signer: null,
  loginError: null,
  address: null,
  connectWallet: () => {},
});

type LoginError = 'User rejected permissions' | 'MetaMask is not installed' | 'Authentication closed';

export default function EthersProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<LoginError | null>(null);

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        // Opens Meta Mask
        const newProvider = new BrowserProvider(window.ethereum);
        const newSigner = await newProvider.getSigner();
        setProvider(newProvider);
        setSigner(newSigner);

        try {
          // Request account access
          const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts',
          });
          setAddress(accounts[0]);
        } catch (error) {
          setLoginError('User rejected permissions');
        }
      } else {
        // TODO: Handle this default case but its not documented correctly...
        // setProvider(ethers.getDefaultProvider())
        setLoginError('MetaMask is not installed');
      }
    } catch {
      setLoginError('Authentication closed');
    }
  };

  return (
    <EthersContext.Provider value={{ provider, signer, loginError, address, connectWallet }}>
      {children}
    </EthersContext.Provider>
  );
}

export function useEthers(): {
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  loginError: LoginError | null;
  address: string | null;
  connectWallet: () => void;
} {
  const context = useContext(EthersContext);
  if (context === undefined) {
    throw new Error('useEthers must be used within an EthersProvider');
  }
  return context;
}
