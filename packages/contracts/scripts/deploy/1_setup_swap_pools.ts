import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers, getNamedAccounts } from 'hardhat';
import { MaxUint256, parseUnits } from 'ethers';
import { getLatestBlockTimestamp } from '../../utils/testHelper';

const deploySwapPools: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {
    deployments: { get, deploy },
  } = hre;

  const { deployer } = await getNamedAccounts();

  const swapOpsDeployment = await get('SwapOperations');
  const swapOps = await ethers.getContractAt('SwapOperations', swapOpsDeployment.address);

  const BtcDeployment = await deploy('MockERC20', {
    from: deployer,
    args: ['Bitcoin', 'BTC', 9],
    log: true,
  });
  const UsdtDeployment = await deploy('MockERC20', {
    from: deployer,
    args: ['USDT', 'USDT', 18],
    log: true,
  });

  const BTC = await ethers.getContractAt('MockERC20', BtcDeployment.address);
  await BTC.unprotectedMint(deployer, parseUnits('1000', 9));

  const USDT = await ethers.getContractAt('MockERC20', UsdtDeployment.address);
  await USDT.unprotectedMint(deployer, parseUnits('1000'));

  console.log(deployer, await swapOps.owner(), swapOpsDeployment.address);
  await swapOps.createPair(BtcDeployment.address, UsdtDeployment.address, { from: deployer });

  const pair = await swapOps.getPair(BTC.target, USDT.target);
  console.log('BTC/USDT Pair:', pair);

  await BTC.approve(swapOps.target, MaxUint256);
  await USDT.approve(swapOps.target, MaxUint256);

  const deadline = (await getLatestBlockTimestamp()) + 100;
  await swapOps.addLiquidity(BTC.target, USDT.target, parseUnits('500', 9), parseUnits('500'), 0, 0, 0, deadline);
};

deploySwapPools.tags = ['DeploySwapPools'];
export default deploySwapPools;
