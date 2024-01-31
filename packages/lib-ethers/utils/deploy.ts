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
  if (!silent) console.log(...args);
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
      storagePool,
      borrowerOperations: await deployContract(deployer, getContractFactory, 'BorrowerOperations', {
        ...overrides,
      }),
      troveManager: await deployContract(deployer, getContractFactory, 'TroveManager', {
        ...overrides,
      }),
      sortedTroves: await deployContract(deployer, getContractFactory, 'SortedTroves', { ...overrides }),
      hintHelpers: await deployContract(deployer, getContractFactory, 'HintHelpers', { ...overrides }),
      priceFeed: await deployContract(
        deployer,
        getContractFactory,
        priceFeedIsTestnet ? 'MockPriceFeed' : 'PriceFeed',
        { ...overrides }
      ),
      swapOperations: await deployContract(deployer, getContractFactory, 'SwapOperations', { ...overrides }),
      redemptionOperations: await deployContract(deployer, getContractFactory, 'RedemptionOperations', {
        ...overrides,
      }),
      liquidationOperations: await deployContract(deployer, getContractFactory, 'LiquidationOperations', {
        ...overrides,
      }),
      reservePool: await deployContract(deployer, getContractFactory, 'ReservePool', {
        ...overrides,
      }),
      stabilityPoolManager: await deployContract(deployer, getContractFactory, 'StabilityPoolManager', {
        ...overrides,
      }),
      collTokenManager: await deployContract(deployer, getContractFactory, 'CollTokenManager', {
        ...overrides,
      }),
      debtTokenManager: await deployContract(deployer, getContractFactory, 'DebtTokenManager', {
        ...overrides,
      }),
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
    liquidationOperations,
    troveManager,
    sortedTroves,
    stabilityPoolManager,
    debtTokenManager,
    collTokenManager,
    priceFeed,
    swapOperations,
    reservePool,
    hintHelpers,
  }: _LiquityContracts,
  deployer: Signer,
  overrides?: Overrides
) => {
  if (!deployer.provider) throw new Error('Signer must have a provider.');

  const txCount = await deployer.provider.getTransactionCount(deployer.getAddress());

  const connections: ((nonce: number) => Promise<ContractTransaction>)[] = [
    nonce =>
      troveManager.setAddresses(
        borrowerOperations.address,
        redemptionOperations.address,
        liquidationOperations.address,
        storagePool.address,
        priceFeed.address,
        sortedTroves.address,
        { ...overrides, nonce }
      ),

    nonce =>
      sortedTroves.setAddresses(troveManager.address, borrowerOperations.address, redemptionOperations.address, {
        ...overrides,
        nonce,
      }),

    nonce => hintHelpers.setAddresses(sortedTroves.address, troveManager.address, { ...overrides, nonce }),

    nonce =>
      borrowerOperations.setAddresses(
        troveManager.address,
        storagePool.address,
        stabilityPoolManager.address,
        reservePool.address,
        priceFeed.address,
        debtTokenManager.address,
        collTokenManager.address,
        swapOperations.address,
        sortedTroves.address,
        { ...overrides, nonce }
      ),

    nonce =>
      redemptionOperations.setAddresses(
        troveManager.address,
        storagePool.address,
        priceFeed.address,
        debtTokenManager.address,
        collTokenManager.address,
        sortedTroves.address,
        { ...overrides, nonce }
      ),

    nonce =>
      liquidationOperations.setAddresses(
        troveManager.address,
        storagePool.address,
        priceFeed.address,
        debtTokenManager.address,
        collTokenManager.address,
        stabilityPoolManager.address,
        { ...overrides, nonce }
      ),

    nonce =>
      storagePool.setAddresses(
        borrowerOperations.address,
        troveManager.address,
        redemptionOperations.address,
        liquidationOperations.address,
        stabilityPoolManager.address,
        priceFeed.address,
        { ...overrides, nonce }
      ),

    nonce => debtTokenManager.setAddresses(stabilityPoolManager.address, { ...overrides, nonce }),
    nonce => collTokenManager.setAddresses(priceFeed.address, { ...overrides, nonce }),

    nonce =>
      stabilityPoolManager.setAddresses(
        liquidationOperations.address,
        priceFeed.address,
        storagePool.address,
        reservePool.address,
        debtTokenManager.address,
        { ...overrides, nonce }
      ),

    nonce =>
      swapOperations.setAddresses(
        borrowerOperations.address,
        troveManager.address,
        priceFeed.address,
        debtTokenManager.address,
        { ...overrides, nonce }
      ),
  ];

  const txs = await Promise.all(connections.map((connect, i) => connect(txCount + i)));

  let i = 0;
  await Promise.all(txs.map(tx => tx.wait().then(() => log(`Connected ${++i}`))));
};

const deployAndConnectDebtTokens = async (
  _isDev: boolean,
  {
    reservePool,
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

  let stableCoinAddress;
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

    if (isStable) stableCoinAddress = debtTokenAddress;
  }

  await reservePool.setAddresses(
    stabilityPoolManager.address,
    priceFeed.address,
    stableCoinAddress,
    stableCoinAddress, // todo use correct gov token address
    1000000, // todo specify correct numbers...
    1000000,
    { ...overrides }
  );
};

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
        addresses,
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
  };
};
