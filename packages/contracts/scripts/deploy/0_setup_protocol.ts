import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers, getNamedAccounts } from 'hardhat';
import { MaxUint256, parseUnits } from 'ethers';
import { getLatestBlockTimestamp } from '../../utils/testHelper';

const deployProtocol: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy,  get} = hre.deployments;
  const { deployer } = await getNamedAccounts();

  // Deploy Core
  const borrowerOperationsDeployment = await deploy('MockBorrowerOperations', {
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

  const troveManagerDeployment = await deploy('MockTroveManager', {
    from: deployer,
    args: [],
    log: true,
  });

  const stabilityPoolManagerDeployment = await deploy('MockStabilityPoolManager', {
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

  const priceFeedDeployment = await deploy('MockPriceFeed', {
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
  const troveManager = await ethers.getContractAt('MockTroveManager', troveManagerDeployment.address);
  await troveManager.setAddresses(
    borrowerOperationsDeployment.address,
    redemptionOperationsDeployment.address,
    liquidationOperationsDeployment.address,
    storagePoolDeployment.address,
    priceFeedDeployment.address,
  );

  const borrowerOperations = await ethers.getContractAt('MockBorrowerOperations', borrowerOperationsDeployment.address);
  await borrowerOperations.setAddresses(
    troveManagerDeployment.address,
    storagePoolDeployment.address,
    stabilityPoolManagerDeployment.address,
    reservePoolDeployment.address,
    priceFeedDeployment.address,
    debtTokenManagerDeployment.address,
    collTokenManagerDeployment.address,
    swapOperationsDeployment.address,
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
    collTokenManagerDeployment.address,
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
    'MockStabilityPoolManager',
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
  const BTCDeployment = await deploy('MockERC20', {
    from: deployer,
    args: ['Bitcoin', 'BTC', 18],
    log: true,
  });
  const USDTDeployment = await deploy('MockERC20', {
    from: deployer,
    args: ['USDT', 'USDT', 18],
    log: true,
  });
  const DFIDeployment = await deploy('MockERC20', {
    from: deployer,
    args: ['DFI', 'DFI', 18],
    log: true,
  });
  await collTokenManager.addCollToken(BTCDeployment.address);
  await collTokenManager.addCollToken(USDTDeployment.address);
  await collTokenManager.addCollToken(DFIDeployment.address);

  const priceFeed = await ethers.getContractAt('MockPriceFeed', priceFeedDeployment.address);
  await priceFeed.setTokenPrice(BTCDeployment.address, parseUnits('21000'));
  await priceFeed.setTokenPrice(USDTDeployment.address, parseUnits('1'));
  await priceFeed.setTokenPrice(DFIDeployment.address, parseUnits('0.1'));

  const STABLEDeployment = await deploy('MockDebtToken', {
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
  await debtTokenManager.addDebtToken(STABLEDeployment.address);
  await priceFeed.setTokenPrice(STABLEDeployment.address, parseUnits('1'));

  const STOCKDeployment = await deploy('MockDebtToken', {
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
  await debtTokenManager.addDebtToken(STOCKDeployment.address);
  await priceFeed.setTokenPrice(STOCKDeployment.address, parseUnits('150'));

  const reservePool = await ethers.getContractAt('ReservePool', reservePoolDeployment.address);
  await reservePool.setAddresses(
    stabilityPoolManagerDeployment.address,
    priceFeedDeployment.address,
    STABLEDeployment.address,
    STABLEDeployment.address, // TODO: change to gov token
    parseUnits('1000000'),
    parseUnits('1000000')
  );


  // SWAPS
  const swapOpsDeployment = await get('SwapOperations');
  const swapOps = await ethers.getContractAt('SwapOperations', swapOpsDeployment.address);

  const BTC = await ethers.getContractAt('MockERC20', BTCDeployment.address);
  await BTC.unprotectedMint(deployer, parseUnits('1000'));

  const USDT = await ethers.getContractAt('MockERC20', USDTDeployment.address);
  await USDT.unprotectedMint(deployer, parseUnits('1000'));

  const DFI = await ethers.getContractAt('MockERC20', DFIDeployment.address);
  await DFI.unprotectedMint(deployer, parseUnits('1000'));

  const STABLE = await ethers.getContractAt('MockDebtToken', STABLEDeployment.address);
  await STABLE.unprotectedMint(deployer, parseUnits('10000'));

  await swapOps.createPair(BTCDeployment.address, STABLEDeployment.address, { from: deployer });
  await swapOps.createPair(USDTDeployment.address, STABLEDeployment.address, { from: deployer });
  await swapOps.createPair(DFIDeployment.address, STABLEDeployment.address, { from: deployer });

  const pair1 = await swapOps.getPair(BTC.target, STABLE.target);
  const pair2 = await swapOps.getPair(USDT.target, STABLE.target);
  const pair3 = await swapOps.getPair(DFI.target, STABLE.target);
  console.log('BTC/STOCK Pair:', pair1);
  console.log('USDT/STOCK Pair:', pair2);
  console.log('DFI/STOCK Pair:', pair3);

  await BTC.approve(swapOps.target, MaxUint256);
  await USDT.approve(swapOps.target, MaxUint256);
  await DFI.approve(swapOps.target, MaxUint256);
  await STABLE.approve(swapOps.target, MaxUint256);

  const deadline = (await getLatestBlockTimestamp()) + 100;
  await swapOps.addLiquidity(BTC.target, STABLE.target, parseUnits('500'), parseUnits('500'), 0, 0, 0, deadline);
  await swapOps.addLiquidity(USDT.target, STABLE.target, parseUnits('500'), parseUnits('500'), 0, 0, 0, deadline);
  await swapOps.addLiquidity(DFI.target, STABLE.target, parseUnits('500'), parseUnits('500'), 0, 0, 0, deadline);

  // Init StoragePool
  await BTC.unprotectedMint(troveManager, parseUnits('100000'));
  await USDT.unprotectedMint(troveManager, parseUnits('100000'));
  await DFI.unprotectedMint(troveManager, parseUnits('100000'));

  await borrowerOperations.testStoragePool_addValue(BTC.target, true, 0, parseUnits('10000'))
  await borrowerOperations.testStoragePool_addValue(USDT.target, true, 0, parseUnits('10000'))
  await borrowerOperations.testStoragePool_addValue(DFI.target, true, 0, parseUnits('10000'))

  await borrowerOperations.testStoragePool_addValue(BTC.target, true, 1, parseUnits('10000'))
  await borrowerOperations.testStoragePool_addValue(USDT.target, true, 1, parseUnits('10000'))
  await borrowerOperations.testStoragePool_addValue(DFI.target, true, 1, parseUnits('10000'))

  // DEMO ACCOUNT
  const demoAcc = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  await BTC.unprotectedMint(demoAcc, parseUnits('1000'));
  await USDT.unprotectedMint(demoAcc, parseUnits('1000'));

  // TODO: This is weird, why does the demo account have DFI? And why so weird amounts?
  console.log(await BTC.balanceOf(demoAcc))
  console.log(await USDT.balanceOf(demoAcc))
  console.log(await DFI.balanceOf(demoAcc))

  const anotherUser = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  await BTC.unprotectedMint(anotherUser, parseUnits('10000'));
  await USDT.unprotectedMint(anotherUser, parseUnits('10000'));
  await DFI.unprotectedMint(anotherUser, parseUnits('10000'));

  await borrowerOperations.mock_increaseTroveColl(anotherUser, [{ amount: parseUnits('1000'), tokenAddress: BTC.target  }, 
  { amount: parseUnits('1000'), tokenAddress: USDT.target  }, 
  { amount: parseUnits('1000'), tokenAddress: DFI.target  }])
};

deployProtocol.tags = ['DeployProtocol'];
export default deployProtocol;
