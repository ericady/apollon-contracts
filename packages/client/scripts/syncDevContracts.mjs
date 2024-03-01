import { Contract } from 'ethers';
import { JsonRpcProvider } from 'ethers/providers';
import fs from 'fs';
import swapOperationsAbi from '../app/context/abis/SwapOperations.json' assert { type: 'json' };

const defaultNetwork = {
  chainName: 'Localhost',
  // 31337 in hex
  chainId: '0x7a69',
  chainIdNumber: 31337,
  rpcUrls: ['http://127.0.0.1:8545'],
  nativeCurrency: {
    name: 'STABLE',
    symbol: 'STABLE',
    decimals: 18,
  },
  blockExplorerUrls: ['https://polygonscan.com/'],
};

// DEV Contracts
const Contracts = {
  DebtToken: {
    STABLE: '0x84ea74d481ee0a5332c457a4d796187f6ba67feb',
    STOCK_1: '0x9e545e3c0baab3e08cdfd552c960a1050f373042',
  },
  ERC20: {
    BTC: '0x9a676e781a523b5d0c0e43731313a708cb607508',
    USDT: '0x959922be3caee4b8cd9a407cc3ac1c251c2007b1',
    GOV: '0x0b306bf915c4d645ff596e518faf3f9669b97016',
  },
  TroveManager: '0x0165878a594ca255338adfa4d48449f69242eb8f',
  StabilityPoolManager: '0xdc64a140aa3e981100a9beca4e685f962f0cf6c9',
  SwapOperations: '0xa51c1fc2f0d1a1b8494ed1fe312d7c3a78ed91c0',
  SwapPairs: {
    BTC: '0x7b320ddbd1426e8d5b30ed159184a93ca462bf00',
    USDT: '0x0f338e0aa373831b0500f63388b82220ac05fd6c',
    STOCK_1: '0xe85a121b51e7d2b101ce7d8fb0126d5ac8e9365b',
  },
  BorrowerOperations: '0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9',
  StoragePool: '0xb7f8bc63bbcad18155201308c8f3540b07f84f5e',
  SortedTroves: '0x610178da211fef7d417bc0e6fed39f05609ad788',
  HintHelpers: '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512',
  PriceFeed: '0xa513e6e4b8f2a923d98304ec87f64353c4d5c853',
  RedemptionOperations: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',
  CollSurplus: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
};

// Define the connection to your local node
const provider = new JsonRpcProvider(defaultNetwork.rpcUrls[0], {
  name: defaultNetwork.chainName,
  chainId: defaultNetwork.chainIdNumber,
});

// Main async function to interact with the Ethereum blockchain
async function main() {
  try {
    const swapOperationsContract = new Contract(Contracts.SwapOperations, swapOperationsAbi, provider);

    const BTC_STABLE = (
      await swapOperationsContract.getPair(Contracts.ERC20.BTC, Contracts.DebtToken.STABLE)
    ).toLowerCase();
    const USDT_STABLE = (
      await swapOperationsContract.getPair(Contracts.ERC20.USDT, Contracts.DebtToken.STABLE)
    ).toLowerCase();
    const STOCK_1_STABLE = (
      await swapOperationsContract.getPair(Contracts.DebtToken.STOCK_1, Contracts.DebtToken.STABLE)
    ).toLowerCase();

    console.log('PAIRS: ', BTC_STABLE, USDT_STABLE, STOCK_1_STABLE);

    const newContractsExport = `
      // GENERATED CODE START - DO NOT EDIT THIS SECTION MANUALLY

      export const Contracts = {
        DebtToken: {
          STABLE: "${Contracts.DebtToken.STABLE}",
          STOCK_1: "${Contracts.DebtToken.STOCK_1}",
        },
        ERC20: {
          BTC: "${Contracts.ERC20.BTC}",
          USDT: "${Contracts.ERC20.USDT}",
          GOV: "${Contracts.ERC20.GOV}",
        },
        TroveManager: "${Contracts.TroveManager}",
        StabilityPoolManager: "${Contracts.StabilityPoolManager}",
        SwapOperations: "${Contracts.SwapOperations}",
        SwapPairs: {
          BTC: '${BTC_STABLE}',
          USDT: '${USDT_STABLE}',
          STOCK_1: '${STOCK_1_STABLE}',
        },
        BorrowerOperations: "${Contracts.BorrowerOperations}",
        StoragePool: "${Contracts.StoragePool}",
        SortedTroves: "${Contracts.SortedTroves}",
        HintHelpers: "${Contracts.HintHelpers}",
        PriceFeed: "${Contracts.PriceFeed}",
        RedemptionOperations: "${Contracts.RedemptionOperations}",
        CollSurplus: "${Contracts.CollSurplus}",
      } as const;

      export const isPoolAddress = (
        address: string,
      ): address is
        | '${BTC_STABLE}'
        | '${USDT_STABLE}'
        | '${STOCK_1_STABLE}' => {
        return Object.values(Contracts.SwapPairs)
          .map((address) => getCheckSum(address))
          .includes(getCheckSum(address) as any);
      };

      export const isDebtTokenAddress = (
        address: string,
      ): address is '${Contracts.DebtToken.STABLE}' | '${Contracts.DebtToken.STOCK_1}' => {
        return Object.values(Contracts.DebtToken)
          .map((address) => getCheckSum(address))
          .includes(getCheckSum(address) as any);
      };
      export const isStableCoinAddress = (address: string): address is '${Contracts.DebtToken.STABLE}' => {
        return getCheckSum(Contracts.DebtToken.STABLE) === getCheckSum(address);
      };

      export const isCollateralTokenAddress = (
        address: string,
      ): address is
        | '${Contracts.ERC20.BTC}'
        | '${Contracts.ERC20.USDT}'
        | '${Contracts.ERC20.GOV}' => {
        return Object.values(Contracts.ERC20)
          .map((address) => getCheckSum(address))
          .includes(getCheckSum(address) as any);
      };

      // GENERATED CODE END
      `;

    // Path to the file
    const filePath = 'config.ts';

    // Read the current content of the file
    let fileContent = fs.readFileSync(filePath, 'utf-8');

    // Check if placeholders exist
    const startMarker = '// GENERATED CODE START - DO NOT EDIT THIS SECTION MANUALLY';
    const endMarker = '// GENERATED CODE END';
    const startMarkerIndex = fileContent.indexOf(startMarker);
    const endMarkerIndex = fileContent.indexOf(endMarker);

    if (startMarkerIndex !== -1 && endMarkerIndex !== -1) {
      // Replace content between markers
      fileContent =
        fileContent.substring(0, startMarkerIndex) +
        newContractsExport +
        fileContent.substring(endMarkerIndex + endMarker.length);
    } else {
      // Append the new content if markers are not found
      fileContent += `\n${newContractsExport}`;
    }

    // Write the updated content back to the file
    fs.writeFileSync(filePath, fileContent, 'utf-8');
  } catch (error) {
    // Log any errors
    console.error('Error:', error);
  }
}

// Execute the main function
main();