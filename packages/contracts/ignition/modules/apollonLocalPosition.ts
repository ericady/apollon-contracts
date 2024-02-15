import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import { Contract, MaxUint256, ZeroAddress, parseUnits } from 'ethers';
import apollonTesting from './apollonTesting';
import apollonLocalSwap from './apollonLocalSwap';

export default buildModule('ApollonLocalPosition', m => {
  const deadline = m.getParameter('deadline');
  const { BTC, STOCK, STABLE, GOV, USDT, borrowerOperations, mockTellor, swapOperations } = m.useModule(apollonTesting);
  const deployer = m.getAccount(0);
  const initialMintUser = m.getAccount(0);

  // setup swap pools
  const stableMint = m.call(STABLE, 'unprotectedMint', [deployer, parseUnits('40000')], {
    id: 'mintStable',
  });
  const stockMint = m.call(STOCK, 'unprotectedMint', [deployer, parseUnits('65')], {
    id: 'mintStock',
  });
  const btcMint = m.call(BTC, 'unprotectedMint', [deployer, parseUnits('1', 9)], { id: 'mintBTC' });
  const usdtMint = m.call(USDT, 'unprotectedMint', [deployer, parseUnits('10000')], {
    id: 'mintUSDT',
  });

  const stableApprove = m.call(STABLE, 'approve', [swapOperations, MaxUint256], {
    id: 'approveStable',
    after: [stableMint],
  });
  const stockApprove = m.call(STOCK, 'approve', [swapOperations, MaxUint256], {
    id: 'approveStock',
    after: [stockMint],
  });
  const btcApprove = m.call(BTC, 'approve', [swapOperations, MaxUint256], {
    id: 'approveBTC',
    after: [btcMint],
  });
  const usdtApprove = m.call(USDT, 'approve', [swapOperations, MaxUint256], {
    id: 'approveUSDT',
    after: [usdtMint],
  });

  // STABLE - BTC
  const stableBTCPair = m.call(swapOperations, 'createPair', [BTC, STABLE], {
    id: 'createPairBTC',
  });
  m.call(
    swapOperations,
    'addLiquidity',
    [
      BTC,
      STABLE,
      parseUnits('1', 9),
      parseUnits('20000'),
      0,
      0,
      { upperHint: ZeroAddress, lowerHint: ZeroAddress, maxFeePercentage: 0 },
      deadline,
    ],
    { id: 'addLiquidityBTC', after: [stableBTCPair, btcApprove, stableApprove] }
  );

  // STABLE - USDT
  const stableUSDTPair = m.call(swapOperations, 'createPair', [USDT, STABLE], {
    id: 'createPairUSDT',
  });
  m.call(
    swapOperations,
    'addLiquidity',
    [
      USDT,
      STABLE,
      parseUnits('10000'),
      parseUnits('10000'),
      0,
      0,
      { upperHint: ZeroAddress, lowerHint: ZeroAddress, maxFeePercentage: 0 },
      deadline,
    ],
    { id: 'addLiquidityUSDT', after: [stableUSDTPair, usdtApprove, stableApprove] }
  );

  // STABLE - STOCK
  const stableStockPair = m.call(swapOperations, 'createPair', [STOCK, STABLE], {
    id: 'createPairSTOCK',
  });
  const addLiquidity = m.call(
    swapOperations,
    'addLiquidity',
    [
      STOCK,
      STABLE,
      parseUnits('65'),
      parseUnits('10000'),
      0,
      0,
      { upperHint: ZeroAddress, lowerHint: ZeroAddress, maxFeePercentage: 0 },
      deadline,
    ],
    { id: 'addLiquiditySTOCK', after: [stableStockPair, stockApprove, stableApprove] }
  );

  // mint test user assets
  m.call(BTC, 'unprotectedMint', [initialMintUser, parseUnits('1', 9)], { id: 'mintBTCUser' });
  m.call(USDT, 'unprotectedMint', [initialMintUser, parseUnits('20000')], { id: 'mintUSDTUser' });
  m.call(STABLE, 'unprotectedMint', [initialMintUser, parseUnits('15000')], { id: 'mintStableUser' });
  m.call(STOCK, 'unprotectedMint', [initialMintUser, parseUnits('65')], { id: 'mintStockUser' });
  m.call(GOV, 'unprotectedMint', [initialMintUser, parseUnits('999999')], { id: 'mintGovUser' });

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
    {
      after: [addLiquidity, openTrove],
    }
  );

  m.call(mockTellor, 'setPrice', [1, parseUnits('2000', 6)], {
    id: 'btcPriceSet',
    from: deployer,
  });
  return {};
});
