import { getCheckSum } from '../utils/crypto';

// TODO: These are the demo/production contracts. Replace them with the real ones.
export const Contracts = {
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
    BTC: '0x6d09e8227073f36028f87f9ac1863540be036c01',
    USDT: '0x6fc8d5049fa554c86660e9a06664b87b1405015d',
    STOCK_1: '0xa3fe5e2fd94cda575722f376eba4816a7eeaf79c',
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
  | '0x6d09e8227073f36028f87f9ac1863540be036c01'
  | '0x6fc8d5049fa554c86660e9a06664b87b1405015d'
  | '0xa3fe5e2fd94cda575722f376eba4816a7eeaf79c' => {
  return Object.values(Contracts.SwapPairs)
    .map((address) => getCheckSum(address))
    .includes(getCheckSum(address) as any);
};

export const isDebtTokenAddress = (
  address: string,
): address is '0x84ea74d481ee0a5332c457a4d796187f6ba67feb' | '0x9e545e3c0baab3e08cdfd552c960a1050f373042' => {
  return Object.values(Contracts.DebtToken)
    .map((address) => getCheckSum(address))
    .includes(getCheckSum(address) as any);
};
export const isStableCoinAddress = (address: string): address is '0x84ea74d481ee0a5332c457a4d796187f6ba67feb' => {
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
