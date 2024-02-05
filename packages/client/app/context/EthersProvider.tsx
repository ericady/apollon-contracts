'use client';

import { Button } from '@mui/material';
import { Contract, Eip1193Provider, JsonRpcSigner } from 'ethers';
import { BrowserProvider, JsonRpcProvider } from 'ethers/providers';
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
import { getCheckSum } from '../utils/crypto';
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
): address is '0x84ea74d481ee0a5332c457a4d796187f6ba67feb' | '0x67d269191c92caf3cd7723f116c85e6e9bf55933' => {
  return Object.values(Contracts.DebtToken)
    .map((address) => getCheckSum(address))
    .includes(getCheckSum(address) as any);
};
export const isCollateralTokenAddress = (
  address: string,
): address is
  | '0x59b670e9fa9d0a427751af201d676719a970857b'
  | '0xc6e7df5e7b4f2a278906862b61205850344d4e7d'
  | '0x4ed7c70f96b99c776995fb64377f0d4ab3b0e1c1' => {
  return Object.values(Contracts.ERC20)
    .map((address) => getCheckSum(address))
    .includes(getCheckSum(address) as any);
};

export const isPoolAddress = (
  address: string,
): address is
  | '0x44039144a891c35e2c947cc9a64f796419f38dcc'
  | '0x12ef5e38f5fde51e7eab0e820d14be6838aff235'
  | '0x0c6484bcba94a1bcc3fda9904977181b03c143e7' => {
  return Object.values(Contracts.SwapPairs)
    .map((address) => getCheckSum(address))
    .includes(getCheckSum(address) as any);
};

// TODO: These are the demo/production contracts. Replace them with the real ones.
export const Contracts = {
  DebtToken: {
    STABLE: '0x67d269191c92caf3cd7723f116c85e6e9bf55933',
    STOCK_1: '0x84ea74d481ee0a5332c457a4d796187f6ba67feb',
  },
  ERC20: {
    USDT: '0x59b670e9fa9d0a427751af201d676719a970857b',
    BTC: '0xc6e7df5e7b4f2a278906862b61205850344d4e7d',
    DFI: '0x4ed7c70f96b99c776995fb64377f0d4ab3b0e1c1',
  },
  TroveManager: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  StabilityPoolManager: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  SwapOperations: '0x610178dA211FEF7D417bC0e6FeD39F05609AD788',
  SwapPairs: {
    BTC: '0x44039144a891c35e2c947cc9a64f796419f38dcc',
    USDT: '0x12ef5e38f5fde51e7eab0e820d14be6838aff235',
    DFI: '0x0c6484bcba94a1bcc3fda9904977181b03c143e7',
  },
  BorrowerOperations: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  StoragePool: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
} as const;

type AllDebtTokenContracts = { [Key in keyof (typeof SchemaDataFreshnessManager)['DebtToken']]: DebtToken };
type AllCollateralTokenContracts = { [Key in keyof (typeof SchemaDataFreshnessManager)['ERC20']]: ERC20 };
type AllSwapPairContracts = {
  [Key in keyof (typeof SchemaDataFreshnessManager)['SwapPairs']]: SwapPair;
};

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

// Connetion to local node
// TODO: Implement testnet once deployed
const provider =
  process.env.NEXT_PUBLIC_CONTRACT_MOCKING === 'enabled' &&
  typeof window !== 'undefined' &&
  typeof window.ethereum !== 'undefined'
    ? new JsonRpcProvider('http://0.0.0.0:8545', { name: 'localhost', chainId: 31337 })
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

        const debtTokenContractStable = new Contract(Contracts.DebtToken.STABLE, debtTokenAbi, provider);
        const debtTokenContractStableWithSigner = debtTokenContractStable.connect(newSigner) as DebtToken;
        const debtTokenContractSTOCK_1 = new Contract(Contracts.DebtToken.STOCK_1, debtTokenAbi, provider);
        const debtTokenContractSTOCK_1WithSigner = debtTokenContractSTOCK_1.connect(newSigner) as DebtToken;
        setDebtTokenContracts({
          [Contracts.DebtToken.STABLE]: debtTokenContractStableWithSigner,
          [Contracts.DebtToken.STOCK_1]: debtTokenContractSTOCK_1WithSigner,
        });

        const collateralTokenContractUSDT = new Contract(Contracts.ERC20.USDT, ERC20Abi, provider);
        const collateralTokenContractWithSignerUSDT = collateralTokenContractUSDT.connect(newSigner) as ERC20;
        const collateralTokenContractBTC = new Contract(Contracts.ERC20.BTC, ERC20Abi, provider);
        const collateralTokenContractWithSignerBTC = collateralTokenContractBTC.connect(newSigner) as ERC20;
        const collateralTokenContractDFI = new Contract(Contracts.ERC20.DFI, ERC20Abi, provider);
        const collateralTokenContractWithSignerDFI = collateralTokenContractDFI.connect(newSigner) as ERC20;
        setCollateralTokenContracts({
          [Contracts.ERC20.USDT]: collateralTokenContractWithSignerUSDT,
          [Contracts.ERC20.BTC]: collateralTokenContractWithSignerBTC,
          [Contracts.ERC20.DFI]: collateralTokenContractWithSignerDFI,
        });

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

        const swapPairContractBTC = new Contract(Contracts.SwapPairs.BTC, swapPairAbi, provider);
        const swapPairContractBTCWithSigner = swapPairContractBTC.connect(newSigner) as SwapPair;
        const swapPairContractUSDT = new Contract(Contracts.SwapPairs.BTC, swapPairAbi, provider);
        const swapPairContractUSDTWithSigner = swapPairContractUSDT.connect(newSigner) as SwapPair;
        const swapPairContractDFI = new Contract(Contracts.SwapPairs.DFI, swapPairAbi, provider);
        const swapPairContractDFIWithSigner = swapPairContractDFI.connect(newSigner) as SwapPair;
        setSwapPairContracts({
          [Contracts.SwapPairs.BTC]: swapPairContractBTCWithSigner,
          [Contracts.SwapPairs.USDT]: swapPairContractUSDTWithSigner,
          [Contracts.SwapPairs.DFI]: swapPairContractDFIWithSigner,
        });

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
        const debtTokenContractSTABLE = new Contract(
          Contracts.DebtToken.STABLE,
          debtTokenAbi,
          provider,
        ) as unknown as DebtToken;
        const debtTokenContractSTOCK_1 = new Contract(
          Contracts.DebtToken.STOCK_1,
          debtTokenAbi,
          provider,
        ) as unknown as DebtToken;
        setDebtTokenContracts({
          [Contracts.DebtToken.STABLE]: debtTokenContractSTABLE,
          [Contracts.DebtToken.STOCK_1]: debtTokenContractSTOCK_1,
        });

        const collateralTokenContractUSDT = new Contract(Contracts.ERC20.USDT, ERC20Abi, provider) as unknown as ERC20;
        const collateralTokenContractBTC = new Contract(Contracts.ERC20.BTC, ERC20Abi, provider) as unknown as ERC20;
        const collateralTokenContractDFI = new Contract(Contracts.ERC20.DFI, ERC20Abi, provider) as unknown as ERC20;
        setCollateralTokenContracts({
          [Contracts.ERC20.USDT]: collateralTokenContractUSDT,
          [Contracts.ERC20.BTC]: collateralTokenContractBTC,
          [Contracts.ERC20.DFI]: collateralTokenContractDFI,
        });

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

        const swapPairContractBTC = new Contract(Contracts.SwapPairs.BTC, swapPairAbi, provider) as unknown as SwapPair;
        const swapPairContractUSDT = new Contract(
          Contracts.SwapPairs.USDT,
          swapPairAbi,
          provider,
        ) as unknown as SwapPair;
        const swapPairContractDFI = new Contract(Contracts.SwapPairs.DFI, swapPairAbi, provider) as unknown as SwapPair;
        setSwapPairContracts({
          [Contracts.SwapPairs.BTC]: swapPairContractBTC,
          [Contracts.SwapPairs.USDT]: swapPairContractUSDT,
          [Contracts.SwapPairs.DFI]: swapPairContractDFI,
        });

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
