'use client';

import { Button } from '@mui/material';
import { BrowserProvider, Contract, Eip1193Provider, JsonRpcSigner, Network } from 'ethers';
import Link from 'next/link';
import { useSnackbar } from 'notistack';
import { createContext, useContext, useState } from 'react';

// copied ABI from https://goerli.etherscan.io/token/0x509ee0d083ddf8ac028f2a56731412edd63223b9#writeContract
import { DummyContractDataAbi } from '../../types/ethers-contracts/DummyContractDataAbi';
import contractAbi from './DummyContractData.abi.json';

// TODO: This is just dummy data and will be exchanged with the real implementation later.
// https://goerli.etherscan.io/token/0x509ee0d083ddf8ac028f2a56731412edd63223b9#writeContract
export const contractAddress = '0x509ee0d083ddf8ac028f2a56731412edd63223b9';

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export const EthersContext = createContext<{
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  address: string;
  contract: DummyContractDataAbi | null;
  connectWallet: () => void;
}>({
  provider: null,
  signer: null,
  address: '',
  contract: null,
  connectWallet: () => {},
});

export default function EthersProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const { enqueueSnackbar } = useSnackbar();

  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [address, setAddress] = useState('');
  const [contract, setContract] = useState<DummyContractDataAbi | null>(null);

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        // Opens Meta Mask
        // TODO: Implement network change: https://docs.ethers.org/v5/concepts/best-practices/
        const testNetwork = new Network('goerli', 5);

        const newProvider = new BrowserProvider(window.ethereum, testNetwork);
        const newSigner = await newProvider.getSigner();

        // TODO: implement real contracts
        const testContract = new Contract(contractAddress, contractAbi, newProvider);
        const contractWithSigner = testContract.connect(newSigner) as DummyContractDataAbi;

        setContract(contractWithSigner);
        setProvider(newProvider);
        setSigner(newSigner);

        try {
          // Request account access
          const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts',
          });
          setAddress(accounts[0]);
        } catch (error) {
          enqueueSnackbar('You rejected necessary permissions. Please try again.', { variant: 'error' });
        }
      } else {
        // TODO: Handle this default case but its not documented correctly...
        // setProvider(ethers.getDefaultProvider())
        enqueueSnackbar('MetaMask extension is not installed. Please install and try again.', {
          variant: 'error',
          action: (
            <Button
              LinkComponent={Link}
              href="https://metamask.io/"
              variant="contained"
              target="_blank"
              rel="noreferrer"
            >
              Install
            </Button>
          ),
        });
      }
    } catch {
      enqueueSnackbar('You closed the authentication window. Please try loging in again.', { variant: 'error' });
    }
  };

  return (
    <EthersContext.Provider value={{ provider, signer, address, connectWallet, contract }}>
      {children}
    </EthersContext.Provider>
  );
}

export function useEthers(): {
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  address: string;
  contract: DummyContractDataAbi | null;
  connectWallet: () => void;
} {
  const context = useContext(EthersContext);
  if (context === undefined) {
    throw new Error('useEthers must be used within an EthersProvider');
  }
  return context;
}
