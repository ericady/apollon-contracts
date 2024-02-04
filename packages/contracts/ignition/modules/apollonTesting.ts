import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import { parseUnits } from 'ethers';

export default buildModule('ApollonTesting', m => {
  // initial contract deployments
  const contracts = {
    borrowerOperations: m.contract('MockBorrowerOperations', []),
    redemptionOperations: m.contract('RedemptionOperations', []),
    liquidationOperations: m.contract('LiquidationOperations', []),
    troveManager: m.contract('MockTroveManager', []),
    sortedTroves: m.contract('SortedTroves', []),
    hintHelpers: m.contract('HintHelpers', []),
    stabilityPoolManager: m.contract('MockStabilityPoolManager', []),
    storagePool: m.contract('StoragePool', []),
    collSurplusPool: m.contract('CollSurplusPool', []),
    reservePool: m.contract('ReservePool', []),
    collTokenManager: m.contract('CollTokenManager', []),
    debtTokenManager: m.contract('DebtTokenManager', []),
    priceFeed: m.contract('MockPriceFeed', []),
    swapOperations: m.contract('SwapOperations', []),
  };

  // contract linking
  const troveLinks = [
    contracts.borrowerOperations,
    contracts.redemptionOperations,
    contracts.liquidationOperations,
    contracts.storagePool,
    contracts.priceFeed,
    contracts.sortedTroves,
  ];
  m.call(contracts.troveManager, 'setAddresses', troveLinks, { after: troveLinks });

  const sortedTrovesLinks = [contracts.troveManager, contracts.borrowerOperations, contracts.redemptionOperations];
  m.call(contracts.sortedTroves, 'setAddresses', sortedTrovesLinks, { after: sortedTrovesLinks });

  const hintHelpersLinks = [contracts.sortedTroves, contracts.troveManager];
  m.call(contracts.hintHelpers, 'setAddresses', hintHelpersLinks, { after: hintHelpersLinks });

  const borrowerOperationsLinks = [
    contracts.troveManager,
    contracts.storagePool,
    contracts.stabilityPoolManager,
    contracts.reservePool,
    contracts.priceFeed,
    contracts.debtTokenManager,
    contracts.collTokenManager,
    contracts.swapOperations,
    contracts.sortedTroves,
    contracts.collSurplusPool,
  ];
  m.call(contracts.borrowerOperations, 'setAddresses', borrowerOperationsLinks, { after: borrowerOperationsLinks });

  const redemptionOperationsLinks = [
    contracts.troveManager,
    contracts.storagePool,
    contracts.priceFeed,
    contracts.debtTokenManager,
    contracts.collTokenManager,
    contracts.sortedTroves,
  ];
  m.call(contracts.redemptionOperations, 'setAddresses', redemptionOperationsLinks, {
    after: redemptionOperationsLinks,
  });

  const liquidationOperationsLinks = [
    contracts.troveManager,
    contracts.storagePool,
    contracts.priceFeed,
    contracts.debtTokenManager,
    contracts.collTokenManager,
    contracts.stabilityPoolManager,
    contracts.collSurplusPool,
  ];
  m.call(contracts.liquidationOperations, 'setAddresses', liquidationOperationsLinks, {
    after: liquidationOperationsLinks,
  });

  const storagePoolLinks = [
    contracts.borrowerOperations,
    contracts.troveManager,
    contracts.redemptionOperations,
    contracts.liquidationOperations,
    contracts.stabilityPoolManager,
    contracts.priceFeed,
  ];
  m.call(contracts.storagePool, 'setAddresses', storagePoolLinks, { after: storagePoolLinks });

  const debtTokenManagerLinks = [contracts.stabilityPoolManager];
  const debtTokenLink = m.call(contracts.debtTokenManager, 'setAddresses', debtTokenManagerLinks, {
    after: debtTokenManagerLinks,
  });

  const collTokenManagerLinks = [contracts.priceFeed];
  const collTokenLink = m.call(contracts.collTokenManager, 'setAddresses', collTokenManagerLinks, {
    after: collTokenManagerLinks,
  });

  const stabilityPoolManagerLinks = [
    contracts.liquidationOperations,
    contracts.priceFeed,
    contracts.storagePool,
    contracts.reservePool,
    contracts.debtTokenManager,
  ];
  m.call(contracts.stabilityPoolManager, 'setAddresses', stabilityPoolManagerLinks, {
    after: stabilityPoolManagerLinks,
  });

  const swapOperationsLinks = [
    contracts.borrowerOperations,
    contracts.troveManager,
    contracts.priceFeed,
    contracts.debtTokenManager,
  ];
  m.call(contracts.swapOperations, 'setAddresses', swapOperationsLinks, { after: swapOperationsLinks });

  const collSurplusPoolLinks = [contracts.liquidationOperations, contracts.borrowerOperations];
  m.call(contracts.collSurplusPool, 'setAddresses', collSurplusPoolLinks, { after: collSurplusPoolLinks });

  // testing setup
  contracts.BTC = m.contract('MockERC20', ['Bitcoin', 'BTC', 9n], { id: 'mockBTC' });
  contracts.USDT = m.contract('MockERC20', ['USDT', 'USDT', 18n], { id: 'mockUSDT' });
  contracts.STABLE = m.contract(
    'MockDebtToken',
    [
      contracts.troveManager,
      contracts.redemptionOperations,
      contracts.borrowerOperations,
      contracts.stabilityPoolManager,
      contracts.debtTokenManager,
      contracts.priceFeed,
      'STABLE',
      'STABLE',
      '1',
      true,
    ],
    { id: 'mockSTABLE' }
  );
  contracts.STOCK = m.contract(
    'MockDebtToken',
    [
      contracts.troveManager,
      contracts.redemptionOperations,
      contracts.borrowerOperations,
      contracts.stabilityPoolManager,
      contracts.debtTokenManager,
      contracts.priceFeed,
      'STOCK',
      'STOCK',
      '1',
      false,
    ],
    { id: 'mockSTOCK' }
  );

  m.call(contracts.debtTokenManager, 'addDebtToken', [contracts.STABLE], {
    id: 'addStable',
    after: [contracts.STABLE, debtTokenLink],
  });
  m.call(contracts.debtTokenManager, 'addDebtToken', [contracts.STOCK], {
    id: 'addStock',
    after: [contracts.STOCK, debtTokenLink],
  });
  m.call(contracts.collTokenManager, 'addCollToken', [contracts.BTC], {
    id: 'addBtc',
    after: [contracts.BTC, collTokenLink],
  });
  m.call(contracts.collTokenManager, 'addCollToken', [contracts.USDT], {
    id: 'addUsdt',
    after: [contracts.USDT, collTokenLink],
  });

  m.call(contracts.priceFeed, 'setTokenPrice', [contracts.BTC, parseUnits('21000')], {
    id: 'setBtcPrice',
    after: [contracts.BTC],
  });
  m.call(contracts.priceFeed, 'setTokenPrice', [contracts.USDT, parseUnits('1')], {
    id: 'setUsdtPrice',
    after: [contracts.USDT],
  });
  m.call(contracts.priceFeed, 'setTokenPrice', [contracts.STABLE, parseUnits('1')], {
    id: 'setStablePrice',
    after: [contracts.STABLE],
  });
  m.call(contracts.priceFeed, 'setTokenPrice', [contracts.STOCK, parseUnits('150')], {
    id: 'setStockPrice',
    after: [contracts.STOCK],
  });

  // reserve pool contract linking
  m.call(
    contracts.reservePool,
    'setAddresses',
    [
      contracts.stabilityPoolManager,
      contracts.priceFeed,
      contracts.STABLE,
      contracts.STABLE, // todo change to gov token
      1000000, // todo real values
      1000000,
    ],
    { after: [contracts.stabilityPoolManager, contracts.priceFeed, contracts.STABLE] }
  );

  // todo
  // // setup swap pools
  // const stableMint = m.call(contracts.STABLE, 'unprotectedMint', [m.getAccount(0), 100000], { id: 'mintStable' });
  // const stockMint = m.call(contracts.STOCK, 'unprotectedMint', [m.getAccount(0), 100000], { id: 'mintStock' });
  // const btcMint = m.call(contracts.BTC, 'unprotectedMint', [m.getAccount(0), 10], { id: 'mintBTC' });
  // const usdtMint = m.call(contracts.USDT, 'unprotectedMint', [m.getAccount(0), 100000], { id: 'mintUSDT' });
  //
  // const stableApprove = m.call(contracts.STABLE, 'approve', [contracts.swapOperations, MaxUint256], {
  //   id: 'approveStable',
  //   after: [stableMint],
  // });
  // const stockApprove = m.call(contracts.STOCK, 'approve', [contracts.swapOperations, MaxUint256], {
  //   id: 'approveStock',
  //   after: [stockMint],
  // });
  // const btcApprove = m.call(contracts.BTC, 'approve', [contracts.swapOperations, MaxUint256], {
  //   id: 'approveBTC',
  //   after: [btcMint],
  // });
  // const usdtApprove = m.call(contracts.USDT, 'approve', [contracts.swapOperations, MaxUint256], {
  //   id: 'approveUSDT',
  //   after: [usdtMint],
  // });
  //
  // // STABLE - BTC
  // const stableBTCPair = m.call(contracts.swapOperations, 'createPair', [contracts.BTC, contracts.STABLE], {
  //   id: 'createPairBTCSTABLE',
  // });
  // m.call(
  //   contracts.swapOperations,
  //   'addLiquidity',
  //   [
  //     contracts.BTC,
  //     contracts.STABLE,
  //     1,
  //     10000,
  //     0,
  //     0,
  //     { upperHint: ZeroAddress, lowerHint: ZeroAddress, maxFeePercentage: 0 },
  //     99999999999, // todo dynamic deadline (await getLatestBlockTimestamp()) + 100;
  //   ],
  //   { id: 'addLiquidityBTCSTABLE', after: [stableBTCPair, btcApprove, stableApprove] }
  // );

  return contracts;
});
