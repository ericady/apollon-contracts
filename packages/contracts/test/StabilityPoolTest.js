const deploymentHelper = require('../utils/deploymentHelpers.js');
const { TestHelper: th, MoneyValues: mv, TimeValues: timeValues } = require('../utils/testHelpers.js');
const dec = th.dec;
const toBN = th.toBN;

// const TroveManagerTester = artifacts.require('TroveManagerTester');
const NonPayable = artifacts.require('NonPayable.sol');

const ZERO = toBN('0');
const ZERO_ADDRESS = th.ZERO_ADDRESS;
const maxBytes32 = th.maxBytes32;
const GAS_PRICE = 10000000;

contract('StabilityPool', async accounts => {
  const [owner, defaulter_1, defaulter_2, defaulter_3, whale, alice, bob, carol, dennis, erin, flyn, A, B, C, D, E, F] =
    accounts;
  const [bountyAddress, lpRewardsAddress, multisig] = accounts.slice(997, 1000);

  let STABLE;
  let STOCK;
  let BTC;
  let USDT;

  let contracts;
  let priceFeed;
  let troveManager;
  let borrowerOperations;
  let storagePool;
  let stabilityPoolManager;

  let gasPriceInWei;

  const getOpenTroveLUSDAmount = async totalDebt => th.getOpenTroveLUSDAmount(contracts, totalDebt);
  const openTrove = async params => th.openTrove(contracts, params);
  const increaseDebt = async params => th.increaseDebt(contracts, params);
  const assertRevert = th.assertRevert;

  describe('Stability Pool Mechanisms', async () => {
    before(async () => {
      gasPriceInWei = await web3.eth.getGasPrice();
    });

    beforeEach(async () => {
      contracts = await deploymentHelper.deployCore();
      await deploymentHelper.connectCoreContracts(contracts);
      await deploymentHelper.deployAndLinkToken(contracts);

      priceFeed = contracts.priceFeedTestnet;
      troveManager = contracts.troveManager;
      borrowerOperations = contracts.borrowerOperations;
      storagePool = contracts.storagePool;
      stabilityPoolManager = contracts.stabilityPoolManager;

      STABLE = contracts.debtToken.STABLE.address;
      STOCK = contracts.debtToken.STOCK.address;
      BTC = contracts.collToken.BTC.address;
      USDT = contracts.collToken.USDT.address;
    });

    // --- provideToSP() ---

    // increases recorded stable at Stability Pool
    it('provideToSP(): increases the Stability Pool stable balance', async () => {
      // --- SETUP --- Give Alice a least 200
      await contracts.debtToken.STOCK.unprotectedMint(alice, 200);

      // --- TEST ---
      await stabilityPoolManager.provideStability([{ tokenAddress: STOCK, amount: 200 }], { from: alice });

      // check pools total
      const stockDeposit = (await contracts.stabilityPoolManager.getTotalDeposits()).find(
        d => d.tokenAddress === STOCK
      );
      assert.equal(stockDeposit.amount, 200);
    });

    it("provideToSP(): updates the user's deposit record in StabilityPool", async () => {
      // --- SETUP --- Give Alice a least 200
      await contracts.debtToken.STOCK.unprotectedMint(alice, 200);

      // --- TEST ---
      // check user's deposit record before
      const depositBefore = (await contracts.stabilityPoolManager.getCompoundedDeposits({ from: alice })).find(
        d => d.tokenAddress === STOCK
      ).amount;
      assert.equal(depositBefore, 0);

      await stabilityPoolManager.provideStability([{ tokenAddress: STOCK, amount: 200 }], { from: alice });

      // check user's deposit record after
      const depositAfter = (await contracts.stabilityPoolManager.getCompoundedDeposits({ from: alice })).find(
        d => d.tokenAddress === STOCK
      ).amount;
      assert.equal(depositAfter, 200);
    });

    it("provideToSP(): reduces the user's stock balance by the correct amount", async () => {
      // --- SETUP --- Give Alice a least 200
      await contracts.debtToken.STOCK.unprotectedMint(alice, 200);

      // --- TEST ---
      // get user's deposit record before
      const stockBefore = await contracts.debtToken.STOCK.balanceOf(alice);

      // provideToSP()
      await stabilityPoolManager.provideStability([{ tokenAddress: STOCK, amount: 200 }], { from: alice });

      // check user's balance change
      const stockAfter = await contracts.debtToken.STOCK.balanceOf(alice);
      assert.equal(stockBefore.sub(stockAfter), '200');
    });

    it('provideToSP(): Correctly updates user snapshots of accumulated rewards per unit staked', async () => {
      // --- SETUP ---

      // Whale opens Trove and deposits to SP
      await openTrove({
        collToken: contracts.collToken.BTC,
        collAmount: dec(1, 18),
        debts: [{ tokenAddress: STOCK, amount: dec(1, 18) }],
        extraParams: { from: whale },
      });
      await stabilityPoolManager.provideStability([{ tokenAddress: STOCK, amount: dec(1, 18) }], {
        from: whale,
      });

      // 2 Troves opened, each withdraws minimum debt
      await openTrove({
        collToken: contracts.collToken.BTC,
        collAmount: dec(2, 16), // 0.02 BTC
        debts: [{ tokenAddress: STOCK, amount: dec(1, 5) }],
        extraParams: { from: defaulter_1 },
      });
      await openTrove({
        collToken: contracts.collToken.BTC,
        collAmount: dec(2, 16), // 0.02 BTC
        debts: [{ tokenAddress: STOCK, amount: dec(1, 5) }],
        extraParams: { from: defaulter_2 },
      });

      // Alice makes Trove and withdraws 1 stock
      await openTrove({
        collToken: contracts.collToken.BTC,
        collAmount: dec(1, 18),
        debts: [{ tokenAddress: STOCK, amount: dec(1, 18) }],
        extraParams: { from: alice },
      });

      // price drops: defaulter's Troves fall below MCR, whale doesn't
      await priceFeed.setTokenPrice(BTC, dec(9500, 18));

      const stockBefore = (await contracts.stabilityPoolManager.getTotalDeposits()).find(
        d => d.tokenAddress === STOCK
      ).amount;

      // Troves are closed
      await troveManager.liquidate(defaulter_1, { from: owner });
      assert.equal(await troveManager.getTroveStatus(defaulter_1), 3);
      await troveManager.liquidate(defaulter_2, { from: owner });
      assert.equal(await troveManager.getTroveStatus(defaulter_2), 3);

      // Confirm SP has decreased
      const stockAfter = (await contracts.stabilityPoolManager.getTotalDeposits()).find(
        d => d.tokenAddress === STOCK
      ).amount;

      assert.isTrue(toBN(stockAfter).lt(toBN(stockBefore)));

      // --- TEST ---
      const stockPool = await th.getStabilityPool(contracts, STOCK);
      const P_Before = await stockPool.P();
      const S_Before_BTC = await stockPool.epochToScaleToCollTokenToSum(0, 0, BTC);
      const S_Before_USDT = await stockPool.epochToScaleToCollTokenToSum(0, 0, USDT);
      // const G_Before = await stockPool.epochToScaleToG(0, 0);
      assert.isTrue(P_Before.gt(toBN('0')));
      assert.isTrue(S_Before_BTC.gt(toBN('0')));
      assert.isTrue(S_Before_USDT.eq(toBN('0'))); // should be 0, because there was no usdt coll which could be added

      // Check 'Before' snapshots
      const alice_snapshot_Before = await stockPool.depositSnapshots(alice);
      const alice_snapshot_P_Before = alice_snapshot_Before.P.toString();
      assert.equal(alice_snapshot_P_Before, '0');
      // const alice_snapshot_G_Before = alice_snapshot_Before[2].toString();
      // assert.equal(alice_snapshot_G_Before, '0');

      const alice_snapshot_S_Before_BTC = (await stockPool.getDepositorCollGain(alice, BTC)).toString();
      assert.equal(alice_snapshot_S_Before_BTC, '0');

      // Make deposit
      await stabilityPoolManager.provideStability([{ tokenAddress: STOCK, amount: 1 }], { from: alice });

      // Check 'After' snapshots
      const alice_snapshot_After = await stockPool.depositSnapshots(alice);
      const alice_snapshot_P_After = alice_snapshot_Before.P.toString();
      assert.equal(alice_snapshot_P_Before, alice_snapshot_P_After);
      // const alice_snapshot_G_Before = alice_snapshot_Before[2].toString();
      // assert.equal(alice_snapshot_G_Before, '0');

      const alice_snapshot_S_After_BTC = (await stockPool.getDepositorCollGain(alice, BTC)).toString();
      assert.equal(alice_snapshot_S_Before_BTC, alice_snapshot_S_After_BTC);
    });

    it("provideToSP(), multiple deposits: updates user's deposit and snapshots", async () => {
      // --- SETUP ---

      // Whale opens Trove and deposits to SP
      await openTrove({
        collToken: contracts.collToken.BTC,
        collAmount: dec(1, 18),
        debts: [{ tokenAddress: STOCK, amount: dec(1, 18) }],
        extraParams: { from: whale },
      });
      await stabilityPoolManager.provideStability([{ tokenAddress: STOCK, amount: dec(1, 5) }], {
        from: whale,
      });

      // 2 Troves opened, each withdraws minimum debt
      await openTrove({
        collToken: contracts.collToken.BTC,
        collAmount: dec(2, 16), // 0.02 BTC
        debts: [{ tokenAddress: STOCK, amount: dec(1, 5) }],
        extraParams: { from: defaulter_1 },
      });
      await openTrove({
        collToken: contracts.collToken.BTC,
        collAmount: dec(2, 16), // 0.02 BTC
        debts: [{ tokenAddress: STOCK, amount: dec(1, 5) }],
        extraParams: { from: defaulter_2 },
      });
      await openTrove({
        collToken: contracts.collToken.BTC,
        collAmount: dec(2, 16), // 0.02 BTC
        debts: [{ tokenAddress: STOCK, amount: dec(1, 5) }],
        extraParams: { from: defaulter_3 },
      });

      // --- TEST ---

      // Alice makes deposit #1
      await openTrove({
        collToken: contracts.collToken.BTC,
        collAmount: dec(1, 18),
        debts: [{ tokenAddress: STOCK, amount: dec(1, 18) }],
        extraParams: { from: alice },
      });
      await stabilityPoolManager.provideStability([{ tokenAddress: STOCK, amount: dec(1, 5) }], { from: alice });

      const stockPool = await th.getStabilityPool(contracts, STOCK);
      const alice_Snapshot_S_0 = (await stockPool.getDepositorCollGain(alice, BTC)).toString();
      const alice_Snapshot_P_0 = (await stockPool.depositSnapshots(alice)).P.toString();
      assert.equal(alice_Snapshot_S_0, '0');
      assert.equal(alice_Snapshot_P_0, '1000000000000000000');

      // price drops: defaulters' Troves fall below MCR, alice and whale Trove remain active
      await priceFeed.setTokenPrice(BTC, dec(9500, 18));

      // 2 users with Trove with 200 STOCK drawn are closed
      // 0.04 BTC -> 50% to the whale, 50% to alice
      // pool is empty after that
      await troveManager.liquidate(defaulter_1, { from: owner });
      await troveManager.liquidate(defaulter_2, { from: owner });

      const alice_compoundedDeposit_1 = await stockPool.getCompoundedDebtDeposit(alice);
      assert.isTrue(alice_compoundedDeposit_1.eq(toBN('0'))); // all debt was consumed

      // Alice makes deposit #2
      // 0.02 BTC will be paid out to alice
      const alice_topUp_1 = dec(1, 5);
      await stabilityPoolManager.provideStability([{ tokenAddress: STOCK, amount: alice_topUp_1 }], { from: alice });
      const alice_newDeposit_1 = await stockPool.getCompoundedDebtDeposit(alice);
      assert.equal(alice_topUp_1, alice_newDeposit_1.toString());

      // get system reward terms
      const S_1 = await stockPool.epochToScaleToCollTokenToSum(1, 0, BTC);
      assert.isTrue(S_1.eq(toBN('0')));
      const P_1 = await stockPool.P();
      assert.isTrue(P_1.eq(toBN(dec(1, 18))));

      // check Alice's new snapshot is correct
      const alice_Snapshot_S_1 = await stockPool.getDepositorCollGain(alice, BTC); // is 0, becuase alice claimed all coll rewards by providing more stability
      assert.isTrue(alice_Snapshot_S_1.eq(S_1));
      const alice_Snapshot_P_1 = (await stockPool.depositSnapshots(alice)).P;
      assert.isTrue(alice_Snapshot_P_1.eq(P_1));

      // Bob withdraws stock and deposits to StabilityPool
      await openTrove({
        collToken: contracts.collToken.BTC,
        collAmount: dec(1, 18),
        debts: [{ tokenAddress: STOCK, amount: dec(1, 18) }],
        extraParams: { from: bob },
      });
      await stabilityPoolManager.provideStability([{ tokenAddress: STOCK, amount: dec(1, 5) }], { from: bob });

      // Defaulter 3 Trove is closed
      // 0.02 BTC, 50% alice, 50% bob
      await troveManager.liquidate(defaulter_3, { from: owner });

      const P_2 = await stockPool.P();
      assert.isTrue(P_2.lt(P_1));
      const S_2 = await stockPool.epochToScaleToCollTokenToSum(1, 0, BTC);
      assert.isTrue(S_2.gt(S_1)); // should be larger because some btc is added throw the defaulter 3 liqudiation

      // Alice makes deposit #3:
      await stabilityPoolManager.provideStability([{ tokenAddress: STOCK, amount: dec(1, 5) }], { from: alice });

      // check Alice's new snapshot is correct
      const alice_Snapshot_S_2 = await stockPool.getDepositorCollGain(alice, BTC);
      const alice_Snapshot_P_2 = (await stockPool.depositSnapshots(alice)).P;
      // todo assert.isTrue(alice_Snapshot_S_2.eq(S_2));
      assert.isTrue(alice_Snapshot_P_2.eq(P_2));
    });
  });
});
