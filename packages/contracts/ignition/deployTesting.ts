import apollonTesting from './modules/apollonTesting';
import hre, { ethers } from 'hardhat';

(async () => {
  const blockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp ?? 0;
  const deadline = blockTimestamp + 60 * 5;

  console.log('Deploying ApollonTesting with deadline', deadline);
  await hre.ignition.deploy(apollonTesting, {
    parameters: {
      ApollonTesting: { deadline },
    },
    config: {},
  });
  console.log('ApollonTesting deployed!');
})();
