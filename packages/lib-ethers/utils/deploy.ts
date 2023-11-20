import { Signer } from '@ethersproject/abstract-signer';
import { ContractTransaction, ContractFactory, Overrides } from '@ethersproject/contracts';
import {
  _LiquityContractAddresses,
  _LiquityContracts,
  _LiquityDeploymentJSON,
  _connectToContracts,
} from '../src/contracts';

let silent = true;

export const log = (...args: unknown[]): void => {
  if (!silent) {
    console.log(...args);
  }
};

export const setSilent = (s: boolean): void => {
  silent = s;
};

const deployContractAndGetBlockNumber = async (
  deployer: Signer,
  getContractFactory: (name: string, signer: Signer) => Promise<ContractFactory>,
  contractName: string,
  ...args: unknown[]
): Promise<[address: string, blockNumber: number]> => {
  log(`Deploying ${contractName} ...`);
  const contract = await (await getContractFactory(contractName, deployer)).deploy(...args);

  log(`Waiting for transaction ${contract.deployTransaction.hash} ...`);
  const receipt = await contract.deployTransaction.wait();

  log({
    contractAddress: contract.address,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toNumber(),
  });

  log();

  return [contract.address, receipt.blockNumber];
};

const deployContract: (...p: Parameters<typeof deployContractAndGetBlockNumber>) => Promise<string> = (...p) =>
  deployContractAndGetBlockNumber(...p).then(([a]) => a);

const deployContracts = async (
  deployer: Signer,
  getContractFactory: (name: string, signer: Signer) => Promise<ContractFactory>,
  priceFeedIsTestnet = true,
  overrides?: Overrides
): Promise<[addresses: Omit<_LiquityContractAddresses, 'uniToken'>, startBlock: number]> => {
  const [storagePool, startBlock] = await deployContractAndGetBlockNumber(deployer, getContractFactory, 'StoragePool', {
    ...overrides,
  });

  return [
    {
      borrowerOperations: await deployContract(deployer, getContractFactory, 'BorrowerOperations', {
        ...overrides,
      }),
      redemptionOperations: await deployContract(deployer, getContractFactory, 'RedemptionOperations', {
        ...overrides,
      }),
      troveManager: await deployContract(deployer, getContractFactory, 'TroveManager', {
        ...overrides,
      }),
      stabilityPoolManager: await deployContract(deployer, getContractFactory, 'StabilityPoolManager', {
        ...overrides,
      }),
      storagePool,
      collTokenManager: await deployContract(deployer, getContractFactory, 'CollTokenManager', {
        ...overrides,
      }),
      debtTokenManager: await deployContract(deployer, getContractFactory, 'DebtTokenManager', {
        ...overrides,
      }),
      priceFeed: await deployContract(
        deployer,
        getContractFactory,
        priceFeedIsTestnet ? 'MockPriceFeed' : 'PriceFeed',
        { ...overrides }
      ),
      // communityIssuance: await deployContract(deployer, getContractFactory, 'CommunityIssuance', {
      //   ...overrides,
      // }),
      // hintHelpers: await deployContract(deployer, getContractFactory, 'HintHelpers', { ...overrides }),
      // lockupContractFactory: await deployContract(deployer, getContractFactory, 'LockupContractFactory', {
      //   ...overrides,
      // }),
      // lqtyStaking: await deployContract(deployer, getContractFactory, 'LQTYStaking', { ...overrides }),
      // unipool: await deployContract(deployer, getContractFactory, 'Unipool', { ...overrides }),
    },
    startBlock,
  ];
};

export const deployTellorCaller = (
  deployer: Signer,
  getContractFactory: (name: string, signer: Signer) => Promise<ContractFactory>,
  tellorAddress: string,
  overrides?: Overrides
): Promise<string> => deployContract(deployer, getContractFactory, 'TellorCaller', tellorAddress, { ...overrides });

const connectContracts = async (
  {
    storagePool,
    borrowerOperations,
    redemptionOperations,
    troveManager,
    stabilityPoolManager,
    debtTokenManager,
    collTokenManager,
    priceFeed,
  }: _LiquityContracts,
  deployer: Signer,
  overrides?: Overrides
) => {
  if (!deployer.provider) {
    throw new Error('Signer must have a provider.');
  }

  const txCount = await deployer.provider.getTransactionCount(deployer.getAddress());

  const connections: ((nonce: number) => Promise<ContractTransaction>)[] = [
    nonce =>
      troveManager.setAddresses(
        borrowerOperations.address,
        redemptionOperations.address,
        storagePool.address,
        stabilityPoolManager.address,
        priceFeed.address,
        debtTokenManager.address,
        collTokenManager.address,
        { ...overrides, nonce }
      ),

    nonce =>
      borrowerOperations.setAddresses(
        troveManager.address,
        storagePool.address,
        stabilityPoolManager.address,
        priceFeed.address,
        debtTokenManager.address,
        collTokenManager.address,
        { ...overrides, nonce }
      ),

    nonce =>
      redemptionOperations.setAddresses(
        troveManager.address,
        storagePool.address,
        priceFeed.address,
        debtTokenManager.address,
        collTokenManager.address,
        { ...overrides, nonce }
      ),

    nonce =>
      storagePool.setAddresses(
        borrowerOperations.address,
        troveManager.address,
        redemptionOperations.address,
        stabilityPoolManager.address,
        priceFeed.address,
        { ...overrides, nonce }
      ),

    nonce => debtTokenManager.setAddresses(stabilityPoolManager.address, { ...overrides, nonce }),
    nonce => collTokenManager.setAddresses(priceFeed.address, { ...overrides, nonce }),

    nonce =>
      stabilityPoolManager.setAddresses(
        troveManager.address,
        priceFeed.address,
        storagePool.address,
        debtTokenManager.address,
        { ...overrides, nonce }
      ),

    // todo
    // nonce =>
    //   hintHelpers.setAddresses(sortedTroves.address, troveManager.address, {
    //     ...overrides,
    //     nonce,
    //   }),
    // nonce =>
    //   lqtyStaking.setAddresses(
    //     lqtyToken.address,
    //     lusdToken.address,
    //     troveManager.address,
    //     borrowerOperations.address,
    //     activePool.address,
    //     { ...overrides, nonce }
    //   ),
    // nonce =>
    //   lockupContractFactory.setLQTYTokenAddress(lqtyToken.address, {
    //     ...overrides,
    //     nonce,
    //   }),
    // nonce =>
    //   communityIssuance.setAddresses(lqtyToken.address, stabilityPool.address, {
    //     ...overrides,
    //     nonce,
    //   }),
    // nonce =>
    //   unipool.setParams(lqtyToken.address, uniToken.address, 2 * 30 * 24 * 60 * 60, {
    //     ...overrides,
    //     nonce,
    //   }),
  ];

  const txs = await Promise.all(connections.map((connect, i) => connect(txCount + i)));

  let i = 0;
  await Promise.all(txs.map(tx => tx.wait().then(() => log(`Connected ${++i}`))));
};

const deployAndConnectDebtTokens = async (
  _isDev: boolean,
  {
    borrowerOperations,
    troveManager,
    redemptionOperations,
    stabilityPoolManager,
    debtTokenManager,
    priceFeed,
  }: _LiquityContracts,
  deployer: Signer,
  getContractFactory: (name: string, signer: Signer) => Promise<ContractFactory>,
  deployment: _LiquityDeploymentJSON,
  overrides?: Overrides
) => {
  const debtTokenNames = [{ name: 'jUSD', symbol: 'jUSD', version: '1.0', isStable: true }];
  if (_isDev) debtTokenNames.push({ name: 'STOCK', symbol: 'STOCK', version: '1.0', isStable: false });

  for (const { name, symbol, version, isStable } of debtTokenNames) {
    const debtTokenAddress = await deployContract(
      deployer,
      getContractFactory,
      'DebtToken',
      troveManager.address,
      redemptionOperations.address,
      borrowerOperations.address,
      stabilityPoolManager.address,
      priceFeed.address,
      name,
      symbol,
      version,
      isStable,
      { ...overrides }
    );
    await debtTokenManager.addDebtToken(debtTokenAddress, { ...overrides });
    deployment.debtTokens[name] = debtTokenAddress;
    log(`Added debt token ${name} at ${debtTokenAddress}`);
  }
};

// const deployMockUniToken = (
//   deployer: Signer,
//   getContractFactory: (name: string, signer: Signer) => Promise<ContractFactory>,
//   overrides?: Overrides
// ) => deployContract(deployer, getContractFactory, 'MockERC20', 'Mock Uniswap V2', 'UNI-V2', 18, { ...overrides });

export const deployAndSetupContracts = async (
  deployer: Signer,
  getContractFactory: (name: string, signer: Signer) => Promise<ContractFactory>,
  _priceFeedIsTestnet = true,
  _isDev = true,
  wethAddress?: string,
  overrides?: Overrides
): Promise<_LiquityDeploymentJSON> => {
  if (!deployer.provider) {
    throw new Error('Signer must have a provider.');
  }

  log('Deploying contracts...');
  log();

  const deployment: _LiquityDeploymentJSON = {
    chainId: await deployer.getChainId(),
    version: 'unknown',
    deploymentDate: new Date().getTime(),
    bootstrapPeriod: 0,
    totalStabilityPoolLQTYReward: '0',
    liquidityMiningLQTYRewardRate: '0',
    _priceFeedIsTestnet,
    _uniTokenIsMock: !wethAddress,
    _isDev,
    debtTokens: {},

    ...(await deployContracts(deployer, getContractFactory, _priceFeedIsTestnet, overrides).then(
      async ([addresses, startBlock]) => ({
        startBlock,
        addresses: {
          ...addresses,
          // todo
          // uniToken: await (wethAddress
          //   ? createUniswapV2Pair(deployer, wethAddress, addresses.lusdToken, overrides)
          //   : deployMockUniToken(deployer, getContractFactory, overrides)),
        },
      })
    )),
  };

  const contracts = _connectToContracts(deployer, deployment);

  log('Connecting contracts...');
  await connectContracts(contracts, deployer, overrides);

  log('Deploying debt tokens...');
  await deployAndConnectDebtTokens(_isDev, contracts, deployer, getContractFactory, deployment, overrides);

  return {
    ...deployment,
    bootstrapPeriod: (await contracts.troveManager.BOOTSTRAP_PERIOD()).toNumber(),

    // todo
    // deploymentDate: (await contracts.troveManager.getDeploymentStartTime()).toNumber() * 1000,
    // totalStabilityPoolLQTYReward: `${Decimal.fromBigNumberString(
    //   (await contracts.communityIssuance.LQTYSupplyCap()).toHexString()
    // )}`,
    // liquidityMiningLQTYRewardRate: `${Decimal.fromBigNumberString((await contracts.unipool.rewardRate()).toHexString())}`,
  };
};
