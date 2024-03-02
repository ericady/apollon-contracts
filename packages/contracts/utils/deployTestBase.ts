import { ethers } from 'hardhat';
import {
  TokenManager,
  SwapOperations,
  PriceFeed,
  RedemptionOperations,
  LiquidationOperations,
  MockBorrowerOperations,
  MockTroveManager,
  MockStabilityPoolManager,
  StoragePool,
  ReservePool,
  SortedTroves,
  HintHelpers,
  CollSurplusPool,
  MockERC20,
  MockTellor,
  MockDebtToken,
  TellorCaller,
} from '../typechain';
import { parseUnits } from 'ethers';

export interface Contracts {
  borrowerOperations: MockBorrowerOperations;
  redemptionOperations: RedemptionOperations;
  liquidationOperations: LiquidationOperations;
  troveManager: MockTroveManager;
  sortedTroves: SortedTroves;
  hintHelpers: HintHelpers;
  stabilityPoolManager: MockStabilityPoolManager;
  storagePool: StoragePool;
  collSurplusPool: CollSurplusPool;
  reservePool: ReservePool;
  tokenManager: TokenManager;
  priceFeed: PriceFeed;
  swapOperations: SwapOperations;
  tellor: MockTellor;
  tellorCaller: TellorCaller;

  USDT: MockERC20;
  BTC: MockERC20;
  GOV: MockERC20;

  STABLE: MockDebtToken;
  STOCK: MockDebtToken;
}

export const TokenTellorIds = {
  BTC: 1,
  USDT: 2,
  STABLE: 3,
  STOCK: 4,
  GOV: 5,
};

export default async function deployTestBase(): Promise<Contracts> {
  const contracts: Contracts = {} as any;

  // deploy all contracts
  await Promise.all(
    [
      ['borrowerOperations', 'MockBorrowerOperations'],
      ['redemptionOperations', 'RedemptionOperations'],
      ['liquidationOperations', 'LiquidationOperations'],
      ['troveManager', 'MockTroveManager'],
      ['sortedTroves', 'SortedTroves'],
      ['hintHelpers', 'HintHelpers'],
      ['stabilityPoolManager', 'MockStabilityPoolManager'],
      ['storagePool', 'StoragePool'],
      ['collSurplusPool', 'CollSurplusPool'],
      ['reservePool', 'ReservePool'],
      ['tokenManager', 'TokenManager'],
      ['priceFeed', 'PriceFeed'],
      ['swapOperations', 'SwapOperations'],
      ['tellor', 'MockTellor'],
    ].map(async ([key, factoryName]) => {
      const factory = await ethers.getContractFactory(factoryName);
      contracts[key] = await factory.deploy();
    })
  );
  contracts.tellorCaller = await (await ethers.getContractFactory('TellorCaller')).deploy(contracts.tellor.target);

  // connect them
  await Promise.all(
    [
      [
        contracts.borrowerOperations,
        [
          contracts.troveManager.target,
          contracts.storagePool.target,
          contracts.stabilityPoolManager.target,
          contracts.reservePool.target,
          contracts.priceFeed.target,
          contracts.tokenManager.target,
          contracts.swapOperations.target,
          contracts.sortedTroves.target,
          contracts.collSurplusPool.target,
        ],
      ],
      [
        contracts.redemptionOperations,
        [
          contracts.troveManager.target,
          contracts.storagePool.target,
          contracts.priceFeed.target,
          contracts.tokenManager.target,
          contracts.sortedTroves.target,
        ],
      ],
      [
        contracts.liquidationOperations,
        [
          contracts.troveManager.target,
          contracts.storagePool.target,
          contracts.priceFeed.target,
          contracts.tokenManager.target,
          contracts.stabilityPoolManager.target,
          contracts.collSurplusPool.target,
        ],
      ],
      [
        contracts.troveManager,
        [
          contracts.borrowerOperations.target,
          contracts.redemptionOperations.target,
          contracts.liquidationOperations.target,
          contracts.storagePool.target,
          contracts.priceFeed.target,
          contracts.sortedTroves.target,
        ],
      ],
      [
        contracts.sortedTroves,
        [contracts.troveManager.target, contracts.borrowerOperations.target, contracts.redemptionOperations.target],
      ],
      [
        contracts.hintHelpers,
        [contracts.sortedTroves.target, contracts.troveManager.target, contracts.redemptionOperations.target],
      ],
      [
        contracts.stabilityPoolManager,
        [
          contracts.liquidationOperations.target,
          contracts.priceFeed.target,
          contracts.storagePool.target,
          contracts.reservePool.target,
          contracts.tokenManager.target,
        ],
      ],
      [
        contracts.storagePool,
        [
          contracts.borrowerOperations.target,
          contracts.troveManager.target,
          contracts.redemptionOperations.target,
          contracts.liquidationOperations.target,
          contracts.stabilityPoolManager.target,
          contracts.priceFeed.target,
        ],
      ],
      [contracts.collSurplusPool, [contracts.liquidationOperations.target, contracts.borrowerOperations.target]],
      [
        contracts.reservePool,
        [
          contracts.tokenManager.target,
          contracts.stabilityPoolManager.target,
          contracts.priceFeed.target,
          parseUnits('0.2'), // 20 %
          parseUnits('1000'),
        ],
      ],
      [contracts.tokenManager, [contracts.stabilityPoolManager.target, contracts.priceFeed.target]],
      [contracts.priceFeed, [contracts.tellorCaller.target, contracts.tokenManager.target]],
      [
        contracts.swapOperations,
        [
          contracts.borrowerOperations.target,
          contracts.troveManager.target,
          contracts.priceFeed.target,
          contracts.tokenManager.target,
        ],
      ],
    ].map(([c, args]) => c.setAddresses(...args))
  );

  // set initial coin prices
  const blockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp ?? 0;
  await Promise.all([
    contracts.tellor.setUpdateTime(blockTimestamp),
    contracts.tellor.setPrice(TokenTellorIds.BTC, parseUnits('21000', 6)),
    contracts.tellor.setPrice(TokenTellorIds.USDT, parseUnits('1', 6)),
    contracts.tellor.setPrice(TokenTellorIds.GOV, parseUnits('5', 6)),
    contracts.tellor.setPrice(TokenTellorIds.STABLE, parseUnits('1', 6)),
    contracts.tellor.setPrice(TokenTellorIds.STOCK, parseUnits('150', 6)),
  ]);

  // seed mock tokens
  const mockERC20Factory = await ethers.getContractFactory('MockERC20');
  const mockDebtTokenFactory = await ethers.getContractFactory('MockDebtToken');
  const [BTC, USDT, GOV, STABLE, STOCK] = await Promise.all(
    [
      [mockERC20Factory, 'Bitcoin', 'BTC', 9],
      [mockERC20Factory, 'Tether', 'USDT', 18],
      [mockERC20Factory, 'Governance', 'GOV', 18],
      [
        mockDebtTokenFactory,
        contracts.troveManager,
        contracts.redemptionOperations,
        contracts.borrowerOperations,
        contracts.stabilityPoolManager,
        contracts.tokenManager,
        contracts.swapOperations,
        'Stablecoin',
        'STABLE',
        '1',
        true,
      ],
      [
        mockDebtTokenFactory,
        contracts.troveManager,
        contracts.redemptionOperations,
        contracts.borrowerOperations,
        contracts.stabilityPoolManager,
        contracts.tokenManager,
        contracts.swapOperations,
        'Stock',
        'STOCK',
        '1',
        false,
      ],
    ].map(([factory, ...args]) => factory.deploy(...args))
  );
  await Promise.all([
    contracts.tokenManager.addCollToken(BTC, TokenTellorIds.BTC, false),
    contracts.tokenManager.addCollToken(USDT, TokenTellorIds.USDT, false),
    contracts.tokenManager.addCollToken(GOV, TokenTellorIds.GOV, true),
    contracts.tokenManager.addDebtToken(STABLE, TokenTellorIds.STABLE),
    contracts.tokenManager.addDebtToken(STOCK, TokenTellorIds.STOCK),
  ]);

  return {
    ...contracts,
    USDT,
    BTC,
    GOV,
    STABLE,
    STOCK,
  };
}
