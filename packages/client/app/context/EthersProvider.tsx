'use client';

import { Button } from '@mui/material';
import { Contract, Eip1193Provider, JsonRpcSigner } from 'ethers';
import { JsonRpcProvider } from 'ethers/providers';
import Link from 'next/link';
import { useSnackbar } from 'notistack';
import { createContext, useContext, useEffect, useState } from 'react';
import { DebtToken, SwapOperations, SwapPair, TroveManager } from '../../generated/types';
import { SchemaDataFreshnessManager } from './CustomApolloProvider';
import debtTokenAbi from './abis/DebtToken.json';
import swapOperationsAbi from './abis/SwapOperations.json';
import swapPairAbi from './abis/SwapPair.json';
import troveManagerAbi from './abis/TroveManager.json';

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

// TODO: These are the demo/production contracts. Replace them with the real ones.
export const Contracts = {
  DebtToken: {
    JUSD: '0x5121BBb216D4B8E830801136472eED608AF756f4',
    DebtToken1: '0x48f322be8Acb969E1Bd4C49E3a873Ec0a469Ee9D',
    DebtToken2: '0x48f322be8Acb969E1Bd4C49E3b873Ec0a469Ee9D',
    DebtToken3: '0x48f322be8Acb969E1Bd4C49E3c873Ec0a469Ee9D',
    DebtToken4: '0x48f322be8Acb969E1Bd4C49E3d873Ec0a469Ee9D',
    DebtToken5: '0x48f322be8Acb969E1Bd4C49E3f873Ec0a469Ee9D',
    DebtToken6: '0x48f322be8Acb969E1Bd4C49E3g873Ec0a469Ee9D',
  },
  ERC20: {
    ETH: '0x509ee0d083ddf8ac028f2a56731412edd63223a8',
    BTC: '0x509ee0d083ddf8ac028f2a56731412edd63223b8',
    USDT: '0x509ee0d083ddf8ac028f2a56731412edd63223c8',
    DEFI: '0x509ee0d083ddf8ac028f2a56731412edd63223d8',
  },
  TroveManager: '0x509ee0d083ddf8ac028f2a56731412edd63223e8',
  SwapOperations: '0x509ee0d083ddf8ac028f2a56731412edd63223f8',
  SwapPairs: {
    DebtToken1: '0x509ee0d083ddf8ac028f2a56731412edd63224b9',
    DebtToken2: '0x509ee0d083ddf8ac028f2a56731412edd63225b9',
  },
} as const;

// TODO: Remove Partial
type AllDebtTokenContracts = Partial<{ [Key in keyof (typeof SchemaDataFreshnessManager)['DebtToken']]: DebtToken }>;
type AllSwapPairContracts = Partial<{
  [Key in keyof (typeof Contracts)['SwapPairs']]: SwapPair;
}>;

export const EthersContext = createContext<{
  // provider: BrowserProvider | null;
  provider: JsonRpcProvider | null;
  signer: JsonRpcSigner | null;
  address: string;
  contracts: {
    debtTokenContracts: AllDebtTokenContracts;
    troveManagerContract: TroveManager;
    swapOperationsContract: SwapOperations;
    swapPairContracts: AllSwapPairContracts;
  };
  connectWallet: () => void;
}>({
  provider: null,
  signer: null,
  address: '',
  contracts: {
    debtTokenContracts: undefined,
    troveManagerContract: undefined,
    swapOperationsContract: undefined,
    swapPairContracts: undefined,
  } as any,
  connectWallet: () => {},
});

// Connetion to local ganache.
const provider = new JsonRpcProvider('http://0.0.0.0:8545', { name: 'localhost', chainId: 31337 });

// TODO: Implement network change: https://docs.ethers.org/v5/concepts/best-practices/
// const testNetwork = new Network('goerli', 5);
// const newProvider = new BrowserProvider(window.ethereum, testNetwork);

export default function EthersProvider({ children }: { children: React.ReactNode }) {
  const { enqueueSnackbar } = useSnackbar();
  // const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string>('');
  const [debtTokenContracts, setDebtTokenContracts] = useState<AllDebtTokenContracts>();
  const [troveManagerContract, setTroveManagerContract] = useState<TroveManager>();
  const [swapOperationsContract, setSwapOperationsContract] = useState<SwapOperations>();
  const [swapPairContracts, setSwapPairContracts] = useState<AllSwapPairContracts>();

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        // Opens Meta Mask
        const newSigner = await provider!.getSigner();
        setSigner(newSigner);

        const debtTokenContract = new Contract(Contracts.DebtToken.JUSD, debtTokenAbi, provider);
        const debtTokenContractWithSigner = debtTokenContract.connect(newSigner) as DebtToken;
        setDebtTokenContracts({ [Contracts.DebtToken.JUSD]: debtTokenContractWithSigner });

        const troveManagerContract = new Contract(
          Contracts.TroveManager,
          troveManagerAbi,
          provider,
        ) as unknown as TroveManager;
        const troveManagerContractWithSigner = troveManagerContract.connect(newSigner);
        setTroveManagerContract(troveManagerContractWithSigner);

        const swapOperationsContract = new Contract(
          Contracts.SwapOperations,
          swapOperationsAbi,
          provider,
        ) as unknown as SwapOperations;
        const swapOperationsContractWithSigner = swapOperationsContract.connect(newSigner);
        setSwapOperationsContract(swapOperationsContractWithSigner);

        const swapPairContracts = new Contract(Contracts.SwapPairs.DebtToken1, swapPairAbi, provider);
        const swapPairContractsWithSigner = swapPairContracts.connect(newSigner) as SwapPair;
        setSwapPairContracts({ DebtToken1: swapPairContractsWithSigner });

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

  // This use effect initializes the contracts to do initial read operations.
  useEffect(() => {
    const debtTokenContract = new Contract(Contracts.DebtToken.JUSD, debtTokenAbi, provider) as unknown as DebtToken;
    setDebtTokenContracts({ [Contracts.DebtToken.JUSD]: debtTokenContract });

    const troveManagerContract = new Contract(
      Contracts.TroveManager,
      troveManagerAbi,
      provider,
    ) as unknown as TroveManager;
    setTroveManagerContract(troveManagerContract);

    const swapOperationsContract = new Contract(
      Contracts.SwapOperations,
      swapOperationsAbi,
      provider,
    ) as unknown as SwapOperations;
    setSwapOperationsContract(swapOperationsContract);

    const swapPairContracts = new Contract(
      Contracts.SwapPairs.DebtToken1,
      swapPairAbi,
      provider,
    ) as unknown as SwapPair;
    setSwapPairContracts({ DebtToken1: swapPairContracts });
  }, []);

  if (!debtTokenContracts || !troveManagerContract || !swapOperationsContract || !swapPairContracts) return null;

  return (
    <EthersContext.Provider
      value={{
        provider,
        signer,
        address,
        connectWallet,
        contracts: {
          debtTokenContracts,
          troveManagerContract,
          swapOperationsContract,
          swapPairContracts,
        },
      }}
    >
      {children}
    </EthersContext.Provider>
  );
}

export function useEthers(): {
  provider: JsonRpcProvider | null;
  // provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  address: string;
  contracts: {
    debtTokenContracts: AllDebtTokenContracts;
    troveManagerContract: TroveManager;
    swapOperationsContract: SwapOperations;
    swapPairContracts: AllSwapPairContracts;
  };
  connectWallet: () => void;
} {
  const context = useContext(EthersContext);
  if (context === undefined) {
    throw new Error('useEthers must be used within an EthersProvider');
  }
  return context;
}
