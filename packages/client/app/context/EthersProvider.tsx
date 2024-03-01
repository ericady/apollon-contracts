'use client';

import { Button } from '@mui/material';
import { Contract, JsonRpcSigner } from 'ethers';
import { BrowserProvider, Eip1193Provider, JsonRpcProvider } from 'ethers/providers';
import Link from 'next/link';
import { useSnackbar } from 'notistack';
import { createContext, useContext, useEffect, useState } from 'react';
import { Contracts, NETWORKS } from '../../config';
import {
  BorrowerOperations,
  CollSurplusPool,
  DebtToken,
  ERC20,
  HintHelpers,
  PriceFeed,
  RedemptionOperations,
  SortedTroves,
  StabilityPoolManager,
  StoragePool,
  SwapOperations,
  SwapPair,
  TroveManager,
} from '../../generated/types';
import { SchemaDataFreshnessManager } from './CustomApolloProvider';
import borrowerOperationsAbi from './abis/BorrowerOperations.json';
import collSurplusAbi from './abis/CollSurplusPool.json';
import debtTokenAbi from './abis/DebtToken.json';
import ERC20Abi from './abis/ERC20.json';
import hintHelpersAbi from './abis/HintHelpers.json';
import priceFeedAbi from './abis/PriceFeed.json';
import redemptionOperationsAbi from './abis/RedemptionOperations.json';
import sortedTrovesAbi from './abis/SortedTroves.json';
import stabilityPoolManagerAbi from './abis/StabilityPoolManager.json';
import storagePoolAbi from './abis/StoragePool.json';
import swapOperationsAbi from './abis/SwapOperations.json';
import swapPairAbi from './abis/SwapPair.json';
import troveManagerAbi from './abis/TroveManager.json';

declare global {
  interface Window {
    ethereum?: BrowserProvider & Eip1193Provider;
  }
}

// TODO: Migrate these assertions

type AllDebtTokenContracts = { [Key in keyof (typeof SchemaDataFreshnessManager)['DebtToken']]: DebtToken };
type AllCollateralTokenContracts = { [Key in keyof (typeof SchemaDataFreshnessManager)['ERC20']]: ERC20 };
type AllSwapPairContracts = {
  [Key in keyof (typeof SchemaDataFreshnessManager)['SwapPairs']]: SwapPair;
};

export const EthersContext = createContext<{
  provider: JsonRpcProvider | null;
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
    redemptionOperationsContract: RedemptionOperations;
    collSurplusContract: CollSurplusPool;
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
    priceFeedContract: undefined,
    redemptionOperationsContract: undefined,
    collSurplusContract: undefined,
  } as any,
  connectWallet: () => {},
});

export default function EthersProvider({ children }: { children: React.ReactNode }) {
  const { enqueueSnackbar } = useSnackbar();
  const [provider, setProvider] = useState<JsonRpcProvider | null>(null);
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
  const [redemptionOperationsContract, setRedemptionOperationsContract] = useState<RedemptionOperations>();
  const [collSurplusContract, setCollSurplusContract] = useState<CollSurplusPool>();

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
        const swapPairContractUSDT = new Contract(Contracts.SwapPairs.USDT, swapPairAbi, provider);
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

        const redemptionOperationsContract = new Contract(
          Contracts.RedemptionOperations,
          redemptionOperationsAbi,
          provider,
        );
        const redemptionOperationsContractWithSigner = redemptionOperationsContract.connect(
          newSigner,
        ) as RedemptionOperations;
        setRedemptionOperationsContract(redemptionOperationsContractWithSigner);

        const collSurplusContract = new Contract(Contracts.CollSurplus, collSurplusAbi, provider);
        const collSurplusContractWithSigner = collSurplusContract.connect(newSigner) as CollSurplusPool;
        setCollSurplusContract(collSurplusContractWithSigner);

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

  function updateProvider(network: (typeof NETWORKS)[number]) {
    if (typeof window.ethereum !== 'undefined') {
      const newProvider = new JsonRpcProvider(network.rpcUrls[0], {
        name: network.chainName,
        chainId: network.chainIdNumber,
      });

      setProvider(newProvider);
    }
  }

  // Initialize the correct provider
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined' && provider === null) {
      window.ethereum.request({ method: 'eth_chainId' }).then((chainIdHex) => {
        const initNetwork = NETWORKS.find((network) => network.chainId === chainIdHex);
        if (initNetwork) {
          updateProvider(initNetwork);
        }
        // Could not find network in the list => add it
        else {
          const { blockExplorerUrls, chainId, chainIdNumber, chainName, nativeCurrency, rpcUrls } = NETWORKS[0];
          window
            .ethereum!.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  // All params must be provided to make it work
                  chainId,
                  rpcUrls,
                  chainName,
                  nativeCurrency,
                  blockExplorerUrls,
                },
              ],
            })
            .then(() => {
              window.location.reload();
              // updateProvider(choosenNetwork)
            });
        }
      });
    } else if (typeof window.ethereum === 'undefined') {
      enqueueSnackbar('MetaMask extension is not installed. Please install and try again.', {
        variant: 'error',
        action: (
          <Button LinkComponent={Link} href="https://metamask.io/" variant="contained" target="_blank" rel="noreferrer">
            Install
          </Button>
        ),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined' && provider) {
      // Log in automaticall if we know the user already.
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
        if (accounts.length > 0) {
          connectWallet();
        }
      });

      window.ethereum.on('accountsChanged', connectWallet);
    }

    // Cleanup the listener when the component unmounts
    return () => {
      if (typeof window.ethereum !== 'undefined') {
        window.ethereum.removeListener('accountsChanged', connectWallet);
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

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

        const redemptionOperationsContract = new Contract(
          Contracts.RedemptionOperations,
          redemptionOperationsAbi,
          provider,
        ) as unknown as RedemptionOperations;
        setRedemptionOperationsContract(redemptionOperationsContract);

        const collSurplusContract = new Contract(
          Contracts.CollSurplus,
          collSurplusAbi,
          provider,
        ) as unknown as CollSurplusPool;
        setCollSurplusContract(collSurplusContract);
      } catch (error) {
        console.error(error);
      }
    }
  }, [provider]);

  if (
    // TODO: Handle where MM is not installed
    !provider ||
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
    !priceFeedContract ||
    !redemptionOperationsContract ||
    !collSurplusContract
  )
    return null;

  return (
    <EthersContext.Provider
      value={{
        provider: provider!,
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
          redemptionOperationsContract,
          collSurplusContract,
        },
      }}
    >
      {children}
    </EthersContext.Provider>
  );
}

export function useEthers(): {
  provider: JsonRpcProvider | null;
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
    redemptionOperationsContract: RedemptionOperations;
    collSurplusContract: CollSurplusPool;
  };
  connectWallet: () => void;
} {
  const context = useContext(EthersContext);
  if (context === undefined) {
    throw new Error('useEthers must be used within an EthersProvider');
  }
  return context;
}
