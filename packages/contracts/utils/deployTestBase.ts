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
  let txs = [];
  for (const [key, factoryName] of [
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
  ]) {
    const factory = await ethers.getContractFactory(factoryName);
    const contract = await factory.deploy();
    txs.push(contract.waitForDeployment());
    contracts[key] = contract;
  }
  await Promise.all(txs);

  contracts.tellorCaller = await (await ethers.getContractFactory('TellorCaller')).deploy(contracts.tellor.target);
  await contracts.tellorCaller.waitForDeployment();

  // connect them
  txs = [];
  for (const [c, args] of [
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
  ]) {
    const tx = await c.setAddresses(...args);
    txs.push(tx.wait());
  }
  await Promise.all(txs);

  // seed mock tokens
  const mockERC20Factory = await ethers.getContractFactory('MockERC20');
  const mockDebtTokenFactory = await ethers.getContractFactory('MockDebtToken');
  txs = [];
  for (const [key, factory, ...args] of [
    ['BTC', mockERC20Factory, 'Bitcoin', 'BTC', 9],
    ['USDT', mockERC20Factory, 'Tether', 'USDT', 18],
    ['GOV', mockERC20Factory, 'Governance', 'GOV', 18],
    [
      'STABLE',
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
      'STOCK',
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
  ]) {
    const contract = await factory.deploy(...args);
    txs.push(contract.waitForDeployment());
    contracts[key] = contract;
  }
  await Promise.all(txs);

  // add tokens to token manager + set initial coin prices
  const blockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp ?? 0;
  await Promise.all([
    (await contracts.tokenManager.addCollToken(contracts.BTC, TokenTellorIds.BTC, false)).wait(),
    (await contracts.tokenManager.addCollToken(contracts.USDT, TokenTellorIds.USDT, false)).wait(),
    (await contracts.tokenManager.addCollToken(contracts.GOV, TokenTellorIds.GOV, true)).wait(),
    (await contracts.tokenManager.addDebtToken(contracts.STABLE, TokenTellorIds.STABLE)).wait(),
    (await contracts.tokenManager.addDebtToken(contracts.STOCK, TokenTellorIds.STOCK)).wait(),
    (await contracts.tellor.setUpdateTime(blockTimestamp)).wait(),
    (await contracts.tellor.setPrice(TokenTellorIds.BTC, parseUnits('21000', 6))).wait(),
    (await contracts.tellor.setPrice(TokenTellorIds.USDT, parseUnits('1', 6))).wait(),
    (await contracts.tellor.setPrice(TokenTellorIds.GOV, parseUnits('5', 6))).wait(),
    (await contracts.tellor.setPrice(TokenTellorIds.STABLE, parseUnits('1', 6))).wait(),
    (await contracts.tellor.setPrice(TokenTellorIds.STOCK, parseUnits('150', 6))).wait(),
  ]);

  return contracts;
}
