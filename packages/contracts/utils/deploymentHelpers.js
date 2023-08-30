const BorrowerOperations = artifacts.require('./BorrowerOperations.sol');
const CollTokenManager = artifacts.require('./CollTokenManager.sol');
const DebtToken = artifacts.require('./DebtToken.sol');
const DebtTokenManager = artifacts.require('./DebtTokenManager.sol');
const PriceFeedTestnet = artifacts.require('./PriceFeedTestnet.sol');
const StabilityPool = artifacts.require('./StabilityPool.sol');
const StabilityPoolManager = artifacts.require('./StabilityPoolManager.sol');
const StoragePool = artifacts.require('./StoragePool.sol');
const TroveManager = artifacts.require('./TroveManager.sol');

const StoragePoolTester = artifacts.require('./StoragePoolTester.sol');
const StabilityPoolTester = artifacts.require('./StabilityPoolTester.sol');
const LiquityMathTester = artifacts.require('./LiquityMathTester.sol');
const BorrowerOperationsTester = artifacts.require('./BorrowerOperationsTester.sol');
const DebtTokenTester = artifacts.require('./DebtTokenTester.sol');

// Proxy scripts
const BorrowerOperationsScript = artifacts.require('BorrowerOperationsScript');
const BorrowerWrappersScript = artifacts.require('BorrowerWrappersScript');
const TroveManagerScript = artifacts.require('TroveManagerScript');
const StabilityPoolScript = artifacts.require('StabilityPoolScript');
const TokenScript = artifacts.require('TokenScript');
const {
  buildUserProxies,
  BorrowerOperationsProxy,
  BorrowerWrappersProxy,
  TroveManagerProxy,
  StabilityPoolProxy,
  TokenProxy,
} = require('../utils/proxyHelpers.js');

const ZERO_ADDRESS = '0x' + '0'.repeat(40);
const maxBytes32 = '0x' + 'f'.repeat(64);

class DeploymentHelper {
  static async deployCore() {
    const core = {
      priceFeedTestnet: await PriceFeedTestnet.new(),
      troveManager: await TroveManager.new(),
      borrowerOperations: await BorrowerOperations.new(),
      storagePool: await StoragePool.new(),
      stabilityPoolManager: await StabilityPoolManager.new(),
      collTokenManager: await CollTokenManager.new(),
      debtTokenManager: await DebtTokenManager.new(),
    };

    // todo add coll tokens
    // todo deploy debt tokens
    // const lusdToken = await LUSDToken.new(troveManager.address, stabilityPool.address, borrowerOperations.address);
    // todo deploy separate stability pools
    // const stabilityPool = await StabilityPool.new();

    const cmdLineArgs = process.argv;
    const frameworkPath = cmdLineArgs[1];
    if (frameworkPath.includes('hardhat')) await this.extendHardhatCore(core);

    return core;
  }

  static async extendHardhatCore(core) {
    PriceFeedTestnet.setAsDeployed(core.priceFeedTestnet);
    TroveManager.setAsDeployed(core.troveManager);
    StoragePool.setAsDeployed(core.storagePool);
    StabilityPoolManager.setAsDeployed(core.stabilityPoolManager);
    BorrowerOperations.setAsDeployed(core.borrowerOperations);
    CollTokenManager.setAsDeployed(core.collTokenManager);
    DebtTokenManager.setAsDeployed(core.debtTokenManager);
  }

  static async deployTesterContracts() {
    const testerContracts = {
      priceFeedTestnet: await PriceFeedTestnet.new(),
      troveManager: await TroveManager.new(),
      functionCaller: await FunctionCaller.new(),
      stabilityPoolManager: await StabilityPoolManager.new(),
      collTokenManager: await CollTokenManager.new(),
      debtTokenManager: await DebtTokenManager.new(),
      // Actual tester contract
      storagePool: await StoragePoolTester.new(),
      borrowerOperations: await BorrowerOperationsTester.new(),
      math: await LiquityMathTester.new(),
    };

    // todo add coll, debt tokens + stability pools
    //      testerContracts.stabilityPool = await StabilityPoolTester.new();
    // testerContracts.lusdToken = await LUSDTokenTester.new(
    //     testerContracts.troveManager.address,
    //     testerContracts.stabilityPool.address,
    //     testerContracts.borrowerOperations.address
    // );

    return testerContracts;
  }

  // static async deployLUSDToken(contracts) {
  //   contracts.lusdToken = await LUSDToken.new(
  //     contracts.troveManager.address,
  //     contracts.stabilityPool.address,
  //     contracts.borrowerOperations.address
  //   );
  //   return contracts;
  // }
  //
  // static async deployLUSDTokenTester(contracts) {
  //   contracts.lusdToken = await LUSDTokenTester.new(
  //     contracts.troveManager.address,
  //     contracts.stabilityPool.address,
  //     contracts.borrowerOperations.address
  //   );
  //   return contracts;
  // }

  // Connect contracts to their dependencies
  static async connectCoreContracts(contracts) {
    await contracts.troveManager.setAddresses(
      contracts.borrowerOperations.address,
      contracts.storagePool.address,
      contracts.stabilityPoolManager.address,
      contracts.priceFeedTestnet.address,
      contracts.debtTokenManager.address,
      contracts.collTokenManager.address
    );

    await contracts.borrowerOperations.setAddresses(
      contracts.troveManager.address,
      contracts.storagePool.address,
      contracts.stabilityPoolManager.address,
      contracts.priceFeedTestnet.address,
      contracts.debtTokenManager.address,
      contracts.collTokenManager.address
    );

    await contracts.storagePool.setAddresses(
      contracts.borrowerOperations.address,
      contracts.troveManager.address,
      contracts.stabilityPoolManager.address,
      contracts.priceFeedTestnet.address
    );

    await contracts.debtTokenManager.setAddresses(
      contracts.troveManager.address,
      contracts.borrowerOperations.address,
      contracts.stabilityPoolManager.address,
      contracts.priceFeedTestnet.address
    );

    await contracts.collTokenManager.setAddresses(contracts.priceFeedTestnet.address);
  }

  static async deployProxyScripts(contracts, owner, users) {
    const proxies = await buildUserProxies(users);

    const borrowerWrappersScript = await BorrowerWrappersScript.new(
      contracts.borrowerOperations.address,
      contracts.troveManager.address
    );
    contracts.borrowerWrappers = new BorrowerWrappersProxy(owner, proxies, borrowerWrappersScript.address);

    const borrowerOperationsScript = await BorrowerOperationsScript.new(contracts.borrowerOperations.address);
    contracts.borrowerOperations = new BorrowerOperationsProxy(
      owner,
      proxies,
      borrowerOperationsScript.address,
      contracts.borrowerOperations
    );

    const troveManagerScript = await TroveManagerScript.new(contracts.troveManager.address);
    contracts.troveManager = new TroveManagerProxy(owner, proxies, troveManagerScript.address, contracts.troveManager);

    // todo deploy them over the manager contracts
    // const stabilityPoolScript = await StabilityPoolScript.new(contracts.stabilityPool.address);
    // contracts.stabilityPool = new StabilityPoolProxy(
    //   owner,
    //   proxies,
    //   stabilityPoolScript.address,
    //   contracts.stabilityPool
    // );
    //
    // const lusdTokenScript = await TokenScript.new(contracts.lusdToken.address);
    // contracts.lusdToken = new TokenProxy(owner, proxies, lusdTokenScript.address, contracts.lusdToken);
  }
}
module.exports = DeploymentHelper;
