// @ts-ignore
import { ethers } from 'hardhat';

// yarn hardhat node --hostname 0.0.0.0
// yarn hardhat run --network localhost scripts/999_client-test-deployment.ts

async function main() {
  const StoragePool = await ethers.deployContract('StoragePool');
  const TroveManager = await ethers.deployContract('TroveManager');
  const BorrowerOperations = await ethers.deployContract('BorrowerOperations');
  const PriceFeed = await ethers.deployContract('PriceFeed');
  const StabilityPoolManager = await ethers.deployContract('StabilityPoolManager');
  const DebtTokenManager = await ethers.deployContract('DebtTokenManager');
  const RedemptionOperations = await ethers.deployContract('RedemptionOperations');

  await StoragePool.waitForDeployment();
  await TroveManager.waitForDeployment();
  await BorrowerOperations.waitForDeployment();
  await PriceFeed.waitForDeployment();
  await StabilityPoolManager.waitForDeployment();
  await DebtTokenManager.waitForDeployment();
  await RedemptionOperations.waitForDeployment();

  const DebtTokenFactory = await ethers.getContractFactory('DebtToken');

  const DebtToken = await DebtTokenFactory.deploy(
    TroveManager.target,
    RedemptionOperations.target,
    BorrowerOperations.target,
    StabilityPoolManager.target,
    PriceFeed.target,
    'JUSD',
    'Jelly',
    '1',
    true
  );
  await DebtToken.waitForDeployment();

  console.log(`Deployed all contracts`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
