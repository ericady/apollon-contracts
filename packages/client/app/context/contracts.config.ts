import { getCheckSum } from '../utils/crypto';

// TODO: These are the demo/production contracts. Replace them with the real ones.
export const Contracts = {
  DebtToken: {
    STABLE: '0xf5059a5d33d5853360d16c683c16e67980206f36',
    STOCK_1: '0x95401dc811bb5740090279ba06cfa8fcf6113778',
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
    BTC: '0x43009892f978d7d8e7e73d59000fadbe86b03dfa',
    USDT: '0xe8f7755d3d96257654b840edbd783168d11e942c',
    STOCK_1: '0x67fa90d48c24c7342e19c0302b022cf2c33b0288',
  },
  BorrowerOperations: '0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9',
  StoragePool: '0xb7f8bc63bbcad18155201308c8f3540b07f84f5e',
  SortedTroves: '0x610178da211fef7d417bc0e6fed39f05609ad788',
  HintHelpers: '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512',
  PriceFeed: '0xa513e6e4b8f2a923d98304ec87f64353c4d5c853',
} as const;

export const isPoolAddress = (
  address: string,
): address is
  | '0x43009892f978d7d8e7e73d59000fadbe86b03dfa'
  | '0xe8f7755d3d96257654b840edbd783168d11e942c'
  | '0x67fa90d48c24c7342e19c0302b022cf2c33b0288' => {
  return Object.values(Contracts.SwapPairs)
    .map((address) => getCheckSum(address))
    .includes(getCheckSum(address) as any);
};
