import apollonLocal from './modules/apollonLocal';
import hre, { ethers } from 'hardhat';

(async () => {
  const blockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp ?? 0;
  const deadline = blockTimestamp + 60 * 5;
  await hre.ignition.deploy(apollonLocal, {
    parameters: {
      ApollonTesting: {
        deadline,
      },
      ApollonLocal: {
        deadline,
        initialMint: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // alice
      },
    },
  });
  console.log('ApollonTesting deployed!');
})();
