import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import apollonTesting from './apollonTesting';
import { MaxUint256, parseUnits, ZeroAddress } from 'ethers';

export default buildModule('ApollonLocal', m => {
  const deadline = m.getParameter('deadline');
  const initialMintUser = m.getParameter('initialMint');

  const { BTC, STABLE, STOCK, GOV, USDT, swapOperations } = m.useModule(apollonTesting);

  // setup swap pools
  const stableMint = m.call(STABLE, 'unprotectedMint', [m.getAccount(0), parseUnits('40000')], {
    id: 'mintStable',
  });
  const stockMint = m.call(STOCK, 'unprotectedMint', [m.getAccount(0), parseUnits('65')], {
    id: 'mintStock',
  });
  const btcMint = m.call(BTC, 'unprotectedMint', [m.getAccount(0), parseUnits('1', 9)], { id: 'mintBTC' });
  const usdtMint = m.call(USDT, 'unprotectedMint', [m.getAccount(0), parseUnits('10000')], {
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
  m.call(
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

  return {};
});
