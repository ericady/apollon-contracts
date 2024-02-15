import { getCheckSum } from '../utils/crypto';

// TODO: These are the demo/production contracts. Replace them with the real ones.
export const Contracts = {
  DebtToken: {
    STABLE: '0x95401dc811bb5740090279ba06cfa8fcf6113778',
    STOCK_1: '0x998abeb3e57409262ae5b751f60747921b33613e',
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
    BTC: '0xfe6a837dbcbf23ace82d3e7d1b45c71bafd040c3',
    USDT: '0x61a459d0b091e4771471de2d0c796611a71a5695',
    STOCK_1: '0xcc971a51d15733d4d01dd40c6294d03ae19e0772',
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
  | '0xfe6a837dbcbf23ace82d3e7d1b45c71bafd040c3'
  | '0x61a459d0b091e4771471de2d0c796611a71a5695'
  | '0xcc971a51d15733d4d01dd40c6294d03ae19e0772' => {
  return Object.values(Contracts.SwapPairs)
    .map((address) => getCheckSum(address))
    .includes(getCheckSum(address) as any);
};
