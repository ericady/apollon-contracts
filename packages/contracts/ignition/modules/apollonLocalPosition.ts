import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import { ZeroAddress, parseUnits } from 'ethers';
import apollonLocalPools from './apollonLocalPools';

export default buildModule('ApollonLocalPosition', m => {
  const contracts = m.useModule(apollonLocalPools);
  const { BTC, STOCK, borrowerOperations, swapOperations, mockTellor } = contracts;

  const deadline = m.getParameter('deadline');
  const deployer = m.getAccount(0);

  // Mint collateral tokens
  const mintFuture = m.call(BTC, 'unprotectedMint', [deployer, parseUnits('10000', 9)]);
  const approveFuture = m.call(BTC, 'approve', [borrowerOperations, parseUnits('10000', 9)], {
    from: deployer,
  });

  // Open position
  const openTrove = m.call(borrowerOperations, 'openTrove', [[{ tokenAddress: BTC, amount: parseUnits('1', 9) }]], {
    from: deployer,
    after: [mintFuture, approveFuture],
  });

  m.call(
    swapOperations,
    'openLongPosition',
    [
      parseUnits('1'),
      0,
      STOCK,
      deployer,
      {
        upperHint: ZeroAddress,
        lowerHint: ZeroAddress,
        maxFeePercentage: parseUnits('0.05'),
      },
      deadline,
    ],
    { after: [openTrove] }
  );

  m.call(mockTellor, 'setPrice', [1, parseUnits('2000', 6)], {
    id: 'btcPriceSet',
    from: deployer,
  });

  return contracts;
});
