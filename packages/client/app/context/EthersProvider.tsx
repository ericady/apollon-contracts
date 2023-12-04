'use client';

import { Button } from '@mui/material';
import { BrowserProvider, Contract, Eip1193Provider, JsonRpcSigner, Network } from 'ethers';
import Link from 'next/link';
import { useSnackbar } from 'notistack';
import { createContext, useContext, useState } from 'react';

// copied ABI from https://goerli.etherscan.io/token/0x509ee0d083ddf8ac028f2a56731412edd63223b9#writeContract

import { DebtToken } from '../../types/ethers-contracts/DebtToken';
import debtTokenAbi from './abis/DebtToken.json';

// TODO: This is just dummy data and will be exchanged with the real implementation later.
// https://goerli.etherscan.io/token/0x509ee0d083ddf8ac028f2a56731412edd63223b9#writeContract
// export const contractAddress = '0x509ee0d083ddf8ac028f2a56731412edd63223b9';
// const testContract = new Contract(contractAddress, contractAbi, newProvider);
// const contractWithSigner = testContract.connect(newSigner) as DummyContractDataAbi;

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export const Contracts = {
  DebtToken: '0x48f322be8Acb969E1Bd4C49E3e873Ec0a469Ee9D',
  IERC20: '0x509ee0d083ddf8ac028f2a56731412edd63223b9',
};

export type SharedContracts = {
  debtToken: DebtToken;
};

export const EthersContext = createContext<{
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  address: string;
  debtTokenContract: DebtToken | null;
  connectWallet: () => void;
}>({
  provider: null,
  signer: null,
  address: '',
  debtTokenContract: null,
  connectWallet: () => {},
});

export default function EthersProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const { enqueueSnackbar } = useSnackbar();

  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [address, setAddress] = useState('');
  const [debtTokenContract, setDebtTokenContract] = useState<DebtToken | null>(null);

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        // Opens Meta Mask
        // TODO: Implement network change: https://docs.ethers.org/v5/concepts/best-practices/
        const testNetwork = new Network('goerli', 5);

        const newProvider = new BrowserProvider(window.ethereum, testNetwork);
        const newSigner = await newProvider.getSigner();
        setProvider(newProvider);
        setSigner(newSigner);

        const debtTokenContract = new Contract(Contracts.DebtToken, debtTokenAbi, newProvider);
        const debtTokenContractWithSigner = debtTokenContract.connect(newSigner) as DebtToken;
        setDebtTokenContract(debtTokenContractWithSigner);

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

  // TODO: try to implement automatic login if user has been seen and allow resolving of view fields
  // useEffect(() => {
  //   if (typeof window.ethereum !== 'undefined') {
  //     const testNetwork = new Network('goerli', 5);

  //     const newProvider = new BrowserProvider(window.ethereum, testNetwork);

  //     const debtTokenContract = new Contract(Contracts.DebtToken, debtTokenAbi, newProvider) as unknown as DebtToken;
  //     setDebtTokenContract(debtTokenContract);

  //   }
  // }, []);

  return (
    <EthersContext.Provider value={{ provider, signer, address, connectWallet, debtTokenContract }}>
      {children}
    </EthersContext.Provider>
  );
}

export function useEthers(): {
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  address: string;
  debtTokenContract: DebtToken | null;
  connectWallet: () => void;
} {
  const context = useContext(EthersContext);
  if (context === undefined) {
    throw new Error('useEthers must be used within an EthersProvider');
  }
  return context;
}
