'use client';

import { Button } from '@mui/material';
import { Contract, Eip1193Provider, JsonRpcSigner } from 'ethers';
import { BrowserProvider, JsonRpcProvider, Network } from 'ethers/providers';
import Link from 'next/link';
import { useSnackbar } from 'notistack';
import { createContext, useContext, useEffect, useState } from 'react';
import {
  BorrowerOperations,
  DebtToken,
  ERC20,
  StabilityPoolManager,
  StoragePool,
  SwapOperations,
  SwapPair,
  TroveManager,
} from '../../generated/types';
import { SchemaDataFreshnessManager } from './CustomApolloProvider';
import borrowerOperationsAbi from './abis/BorrowerOperations.json';
import debtTokenAbi from './abis/DebtToken.json';
import ERC20Abi from './abis/ERC20.json';
import stabilityPoolManagerAbi from './abis/StabilityPoolManager.json';
import storagePoolAbi from './abis/StoragePool.json';
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

export const isDebtTokenAddress = (
  address: string,
): address is '0x7a2088a1bFc9d81c55368AE168C2C02570cB814F' | '0x67d269191c92Caf3cD7723F116c85e6E9bf55933' => {
  return Object.values(Contracts.DebtToken).includes(address as any);
};
export const isCollateralTokenAddress = (
  address: string,
): address is
  | '0x59b670e9fA9D0A427751Af201D676719a970857b'
  | '0xc6e7DF5E7b4f2A278906862b61205850344D4e7d'
  | '0x9E545E3C0baAB3E08CdfD552C960A1050f373042'
  | '0xa82fF9aFd8f496c3d6ac40E2a0F282E47488CFc9' => {
  return Object.values(Contracts.ERC20).includes(address as any);
};
export const isPoolAddress = (address: string): address is '0x687E100f79ceD7Cc8b2BD19Eb326a28885F5b371' => {
  return Object.values(Contracts.SwapPairs).includes(address as any);
};

// TODO: These are the demo/production contracts. Replace them with the real ones.
export const Contracts = {
  DebtToken: {
    STABLE: '0x7a2088a1bFc9d81c55368AE168C2C02570cB814F',
    STOCK_1: '0x67d269191c92Caf3cD7723F116c85e6E9bf55933',
  },
  ERC20: {
    // Please always keep it first
    JUSD: '0x59b670e9fA9D0A427751Af201D676719a970857b',
    ETH: '0xc6e7DF5E7b4f2A278906862b61205850344D4e7d',
    USDT: '0x9E545E3C0baAB3E08CdfD552C960A1050f373042',
    DFI: '0xa82fF9aFd8f496c3d6ac40E2a0F282E47488CFc9',
  },
  TroveManager: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  StabilityPoolManager: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  SwapOperations: '0x610178dA211FEF7D417bC0e6FeD39F05609AD788',
  SwapPairs: {
    STOCK_1: '0x687E100f79ceD7Cc8b2BD19Eb326a28885F5b371',
  },
  BorrowerOperations: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  StoragePool: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
} as const;

// TODO: Remove Partial
type AllDebtTokenContracts = Partial<{ [Key in keyof (typeof SchemaDataFreshnessManager)['DebtToken']]: DebtToken }>;
type AllCollateralTokenContracts = Partial<{ [Key in keyof (typeof SchemaDataFreshnessManager)['ERC20']]: ERC20 }>;
type AllSwapPairContracts = Partial<{
  [Key in keyof (typeof Contracts)['SwapPairs']]: SwapPair;
}>;

export const EthersContext = createContext<{
  // provider: BrowserProvider | null;
  provider: JsonRpcProvider | BrowserProvider | null;
  signer: JsonRpcSigner | null;
  address: string;
  contracts: {
    debtTokenContracts: AllDebtTokenContracts;
    collateralTokenContracts: AllCollateralTokenContracts;
    troveManagerContract: TroveManager;
    stabilityPoolManagerContract: StabilityPoolManager;
    swapOperationsContract: SwapOperations;
    swapPairContracts: AllSwapPairContracts;
    borrowerOperationsContract: BorrowerOperations;
    storagePoolContract: StoragePool;
  };
  connectWallet: () => void;
}>({
  provider: null,
  signer: null,
  address: '',
  contracts: {
    debtTokenContracts: undefined,
    collateralTokenContracts: undefined,
    troveManagerContract: undefined,
    stabilityPoolManagerContract: undefined,
    swapOperationsContract: undefined,
    swapPairContracts: undefined,
    borrowerOperationsContract: undefined,
    storagePoolContract: undefined,
  } as any,
  connectWallet: () => {},
});

// Connetion to local ganache.
const provider =
  process.env.NEXT_PUBLIC_CONTRACT_MOCKING === 'enabled' &&
  typeof window !== 'undefined' &&
  typeof window.ethereum !== 'undefined'
    ? new BrowserProvider(window.ethereum, new Network('goerli', 5))
    : new JsonRpcProvider('http://0.0.0.0:8545', { name: 'localhost', chainId: 31337 });

// TODO: Implement network change: https://docs.ethers.org/v5/concepts/best-practices/
// const testNetwork = new Network('goerli', 5);
// const newProvider = new BrowserProvider(window.ethereum, testNetwork);

export default function EthersProvider({ children }: { children: React.ReactNode }) {
  const { enqueueSnackbar } = useSnackbar();
  // const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string>('');
  const [debtTokenContracts, setDebtTokenContracts] = useState<AllDebtTokenContracts>();
  const [collateralTokenContracts, setCollateralTokenContracts] = useState<AllCollateralTokenContracts>();
  const [troveManagerContract, setTroveManagerContract] = useState<TroveManager>();
  const [stabilityPoolManagerContract, setStabilityPoolManagerContract] = useState<StabilityPoolManager>();
  const [swapOperationsContract, setSwapOperationsContract] = useState<SwapOperations>();
  const [swapPairContracts, setSwapPairContracts] = useState<AllSwapPairContracts>();
  const [borrowerOperationsContract, setBorrowerOperationsContract] = useState<BorrowerOperations>();
  const [storagePoolContract, setStoragePoolContract] = useState<StoragePool>();

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        // Opens Meta Mask
        const newSigner = await provider!.getSigner();
        setSigner(newSigner);

        const debtTokenContract = new Contract(Contracts.DebtToken.STABLE, debtTokenAbi, provider);
        const debtTokenContractWithSigner = debtTokenContract.connect(newSigner) as DebtToken;
        setDebtTokenContracts({ [Contracts.DebtToken.STABLE]: debtTokenContractWithSigner });

        const collateralTokenContracts = new Contract(Contracts.ERC20.ETH, ERC20Abi, provider);
        const collateralTokenContractsWithSigner = collateralTokenContracts.connect(newSigner) as ERC20;
        setCollateralTokenContracts({ [Contracts.ERC20.ETH]: collateralTokenContractsWithSigner });

        const troveManagerContract = new Contract(
          Contracts.TroveManager,
          troveManagerAbi,
          provider,
        ) as unknown as TroveManager;
        const troveManagerContractWithSigner = troveManagerContract.connect(newSigner);
        setTroveManagerContract(troveManagerContractWithSigner);

        const stabilityPoolManagerContract = new Contract(
          Contracts.StabilityPoolManager,
          stabilityPoolManagerAbi,
          provider,
        ) as unknown as StabilityPoolManager;
        const stabilityPoolManagerContractWithSigner = stabilityPoolManagerContract.connect(newSigner);
        setStabilityPoolManagerContract(stabilityPoolManagerContractWithSigner);

        const swapOperationsContract = new Contract(
          Contracts.SwapOperations,
          swapOperationsAbi,
          provider,
        ) as unknown as SwapOperations;
        const swapOperationsContractWithSigner = swapOperationsContract.connect(newSigner);
        setSwapOperationsContract(swapOperationsContractWithSigner);

        const swapPairContracts = new Contract(Contracts.SwapPairs.STOCK_1, swapPairAbi, provider);
        const swapPairContractsWithSigner = swapPairContracts.connect(newSigner) as SwapPair;
        setSwapPairContracts({ STOCK_1: swapPairContractsWithSigner });

        const borrowerOperationsContract = new Contract(Contracts.BorrowerOperations, borrowerOperationsAbi, provider);
        const borrowerOperationsContractWithSigner = borrowerOperationsContract.connect(
          newSigner,
        ) as BorrowerOperations;
        setBorrowerOperationsContract(borrowerOperationsContractWithSigner);

        const storagePoolContract = new Contract(Contracts.StoragePool, storagePoolAbi, provider);
        const storagePoolContractWithSigner = storagePoolContract.connect(newSigner) as StoragePool;
        setStoragePoolContract(storagePoolContractWithSigner);

        try {
          // Request account access
          const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts',
          });
          setAddress(accounts[0]);
        } catch (error) {
          enqueueSnackbar('You rejected necessary permissions. Please try again.', { variant: 'error' });
        }
      }
    } catch {
      enqueueSnackbar('You closed the authentication window. Please try loging in again.', { variant: 'error' });
    }
  };

  // TODO: try to implement automatic login if user has been seen and allow resolving of view fields

  // This use effect initializes the contracts to do initial read operations.
  useEffect(() => {
    if (provider) {
      try {
        const debtTokenContract = new Contract(
          Contracts.DebtToken.STABLE,
          debtTokenAbi,
          provider,
        ) as unknown as DebtToken;
        setDebtTokenContracts({ [Contracts.DebtToken.STABLE]: debtTokenContract });

        const collateralTokenContracts = new Contract(Contracts.ERC20.ETH, ERC20Abi, provider) as unknown as ERC20;
        setCollateralTokenContracts({ [Contracts.ERC20.ETH]: collateralTokenContracts });

        const troveManagerContract = new Contract(
          Contracts.TroveManager,
          troveManagerAbi,
          provider,
        ) as unknown as TroveManager;
        setTroveManagerContract(troveManagerContract);

        const stabilityPoolManagerContract = new Contract(
          Contracts.StabilityPoolManager,
          stabilityPoolManagerAbi,
          provider,
        ) as unknown as StabilityPoolManager;
        setStabilityPoolManagerContract(stabilityPoolManagerContract);

        const swapOperationsContract = new Contract(
          Contracts.SwapOperations,
          swapOperationsAbi,
          provider,
        ) as unknown as SwapOperations;
        setSwapOperationsContract(swapOperationsContract);

        const swapPairContracts = new Contract(
          Contracts.SwapPairs.STOCK_1,
          swapPairAbi,
          provider,
        ) as unknown as SwapPair;
        setSwapPairContracts({ STOCK_1: swapPairContracts });

        const borrowerOperationsContract = new Contract(
          Contracts.BorrowerOperations,
          borrowerOperationsAbi,
          provider,
        ) as unknown as BorrowerOperations;
        setBorrowerOperationsContract(borrowerOperationsContract);

        const storagePoolContract = new Contract(
          Contracts.StoragePool,
          storagePoolAbi,
          provider,
        ) as unknown as StoragePool;
        setStoragePoolContract(storagePoolContract);
      } catch (error) {
        // console.error(error);
      }
    } else {
      enqueueSnackbar('MetaMask extension is not installed. Please install and try again.', {
        variant: 'error',
        action: (
          <Button LinkComponent={Link} href="https://metamask.io/" variant="contained" target="_blank" rel="noreferrer">
            Install
          </Button>
        ),
      });
    }
  }, [enqueueSnackbar]);

  if (
    !debtTokenContracts ||
    !collateralTokenContracts ||
    !troveManagerContract ||
    !stabilityPoolManagerContract ||
    !swapOperationsContract ||
    !swapPairContracts ||
    !borrowerOperationsContract ||
    !storagePoolContract
  )
    return null;

  return (
    <EthersContext.Provider
      value={{
        provider,
        signer,
        address,
        connectWallet,
        contracts: {
          debtTokenContracts,
          collateralTokenContracts,
          troveManagerContract,
          stabilityPoolManagerContract,
          swapOperationsContract,
          swapPairContracts,
          borrowerOperationsContract,
          storagePoolContract,
        },
      }}
    >
      {children}
    </EthersContext.Provider>
  );
}

export function useEthers(): {
  provider: JsonRpcProvider | BrowserProvider | null;
  // provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  address: string;
  contracts: {
    debtTokenContracts: AllDebtTokenContracts;
    collateralTokenContracts: AllCollateralTokenContracts;
    troveManagerContract: TroveManager;
    stabilityPoolManagerContract: StabilityPoolManager;
    swapOperationsContract: SwapOperations;
    swapPairContracts: AllSwapPairContracts;
    borrowerOperationsContract: BorrowerOperations;
    storagePoolContract: StoragePool;
  };
  connectWallet: () => void;
} {
  const context = useContext(EthersContext);
  if (context === undefined) {
    throw new Error('useEthers must be used within an EthersProvider');
  }
  return context;
}
