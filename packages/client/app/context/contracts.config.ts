import { getCheckSum } from '../utils/crypto';

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
    BTC: '0xe0d5966d4dcce4a44610f397fab6b2388707a0a4',
    USDT: '0xba981678fb7fa5d3547be6713676ffeebb44d484',
    STOCK_1: '0x494b43b7b45b894e4147c14daeb294fad8119bd1',
  },
  BorrowerOperations: '0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9',
  StoragePool: '0xb7f8bc63bbcad18155201308c8f3540b07f84f5e',
  SortedTroves: '0x610178da211fef7d417bc0e6fed39f05609ad788',
  HintHelpers: '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512',
} as const;

export const isPoolAddress = (
  address: string,
): address is
  | '0xe0d5966d4dcce4a44610f397fab6b2388707a0a4'
  | '0xba981678fb7fa5d3547be6713676ffeebb44d484'
  | '0x494b43b7b45b894e4147c14daeb294fad8119bd1' => {
  return Object.values(Contracts.SwapPairs)
    .map((address) => getCheckSum(address))
    .includes(getCheckSum(address) as any);
};
