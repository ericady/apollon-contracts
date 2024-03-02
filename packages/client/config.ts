import { getCheckSum } from './app/utils/crypto';

// first one is the default network
export const NETWORKS = [
  // {
  //   chainName: 'Localhost',
  //   chainId: '0x7a69', // 31337 in hex
  //   chainIdNumber: 31337,
  //   rpcUrls: ['http://127.0.0.1:8545'],
  //   nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  //   blockExplorerUrls: ['https://polygonscan.com/'],
  //   graphEndpoint: '', // todo @chris, not from the env file...
  //   contracts: {
  //     ERC20: {
  //       BTC: '0xc5a5C42992dECbae36851359345FE25997F5C42d',
  //       USDT: '0x67d269191c92Caf3cD7723F116c85e6E9bf55933',
  //       GOV: '0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E',
  //     },
  //     DebtToken: {
  //       STABLE: '0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690',
  //       STOCK_1: '0x84eA74d481Ee0A5332c457a4d796187F6Ba67fEB',
  //     },
  //     SwapPairs: {
  //       BTC: '0xeD4DDFf1ab82b0437FD7290c5C18408089916935',
  //       USDT: '0x0ADD5ED77Ac2cF1Fb863ac4253Fd9973C632Bf16',
  //       GOV: '0x3FCaAc291EB04950c3cB7c586E07eAB1bcA1dC36',
  //       STOCK_1: '0x5639b6C74087D251C53531d2a4Ce122a8FAc3184',
  //     },
  //     TroveManager: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  //     StabilityPoolManager: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
  //     SwapOperations: '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0',
  //     BorrowerOperations: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  //     StoragePool: '0xb7f8bc63bbcad18155201308c8f3540b07f84f5e',
  //     SortedTroves: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  //     HintHelpers: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
  //     PriceFeed: '0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e',
  //     RedemptionOperations: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  //     CollSurplus: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',
  //   },
  // },
  {
    chainName: 'Apollon test network',
    chainId: '0x539', // 1337 in hex
    chainIdNumber: 1337,
    rpcUrls: ['http://161.97.170.25:8545'],
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    blockExplorerUrls: ['https://polygonscan.com/'],
    graphEndpoint: '', // todo @chris
    contracts: {
      ERC20: {
        BTC: '0xC01B2841FAA908D2793676e71a6Bbb7D2838aeDa',
        USDT: '0xCF389CE0CD7DfF99689eeB56029A28fa965Fe89E',
        GOV: '0x61A4Ecb233477d93C45C54f83948B1FF89182B65',
      },
      DebtToken: {
        STABLE: '0xbEc2096Ef1FDfA8A5c876d900DDD9570d1471572',
        STOCK_1: '0xefaC809C80e25039799EB11b70E157752DC9869e',
      },
      SwapPairs: {
        BTC: '0x191DE2AAeb415fDfDb83Ecf8b812D4F50E5B5ef1',
        USDT: '0xf54209d0d3Ea98539657F33F2ecFc23C89FB2b0e',
        GOV: '0xC9A0b3065404c7617c96415f6e49D5E6F0013683',
        STOCK_1: '0x68905151e8E5C27C3a260F07d0156656A31545aB',
      },
      TroveManager: '0x971Ff2D85DA8FE1e1533204cE2F3EA36F7d27c66',
      StabilityPoolManager: '0xc581768f944F60c8D711a086Fb45339703090cb3',
      SwapOperations: '0x2f372E96721f305BC3E55D6c985dFe30dDDBBA6F',
      BorrowerOperations: '0x3B22f0466d98bE3040d2c51dE89b0479FDD48910',
      StoragePool: '0x7F1667b13768D15fedD4ab3B006B4C2174410593',
      SortedTroves: '0xFE8ce62ef63a1e23F871830068614F93545fCBfA',
      HintHelpers: '0xA2e37Cc979911806a70f583697bCfCB31B989b08',
      PriceFeed: '0xC4407fbaA0FF4fF5ed89A91860FB9e9d33ea56CC',
      RedemptionOperations: '0xFC623e91a3A638718cDA6dCC108BD60a9F8109E1',
      CollSurplus: '0x1cd89D59208f8E16344eD2D4D98A99e1f208fbec',
    },
  },
  // {
  //   chainName: 'Goerli test network',
  //   chainId: '0x5', // 5 in hex
  //   chainIdNumber: 5,
  //   rpcUrls: ['https://goerli.infura.io/v3/'],
  //   nativeCurrency: { name: 'GoerliETH', symbol: 'GoerliETH', decimals: 18 },
  //   blockExplorerUrls: ['https://polygonscan.com/'],
  //   graphEndpoint: '',
  //   contracts: {
  //     ERC20: {
  //       BTC: '',
  //       USDT: '',
  //       GOV: '',
  //     },
  //     DebtToken: {
  //       STABLE: '',
  //       STOCK_1: '',
  //     },
  //     SwapPairs: {
  //       BTC: '',
  //       USDT: '',
  //       STOCK_1: '',
  //     },
  //     TroveManager: '',
  //     StabilityPoolManager: '',
  //     SwapOperations: '',
  //     BorrowerOperations: '',
  //     StoragePool: '',
  //     SortedTroves: '',
  //     HintHelpers: '',
  //     PriceFeed: '',
  //     RedemptionOperations: '',
  //     CollSurplus: '',
  //   },
  // },
];

export const Contracts = NETWORKS[1].contracts; // todo @chris, please load dynamically from the current active network

export const isPoolAddress = (address: string) => {
  return Object.values(Contracts.SwapPairs) // todo @chris, please load dynamically from the current active network
    .map((address) => getCheckSum(address))
    .includes(getCheckSum(address) as any);
};

export const isDebtTokenAddress = (address: string) => {
  return Object.values(Contracts.DebtToken) // todo @chris, please load dynamically from the current active network
    .map((address) => getCheckSum(address))
    .includes(getCheckSum(address) as any);
};
export const isStableCoinAddress = (address: string) => {
  return getCheckSum(Contracts.DebtToken.STABLE) === getCheckSum(address); // todo @chris, please load dynamically from the current active network
};

export const isCollateralTokenAddress = (address: string) => {
  return Object.values(Contracts.ERC20) // todo @chris, please load dynamically from the current active network
    .map((address) => getCheckSum(address))
    .includes(getCheckSum(address) as any);
};
