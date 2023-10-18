import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import { Contracts, connectCoreContracts, deployAndLinkToken, deployCore } from '../utils/deploymentHelpers';
import {
  BorrowerOperations,
  MockDebtToken,
  MockERC20,
  MockPriceFeed,
  StabilityPoolManager,
  StoragePool,
  TroveManager,
} from '../typechain';
import { expect } from 'chai';
import {
  getStabilityPool,
  openTrove,
  assertRevert,
  whaleShrimpTroveInit,
  fastForwardTime,
  TimeValues,
  gasUsed,
} from '../utils/testHelper';
import { parseUnits } from 'ethers';

describe('StabilityPool', () => {
  let signers: SignerWithAddress[];
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carol: SignerWithAddress;
  let whale: SignerWithAddress;
  let dennis: SignerWithAddress;
  let erin: SignerWithAddress;
  let flyn: SignerWithAddress;

  let defaulter_1: SignerWithAddress;
  let defaulter_2: SignerWithAddress;
  let defaulter_3: SignerWithAddress;

  let STABLE: MockDebtToken;
  let STOCK: MockDebtToken;
  let BTC: MockERC20;
  let USDT: MockERC20;

  let contracts: Contracts;
  let priceFeed: MockPriceFeed;
  let troveManager: TroveManager;
  let borrowerOperations: BorrowerOperations;
  let storagePool: StoragePool;
  let stabilityPoolManager: StabilityPoolManager;

  before(async () => {
    signers = await ethers.getSigners();
    [owner, defaulter_1, defaulter_2, defaulter_3, whale, alice, bob, carol, dennis, erin, flyn] = signers;
  });

  describe('Stability Pool Mechanisms', async () => {
    beforeEach(async () => {
      contracts = await deployCore();
      await connectCoreContracts(contracts);
      await deployAndLinkToken(contracts);

      priceFeed = contracts.priceFeed;
      troveManager = contracts.troveManager;
      borrowerOperations = contracts.borrowerOperations;
      storagePool = contracts.storagePool;
      stabilityPoolManager = contracts.stabilityPoolManager;

      STABLE = contracts.debtToken.STABLE;
      STOCK = contracts.debtToken.STOCK;
      BTC = contracts.collToken.BTC;
      USDT = contracts.collToken.USDT;
    });

    // todo gov token tests missing
    // it("provideToSP(), new deposit: when SP > 0, triggers LQTY reward event - increases the sum G", async () => {
    // it("provideToSP(), new deposit: when SP is empty, doesn't update G", async () => {
    // it("provideToSP(), new deposit: depositor does not receive any LQTY rewards", async () => {
    // it("provideToSP(), new deposit after past full withdrawal: depositor does not receive any LQTY rewards", async () => {
    // it("provideToSP(), new eligible deposit: tagged front end receives LQTY rewards", async () => {

    // --- provideToSP() ---

    // increases recorded stable at Stability Pool
    it('provideToSP(): increases the Stability Pool stable balance', async () => {
      // --- SETUP --- Give Alice a least 200
      await STOCK.unprotectedMint(alice, 200);

      // --- TEST ---
      await stabilityPoolManager.connect(alice).provideStability([{ tokenAddress: STOCK, amount: 200 }]);

      // check pools total
      const stockDeposit = (await stabilityPoolManager.getTotalDeposits()).find(d => d.tokenAddress === STOCK.target);
      expect(stockDeposit?.amount).to.be.equal(200n);
    });

    it("provideToSP(): updates the user's deposit record in StabilityPool", async () => {
      // --- SETUP --- Give Alice a least 200
      await STOCK.unprotectedMint(alice, 200n);

      // --- TEST ---
      // check user's deposit record before
      const depositBefore = (await stabilityPoolManager.connect(alice).getCompoundedDeposits()).find(
        d => d.tokenAddress === STOCK.target
      )?.amount;
      expect(depositBefore).to.be.equal(0n);

      await stabilityPoolManager.connect(alice).provideStability([{ tokenAddress: STOCK, amount: 200n }]);

      // check user's deposit record after
      const depositAfter = (await stabilityPoolManager.connect(alice).getCompoundedDeposits()).find(
        d => d.tokenAddress === STOCK.target
      )?.amount;
      expect(depositAfter).to.be.equal(200n);
    });

    it("provideToSP(): reduces the user's stock balance by the correct amount", async () => {
      // --- SETUP --- Give Alice a least 200
      await STOCK.unprotectedMint(alice, 200n);

      // --- TEST ---
      // get user's deposit record before
      const stockBefore = await STOCK.balanceOf(alice);

      // provideToSP()
      await stabilityPoolManager.connect(alice).provideStability([{ tokenAddress: STOCK, amount: 200n }]);

      // check user's balance change
      const stockAfter = await STOCK.balanceOf(alice);
      expect(stockBefore - stockAfter).to.be.equal(200n);
    });

    it('provideToSP(): Correctly updates user snapshots of accumulated rewards per unit staked', async () => {
      // --- SETUP ---

      // Whale opens Trove and deposits to SP
      await openTrove({
        from: whale,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('1', 9),
        debts: [{ tokenAddress: STOCK, amount: parseUnits('1') }],
      });
      await stabilityPoolManager.connect(whale).provideStability([{ tokenAddress: STOCK, amount: parseUnits('1') }]);

      // 2 Troves opened, each withdraws minimum debt
      await openTrove({
        from: defaulter_1,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('0.02', 9), // 0.02 BTC
        debts: [{ tokenAddress: STOCK, amount: parseUnits('1') }],
      });
      await openTrove({
        from: defaulter_2,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('0.02', 9), // 0.02 BTC
        debts: [{ tokenAddress: STOCK, amount: parseUnits('1') }],
      });

      // Alice makes Trove and withdraws 1 stock
      await openTrove({
        from: alice,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('1', 9),
        debts: [{ tokenAddress: STOCK, amount: parseUnits('1') }],
      });

      // price drops: defaulter's Troves fall below MCR, whale doesn't
      await priceFeed.setTokenPrice(BTC, parseUnits('9500'));

      const stockBefore = (await stabilityPoolManager.getTotalDeposits()).find(d => d.tokenAddress === STOCK.target)
        ?.amount;

      // Troves are closed
      await troveManager.liquidate(defaulter_1);
      expect(await troveManager.getTroveStatus(defaulter_1)).to.be.equal(3n);
      await troveManager.liquidate(defaulter_2);
      expect(await troveManager.getTroveStatus(defaulter_2)).to.be.equal(3n);

      // Confirm SP has decreased
      const stockAfter = (await contracts.stabilityPoolManager.getTotalDeposits()).find(
        d => d.tokenAddress === STOCK.target
      )?.amount;

      expect(stockAfter).to.be.lt(stockBefore);

      // --- TEST ---
      const stockPool = await getStabilityPool(contracts, STOCK);
      const P_Before = await stockPool.P();
      const S_Before_BTC = await stockPool.epochToScaleToCollTokenToSum(0, 0, BTC);
      const S_Before_USDT = await stockPool.epochToScaleToCollTokenToSum(0, 0, USDT);
      // const G_Before = await stockPool.epochToScaleToG(0, 0);
      expect(P_Before).to.be.gt(0n);
      expect(S_Before_BTC).to.be.gt(0n);
      expect(S_Before_USDT).to.be.eq(0n); // should be 0, because there was no usdt coll which could be added

      // Check 'Before' snapshots
      const alice_snapshot_Before = await stockPool.depositSnapshots(alice);
      const alice_snapshot_P_Before = alice_snapshot_Before.P;
      expect(alice_snapshot_P_Before).to.be.eq(0n);
      // const alice_snapshot_G_Before = alice_snapshot_Before[2].toString();
      // assert.equal(alice_snapshot_G_Before, '0');

      const alice_snapshot_S_Before_BTC = await stockPool.getDepositorCollGain(alice, BTC);
      expect(alice_snapshot_S_Before_BTC).to.be.eq(0n);

      // Make deposit
      await stabilityPoolManager.connect(alice).provideStability([{ tokenAddress: STOCK, amount: 1 }]);

      // Check 'After' snapshots
      const alice_snapshot_After = await stockPool.depositSnapshots(alice);
      // TODO: alice_snapshot_After is unused, should be used in below line
      const alice_snapshot_P_After = alice_snapshot_Before.P;
      expect(alice_snapshot_P_Before).to.be.eq(alice_snapshot_P_After);
      // const alice_snapshot_G_Before = alice_snapshot_Before[2].toString();
      // assert.equal(alice_snapshot_G_Before, '0');

      const alice_snapshot_S_After_BTC = await stockPool.getDepositorCollGain(alice, BTC);
      expect(alice_snapshot_S_Before_BTC).to.be.equal(alice_snapshot_S_After_BTC);
    });

    it("provideToSP(), multiple deposits: updates user's deposit and snapshots", async () => {
      // --- SETUP ---

      // Whale opens Trove and deposits to SP
      await openTrove({
        from: whale,
        contracts,
        collToken: contracts.collToken.BTC,
        collAmount: parseUnits('1', 9),
        debts: [{ tokenAddress: STOCK, amount: parseUnits('1') }],
      });
      await stabilityPoolManager.connect(whale).provideStability([{ tokenAddress: STOCK, amount: parseUnits('1') }]);

      // 2 Troves opened, each withdraws minimum debt
      await openTrove({
        from: defaulter_1,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('0.02', 9), // 0.02 BTC
        debts: [{ tokenAddress: STOCK, amount: parseUnits('1') }],
      });
      await openTrove({
        from: defaulter_2,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('0.02', 9), // 0.02 BTC
        debts: [{ tokenAddress: STOCK, amount: parseUnits('1') }],
      });
      await openTrove({
        from: defaulter_3,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('0.02', 9), // 0.02 BTC
        debts: [{ tokenAddress: STOCK, amount: parseUnits('1') }],
      });

      // --- TEST ---

      // Alice makes deposit #1
      await openTrove({
        from: alice,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('1', 9),
        debts: [{ tokenAddress: STOCK, amount: parseUnits('3') }],
      });
      await stabilityPoolManager.connect(alice).provideStability([{ tokenAddress: STOCK, amount: parseUnits('1') }]);

      const stockPool = await getStabilityPool(contracts, STOCK);
      const alice_Snapshot_S_0 = await stockPool.getDepositorCollGain(alice, BTC);
      const alice_Snapshot_P_0 = (await stockPool.depositSnapshots(alice)).P;
      expect(alice_Snapshot_S_0).to.be.equal(0n);
      expect(alice_Snapshot_P_0).to.be.equal(parseUnits('1'));

      // price drops: defaulters' Troves fall below MCR, alice and whale Trove remain active
      await priceFeed.setTokenPrice(BTC, parseUnits('9500'));

      // 2 users with Trove with 2 STOCK drawn are closed
      // 0.04 BTC -> 50% to the whale, 50% to alice
      // pool is empty after that
      await troveManager.liquidate(defaulter_1);
      await troveManager.liquidate(defaulter_2);

      const alice_compoundedDeposit_1 = await stockPool.getCompoundedDebtDeposit(alice);
      expect(alice_compoundedDeposit_1).to.be.equal(0n); // all debt was consumed

      // Alice makes deposit #2
      // 0.02 BTC will be paid out to alice
      const alice_topUp_1 = parseUnits('1');
      await stabilityPoolManager.connect(alice).provideStability([{ tokenAddress: STOCK, amount: alice_topUp_1 }]);
      const alice_newDeposit_1 = await stockPool.getCompoundedDebtDeposit(alice);
      expect(alice_newDeposit_1).to.be.equal(alice_topUp_1);
      const alice_btc_balance = await BTC.balanceOf(alice.address);
      expect(alice_btc_balance).to.be.equal(19800982n); // 0.02 BTC - liquidation fee

      // get system reward terms
      const S_1 = await stockPool.epochToScaleToCollTokenToSum(1, 0, BTC);
      expect(S_1).to.be.equal(0n); // pool is empty...
      const P_1 = await stockPool.P();
      expect(P_1).to.be.equal(parseUnits('1'));

      // check Alice's new snapshot is correct
      const alice_Snapshot_S_1 = await stockPool.getDepositorCollGain(alice, BTC);
      expect(alice_Snapshot_S_1).to.be.equal(0n); // is 0, because alice claimed all coll rewards by providing more stability
      const alice_Snapshot_P_1 = (await stockPool.depositSnapshots(alice)).P;
      expect(alice_Snapshot_P_1).to.be.equal(P_1);

      // Bob withdraws stock and deposits to StabilityPool
      await openTrove({
        from: bob,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('1', 9),
        debts: [{ tokenAddress: STOCK, amount: parseUnits('1') }],
      });
      await stabilityPoolManager.connect(bob).provideStability([{ tokenAddress: STOCK, amount: parseUnits('1', 5) }]);

      // Defaulter 3 Trove is closed
      // 0.02 BTC, 50% alice, 50% bob
      await troveManager.liquidate(defaulter_3);

      const P_2 = await stockPool.P();
      expect(P_2).to.be.lt(P_1);
      const S_2 = await stockPool.epochToScaleToCollTokenToSum(1, 0, BTC);
      expect(S_2).to.be.gt(S_1); // should be larger because some btc is added throw the defaulter 3 liquidation

      // Alice makes deposit #3:
      await stabilityPoolManager.connect(alice).provideStability([{ tokenAddress: STOCK, amount: parseUnits('1', 5) }]);

      // check Alice's new snapshot is correct
      const alice_Snapshot_S_2 = await stockPool.getDepositorCollGain(alice, BTC);
      const alice_Snapshot_P_2 = (await stockPool.depositSnapshots(alice)).P;
      // TODO: assert.isTrue(alice_Snapshot_S_2.eq(S_2));
      expect(alice_Snapshot_P_2).to.be.eq(P_2);
    });

    it('provideToSP(): reverts if user tries to provide more than their STOCK balance', async () => {
      await STOCK.unprotectedMint(alice, 200n);
      await STOCK.unprotectedMint(bob, 200n);
      const aliceBalance = await STOCK.balanceOf(alice);
      const bobBalance = await STOCK.balanceOf(bob);

      // Alice, attempts to deposit 1 wei more than her balance
      const aliceTxPromise = stabilityPoolManager
        .connect(alice)
        .provideStability([{ tokenAddress: STOCK, amount: aliceBalance + 1n }]);
      await assertRevert(aliceTxPromise);

      // Bob, attempts to deposit 23000n more than his balance
      const bobTxPromise = stabilityPoolManager
        .connect(bob)
        .provideStability([{ tokenAddress: STOCK, amount: bobBalance + 23000n }]);
      await assertRevert(bobTxPromise);
    });

    it('provideToSP(): reverts if user tries to provide 2^256-1 STABLE, which exceeds their balance', async () => {
      await STOCK.unprotectedMint(alice, 200n);

      // Alice attempts to deposit 2^256-1
      const aliceTxPromise = stabilityPoolManager
        .connect(alice)
        .provideStability([{ tokenAddress: STOCK, amount: 2 ^ 256 }]);
      await assertRevert(aliceTxPromise);
    });

    // not relevant, only working with erc20 currently
    // it('provideToSP(): reverts if cannot receive coll Gain', async () => {
    //   // --- SETUP ---
    //
    //   // Whale opens Trove and deposits to SP
    //   await openTrove({
    //     from: whale,
    //     contracts,
    //     collToken: contracts.collToken.BTC,
    //     collAmount: parseUnits('1'),
    //     debts: [{ tokenAddress: STABLE, amount: parseUnits('1850') }],
    //   });
    //   await stabilityPoolManager.connect(whale).provideStability([{ tokenAddress: STOCK, amount: parseUnits('1850') }]);
    //
    //   // 2 Troves opened
    //   await openTrove({
    //     from: defaulter_1,
    //     contracts,
    //     collToken: BTC,
    //     collAmount: parseUnits('0.02'), // 0.02 BTC
    //     debts: [{ tokenAddress: STOCK, amount: parseUnits('1', 5) }],
    //   });
    //   await openTrove({
    //     from: defaulter_2,
    //     contracts,
    //     collToken: BTC,
    //     collAmount: parseUnits('0.02'), // 0.02 BTC
    //     debts: [{ tokenAddress: STOCK, amount: parseUnits('1', 5) }],
    //   });
    //
    //   // --- TEST ---
    //
    //   await STABLE.transfer(defaulter_3.address, parseUnits('250'), { from: whale });
    //   await stabilityPoolManager
    //     .connect(defaulter_3)
    //     .provideStability([{ tokenAddress: STOCK, amount: parseUnits('150') }]);
    //
    //   const gain_0 = await stabilityPool.getDepositorETHGain(nonPayable.address);
    //   assert.isTrue(gain_0.eq(toBN(0)), 'NonPayable should not have accumulated gains');
    //
    //   // price drops: defaulters' Troves fall below MCR, nonPayable and whale Trove remain active
    //   await priceFeed.setTokenPrice(BTC, parseUnits('9500'));
    //
    //   // 2 defaulters are closed
    //   await troveManager.connect(owner).liquidate(defaulter_1);
    //   await troveManager.connect(owner).liquidate(defaulter_2);
    //
    //   const gain_1 = await stabilityPool.getDepositorETHGain(nonPayable.address);
    //   assert.isTrue(gain_1.gt(toBN(0)), 'NonPayable should have some accumulated gains');
    //
    //   // NonPayable tries to make deposit #2: 100 stable (which also attempts to withdraw ETH gain)
    //   await stabilityPoolManager
    //     .connect(defaulter_3)
    //     .provideStability([{ tokenAddress: STOCK, amount: parseUnits('100') }]);
    //   await th.assertRevert(nonPayable.forward(stabilityPool.address, txData2), 'StabilityPool: sending ETH failed');
    // });

    it("provideToSP(): doesn't impact other users' deposits or coll gains", async () => {
      await whaleShrimpTroveInit(contracts, signers);

      // Price drops
      await priceFeed.setTokenPrice(BTC, parseUnits('9500'));

      // 2 defaulters are closed
      await troveManager.connect(owner).liquidate(defaulter_1);
      await troveManager.connect(owner).liquidate(defaulter_2);

      const stockPool = await getStabilityPool(contracts, STABLE);
      const alice_stableDeposit_Before = await stockPool.getCompoundedDebtDeposit(alice);
      const bob_stableDeposit_Before = await stockPool.getCompoundedDebtDeposit(bob);
      const carol_stableDeposit_Before = await stockPool.getCompoundedDebtDeposit(carol);

      const alice_btc_gain_before = await stockPool.getDepositorCollGain(alice, BTC);
      const bob_btc_gain_before = await stockPool.getDepositorCollGain(bob, BTC);
      const carol_btc_gain_before = await stockPool.getDepositorCollGain(carol, BTC);

      //check non-zero stock and coll Gain in the Stability Pool
      const stockInPool = await stockPool.getTotalDeposit();
      const btcInPool = (await stockPool.getTotalGainedColl()).find(d => d.tokenAddress === BTC.target)?.amount;
      expect(stockInPool).to.be.gt(0);
      expect(btcInPool).to.be.gt(0);

      // D makes an SP deposit
      await stabilityPoolManager
        .connect(dennis)
        .provideStability([{ tokenAddress: STABLE, amount: parseUnits('300') }]);

      const alice_stableDeposit_after = await stockPool.getCompoundedDebtDeposit(alice);
      const bob_stableDeposit_after = await stockPool.getCompoundedDebtDeposit(bob);
      const carol_stableDeposit_after = await stockPool.getCompoundedDebtDeposit(carol);

      const alice_btc_gain_after = await stockPool.getDepositorCollGain(alice, BTC);
      const bob_btc_gain_after = await stockPool.getDepositorCollGain(bob, BTC);
      const carol_btc_gain_after = await stockPool.getDepositorCollGain(carol, BTC);

      // Check compounded deposits and ETH gains for A, B and C have not changed
      expect(alice_stableDeposit_Before).to.be.equal(alice_stableDeposit_after);
      expect(bob_stableDeposit_Before).to.be.equal(bob_stableDeposit_after);
      expect(carol_stableDeposit_Before).to.be.equal(carol_stableDeposit_after);

      expect(alice_btc_gain_before).to.be.equal(alice_btc_gain_after);
      expect(bob_btc_gain_before).to.be.equal(bob_btc_gain_after);
      expect(carol_btc_gain_before).to.be.equal(carol_btc_gain_after);
    });

    it("provideToSP(): doesn't impact system debt, collateral or TCR", async () => {
      await whaleShrimpTroveInit(contracts, signers);

      // Price drops
      await priceFeed.setTokenPrice(BTC, parseUnits('9500'));

      // Defaulters are liquidated
      await troveManager.liquidate(defaulter_1);
      await troveManager.liquidate(defaulter_2);

      const activeDebt_Before = await storagePool.getValue(STABLE, false, 0);
      const defaultedDebt_Before = await storagePool.getValue(STABLE, false, 1);
      const activeColl_Before = await storagePool.getValue(BTC, true, 0);
      const defaultedColl_Before = await storagePool.getValue(BTC, true, 1);
      const [, tcrBefore, ,] = await storagePool.checkRecoveryMode();

      // D makes an SP deposit
      await stabilityPoolManager
        .connect(dennis)
        .provideStability([{ tokenAddress: STABLE, amount: parseUnits('300') }]);

      const activeDebt_After = await storagePool.getValue(STABLE, false, 0);
      const defaultedDebt_After = await storagePool.getValue(STABLE, false, 1);
      const activeColl_After = await storagePool.getValue(BTC, true, 0);
      const defaultedColl_After = await storagePool.getValue(BTC, true, 1);
      const [, tcrAfter, ,] = await storagePool.checkRecoveryMode();

      // Check total system debt, collateral and TCR have not changed after a Stability deposit is made
      expect(activeDebt_Before).to.be.equal(activeDebt_After);
      expect(defaultedDebt_Before).to.be.equal(defaultedDebt_After);
      expect(activeColl_Before).to.be.equal(activeColl_After);
      expect(defaultedColl_Before).to.be.equal(defaultedColl_After);
      expect(tcrBefore).to.be.equal(tcrAfter);
    });

    it("provideToSP(): doesn't impact any troves, including the caller's trove", async () => {
      await whaleShrimpTroveInit(contracts, signers);

      // Price drops
      await priceFeed.setTokenPrice(BTC, parseUnits('9500'));

      // Get debt, collateral and ICR of all existing troves
      const whale_Debt_Before = (await troveManager.getTroveDebt(whale))[0][1];
      const alice_Debt_Before = (await troveManager.getTroveDebt(alice))[0][1];
      const bob_Debt_Before = (await troveManager.getTroveDebt(bob))[0][1];
      const carol_Debt_Before = (await troveManager.getTroveDebt(carol))[0][1];
      const dennis_Debt_Before = (await troveManager.getTroveDebt(dennis))[0][1];

      const whale_Coll_Before = (await troveManager.getTroveColl(whale))[0][1];
      const alice_Coll_Before = (await troveManager.getTroveColl(alice))[0][1];
      const bob_Coll_Before = (await troveManager.getTroveColl(bob))[0][1];
      const carol_Coll_Before = (await troveManager.getTroveColl(carol))[0][1];
      const dennis_Coll_Before = (await troveManager.getTroveColl(dennis))[0][1];

      const whale_ICR_Before = (await troveManager.getCurrentICR(whale))[0];
      const alice_ICR_Before = (await troveManager.getCurrentICR(alice))[0];
      const bob_ICR_Before = (await troveManager.getCurrentICR(bob))[0];
      const carol_ICR_Before = (await troveManager.getCurrentICR(carol))[0];
      const dennis_ICR_Before = (await troveManager.getCurrentICR(dennis))[0];

      // D makes an SP deposit
      await stabilityPoolManager
        .connect(dennis)
        .provideStability([{ tokenAddress: STABLE, amount: parseUnits('300') }]);

      const whale_Debt_After = (await troveManager.getTroveDebt(whale))[0][1];
      const alice_Debt_After = (await troveManager.getTroveDebt(alice))[0][1];
      const bob_Debt_After = (await troveManager.getTroveDebt(bob))[0][1];
      const carol_Debt_After = (await troveManager.getTroveDebt(carol))[0][1];
      const dennis_Debt_After = (await troveManager.getTroveDebt(dennis))[0][1];

      const whale_Coll_After = (await troveManager.getTroveColl(whale))[0][1];
      const alice_Coll_After = (await troveManager.getTroveColl(alice))[0][1];
      const bob_Coll_After = (await troveManager.getTroveColl(bob))[0][1];
      const carol_Coll_After = (await troveManager.getTroveColl(carol))[0][1];
      const dennis_Coll_After = (await troveManager.getTroveColl(dennis))[0][1];

      const whale_ICR_After = (await troveManager.getCurrentICR(whale))[0];
      const alice_ICR_After = (await troveManager.getCurrentICR(alice))[0];
      const bob_ICR_After = (await troveManager.getCurrentICR(bob))[0];
      const carol_ICR_After = (await troveManager.getCurrentICR(carol))[0];
      const dennis_ICR_After = (await troveManager.getCurrentICR(dennis))[0];

      expect(whale_Debt_Before).to.be.equal(whale_Debt_After);
      expect(alice_Debt_Before).to.be.equal(alice_Debt_After);
      expect(bob_Debt_Before).to.be.equal(bob_Debt_After);
      expect(carol_Debt_Before).to.be.equal(carol_Debt_After);
      expect(dennis_Debt_Before).to.be.equal(dennis_Debt_After);

      expect(whale_Coll_Before).to.be.equal(whale_Coll_After);
      expect(alice_Coll_Before).to.be.equal(alice_Coll_After);
      expect(bob_Coll_Before).to.be.equal(bob_Coll_After);
      expect(carol_Coll_Before).to.be.equal(carol_Coll_After);
      expect(dennis_Coll_Before).to.be.equal(dennis_Coll_After);

      expect(whale_ICR_Before).to.be.equal(whale_ICR_After);
      expect(alice_ICR_Before).to.be.equal(alice_ICR_After);
      expect(bob_ICR_Before).to.be.equal(bob_ICR_After);
      expect(carol_ICR_Before).to.be.equal(carol_ICR_After);
      expect(dennis_ICR_Before).to.be.equal(dennis_ICR_After);
    });

    it("provideToSP(): doesn't protect the depositor's trove from liquidation", async () => {
      await whaleShrimpTroveInit(contracts, signers);

      // Confirm Bob has a Stability deposit
      expect(
        (await stabilityPoolManager.connect(bob).getCompoundedDeposits()).find(d => d.tokenAddress === STABLE.target)
          ?.amount
      ).to.be.equal(parseUnits('2000'));

      // Price drops
      await priceFeed.setTokenPrice(BTC, parseUnits('100'));

      // Liquidate bob
      await troveManager.liquidate(bob);

      // Check Bob's trove has been removed from the system
      expect(await troveManager.getTroveStatus(bob)).to.be.equal(3n); // check Bob's trove status was closed by liquidation
    });

    it('provideToSP(): providing 0 stable reverts', async () => {
      await whaleShrimpTroveInit(contracts, signers);

      const StableInSP_Before = (await stabilityPoolManager.getTotalDeposits()).find(
        d => d.tokenAddress === STABLE.target
      )?.[1];
      expect(StableInSP_Before).to.be.equal(parseUnits('6000'));

      // Bob provides 0 stable to the Stability Pool
      const bobTxPromise = stabilityPoolManager.connect(alice).provideStability([{ tokenAddress: STOCK, amount: 0n }]);
      await assertRevert(bobTxPromise);
    });

    it('provideToSP(), new deposit: depositor does not receive ETH gains', async () => {
      await openTrove({
        from: whale,
        contracts,
        collToken: contracts.collToken.BTC,
        collAmount: parseUnits('1', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('5000') }],
      });

      // Whale transfers stable to A
      await STABLE.connect(whale).transfer(alice, parseUnits('500'));

      // B open troves
      await openTrove({
        from: bob,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('1', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('2000') }],
      });

      // --- TEST ---

      // get current ETH balances
      const A_ETHBalance_Before = await ethers.provider.getBalance(alice);
      const B_ETHBalance_Before = await ethers.provider.getBalance(bob);

      // A, B, C, D provide to SP
      const A_GAS_Used = await gasUsed(
        await stabilityPoolManager
          .connect(alice)
          .provideStability([{ tokenAddress: STABLE, amount: parseUnits('500') }])
      );
      const B_GAS_Used = await gasUsed(
        await stabilityPoolManager.connect(bob).provideStability([{ tokenAddress: STABLE, amount: parseUnits('2000') }])
      );

      // ETH balances before minus gas used
      const A_expectedBalance = A_ETHBalance_Before - A_GAS_Used;
      const B_expectedBalance = B_ETHBalance_Before - B_GAS_Used;

      // Get  ETH balances after
      const A_ETHBalance_After = await ethers.provider.getBalance(alice);
      const B_ETHBalance_After = await ethers.provider.getBalance(bob);

      // Check ETH balances have not changed
      expect(A_expectedBalance).to.be.equal(A_ETHBalance_After);
      expect(B_expectedBalance).to.be.equal(B_ETHBalance_After);
    });
  });
});
