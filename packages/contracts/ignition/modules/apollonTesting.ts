import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import { MaxUint256, parseUnits, ZeroAddress } from 'ethers';

export default buildModule('ApollonTesting', m => {
  const deadline = m.getParameter('deadline');
  const oracleUpdateTime = m.getParameter('oracleUpdateTime');

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

  // const reservePoolLinks = [contracts.tokenManager, contracts.stabilityPoolManager, contracts.priceFeed];
  // m.call(
  //   contracts.reservePool,
  //   'setAddresses',
  //   [
  //     ...reservePoolLinks,
  //     parseUnits('0.2'), // 20 %
  //     parseUnits('1000'),
  //   ],
  //   {
  //     after: [...reservePoolLinks, stableKnown, govKnown],
  //   }
  // );


  // setup mock tellor for testing
  const mockTellor = m.contract('MockTellor', []);
  m.call(mockTellor, 'setUpdateTime', [oracleUpdateTime]);
  const tellorCaller = m.contract('TellorCaller', [mockTellor], {
    after: [mockTellor],
  });

  // setting prices, two per token, important to become trusted
  m.call(mockTellor, 'setPrice', [1, parseUnits('21000', 6)], {
    id: 'btcPriceSet',
    after: [mockTellor],
  }); // BTC
  m.call(mockTellor, 'setPrice', [2, parseUnits('1', 6)], {
    id: 'usdtPriceSet',
    after: [mockTellor],
  }); // USDT
  m.call(mockTellor, 'setPrice', [3, parseUnits('1', 6)], {
    id: 'stablePriceSet',
    after: [mockTellor],
  }); // STABLE
  m.call(mockTellor, 'setPrice', [4, parseUnits('150', 6)], {
    id: 'stockPriceSet',
    after: [mockTellor],
  }); // STOCK
  m.call(mockTellor, 'setPrice', [5, parseUnits('5', 6)], {
    id: 'govPriceSet',
    after: [mockTellor],
  }); // GOV

  // price feed setup / linking
  const priceFeedLinks = [tellorCaller, contracts.tokenManager];
  m.call(contracts.priceFeed, 'setAddresses', priceFeedLinks, { after: priceFeedLinks });

  // testing setup
  const BTC = m.contract('MockERC20', ['Bitcoin', 'BTC', 9n], { id: 'mockBTC' });
  const USDT = m.contract('MockERC20', ['USDT', 'USDT', 18n], { id: 'mockUSDT' });
  const STABLE = m.contract(
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
  const STOCK = m.contract(
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
  const GOV = m.contract('MockERC20', ['GovToken', 'GOV', 18n], { id: 'mockGOV' });

  m.call(contracts.tokenManager, 'addCollToken', [BTC, 1, false], {
    id: 'addBtc',
    after: [BTC, tokenLink],
  });
  m.call(contracts.tokenManager, 'addCollToken', [USDT, 2, false], {
    id: 'addUsdt',
    after: [USDT, tokenLink],
  });
  const stableKnown = m.call(contracts.tokenManager, 'addDebtToken', [STABLE, 3], {
    id: 'addStable',
    after: [STABLE, tokenLink],
  });
  m.call(contracts.tokenManager, 'addDebtToken', [STOCK, 4], {
    id: 'addStock',
    after: [STOCK, tokenLink],
  });
  const govKnown =  m.call(contracts.tokenManager, 'addCollToken', [GOV, 5, true], {
    id: 'addGov',
    after: [GOV, tokenLink],
  });

  return {
    ...contracts,
    mockTellor,
    BTC,
    USDT,
    STABLE,
    STOCK,
    GOV,
  };
});
