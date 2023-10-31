import { ethers } from 'hardhat';
import {
  CollTokenManager,
  DebtTokenManager,
  MockERC20,
  MockPriceFeed,
  MockTroveManager,
  StabilityPoolManagerTester,
  StoragePool,
} from '../typechain';
import { parseUnits } from 'ethers';
import { BorrowerOperationsTester } from '../typechain/contracts/TestContracts/BorrowerOperationsTester';

export interface Contracts {
  borrowerOperations: BorrowerOperationsTester;
  troveManager: MockTroveManager;
  stabilityPoolManager: StabilityPoolManagerTester;
  storagePool: StoragePool;
  collTokenManager: CollTokenManager;
  debtTokenManager: DebtTokenManager;
  priceFeed: MockPriceFeed;
  collToken: any;
  debtToken: any;
}

export const deployCore = async (): Promise<Contracts> => {
  const borrowerOperationsFactory = await ethers.getContractFactory('BorrowerOperationsTester');
  const borrowerOperations = await borrowerOperationsFactory.deploy();

  const troveManagerFactory = await ethers.getContractFactory('MockTroveManager');
  const troveManager = await troveManagerFactory.deploy();

  const stabilityPoolManagerFactory = await ethers.getContractFactory('StabilityPoolManagerTester');
  const stabilityPoolManager = await stabilityPoolManagerFactory.deploy();

  const storagePoolFactory = await ethers.getContractFactory('StoragePool');
  const storagePool = await storagePoolFactory.deploy();

  const collTokenManagerFactory = await ethers.getContractFactory('CollTokenManager');
  const collTokenManager = await collTokenManagerFactory.deploy();

  const debtTokenManagerFactory = await ethers.getContractFactory('DebtTokenManager');
  const debtTokenManager = await debtTokenManagerFactory.deploy();

  const priceFeedFactory = await ethers.getContractFactory('MockPriceFeed');
  const priceFeed = await priceFeedFactory.deploy();

  return {
    borrowerOperations,
    troveManager,
    stabilityPoolManager,
    storagePool,
    collTokenManager,
    debtTokenManager,
    priceFeed,
    collToken: undefined,
    debtToken: undefined,
  };
};

// Connect contracts to their dependencies
export const connectCoreContracts = async (contracts: Contracts) => {
  await contracts.troveManager.setAddresses(
    contracts.borrowerOperations,
    contracts.storagePool,
    contracts.stabilityPoolManager,
    contracts.priceFeed,
    contracts.debtTokenManager,
    contracts.collTokenManager
  );

  await contracts.borrowerOperations.setAddresses(
    contracts.troveManager,
    contracts.storagePool,
    contracts.stabilityPoolManager,
    contracts.priceFeed,
    contracts.debtTokenManager,
    contracts.collTokenManager
  );

  await contracts.storagePool.setAddresses(
    contracts.borrowerOperations,
    contracts.troveManager,
    contracts.stabilityPoolManager,
    contracts.priceFeed
  );

  await contracts.debtTokenManager.setAddresses(
    contracts.troveManager,
    contracts.borrowerOperations,
    contracts.stabilityPoolManager,
    contracts.priceFeed
  );

  await contracts.collTokenManager.setAddresses(contracts.priceFeed);

  await contracts.stabilityPoolManager.setAddresses(
    contracts.troveManager,
    contracts.priceFeed,
    contracts.storagePool,
    contracts.debtTokenManager
  );
};

export const deployAndLinkToken = async (contracts: Contracts) => {
  // coll tokens
  const mockTokenFactory = await ethers.getContractFactory('MockERC20');
  const BTC = await mockTokenFactory.deploy('Bitcoin', 'BTC', 9);
  const USDT = await mockTokenFactory.deploy('USDT', 'USDT', 18);
  contracts.collToken = { BTC, USDT };
  await contracts.collTokenManager.addCollToken(USDT);
  await contracts.priceFeed.setTokenPrice(USDT, parseUnits('1'));
  await contracts.collTokenManager.addCollToken(BTC);
  await contracts.priceFeed.setTokenPrice(BTC, parseUnits('21000'));

  const mockDebtTokenFactory = await ethers.getContractFactory('MockDebtToken');
  const STABLE = await mockDebtTokenFactory.deploy(
    contracts.troveManager,
    contracts.borrowerOperations,
    contracts.stabilityPoolManager,
    contracts.priceFeed,
    'STABLE',
    'STABLE',
    '1',
    true
  );
  const STOCK = await mockDebtTokenFactory.deploy(
    contracts.troveManager,
    contracts.borrowerOperations,
    contracts.stabilityPoolManager,
    contracts.priceFeed,
    'STOCK',
    'STOCK',
    '1',
    false
  );

  // debt tokens
  contracts.debtToken = {
    STABLE,
    STOCK,
  };
  await contracts.debtTokenManager.addDebtToken(STABLE);
  await contracts.debtTokenManager.addDebtToken(STOCK);
  await contracts.priceFeed.setTokenPrice(STOCK, parseUnits('150'));
  await contracts.priceFeed.setTokenPrice(STABLE, parseUnits('1'));
};

// class DeploymentHelper {
//   static async deployTesterContracts() {
//     const testerContracts = {
//       priceFeedTestnet: await PriceFeedTestnet.new(),
//       troveManager: await TroveManager.new(),
//       functionCaller: await FunctionCaller.new(),
//       stabilityPoolManager: await StabilityPoolManager.new(),
//       collTokenManager: await CollTokenManager.new(),
//       debtTokenManager: await DebtTokenManager.new(),
//       // Actual tester contract
//       storagePool: await StoragePoolTester.new(),
//       borrowerOperations: await BorrowerOperationsTester.new(),
//       math: await LiquityMathTester.new(),
//     };

//     return testerContracts;
//   }

//   static async deployProxyScripts(contracts, owner, users) {
//     const proxies = await buildUserProxies(users);

//     const borrowerWrappersScript = await BorrowerWrappersScript.new(
//       contracts.borrowerOperations.address,
//       contracts.troveManager.address
//     );
//     contracts.borrowerWrappers = new BorrowerWrappersProxy(owner, proxies, borrowerWrappersScript.address);

//     const borrowerOperationsScript = await BorrowerOperationsScript.new(contracts.borrowerOperations.address);
//     contracts.borrowerOperations = new BorrowerOperationsProxy(
//       owner,
//       proxies,
//       borrowerOperationsScript.address,
//       contracts.borrowerOperations
//     );

//     const troveManagerScript = await TroveManagerScript.new(contracts.troveManager.address);
//     contracts.troveManager = new TroveManagerProxy(owner, proxies, troveManagerScript.address, contracts.troveManager);
//   }
// }
