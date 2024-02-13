// Import ethers from the ethers.js library
const { JsonRpcProvider } = require('ethers/providers');
const { Contract } = require('ethers');
const swapOperationsAbi = require('../app/context/abis/SwapOperations.json');
const fs = require('fs');

// Define the connection to your local node
const provider = new JsonRpcProvider('http://0.0.0.0:8545', { name: 'localhost', chainId: 31337 });

const Contracts = {
    DebtToken: {
      STABLE: '0x1613beb3b2c4f22ee086b2b38c1476a3ce7f78e8',
      STOCK_1: '0x851356ae760d987e095750cceb3bc6014560891c',
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
  }

// Main async function to interact with the Ethereum blockchain
async function main() {
  try {


    const swapOperationsContract = new Contract(
        Contracts.SwapOperations,
        swapOperationsAbi,
        provider,
      )

      const BTC_STABLE =( await swapOperationsContract.getPair(Contracts.ERC20.BTC, Contracts.DebtToken.STABLE)).toLowerCase()
      const USDT_STABLE =( await swapOperationsContract.getPair(Contracts.ERC20.USDT, Contracts.DebtToken.STABLE)).toLowerCase()
      const STOCK_1_STABLE =( await swapOperationsContract.getPair(Contracts.DebtToken.STOCK_1, Contracts.DebtToken.STABLE)).toLowerCase()
      console.log("PAIRS: ", BTC_STABLE, USDT_STABLE, STOCK_1_STABLE)

      const contractsLiteral = `
      import { getCheckSum } from "../utils/crypto";

      // TODO: These are the demo/production contracts. Replace them with the real ones.
      export const Contracts = {
        DebtToken: {
          STABLE: '0x1613beb3b2c4f22ee086b2b38c1476a3ce7f78e8',
          STOCK_1: '0x851356ae760d987e095750cceb3bc6014560891c',
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
          BTC: '${BTC_STABLE}',
          USDT: '${USDT_STABLE}',
          STOCK_1: '${STOCK_1_STABLE}',
        },
        BorrowerOperations: '0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9',
        StoragePool: '0xb7f8bc63bbcad18155201308c8f3540b07f84f5e',
        SortedTroves: '0x610178da211fef7d417bc0e6fed39f05609ad788',
        HintHelpers: '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512',
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

      `

        fs.writeFileSync('app/context/contracts.config.ts', contractsLiteral, 'utf-8')


  } catch (error) {
    // Log any errors
    console.error("Error:", error);
  }
}

// Execute the main function
main();