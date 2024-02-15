import apollonLocalSwap from './modules/apollonLocalSwap';
import apollonLocalPosition from './modules/apollonLocalPosition';
import hre, { ethers } from 'hardhat';

(async () => {
  const blockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp ?? 0;
  const deadline = blockTimestamp + 60 * 5;
  // await hre.ignition.deploy(apollonLocalSwap, {
  //   parameters: {
  //     ApollonTesting: {
  //       deadline,
  //     },
  //     ApollonLocalSwap: {
  //       deadline,
  //       initialMint: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // alice
  //     },
  //   },
  // });

  await hre.ignition.deploy(apollonLocalPosition, {
    parameters: {
      ApollonTesting: {
        deadline,
        oracleUpdateTime: blockTimestamp,
      },
      ApollonLocalPosition: {
        deadline,
      },
    },
  });

  console.log('ApollonTesting deployed!');
})();
