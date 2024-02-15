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
  HintHelpers,
  PriceFeed,
  SortedTroves,
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
import hintHelpersAbi from './abis/HintHelpers.json';
import sortedTrovesAbi from './abis/SortedTroves.json';
import stabilityPoolManagerAbi from './abis/StabilityPoolManager.json';
import storagePoolAbi from './abis/StoragePool.json';
import swapOperationsAbi from './abis/SwapOperations.json';
import swapPairAbi from './abis/SwapPair.json';
import troveManagerAbi from './abis/TroveManager.json';
import priceFeedAbi from './abis/PriceFeed.json';
import { Contracts } from './contracts.config';

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

// TODO: Migrate these assertions
export const isDebtTokenAddress = (
  address: string,
): address is '0x95401dc811bb5740090279ba06cfa8fcf6113778' | '0x998abeb3e57409262ae5b751f60747921b33613e' => {
  return Object.values(Contracts.DebtToken)
    .map((address) => getCheckSum(address))
    .includes(getCheckSum(address) as any);
};
export const isStableCoinAddress = (address: string): address is '0x1613beb3b2c4f22ee086b2b38c1476a3ce7f78e8' => {
  return getCheckSum(Contracts.DebtToken.STABLE) === getCheckSum(address);
};

export const isCollateralTokenAddress = (
  address: string,
): address is
  | '0x9a676e781a523b5d0c0e43731313a708cb607508'
  | '0x959922be3caee4b8cd9a407cc3ac1c251c2007b1'
  | '0x0b306bf915c4d645ff596e518faf3f9669b97016' => {
  return Object.values(Contracts.ERC20)
    .map((address) => getCheckSum(address))
    .includes(getCheckSum(address) as any);
};

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
    sortedTrovesContract: SortedTroves;
    hintHelpersContract: HintHelpers;
    priceFeedContract: PriceFeed;
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
    sortedTrovesContract: undefined,
    hintHelpersContract: undefined,
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
  const [sortedTrovesContract, setSortedTrovesContract] = useState<SortedTroves>();
  const [hintHelpersContract, setHintHelpersContract] = useState<HintHelpers>();
  const [priceFeedContract, setPriceFeedContract] = useState<PriceFeed>();

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
        const collateralTokenContractDFI = new Contract(Contracts.ERC20.GOV, ERC20Abi, provider);
        const collateralTokenContractWithSignerDFI = collateralTokenContractDFI.connect(newSigner) as ERC20;
        setCollateralTokenContracts({
          [Contracts.ERC20.USDT]: collateralTokenContractWithSignerUSDT,
          [Contracts.ERC20.BTC]: collateralTokenContractWithSignerBTC,
          [Contracts.ERC20.GOV]: collateralTokenContractWithSignerDFI,
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
        const swapPairContractDFI = new Contract(Contracts.SwapPairs.STOCK_1, swapPairAbi, provider);
        const swapPairContractDFIWithSigner = swapPairContractDFI.connect(newSigner) as SwapPair;
        setSwapPairContracts({
          [Contracts.SwapPairs.BTC]: swapPairContractBTCWithSigner,
          [Contracts.SwapPairs.USDT]: swapPairContractUSDTWithSigner,
          [Contracts.SwapPairs.STOCK_1]: swapPairContractDFIWithSigner,
        });

        const borrowerOperationsContract = new Contract(Contracts.BorrowerOperations, borrowerOperationsAbi, provider);
        const borrowerOperationsContractWithSigner = borrowerOperationsContract.connect(
          newSigner,
        ) as BorrowerOperations;
        setBorrowerOperationsContract(borrowerOperationsContractWithSigner);

        const storagePoolContract = new Contract(Contracts.StoragePool, storagePoolAbi, provider);
        const storagePoolContractWithSigner = storagePoolContract.connect(newSigner) as StoragePool;
        setStoragePoolContract(storagePoolContractWithSigner);

        const sortedTrovesContract = new Contract(Contracts.SortedTroves, sortedTrovesAbi, provider);
        const sortedTrovesContractWithSigner = sortedTrovesContract.connect(newSigner) as SortedTroves;
        setSortedTrovesContract(sortedTrovesContractWithSigner);

        const hintHelpersContract = new Contract(Contracts.HintHelpers, hintHelpersAbi, provider);
        const hintHelpersContractWithSigner = hintHelpersContract.connect(newSigner) as HintHelpers;
        setHintHelpersContract(hintHelpersContractWithSigner);

        const priceFeedContract = new Contract(Contracts.PriceFeed, priceFeedAbi, provider);
        const priceFeedContractWithSigner = priceFeedContract.connect(newSigner) as PriceFeed;
        setPriceFeedContract(priceFeedContractWithSigner);

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

  // Log in automaticall if we know the user already.
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
        if (accounts.length > 0) {
          connectWallet();
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        const collateralTokenContractDFI = new Contract(Contracts.ERC20.GOV, ERC20Abi, provider) as unknown as ERC20;
        setCollateralTokenContracts({
          [Contracts.ERC20.USDT]: collateralTokenContractUSDT,
          [Contracts.ERC20.BTC]: collateralTokenContractBTC,
          [Contracts.ERC20.GOV]: collateralTokenContractDFI,
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
        const swapPairContractDFI = new Contract(
          Contracts.SwapPairs.STOCK_1,
          swapPairAbi,
          provider,
        ) as unknown as SwapPair;
        setSwapPairContracts({
          [Contracts.SwapPairs.BTC]: swapPairContractBTC,
          [Contracts.SwapPairs.USDT]: swapPairContractUSDT,
          [Contracts.SwapPairs.STOCK_1]: swapPairContractDFI,
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

        const sortedTrovesContract = new Contract(
          Contracts.SortedTroves,
          sortedTrovesAbi,
          provider,
        ) as unknown as SortedTroves;
        setSortedTrovesContract(sortedTrovesContract);

        const hintHelpersContract = new Contract(
          Contracts.HintHelpers,
          hintHelpersAbi,
          provider,
        ) as unknown as HintHelpers;
        setHintHelpersContract(hintHelpersContract);

        const priceFeedContract = new Contract(Contracts.PriceFeed, priceFeedAbi, provider) as unknown as PriceFeed;
        setPriceFeedContract(priceFeedContract);
      } catch (error) {
        console.error(error);
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
    !storagePoolContract ||
    !sortedTrovesContract ||
    !hintHelpersContract ||
    !priceFeedContract 
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
          sortedTrovesContract,
          hintHelpersContract,
          priceFeedContract,
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
    sortedTrovesContract: SortedTroves;
    hintHelpersContract: HintHelpers;
    priceFeedContract: PriceFeed;
  };
  connectWallet: () => void;
} {
  const context = useContext(EthersContext);
  if (context === undefined) {
    throw new Error('useEthers must be used within an EthersProvider');
  }
  return context;
}
