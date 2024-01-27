import { ethers } from 'hardhat';
import {
  CollTokenManager,
  DebtTokenManager,
  SwapOperations,
  MockPriceFeed,
  RedemptionOperations,
  LiquidationOperations,
  MockBorrowerOperations,
  MockTroveManager,
  MockStabilityPoolManager,
  StoragePool,
  ReservePool,
  SortedTroves,
  HintHelpers,
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
  reservePool: ReservePool;
  collTokenManager: CollTokenManager;
  debtTokenManager: DebtTokenManager;
  priceFeed: MockPriceFeed;
  swapOperations: SwapOperations;
  collToken: any;
  debtToken: any;
}

export const deployCore = async (): Promise<Contracts> => {
  const borrowerOperationsFactory = await ethers.getContractFactory('MockBorrowerOperations');
  const borrowerOperations = await borrowerOperationsFactory.deploy();

  const redemptionOperationsFactory = await ethers.getContractFactory('RedemptionOperations');
  const redemptionOperations = await redemptionOperationsFactory.deploy();

  const liquidationOperationsFactory = await ethers.getContractFactory('LiquidationOperations');
  const liquidationOperations = await liquidationOperationsFactory.deploy();

  const troveManagerFactory = await ethers.getContractFactory('MockTroveManager');
  const troveManager = await troveManagerFactory.deploy();

  const sortedTrovesFactory = await ethers.getContractFactory('SortedTroves');
  const sortedTroves = await sortedTrovesFactory.deploy();

  const hintHelpersFactory = await ethers.getContractFactory('HintHelpers');
  const hintHelpers = await hintHelpersFactory.deploy();

  const stabilityPoolManagerFactory = await ethers.getContractFactory('MockStabilityPoolManager');
  const stabilityPoolManager = await stabilityPoolManagerFactory.deploy();

  const storagePoolFactory = await ethers.getContractFactory('StoragePool');
  const storagePool = await storagePoolFactory.deploy();

  const reservePoolFactory = await ethers.getContractFactory('ReservePool');
  const reservePool = await reservePoolFactory.deploy();

  const collTokenManagerFactory = await ethers.getContractFactory('CollTokenManager');
  const collTokenManager = await collTokenManagerFactory.deploy();

  const debtTokenManagerFactory = await ethers.getContractFactory('DebtTokenManager');
  const debtTokenManager = await debtTokenManagerFactory.deploy();

  const priceFeedFactory = await ethers.getContractFactory('MockPriceFeed');
  const priceFeed = await priceFeedFactory.deploy();

  const swapOperationsFactory = await ethers.getContractFactory('SwapOperations');
  const swapOperations = await swapOperationsFactory.deploy();

  return {
    borrowerOperations,
    redemptionOperations,
    liquidationOperations,
    troveManager,
    sortedTroves,
    hintHelpers,
    stabilityPoolManager,
    storagePool,
    reservePool,
    collTokenManager,
    debtTokenManager,
    priceFeed,
    swapOperations,
    collToken: undefined,
    debtToken: undefined,
  };
};

// Connect contracts to their dependencies
export const connectCoreContracts = async (contracts: Contracts) => {
  await contracts.troveManager.setAddresses(
    contracts.borrowerOperations,
    contracts.redemptionOperations,
    contracts.liquidationOperations,
    contracts.storagePool,
    contracts.priceFeed,
    contracts.sortedTroves
  );

  await contracts.sortedTroves.setAddresses(
    contracts.troveManager,
    contracts.borrowerOperations,
    contracts.redemptionOperations
  );

  await contracts.hintHelpers.setAddresses(contracts.sortedTroves, contracts.troveManager);

  await contracts.borrowerOperations.setAddresses(
    contracts.troveManager,
    contracts.storagePool,
    contracts.stabilityPoolManager,
    contracts.reservePool,
    contracts.priceFeed,
    contracts.debtTokenManager,
    contracts.collTokenManager,
    contracts.swapOperations,
    contracts.sortedTroves
  );

  await contracts.redemptionOperations.setAddresses(
    contracts.troveManager,
    contracts.storagePool,
    contracts.priceFeed,
    contracts.debtTokenManager,
    contracts.collTokenManager,
    contracts.sortedTroves
  );

  await contracts.liquidationOperations.setAddresses(
    contracts.troveManager,
    contracts.storagePool,
    contracts.priceFeed,
    contracts.debtTokenManager,
    contracts.collTokenManager,
    contracts.stabilityPoolManager
  );

  await contracts.storagePool.setAddresses(
    contracts.borrowerOperations,
    contracts.troveManager,
    contracts.redemptionOperations,
    contracts.liquidationOperations,
    contracts.stabilityPoolManager,
    contracts.priceFeed
  );

  await contracts.debtTokenManager.setAddresses(contracts.stabilityPoolManager);

  await contracts.collTokenManager.setAddresses(contracts.priceFeed);

  await contracts.stabilityPoolManager.setAddresses(
    contracts.liquidationOperations,
    contracts.priceFeed,
    contracts.storagePool,
    contracts.reservePool,
    contracts.debtTokenManager
  );

  await contracts.swapOperations.setAddresses(
    contracts.borrowerOperations,
    contracts.troveManager,
    contracts.priceFeed,
    contracts.debtTokenManager
  );
};

export const deployAndLinkToken = async (contracts: Contracts) => {
  const mockTokenFactory = await ethers.getContractFactory('MockERC20');
  const BTC = await mockTokenFactory.deploy('Bitcoin', 'BTC', 9);
  await contracts.collTokenManager.addCollToken(BTC);
  await contracts.priceFeed.setTokenPrice(BTC, parseUnits('21000'));

  const USDT = await mockTokenFactory.deploy('USDT', 'USDT', 18);
  await contracts.collTokenManager.addCollToken(USDT);
  await contracts.priceFeed.setTokenPrice(USDT, parseUnits('1'));

  // coll tokens
  contracts.collToken = { BTC, USDT };

  const mockDebtTokenFactory = await ethers.getContractFactory('MockDebtToken');
  const STABLE = await mockDebtTokenFactory.deploy(
    contracts.troveManager,
    contracts.redemptionOperations,
    contracts.borrowerOperations,
    contracts.stabilityPoolManager,
    contracts.priceFeed,
    'STABLE',
    'STABLE',
    '1',
    true
  );
  await contracts.debtTokenManager.addDebtToken(STABLE);
  await contracts.priceFeed.setTokenPrice(STABLE, parseUnits('1'));

  const STOCK = await mockDebtTokenFactory.deploy(
    contracts.troveManager,
    contracts.redemptionOperations,
    contracts.borrowerOperations,
    contracts.stabilityPoolManager,
    contracts.priceFeed,
    'STOCK',
    'STOCK',
    '1',
    false
  );
  await contracts.debtTokenManager.addDebtToken(STOCK);
  await contracts.priceFeed.setTokenPrice(STOCK, parseUnits('150'));

  // debt tokens
  contracts.debtToken = { STABLE, STOCK };

  await contracts.reservePool.setAddresses(
    contracts.stabilityPoolManager,
    contracts.priceFeed,
    contracts.debtToken.STABLE,
    contracts.debtToken.STABLE, // TODO: change to gov token
    parseUnits('1000000'),
    parseUnits('1000000')
  );
};
