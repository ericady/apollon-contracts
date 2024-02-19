import apollonLocalPosition from './modules/apollonLocalPosition';
import hre, { ethers } from 'hardhat';

(async () => {
  const blockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp ?? 0;
  const deadline = blockTimestamp + 60 * 5;
  const contracts = await hre.ignition.deploy(apollonLocalPosition, {
    parameters: {
      ApollonTesting: { oracleUpdateTime: blockTimestamp },
      ApollonLocalPools: { deadline },
      ApollonLocalPosition: { deadline },
    },
  });

  for (const [name, { target }] of Object.entries(contracts)) console.log(`${name}: ${target}`);
  console.log('ApollonTesting deployed!');
})();
