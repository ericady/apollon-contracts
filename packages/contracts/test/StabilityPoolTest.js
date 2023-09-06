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

      // Alice makes Trove and withdraws 100 stock
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
      // todo fix missing stability coll gain first

      // // --- TEST ---
      // const P_Before = await stabilityPool.P();
      // const S_Before = await stabilityPool.epochToScaleToSum(0, 0);
      // const G_Before = await stabilityPool.epochToScaleToG(0, 0);
      // assert.isTrue(P_Before.gt(toBN('0')));
      // assert.isTrue(S_Before.gt(toBN('0')));
      //
      // // Check 'Before' snapshots
      // const alice_snapshot_Before = await stabilityPool.depositSnapshots(alice);
      // const alice_snapshot_S_Before = alice_snapshot_Before[0].toString();
      // const alice_snapshot_P_Before = alice_snapshot_Before[1].toString();
      // const alice_snapshot_G_Before = alice_snapshot_Before[2].toString();
      // assert.equal(alice_snapshot_S_Before, '0');
      // assert.equal(alice_snapshot_P_Before, '0');
      // assert.equal(alice_snapshot_G_Before, '0');
      //
      // // Make deposit
      // await stabilityPool.provideToSP(dec(100, 18), frontEnd_1, { from: alice });
      //
      // // Check 'After' snapshots
      // const alice_snapshot_After = await stabilityPool.depositSnapshots(alice);
      // const alice_snapshot_S_After = alice_snapshot_After[0].toString();
      // const alice_snapshot_P_After = alice_snapshot_After[1].toString();
      // const alice_snapshot_G_After = alice_snapshot_After[2].toString();
      //
      // assert.equal(alice_snapshot_S_After, S_Before);
      // assert.equal(alice_snapshot_P_After, P_Before);
      // assert.equal(alice_snapshot_G_After, G_Before);
    });
  });
});
