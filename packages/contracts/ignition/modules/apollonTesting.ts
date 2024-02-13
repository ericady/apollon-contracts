import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import { parseUnits } from 'ethers';

export default buildModule('ApollonTesting', m => {
  const deadline = m.getParameter('deadline');

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
    tokenManager: m.contract('TokenManager', []),
    priceFeed: m.contract('PriceFeed', []),
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

  const hintHelpersLinks = [contracts.sortedTroves, contracts.troveManager, contracts.redemptionOperations];
  m.call(contracts.hintHelpers, 'setAddresses', hintHelpersLinks, { after: hintHelpersLinks });

  const borrowerOperationsLinks = [
    contracts.troveManager,
    contracts.storagePool,
    contracts.stabilityPoolManager,
    contracts.reservePool,
    contracts.priceFeed,
    contracts.tokenManager,
    contracts.swapOperations,
    contracts.sortedTroves,
    contracts.collSurplusPool,
  ];
  m.call(contracts.borrowerOperations, 'setAddresses', borrowerOperationsLinks, { after: borrowerOperationsLinks });

  const redemptionOperationsLinks = [
    contracts.troveManager,
    contracts.storagePool,
    contracts.priceFeed,
    contracts.tokenManager,
    contracts.sortedTroves,
  ];
  m.call(contracts.redemptionOperations, 'setAddresses', redemptionOperationsLinks, {
    after: redemptionOperationsLinks,
  });

  const liquidationOperationsLinks = [
    contracts.troveManager,
    contracts.storagePool,
    contracts.priceFeed,
    contracts.tokenManager,
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

  const tokenManagerLinks = [contracts.stabilityPoolManager, contracts.priceFeed];
  const tokenLink = m.call(contracts.tokenManager, 'setAddresses', tokenManagerLinks, {
    after: tokenManagerLinks,
  });

  const stabilityPoolManagerLinks = [
    contracts.liquidationOperations,
    contracts.priceFeed,
    contracts.storagePool,
    contracts.reservePool,
    contracts.tokenManager,
  ];
  m.call(contracts.stabilityPoolManager, 'setAddresses', stabilityPoolManagerLinks, {
    after: stabilityPoolManagerLinks,
  });

  const swapOperationsLinks = [
    contracts.borrowerOperations,
    contracts.troveManager,
    contracts.priceFeed,
    contracts.tokenManager,
  ];
  m.call(contracts.swapOperations, 'setAddresses', swapOperationsLinks, { after: swapOperationsLinks });

  const collSurplusPoolLinks = [contracts.liquidationOperations, contracts.borrowerOperations];
  m.call(contracts.collSurplusPool, 'setAddresses', collSurplusPoolLinks, { after: collSurplusPoolLinks });

  const reservePoolLinks = [contracts.tokenManager, contracts.stabilityPoolManager, contracts.priceFeed];
  m.call(
    contracts.reservePool,
    'setAddresses',
    [
      ...reservePoolLinks,
      parseUnits('0.2'), // 20 %
      parseUnits('1000'),
    ],
    {
      after: reservePoolLinks,
    }
  );

  // setup mock tellor for testing
  contracts.mockTellor = m.contract('MockTellor', []);
  m.call(contracts.mockTellor, 'setUpdateTime', [deadline]);
  contracts.tellorCaller = m.contract('TellorCaller', [contracts.mockTellor], {
    after: [contracts.mockTellor],
  });

  // setting prices, two per token, important to become trusted
  m.call(contracts.mockTellor, 'setPrice', [1, parseUnits('21000', 6)], {
    id: 'btcPriceSet',
    after: [contracts.mockTellor],
  }); // BTC
  m.call(contracts.mockTellor, 'setPrice', [2, parseUnits('1', 6)], {
    id: 'usdtPriceSet',
    after: [contracts.mockTellor],
  }); // USDT
  m.call(contracts.mockTellor, 'setPrice', [3, parseUnits('1', 6)], {
    id: 'stablePriceSet',
    after: [contracts.mockTellor],
  }); // STABLE
  m.call(contracts.mockTellor, 'setPrice', [4, parseUnits('150', 6)], {
    id: 'stockPriceSet',
    after: [contracts.mockTellor],
  }); // STOCK
  m.call(contracts.mockTellor, 'setPrice', [5, parseUnits('5', 6)], {
    id: 'govPriceSet',
    after: [contracts.mockTellor],
  }); // GOV

  // price feed setup / linking
  const priceFeedLinks = [contracts.tellorCaller, contracts.tokenManager];
  m.call(contracts.priceFeed, 'setAddresses', priceFeedLinks, { after: priceFeedLinks });

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
      contracts.tokenManager,
      contracts.swapOperations,
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
      contracts.tokenManager,
      contracts.swapOperations,
      'STOCK',
      'STOCK',
      '1',
      false,
    ],
    { id: 'mockSTOCK' }
  );
  contracts.GOV = m.contract('MockERC20', ['GovToken', 'GOV', 18n], { id: 'mockGOV' });

  m.call(contracts.tokenManager, 'addCollToken', [contracts.BTC, 1, false], {
    id: 'addBtc',
    after: [contracts.BTC, tokenLink],
  });
  m.call(contracts.tokenManager, 'addCollToken', [contracts.USDT, 2, false], {
    id: 'addUsdt',
    after: [contracts.USDT, tokenLink],
  });
  m.call(contracts.tokenManager, 'addDebtToken', [contracts.STABLE, 3], {
    id: 'addStable',
    after: [contracts.STABLE, tokenLink],
  });
  m.call(contracts.tokenManager, 'addDebtToken', [contracts.STOCK, 4], {
    id: 'addStock',
    after: [contracts.STOCK, tokenLink],
  });
  m.call(contracts.tokenManager, 'addCollToken', [contracts.GOV, 5, true], {
    id: 'addGov',
    after: [contracts.GOV, tokenLink],
  });

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
