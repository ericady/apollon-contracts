import { ethers } from 'hardhat';
import deployTestBase from './deployTestBase';
import { MaxUint256, parseUnits, ZeroAddress } from 'ethers';

(async () => {
  const contracts = await deployTestBase();
  const STABLE = contracts.STABLE;

  const blockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp ?? 0;
  const deadline = blockTimestamp + 60 * 5;
  const deployer = (await ethers.getSigners())[0];

  // seed some pools
  await Promise.all(
    [
      [contracts.BTC, parseUnits('1', 9), parseUnits('20000')],
      [contracts.USDT, parseUnits('10000'), parseUnits('10000')],
      [contracts.GOV, parseUnits('2000'), parseUnits('10000')],
      [contracts.STOCK, parseUnits('65'), parseUnits('10000')],
    ].map(async ([token, tokenAmount, stableAmount]) => {
      await token.unprotectedMint(deployer, tokenAmount);
      await STABLE.unprotectedMint(deployer, stableAmount);

      await token.approve(contracts.swapOperations.target, MaxUint256);
      await STABLE.approve(contracts.swapOperations.target, MaxUint256);

      await contracts.swapOperations.createPair(token, STABLE);
      await contracts.swapOperations.addLiquidity(
        token,
        STABLE,
        tokenAmount,
        stableAmount,
        0,
        0,
        { upperHint: ZeroAddress, lowerHint: ZeroAddress, maxFeePercentage: 0 },
        deadline
      );
    })
  );

  // mint test user assets
  await Promise.all(
    [
      [contracts.BTC, parseUnits('1', 9)],
      [contracts.USDT, parseUnits('20000')],
      [contracts.GOV, parseUnits('15000')],
      [contracts.STABLE, parseUnits('65')],
      [contracts.STOCK, parseUnits('999999')],
    ].map(([token, amount]) => token.unprotectedMint(deployer, amount))
  );
})();
