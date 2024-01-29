import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers, getNamedAccounts } from 'hardhat';
import { parseUnits } from 'ethers';

const deployProtocol: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await getNamedAccounts();

  // Deploy Core
  const borrowerOperationsDeployment = await deploy('BorrowerOperations', {
    from: deployer,
    args: [],
    log: true,
  });

  const redemptionOperationsDeployment = await deploy('RedemptionOperations', {
    from: deployer,
    args: [],
    log: true,
  });

  const liquidationOperationsDeployment = await deploy('LiquidationOperations', {
    from: deployer,
    args: [],
    log: true,
  });

  const troveManagerDeployment = await deploy('TroveManager', {
    from: deployer,
    args: [],
    log: true,
  });

  const stabilityPoolManagerDeployment = await deploy('StabilityPoolManager', {
    from: deployer,
    args: [],
    log: true,
  });

  const storagePoolDeployment = await deploy('StoragePool', {
    from: deployer,
    args: [],
    log: true,
  });

  const reservePoolDeployment = await deploy('ReservePool', {
    from: deployer,
    args: [],
    log: true,
  });

  const collTokenManagerDeployment = await deploy('CollTokenManager', {
    from: deployer,
    args: [],
    log: true,
  });

  const debtTokenManagerDeployment = await deploy('DebtTokenManager', {
    from: deployer,
    args: [],
    log: true,
  });

  const priceFeedDeployment = await deploy('PriceFeed', {
    from: deployer,
    args: [],
    log: true,
  });

  const swapOperationsDeployment = await deploy('SwapOperations', {
    from: deployer,
    args: [],
    log: true,
  });

  // Connect core contracts
  const troveManager = await ethers.getContractAt('TroveManager', troveManagerDeployment.address);
  await troveManager.setAddresses(
    borrowerOperationsDeployment.address,
    redemptionOperationsDeployment.address,
    liquidationOperationsDeployment.address,
    storagePoolDeployment.address,
    priceFeedDeployment.address
  );

  const borrowerOperations = await ethers.getContractAt('BorrowerOperations', borrowerOperationsDeployment.address);
  await borrowerOperations.setAddresses(
    troveManagerDeployment.address,
    storagePoolDeployment.address,
    stabilityPoolManagerDeployment.address,
    reservePoolDeployment.address,
    priceFeedDeployment.address,
    debtTokenManagerDeployment.address,
    collTokenManagerDeployment.address,
    swapOperationsDeployment.address
  );

  const redemptionOperations = await ethers.getContractAt(
    'RedemptionOperations',
    redemptionOperationsDeployment.address
  );
  await redemptionOperations.setAddresses(
    troveManagerDeployment.address,
    storagePoolDeployment.address,
    priceFeedDeployment.address,
    debtTokenManagerDeployment.address,
    collTokenManagerDeployment.address
  );

  const liquidationOperations = await ethers.getContractAt(
    'LiquidationOperations',
    liquidationOperationsDeployment.address
  );
  await liquidationOperations.setAddresses(
    troveManagerDeployment.address,
    storagePoolDeployment.address,
    priceFeedDeployment.address,
    debtTokenManagerDeployment.address,
    collTokenManagerDeployment.address,
    stabilityPoolManagerDeployment.address
  );

  const storagePool = await ethers.getContractAt('StoragePool', storagePoolDeployment.address);
  await storagePool.setAddresses(
    borrowerOperationsDeployment.address,
    troveManagerDeployment.address,
    redemptionOperationsDeployment.address,
    liquidationOperationsDeployment.address,
    stabilityPoolManagerDeployment.address,
    priceFeedDeployment.address
  );

  const debtTokenManager = await ethers.getContractAt('DebtTokenManager', debtTokenManagerDeployment.address);
  await debtTokenManager.setAddresses(stabilityPoolManagerDeployment.address);

  const collTokenManager = await ethers.getContractAt('CollTokenManager', collTokenManagerDeployment.address);
  await collTokenManager.setAddresses(priceFeedDeployment.address);

  const stabilityPoolManager = await ethers.getContractAt(
    'StabilityPoolManager',
    stabilityPoolManagerDeployment.address
  );
  await stabilityPoolManager.setAddresses(
    liquidationOperationsDeployment.address,
    priceFeedDeployment.address,
    storagePoolDeployment.address,
    reservePoolDeployment.address,
    debtTokenManagerDeployment.address
  );

  const swapOperations = await ethers.getContractAt('SwapOperations', swapOperationsDeployment.address);
  await swapOperations.setAddresses(
    borrowerOperationsDeployment.address,
    troveManagerDeployment.address,
    priceFeedDeployment.address,
    debtTokenManagerDeployment.address
  );

  // Link contracts
  const BTCDeployment = await deploy('ERC20', {
    from: deployer,
    args: ['Bitcoin', 'BTC', 9],
    log: true,
  });
  const USDTDeployment = await deploy('ERC20', {
    from: deployer,
    args: ['USDT', 'USDT', 18],
    log: true,
  });
  await collTokenManager.addCollToken(BTCDeployment.address);
  await collTokenManager.addCollToken(USDTDeployment.address);

  const priceFeed = await ethers.getContractAt('PriceFeed', priceFeedDeployment.address);

  const STABLE = await deploy('DebtToken', {
    from: deployer,
    args: [
      troveManagerDeployment.address,
      redemptionOperationsDeployment.address,
      borrowerOperationsDeployment.address,
      stabilityPoolManagerDeployment.address,
      priceFeedDeployment.address,
      'STABLE',
      'STABLE',
      '1',
      true,
    ],
    log: true,
  });
  await debtTokenManager.addDebtToken(STABLE.address);

  const STOCK = await deploy('DebtToken', {
    from: deployer,
    args: [
      troveManagerDeployment.address,
      redemptionOperationsDeployment.address,
      borrowerOperationsDeployment.address,
      stabilityPoolManagerDeployment.address,
      priceFeedDeployment.address,
      'STOCK',
      'STOCK',
      '1',
      false,
    ],
    log: true,
  });
  await debtTokenManager.addDebtToken(STOCK.address);

  const reservePool = await ethers.getContractAt('ReservePool', reservePoolDeployment.address);
  await reservePool.setAddresses(
    stabilityPoolManagerDeployment.address,
    priceFeedDeployment.address,
    STABLE.address,
    STABLE.address, // TODO: change to gov token
    parseUnits('1000000'),
    parseUnits('1000000')
  );
};

deployProtocol.tags = ['DeployProtocolLocal', 'Local'];
export default deployProtocol;
