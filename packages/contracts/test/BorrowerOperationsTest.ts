import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import {
  MockBorrowerOperations,
  MockDebtToken,
  MockERC20,
  PriceFeed,
  MockTroveManager,
  LiquidationOperations,
  StoragePool,
} from '../typechain';
import { expect } from 'chai';
import {
  MAX_BORROWING_FEE,
  checkRecoveryMode,
  fastForwardTime,
  getLatestBlockTimestamp,
  getTCR,
  getTroveEntireColl,
  getTroveEntireDebt,
  openTrove,
  getTroveStakeValue,
  getTroveStake,
  getEmittedLiquidationValues,
  getStableFeeFromStableBorrowingEvent,
  addColl,
  withdrawalColl,
  increaseDebt,
  repayDebt,
  getDomain,
  PermitTypes,
  getHints,
  setPrice,
} from '../utils/testHelper';
import { AbiCoder, Signature, keccak256, parseUnits, solidityPacked, toUtf8Bytes } from 'ethers';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import apollonTesting from '../ignition/modules/apollonTesting';

describe('BorrowerOperations', () => {
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carol: SignerWithAddress;
  let whale: SignerWithAddress;
  let dennis: SignerWithAddress;
  let erin: SignerWithAddress;

  let contracts: any;
  let priceFeed: PriceFeed;
  let troveManager: MockTroveManager;
  let borrowerOperations: MockBorrowerOperations;
  let storagePool: StoragePool;
  let liquidationOperations: LiquidationOperations;
  let STABLE: MockDebtToken;
  let BTC: MockERC20;

  const open = async (user: SignerWithAddress, collAmount: bigint, debtAmount: bigint) => {
    return await openTrove({
      from: user,
      contracts,
      collToken: BTC,
      collAmount: collAmount,
      debts: [{ tokenAddress: STABLE, amount: debtAmount }],
    });
  };

  before(async () => {
    [, , , , whale, alice, bob, carol, dennis, erin] = await ethers.getSigners();
  });

  beforeEach(async () => {
    // @ts-ignore
    contracts = await ignition.deploy(apollonTesting);
    troveManager = contracts.troveManager;
    storagePool = contracts.storagePool;
    BTC = contracts.BTC;
    STABLE = contracts.STABLE;
    borrowerOperations = contracts.borrowerOperations;
    liquidationOperations = contracts.liquidationOperations;
    priceFeed = contracts.priceFeed;
  });

  // --- addColl() ---
  describe('addColl()', () => {
    it('reverts when top-up would leave trove with ICR < MCR', async () => {
      // alice creates a Trove and adds first collateral
      await open(alice, parseUnits('0.05', 9), parseUnits('150'));
      await open(bob, parseUnits('1', 9), parseUnits('100'));

      // Price drops
      await setPrice('BTC', '1000', contracts);
      // System debt status,
      // Collateral:  1.05 BTC  ($1050)
      // Debt:        2 STOCK ($688.5 = $285 + $400 gas lock + $3.5 borrowing fee)
      // TCR:         152%

      const poolStats = await storagePool.checkRecoveryMode();
      expect(poolStats.isInRecoveryMode).to.be.false;

      // At the moment alice's debt status,
      // Collateral:  0.05 BTC  ($50)
      // Debt:        1 STOCK ($350 = 150 + 200 gas lock)
      // ICR:         14%
      const aliceICR = await troveManager.getCurrentICR(alice);
      expect(aliceICR.ICR).lt(parseUnits('1.1')); // Less than 110%

      // 1 wei top up
      await expect(addColl(alice, contracts, [{ tokenAddress: BTC, amount: 1 }], true)).to.be.revertedWithCustomError(
        borrowerOperations,
        'ICR_lt_MCR'
      );
    });
    it('Increases the activePool ETH and raw ether balance by correct amount', async () => {
      const aliceColl = parseUnits('0.05', 9);
      await open(alice, aliceColl, parseUnits('150'));

      const pool_BTC_Before = await storagePool.getValue(BTC, true, 0);
      const pool_RawBTC_Before = await BTC.balanceOf(storagePool);

      expect(pool_BTC_Before).to.be.equal(aliceColl);
      expect(pool_RawBTC_Before).to.be.equal(aliceColl);

      // Add 1 BTC
      const collTopUp = parseUnits('1', 9);
      await addColl(alice, contracts, [{ tokenAddress: BTC, amount: collTopUp }], true);

      const pool_BTC_After = await storagePool.getValue(BTC, true, 0);
      const pool_RawBTC_After = await BTC.balanceOf(storagePool);
      expect(pool_BTC_After).to.be.equal(pool_BTC_Before + collTopUp);
      expect(pool_RawBTC_After).to.be.equal(pool_RawBTC_Before + collTopUp);
    });
    it('add collaterals with permit', async () => {
      const aliceColl = parseUnits('0.05', 9);
      await open(alice, aliceColl, parseUnits('150'));

      const pool_BTC_Before = await storagePool.getValue(BTC, true, 0);
      const pool_RawBTC_Before = await BTC.balanceOf(storagePool);

      expect(pool_BTC_Before).to.be.equal(aliceColl);
      expect(pool_RawBTC_Before).to.be.equal(aliceColl);

      // Add 1 BTC
      const collTopUp = parseUnits('1', 9);
      const amount = parseUnits('1', 9);
      const deadline = 100000000000000;
      const nonce = await BTC.nonces(alice);
      const domain = await getDomain(BTC);
      const signature = await alice.signTypedData(domain, PermitTypes, {
        owner: alice.address,
        spender: borrowerOperations.target,
        value: amount,
        nonce: nonce,
        deadline: deadline,
      });
      const { v, r, s } = Signature.from(signature);
      const collaterals = [{ tokenAddress: BTC, amount: collTopUp }];
      const afterPathCR = await contracts.troveManager.getICRIncludingPatch(alice, collaterals, [], [], []);
      const [upperHint, lowerHint] = await getHints(contracts, afterPathCR);

      await BTC.unprotectedMint(alice, amount);
      await borrowerOperations
        .connect(alice)
        .addCollWithPermit(collaterals, deadline, [v], [r], [s], upperHint, lowerHint);

      const pool_BTC_After = await storagePool.getValue(BTC, true, 0);
      const pool_RawBTC_After = await BTC.balanceOf(storagePool);
      expect(pool_BTC_After).to.be.equal(pool_BTC_Before + collTopUp);
      expect(pool_RawBTC_After).to.be.equal(pool_RawBTC_Before + collTopUp);
    });
    it('active Trove: adds the correct collateral amount to the Trove', async () => {
      // alice creates a Trove and adds first collateral
      const aliceColl = parseUnits('0.05', 9);
      await open(alice, aliceColl, parseUnits('150'));

      const alice_Trove_Before = await troveManager.Troves(alice);
      const alice_DebtAndColl_Before = await troveManager.getTroveColl(alice);
      const alice_Coll_Before = await alice_DebtAndColl_Before[0].amount;
      const status_Before = alice_Trove_Before.status;

      // check status before
      expect(status_Before).to.be.equal(1);

      // Alice adds second collateral
      const collTopUp = parseUnits('1', 9);
      await addColl(alice, contracts, [{ tokenAddress: BTC, amount: collTopUp }], true);

      const alice_Trove_After = await troveManager.Troves(alice);
      const alice_DebtAndColl_After = await troveManager.getTroveColl(alice);
      const alice_Coll_After = await alice_DebtAndColl_After[0].amount;
      const status_After = alice_Trove_After.status;

      // check coll increases by correct amount,and status remains active
      expect(alice_Coll_After).to.be.equal(alice_Coll_Before + collTopUp);
      expect(status_After).to.be.equal(1);
    });
    it('active Trove: updates the stake and updates the total stakes', async () => {
      //  Alice creates initial Trove with 1 ether
      const aliceColl = parseUnits('0.05', 9);
      await open(alice, aliceColl, parseUnits('150'));

      const BTC_Price = await priceFeed.getPrice(BTC);

      const alice_Stake_Before = await troveManager.getTroveStakeValue(alice);
      const totalStakes_Before = await troveManager.totalStakes(BTC);

      expect(alice_Stake_Before).to.be.equal((totalStakes_Before * BTC_Price) / 1_000_000_000n);

      // Alice tops up Trove collateral with 2 ether
      const collTopUp = parseUnits('1', 9);
      await addColl(alice, contracts, [{ tokenAddress: BTC, amount: collTopUp }], true);

      // Check stake and total stakes get updated
      const alice_Stake_After = await troveManager.getTroveStakeValue(alice);
      const totalStakes_After = await troveManager.totalStakes(BTC);
      expect(alice_Stake_After).to.be.equal(alice_Stake_Before + (collTopUp * BTC_Price) / 1_000_000_000n);
      expect(totalStakes_After).to.be.equal(totalStakes_Before + collTopUp);
    });
    it("active Trove: applies pending rewards and updates user's L_ETH, L_LUSDDebt snapshots", async () => {
      // --- SETUP ---
      const aliceColl = parseUnits('1.5', 9);
      const aliceDebt = parseUnits('15000');
      const { debtInUSD: aliceDebtBefore } = await open(alice, aliceColl, aliceDebt);

      const bobColl = parseUnits('1', 9);
      const bobDebt = parseUnits('10000');
      const { debtInUSD: bobDebtBefore } = await open(bob, bobColl, bobDebt);

      await open(carol, parseUnits('0.4', 9), parseUnits('5000'));

      // --- TEST ---

      // price drops to 1BTC:$10k, reducing Carol's ICR below MCR
      await setPrice('BTC', '1000', contracts);

      // Liquidate Carol's Trove,
      await liquidationOperations.liquidate(carol);

      const carolTroveStatus = await troveManager.getTroveStatus(carol);
      expect(carolTroveStatus).to.be.equal(4n); // closedByLiquidationInRecoveryMode

      const L_BTC = await troveManager.liquidatedTokens(BTC, true);
      const L_STABLE = await troveManager.liquidatedTokens(STABLE, false);
      // console.log('Liquidated Tokens:', L_BTC, L_STABLE);
      // console.log('Alice PendingReward:', await troveManager.getPendingReward(alice, BTC, true));
      // console.log('Bob PendingReward:', await troveManager.getPendingReward(bob, BTC, true));

      // check Alice and Bob's reward snapshots are zero before they alter their Troves
      const alice_BTCrewardSnapshot_Before = await troveManager.rewardSnapshots(alice, BTC, true);
      const alice_StableDebtRewardSnapshot_Before = await troveManager.rewardSnapshots(alice, BTC, true);

      const bob_BTCrewardSnapshot_Before = await troveManager.rewardSnapshots(bob, BTC, true);
      const bob_StableDebtRewardSnapshot_Before = await troveManager.rewardSnapshots(bob, BTC, true);

      expect(alice_BTCrewardSnapshot_Before).to.be.equal(0);
      expect(alice_StableDebtRewardSnapshot_Before).to.be.equal(0);
      expect(bob_BTCrewardSnapshot_Before).to.be.equal(0);
      expect(bob_StableDebtRewardSnapshot_Before).to.be.equal(0);

      const alicePendingRewardBTCBefore = await troveManager.getPendingReward(alice, BTC, true);
      const bobPendingRewardBTCBefore = await troveManager.getPendingReward(bob, BTC, true);
      const alicePendingRewardStableBefore = await troveManager.getPendingReward(alice, STABLE, false);
      const bobPendingRewardStableBefore = await troveManager.getPendingReward(bob, STABLE, false);
      // console.log(alicePendingRewardBTC, alicePendingRewardStable);
      // console.log(bobPendingRewardBTC, bobPendingRewardStable);
      // TODO: Checking liquidation rewards again
      // expect(alicePendingRewardBTC).to.be.equal(0);
      // expect(bobPendingRewardBTC).to.be.equal(0);
      // expect(alicePendingRewardStable).to.be.equal(0);
      // expect(bobPendingRewardStable).to.be.equal(0);

      // Alice and Bob top up their Troves
      const aliceTopup = parseUnits('5', 9);
      await addColl(alice, contracts, [{ tokenAddress: BTC, amount: aliceTopup }], true);
      const bobTopup = parseUnits('1', 9);
      await addColl(bob, contracts, [{ tokenAddress: BTC, amount: bobTopup }], true);

      const alicePendingRewardBTCAfter = await troveManager.getPendingReward(alice, BTC, true);
      const alicePendingRewardStableAfter = await troveManager.getPendingReward(alice, STABLE, false);
      const bobPendingRewardBTCAfter = await troveManager.getPendingReward(bob, BTC, true);
      const bobPendingRewardStableAfter = await troveManager.getPendingReward(bob, STABLE, false);
      // Check that both alice and Bob have had pending rewards applied in addition to their top-ups.
      const aliceNewColl = await getTroveEntireColl(contracts, alice);
      const aliceNewDebt = await getTroveEntireDebt(contracts, alice);
      const bobNewColl = await getTroveEntireColl(contracts, bob);
      const bobNewDebt = await getTroveEntireDebt(contracts, bob);

      expect(aliceNewColl).to.be.equal(
        (alicePendingRewardBTCBefore + alicePendingRewardBTCAfter + aliceTopup + aliceColl) * parseUnits('1000', 9)
      );
      expect(aliceNewDebt).to.be.equal(
        aliceDebtBefore + alicePendingRewardStableAfter + alicePendingRewardStableBefore
      );
      expect(bobNewColl).to.be.equal(
        (bobPendingRewardBTCBefore + bobPendingRewardBTCAfter + bobTopup + bobColl) * parseUnits('1000', 9)
      );
      expect(bobNewDebt).to.be.equal(bobDebtBefore + bobPendingRewardStableAfter + bobPendingRewardStableBefore);

      /* Check that both Alice and Bob's snapshots of the rewards-per-unit-staked metrics should be updated
       to the latest values of L_ETH and L_LUSDDebt */
      const alice_BTCrewardSnapshot_After = await troveManager.rewardSnapshots(alice, BTC, true);
      const alice_StableDebtRewardSnapshot_After = await troveManager.rewardSnapshots(alice, STABLE, false);

      const bob_BTCrewardSnapshot_After = await troveManager.rewardSnapshots(bob, BTC, true);
      const bob_StableDebtRewardSnapshot_After = await troveManager.rewardSnapshots(bob, STABLE, false);

      expect(alice_BTCrewardSnapshot_After).to.be.closeTo(L_BTC, 100n);
      expect(alice_StableDebtRewardSnapshot_After).to.be.closeTo(L_STABLE, 100n);
      expect(bob_BTCrewardSnapshot_After).to.be.closeTo(L_BTC, 100n);
      expect(bob_StableDebtRewardSnapshot_After).to.be.closeTo(L_STABLE, 100n);
    });
    it('reverts if trove is non-existent or closed', async () => {
      // A, B open troves
      const aliceColl = parseUnits('1.5', 9);
      const aliceDebt = parseUnits('15000');
      await open(alice, aliceColl, aliceDebt);
      const bobColl = parseUnits('1.5', 9);
      const bobDebt = parseUnits('15000');
      await open(bob, bobColl, bobDebt);

      // Carol attempts to add collateral to her non-existent trove
      await expect(
        addColl(carol, contracts, [{ tokenAddress: BTC, amount: parseUnits('1', 9) }], true)
      ).to.be.revertedWithCustomError(borrowerOperations, 'TroveClosedOrNotExist');

      // Price drops
      await setPrice('BTC', '1000', contracts);

      // Bob gets liquidated
      await liquidationOperations.liquidate(bob);

      // Bob attempts to add collateral to his closed trove
      await expect(
        addColl(bob, contracts, [{ tokenAddress: BTC, amount: parseUnits('1', 9) }], true)
      ).to.be.revertedWithCustomError(borrowerOperations, 'TroveClosedOrNotExist');
    });
    it('can add collateral in Recovery Mode', async () => {
      const aliceColl = parseUnits('1.5', 9);
      const aliceDebt = parseUnits('15000');
      await open(alice, aliceColl, aliceDebt);
      const aliceCollBefore = await troveManager.getTroveColl(alice);

      expect(await checkRecoveryMode(contracts)).to.be.false;

      await setPrice('BTC', '1000', contracts);

      expect(await checkRecoveryMode(contracts)).to.be.true;

      const collTopUp = parseUnits('1', 9);
      await addColl(alice, contracts, [{ tokenAddress: BTC, amount: collTopUp }], true);

      // Check Alice's collateral
      const aliceCollAfter = await troveManager.getTroveColl(alice);
      // const aliceCollAfter = (await troveManager.Troves(alice)).;
      expect(aliceCollAfter[0].amount).to.be.equal(aliceCollBefore[0].amount + collTopUp);
    });
  });

  describe('withdrawColl():', () => {
    it('reverts when withdrawal would leave trove with ICR < MCR', async () => {
      // alice creates a Trove and adds first collateral
      const aliceColl = parseUnits('1.5', 9);
      const aliceDebt = parseUnits('1500');
      await open(alice, aliceColl, aliceDebt);

      const bobColl = parseUnits('1', 9);
      const bobDebt = parseUnits('1');
      await open(bob, bobColl, bobDebt);

      // Price drops
      await setPrice('BTC', '1200', contracts);

      expect((await storagePool.checkRecoveryMode()).isInRecoveryMode).to.be.false;
      expect((await troveManager.getCurrentICR(alice)).ICR).to.be.lt(parseUnits('1.1')); // less than 110%

      await expect(addColl(alice, contracts, [{ tokenAddress: BTC, amount: 1 }], true)).to.be.revertedWithCustomError(
        borrowerOperations,
        'ICR_lt_MCR'
      );
    });
    it('reverts when calling address does not have active trove', async () => {
      const aliceColl = parseUnits('1.5', 9);
      const aliceDebt = parseUnits('1000');
      await open(alice, aliceColl, aliceDebt);
      const bobColl = parseUnits('1', 9);
      const bobDebt = parseUnits('10000');
      await open(bob, bobColl, bobDebt);

      // Bob successfully withdraws some coll
      await withdrawalColl(bob, contracts, [{ tokenAddress: BTC, amount: parseUnits('0.1', 9) }]);

      // Carol with no active trove attempts to withdraw
      await expect(
        withdrawalColl(carol, contracts, [{ tokenAddress: BTC, amount: parseUnits('0.1', 9) }])
      ).to.be.revertedWithCustomError(borrowerOperations, 'TroveClosedOrNotExist');
    });
    it('reverts when system is in Recovery Mode', async () => {
      const aliceColl = parseUnits('1.5', 9);
      const aliceDebt = parseUnits('10000');
      await open(alice, aliceColl, aliceDebt);
      const bobColl = parseUnits('1.5', 9);
      const bobDebt = parseUnits('10000');
      await open(bob, bobColl, bobDebt);

      expect(await checkRecoveryMode(contracts)).to.be.false;

      // Withdrawal possible when recoveryMode == false
      await withdrawalColl(alice, contracts, [{ tokenAddress: BTC, amount: 1000 }]);

      await setPrice('BTC', '1000', contracts);

      expect(await checkRecoveryMode(contracts)).to.be.true;

      //Check withdrawal impossible when recoveryMode == true
      await expect(
        withdrawalColl(alice, contracts, [{ tokenAddress: BTC, amount: 1000 }])
      ).to.be.revertedWithCustomError(borrowerOperations, 'CollWithdrawPermittedInRM');
    });
    it("reverts when requested ETH withdrawal is > the trove's collateral", async () => {
      const aliceColl = parseUnits('1.5', 9);
      const aliceDebt = parseUnits('10000');
      await open(alice, aliceColl, aliceDebt);
      const bobColl = parseUnits('1', 9);
      const bobDebt = parseUnits('10000');
      await open(bob, bobColl, bobDebt);
      const carolColl = parseUnits('1.5', 9);
      const carolDebt = parseUnits('10000');
      await open(carol, carolColl, carolDebt);

      // Carol withdraws exactly all her collateral
      await expect(
        withdrawalColl(carol, contracts, [{ tokenAddress: BTC, amount: carolColl }])
      ).to.be.revertedWithCustomError(borrowerOperations, 'ICR_lt_MCR');

      // Bob attempts to withdraw 1 wei more than his collateral
      await expect(
        withdrawalColl(bob, contracts, [{ tokenAddress: BTC, amount: bobColl + 1n }])
      ).to.be.revertedWithCustomError(borrowerOperations, 'WithdrawAmount_gt_Coll');
    });
    it("reverts when withdrawal would bring the user's ICR < MCR", async () => {
      await setPrice('BTC', '11000', contracts);
      await open(whale, parseUnits('1.5', 9), parseUnits('1000'));
      // BOB ICR = 110%
      await open(bob, parseUnits('1', 9), parseUnits('9750'));

      // Bob attempts to withdraws 1 wei, Which would leave him with < 110% ICR.
      await expect(
        withdrawalColl(bob, contracts, [{ tokenAddress: BTC, amount: parseUnits('0.1', 9) }])
      ).to.be.revertedWithCustomError(borrowerOperations, 'ICR_lt_MCR');
    });
    it('reverts if system is in Recovery Mode', async () => {
      // --- SETUP ---

      // A and B open troves at 150% ICR
      const aliceColl = parseUnits('1.5', 9);
      const aliceDebt = parseUnits('10000');
      await open(alice, aliceColl, aliceDebt);
      const bobColl = parseUnits('1', 9);
      const bobDebt = parseUnits('10000');
      await open(bob, bobColl, bobDebt);

      const TCR = await getTCR(contracts);
      expect(TCR).to.be.gt(parseUnits('1.5')); // gt 150%

      // --- TEST ---

      // price drops to 1ETH:150LUSD, reducing TCR below 150%
      await setPrice('BTC', '1000', contracts);

      //Alice tries to withdraw collateral during Recovery Mode
      await expect(withdrawalColl(alice, contracts, [{ tokenAddress: BTC, amount: 1 }])).to.be.revertedWithCustomError(
        borrowerOperations,
        'CollWithdrawPermittedInRM'
      );
    });
    it('doesn’t allow a user to completely withdraw all collateral from their Trove (due to gas compensation)', async () => {
      const aliceColl = parseUnits('1.5', 9);
      const aliceDebt = parseUnits('10000');
      await open(alice, aliceColl, aliceDebt);
      const bobColl = parseUnits('1', 9);
      const bobDebt = parseUnits('10000');
      await open(bob, bobColl, bobDebt);

      // Check Trove is active
      const alice_Trove_Before = await troveManager.Troves(alice);
      expect(alice_Trove_Before.status).to.be.equal(1);

      // Alice attempts to withdraw all collateral
      await expect(
        withdrawalColl(alice, contracts, [{ tokenAddress: BTC, amount: aliceColl }])
      ).to.be.revertedWithCustomError(borrowerOperations, 'ICR_lt_MCR');
    });
    it('leaves the Trove active when the user withdraws less than all the collateral', async () => {
      // Open Trove
      const aliceColl = parseUnits('1.5', 9);
      const aliceDebt = parseUnits('10000');
      await open(alice, aliceColl, aliceDebt);

      // Check Trove is active
      const alice_Trove_Before = await troveManager.Troves(alice);
      expect(alice_Trove_Before.status).to.be.equal(1);

      // Withdraw some collateral
      await withdrawalColl(alice, contracts, [{ tokenAddress: BTC, amount: parseUnits('0.1', 9) }]);

      // Check Trove is still active
      const alice_Trove_After = await troveManager.Troves(alice);
      expect(alice_Trove_After.status).to.be.equal(1);
    });
    it("reduces the Trove's collateral by the correct amount", async () => {
      const aliceColl = parseUnits('1.5', 9);
      const aliceDebt = parseUnits('10000');
      await open(alice, aliceColl, aliceDebt);

      // Alice withdraws 1 ether
      const withdrawColl = parseUnits('0.1', 9);
      await withdrawalColl(alice, contracts, [{ tokenAddress: BTC, amount: withdrawColl }]);

      // Check 1 ether remaining
      const troveAfter = await troveManager.getTroveColl(alice);
      const aliceCollAfter = troveAfter[0].amount;

      expect(aliceCollAfter).to.be.equal(aliceColl - withdrawColl);
    });
    it('reduces ActivePool ETH and raw ether by correct amount', async () => {
      const aliceColl = parseUnits('1.5', 9);
      const aliceDebt = parseUnits('10000');
      await open(alice, aliceColl, aliceDebt);

      // check before
      const activePool_BTC_before = await storagePool.getValue(BTC, true, 0);
      const activePool_RawBTC_before = await BTC.balanceOf(storagePool);

      const withdrawColl = parseUnits('0.1', 9);
      await withdrawalColl(alice, contracts, [{ tokenAddress: BTC, amount: withdrawColl }]);

      // check after
      const activePool_BTC_After = await storagePool.getValue(BTC, true, 0);
      const activePool_RawBTC_After = await BTC.balanceOf(storagePool);
      expect(activePool_BTC_After).to.be.equal(activePool_BTC_before - withdrawColl);
      expect(activePool_RawBTC_After).to.be.equal(activePool_RawBTC_before - withdrawColl);
    });
    it('updates the stake and updates the total stakes', async () => {
      //  Alice creates initial Trove with 2 ether
      const aliceColl = parseUnits('1.5', 9);
      const aliceDebt = parseUnits('10000');
      await open(alice, aliceColl, aliceDebt);

      const alice_Stake_Before = await troveManager.getTroveStakes(alice, BTC);
      const totalStakes_Before = await troveManager.totalStakes(BTC);

      expect(alice_Stake_Before).to.be.equal(aliceColl);
      expect(totalStakes_Before).to.be.equal(aliceColl);

      // Alice withdraws 1 ether
      const withdrawColl = parseUnits('0.1', 9);
      await withdrawalColl(alice, contracts, [{ tokenAddress: BTC, amount: withdrawColl }]);

      // Check stake and total stakes get updated
      const alice_Stake_After = await troveManager.getTroveStakes(alice, BTC);
      const totalStakes_After = await troveManager.totalStakes(BTC);

      expect(alice_Stake_After).to.be.equal(alice_Stake_Before - withdrawColl);
      expect(totalStakes_After).to.be.equal(totalStakes_Before - withdrawColl);
    });
    it('sends the correct amount of ETH to the user', async () => {
      const aliceColl = parseUnits('1.5', 9);
      const aliceDebt = parseUnits('10000');
      await open(alice, aliceColl, aliceDebt);

      const alice_BTC_Bal_Before = await BTC.balanceOf(alice);
      const withdrawColl = parseUnits('0.1', 9);
      await withdrawalColl(alice, contracts, [{ tokenAddress: BTC, amount: withdrawColl }]);

      const alice_BTC_Bal_After = await BTC.balanceOf(alice);
      expect(alice_BTC_Bal_After).to.be.equal(alice_BTC_Bal_Before + withdrawColl);
    });
    it("applies pending rewards and updates user's L_ETH, L_LUSDDebt snapshots", async () => {
      // --- SETUP ---
      // Alice adds 15 ether, Bob adds 5 ether, Carol adds 1 ether
      await open(whale, parseUnits('10', 9), parseUnits('1'));
      const aliceColl = parseUnits('1.5', 9);
      const aliceDebt = parseUnits('1000');
      await open(alice, aliceColl, aliceDebt);
      const bobColl = parseUnits('1', 9);
      const bobDebt = parseUnits('1000');
      await open(bob, bobColl, bobDebt);
      const carolColl = parseUnits('0.1', 9);
      const carolDebt = parseUnits('1200');
      await open(carol, carolColl, carolDebt);

      const aliceDebtBefore = (await troveManager.getTroveDebt(alice))[0].amount;
      const bobDebtBefore = (await troveManager.getTroveDebt(bob))[0].amount;

      // --- TEST ---

      // price drops to 1ETH:100LUSD, reducing Carol's ICR below MCR
      await setPrice('BTC', '5000', contracts);

      // close Carol's Trove, liquidating her 1 ether and 180LUSD.
      await liquidationOperations.liquidate(carol);

      const L_BTC = await troveManager.liquidatedTokens(BTC, true);
      const L_STABLE = await troveManager.liquidatedTokens(STABLE, false);

      // check Alice and Bob's reward snapshots are zero before they alter their Troves
      const alice_BTCrewardSnapshot_Before = await troveManager.rewardSnapshots(alice, BTC, true);
      const alice_StableDebtRewardSnapshot_Before = await troveManager.rewardSnapshots(alice, STABLE, false);
      const bob_BTCrewardSnapshot_Before = await troveManager.rewardSnapshots(bob, BTC, true);
      const bob_StableDebtRewardSnapshot_Before = await troveManager.rewardSnapshots(bob, STABLE, false);

      expect(alice_BTCrewardSnapshot_Before).to.be.equal(0n);
      expect(alice_StableDebtRewardSnapshot_Before).to.be.equal(0n);
      expect(bob_BTCrewardSnapshot_Before).to.be.equal(0n);
      expect(bob_StableDebtRewardSnapshot_Before).to.be.equal(0n);

      // Check A and B have pending rewards
      const pendingCollReward_A = await troveManager.getPendingReward(alice, BTC, true);
      const pendingDebtReward_A = await troveManager.getPendingReward(alice, STABLE, false);
      const pendingCollReward_B = await troveManager.getPendingReward(bob, BTC, true);
      const pendingDebtReward_B = await troveManager.getPendingReward(bob, STABLE, false);

      // TODO: Check pending rewards again
      // for (reward of [pendingCollReward_A, pendingDebtReward_A, pendingCollReward_B, pendingDebtReward_B]) {
      //   assert.isTrue(reward.gt(toBN('0')));
      // }

      // Alice and Bob withdraw from their Troves
      const aliceCollWithdrawal = parseUnits('0.2', 9);
      const bobCollWithdrawal = parseUnits('0.1', 9);

      await withdrawalColl(alice, contracts, [{ tokenAddress: BTC, amount: aliceCollWithdrawal }]);
      await withdrawalColl(bob, contracts, [{ tokenAddress: BTC, amount: bobCollWithdrawal }]);

      // Check that both alice and Bob have had pending rewards applied in addition to their top-ups.
      const aliceCollAfter = (await troveManager.getTroveColl(alice))[0].amount;
      const aliceDebtAfter = (await troveManager.getTroveDebt(alice))[0].amount;
      const bobCollAfter = (await troveManager.getTroveColl(bob))[0].amount;
      const bobDebtAfter = (await troveManager.getTroveDebt(bob))[0].amount;

      // Check rewards have been applied to troves
      expect(aliceCollAfter).to.be.closeTo(aliceColl - aliceCollWithdrawal + pendingCollReward_A, 10000n);
      expect(aliceDebtAfter).to.be.closeTo(aliceDebtBefore + pendingDebtReward_A, 10000n);
      expect(bobCollAfter).to.be.closeTo(bobColl - bobCollWithdrawal + pendingCollReward_B, 10000n);
      expect(bobDebtAfter).to.be.closeTo(bobDebtBefore + pendingDebtReward_B, 10000n);

      /* After top up, both Alice and Bob's snapshots of the rewards-per-unit-staked metrics should be updated
       to the latest values of L_ETH and L_LUSDDebt */
      const alice_BTCrewardSnapshot_After = await troveManager.rewardSnapshots(alice, BTC, true);
      const alice_StableDebtRewardSnapshot_After = await troveManager.rewardSnapshots(alice, STABLE, false);
      const bob_BTCrewardSnapshot_After = await troveManager.rewardSnapshots(bob, BTC, true);
      const bob_StableDebtRewardSnapshot_After = await troveManager.rewardSnapshots(bob, STABLE, false);

      expect(alice_BTCrewardSnapshot_After).to.be.closeTo(alice_BTCrewardSnapshot_Before + L_BTC, 100n);
      expect(alice_StableDebtRewardSnapshot_After).to.be.closeTo(
        alice_StableDebtRewardSnapshot_Before + L_STABLE,
        100n
      );
      expect(bob_BTCrewardSnapshot_After).to.be.closeTo(bob_BTCrewardSnapshot_Before + L_BTC, 100n);
      expect(bob_StableDebtRewardSnapshot_After).to.be.closeTo(bob_StableDebtRewardSnapshot_Before + L_STABLE, 100n);
    });
  });

  describe('increaseDebts()', () => {
    it('reverts when withdrawal would leave trove with ICR < MCR', async () => {
      // alice creates a Trove and adds first collateral
      const aliceColl = parseUnits('1.5', 9);
      const aliceDebt = parseUnits('1000');
      await open(alice, aliceColl, aliceDebt);
      const bobColl = parseUnits('1', 9);
      const bobDebt = parseUnits('5000');
      await open(bob, bobColl, bobDebt);
      // Price drops
      await setPrice('BTC', '5000', contracts);

      expect(await checkRecoveryMode(contracts)).to.be.false;
      expect((await troveManager.getCurrentICR(bob)).ICR).to.be.lt(parseUnits('1.1'));

      const stableMint = 1; // withdraw 1 wei LUSD

      await expect(
        increaseDebt(bob, contracts, [{ tokenAddress: STABLE, amount: stableMint }])
      ).to.be.revertedWithCustomError(borrowerOperations, 'ICR_lt_MCR');
    });
    it('decays a non-zero base rate', async () => {
      await open(whale, parseUnits('10', 9), parseUnits('1'));
      await open(alice, parseUnits('1', 9), parseUnits('10000'));
      await open(bob, parseUnits('1', 9), parseUnits('10000'));
      await open(carol, parseUnits('1', 9), parseUnits('10000'));
      await open(dennis, parseUnits('1', 9), parseUnits('10000'));

      // Artificially set base rate to 5%
      await troveManager.setBaseRate(parseUnits('0.05'));

      // Check baseRate is now non-zero
      const baseRate_1 = await troveManager.getStableCoinBaseRate();
      expect(baseRate_1).to.be.equal(parseUnits('0.05'));

      // 2 hours pass
      await fastForwardTime(60 * 60 * 2);

      // D withdraws LUSD
      await increaseDebt(dennis, contracts, [{ tokenAddress: STABLE, amount: parseUnits('1') }]);

      // Check baseRate has decreased
      const baseRate_2 = await troveManager.getStableCoinBaseRate();
      expect(baseRate_2).to.be.lt(baseRate_1);

      // 1 hour passes
      await fastForwardTime(60 * 60);

      // E withdraws LUSD
      await increaseDebt(carol, contracts, [{ tokenAddress: STABLE, amount: parseUnits('1') }]);

      const baseRate_3 = await troveManager.getStableCoinBaseRate();
      expect(baseRate_3).to.be.lt(baseRate_2);
    });
    it('reverts if max fee > 100%', async () => {
      await open(alice, parseUnits('1', 9), parseUnits('10000'));

      await expect(
        increaseDebt(alice, contracts, [{ tokenAddress: STABLE, amount: parseUnits('1') }], parseUnits('2'))
      ).to.be.revertedWithCustomError(borrowerOperations, 'MaxFee_out_Range');
      await expect(
        increaseDebt(alice, contracts, [{ tokenAddress: STABLE, amount: parseUnits('1') }], parseUnits('1') + 1n)
      ).to.be.revertedWithCustomError(borrowerOperations, 'MaxFee_out_Range');
    });
    it('reverts if max fee < 0.5% in Normal mode', async () => {
      await open(alice, parseUnits('1', 9), parseUnits('10000'));

      await expect(
        increaseDebt(alice, contracts, [{ tokenAddress: STABLE, amount: parseUnits('1') }], 0n)
      ).to.be.revertedWithCustomError(borrowerOperations, 'MaxFee_out_Range');
      await expect(
        increaseDebt(alice, contracts, [{ tokenAddress: STABLE, amount: parseUnits('1') }], 1n)
      ).to.be.revertedWithCustomError(borrowerOperations, 'MaxFee_out_Range');
      await expect(
        increaseDebt(alice, contracts, [{ tokenAddress: STABLE, amount: parseUnits('1') }], parseUnits('0.005') - 1n)
      ).to.be.revertedWithCustomError(borrowerOperations, 'MaxFee_out_Range');
    });
    it('succeeds when fee is less than max fee percentage', async () => {
      await open(alice, parseUnits('1', 9), parseUnits('10000'));

      // Artificially make baseRate 5%
      await troveManager.setBaseRate(parseUnits('0.05'));
      await troveManager.setLastFeeOpTimeToNow();

      let baseRate = await troveManager.getStableCoinBaseRate(); // expect 5% base rate
      expect(baseRate).to.be.equal(parseUnits('0.05'));

      // Attempt with maxFee > 5%
      await expect(
        increaseDebt(alice, contracts, [{ tokenAddress: STABLE, amount: parseUnits('1') }], MAX_BORROWING_FEE + 1n)
      ).to.be.revertedWithCustomError(borrowerOperations, 'MaxFee_out_Range');

      baseRate = await troveManager.getStableCoinBaseRate(); // expect 5% base rate
      expect(baseRate).to.be.equal(parseUnits('0.05'));

      // Attempt with maxFee = 5%
      await increaseDebt(alice, contracts, [{ tokenAddress: STABLE, amount: parseUnits('1') }], parseUnits('0.05'));

      baseRate = await troveManager.getStableCoinBaseRate(); // expect 5% base rate
      expect(baseRate).to.be.equal(parseUnits('0.05'));
    });
    it("doesn't change base rate if it is already zero", async () => {
      await open(whale, parseUnits('10', 9), parseUnits('10000'));
      await open(alice, parseUnits('1', 9), parseUnits('10000'));
      await open(bob, parseUnits('2', 9), parseUnits('20000'));

      // Check baseRate is zero
      const baseRate_1 = await troveManager.getStableCoinBaseRate();
      expect(baseRate_1).to.be.equal(0n);

      // 2 hours pass
      await fastForwardTime(7200);

      // D withdraws LUSD
      await increaseDebt(alice, contracts, [{ tokenAddress: STABLE, amount: parseUnits('37') }]);

      // Check baseRate is still 0
      const baseRate_2 = await troveManager.getStableCoinBaseRate();
      expect(baseRate_2).to.be.equal(0n);

      // 1 hour passes
      await fastForwardTime(3600);

      // E opens trove
      await increaseDebt(bob, contracts, [{ tokenAddress: STABLE, amount: parseUnits('12') }]);

      const baseRate_3 = await troveManager.getStableCoinBaseRate();
      expect(baseRate_3).to.be.equal(0n);
    });
    it("lastFeeOpTime doesn't update if less time than decay interval has passed since the last fee operation", async () => {
      await open(whale, parseUnits('10', 9), parseUnits('10000'));
      await open(alice, parseUnits('1', 9), parseUnits('10000'));
      await open(bob, parseUnits('2', 9), parseUnits('20000'));

      // Artificially make baseRate 5%
      await troveManager.setBaseRate(parseUnits('0.05'));
      await troveManager.setLastFeeOpTimeToNow();

      // Check baseRate is now non-zero
      const baseRate_1 = await troveManager.getStableCoinBaseRate();
      expect(baseRate_1).to.be.equal(parseUnits('0.05'));

      const lastFeeOpTime_1 = await troveManager.lastFeeOperationTime();

      // 10 seconds pass
      await fastForwardTime(10);

      // Borrower C triggers a fee
      await increaseDebt(bob, contracts, [{ tokenAddress: STABLE, amount: parseUnits('1') }]);

      const lastFeeOpTime_2 = await troveManager.lastFeeOperationTime();

      // Check that the last fee operation time did not update, as borrower D's debt issuance occured
      // since before minimum interval had passed
      expect(lastFeeOpTime_2).to.be.equal(lastFeeOpTime_1);

      // 60 seconds passes
      await fastForwardTime(60);

      // Check that now, at least one minute has passed since lastFeeOpTime_1
      const timeNow = await getLatestBlockTimestamp();
      expect(BigInt(timeNow) - lastFeeOpTime_1).to.be.gte(60n);

      // Borrower C triggers a fee
      await increaseDebt(bob, contracts, [{ tokenAddress: STABLE, amount: parseUnits('1') }]);

      const lastFeeOpTime_3 = await troveManager.lastFeeOperationTime();

      // Check that the last fee operation time DID update, as borrower's debt issuance occured
      // after minimum interval had passed
      expect(lastFeeOpTime_3).to.be.gt(lastFeeOpTime_1);
    });
    it("borrower can't grief the baseRate and stop it decaying by issuing debt at higher frequency than the decay granularity", async () => {
      await open(whale, parseUnits('10', 9), parseUnits('10000'));
      await open(alice, parseUnits('1', 9), parseUnits('10000'));
      await open(bob, parseUnits('2', 9), parseUnits('20000'));

      // Artificially make baseRate 5%
      await troveManager.setBaseRate(parseUnits('0.05'));
      await troveManager.setLastFeeOpTimeToNow();

      // Check baseRate is now non-zero
      const baseRate_1 = await troveManager.getStableCoinBaseRate();
      expect(baseRate_1).to.be.equal(parseUnits('0.05'));

      // 30 seconds pass
      await fastForwardTime(30);

      // Borrower C triggers a fee, before decay interval has passed
      await increaseDebt(bob, contracts, [{ tokenAddress: STABLE, amount: parseUnits('1') }]);

      // 30 seconds pass
      await fastForwardTime(30);

      // Borrower C triggers another fee
      await increaseDebt(bob, contracts, [{ tokenAddress: STABLE, amount: parseUnits('1') }]);

      // Check base rate has decreased even though Borrower tried to stop it decaying
      const baseRate_2 = await troveManager.getStableCoinBaseRate();
      expect(baseRate_2).to.be.lt(baseRate_1);
    });
    // TODO: Take care after staking enabled
    // it('borrowing at non-zero base rate sends LUSD fee to LQTY staking contract', async () => {
    //   // time fast-forwards 1 year, and multisig stakes 1 LQTY
    //   await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider);
    //   await lqtyToken.approve(lqtyStaking.address, dec(1, 18), {
    //     from: multisig,
    //   });
    //   await lqtyStaking.stake(dec(1, 18), { from: multisig });

    //   // Check LQTY LUSD balance before == 0
    //   const lqtyStaking_LUSDBalance_Before = await lusdToken.balanceOf(lqtyStaking.address);
    //   assert.equal(lqtyStaking_LUSDBalance_Before, '0');

    //   await openTrove({ ICR: toBN(dec(10, 18)), extraParams: { from: whale } });
    //   await openTrove({
    //     extraLUSDAmount: toBN(dec(30, 18)),
    //     ICR: toBN(dec(2, 18)),
    //     extraParams: { from: A },
    //   });
    //   await openTrove({
    //     extraLUSDAmount: toBN(dec(40, 18)),
    //     ICR: toBN(dec(2, 18)),
    //     extraParams: { from: B },
    //   });
    //   await openTrove({
    //     extraLUSDAmount: toBN(dec(50, 18)),
    //     ICR: toBN(dec(2, 18)),
    //     extraParams: { from: C },
    //   });
    //   await openTrove({
    //     extraLUSDAmount: toBN(dec(50, 18)),
    //     ICR: toBN(dec(2, 18)),
    //     extraParams: { from: D },
    //   });

    //   // Artificially make baseRate 5%
    //   await troveManager.setBaseRate(dec(5, 16));
    //   await troveManager.setLastFeeOpTimeToNow();

    //   // Check baseRate is now non-zero
    //   const baseRate_1 = await troveManager.getStableCoinBaseRate();
    //   assert.isTrue(baseRate_1.gt(toBN('0')));

    //   // 2 hours pass
    //   th.fastForwardTime(7200, web3.currentProvider);

    //   // D withdraws LUSD
    //   await borrowerOperations.increaseDebts(th._100pct, dec(37, 18), C, C, {
    //     from: D,
    //   });

    //   // Check LQTY LUSD balance after has increased
    //   const lqtyStaking_LUSDBalance_After = await lusdToken.balanceOf(lqtyStaking.address);
    //   assert.isTrue(lqtyStaking_LUSDBalance_After.gt(lqtyStaking_LUSDBalance_Before));
    // });

    // if (!withProxy) {
    //   // TODO: use rawLogs instead of logs
    //   it('borrowing at non-zero base records the (drawn debt + fee) on the Trove struct', async () => {
    //     // time fast-forwards 1 year, and multisig stakes 1 LQTY
    //     await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider);
    //     await lqtyToken.approve(lqtyStaking.address, dec(1, 18), {
    //       from: multisig,
    //     });
    //     await lqtyStaking.stake(dec(1, 18), { from: multisig });

    //     await openTrove({
    //       ICR: toBN(dec(10, 18)),
    //       extraParams: { from: whale },
    //     });
    //     await openTrove({
    //       extraLUSDAmount: toBN(dec(30, 18)),
    //       ICR: toBN(dec(2, 18)),
    //       extraParams: { from: A },
    //     });
    //     await openTrove({
    //       extraLUSDAmount: toBN(dec(40, 18)),
    //       ICR: toBN(dec(2, 18)),
    //       extraParams: { from: B },
    //     });
    //     await openTrove({
    //       extraLUSDAmount: toBN(dec(50, 18)),
    //       ICR: toBN(dec(2, 18)),
    //       extraParams: { from: C },
    //     });
    //     await openTrove({
    //       extraLUSDAmount: toBN(dec(50, 18)),
    //       ICR: toBN(dec(2, 18)),
    //       extraParams: { from: D },
    //     });
    //     const D_debtBefore = await getTroveEntireDebt(D);

    //     // Artificially make baseRate 5%
    //     await troveManager.setBaseRate(dec(5, 16));
    //     await troveManager.setLastFeeOpTimeToNow();

    //     // Check baseRate is now non-zero
    //     const baseRate_1 = await troveManager.getStableCoinBaseRate();
    //     assert.isTrue(baseRate_1.gt(toBN('0')));

    //     // 2 hours pass
    //     th.fastForwardTime(7200, web3.currentProvider);

    //     // D withdraws LUSD
    //     const withdrawal_D = toBN(dec(37, 18));
    //     const withdrawalTx = await borrowerOperations.increaseDebts(th._100pct, toBN(dec(37, 18)), D, D, { from: D });

    //     const emittedFee = toBN(th.getLUSDFeeFromLUSDBorrowingEvent(withdrawalTx));
    //     assert.isTrue(emittedFee.gt(toBN('0')));

    //     const newDebt = (await troveManager.Troves(D))[0];

    //     // Check debt on Trove struct equals initial debt + withdrawal + emitted fee
    //     th.assertIsApproximatelyEqual(newDebt, D_debtBefore.add(withdrawal_D).add(emittedFee), 10000);
    //   });
    // }
    // it('Borrowing at non-zero base rate increases the LQTY staking contract LUSD fees-per-unit-staked', async () => {
    //   // time fast-forwards 1 year, and multisig stakes 1 LQTY
    //   await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider);
    //   await lqtyToken.approve(lqtyStaking.address, dec(1, 18), {
    //     from: multisig,
    //   });
    //   await lqtyStaking.stake(dec(1, 18), { from: multisig });

    //   // Check LQTY contract LUSD fees-per-unit-staked is zero
    //   const F_LUSD_Before = await lqtyStaking.F_LUSD();
    //   assert.equal(F_LUSD_Before, '0');

    //   await openTrove({ ICR: toBN(dec(10, 18)), extraParams: { from: whale } });
    //   await openTrove({
    //     extraLUSDAmount: toBN(dec(30, 18)),
    //     ICR: toBN(dec(2, 18)),
    //     extraParams: { from: A },
    //   });
    //   await openTrove({
    //     extraLUSDAmount: toBN(dec(40, 18)),
    //     ICR: toBN(dec(2, 18)),
    //     extraParams: { from: B },
    //   });
    //   await openTrove({
    //     extraLUSDAmount: toBN(dec(50, 18)),
    //     ICR: toBN(dec(2, 18)),
    //     extraParams: { from: C },
    //   });
    //   await openTrove({
    //     extraLUSDAmount: toBN(dec(50, 18)),
    //     ICR: toBN(dec(2, 18)),
    //     extraParams: { from: D },
    //   });

    //   // Artificially make baseRate 5%
    //   await troveManager.setBaseRate(dec(5, 16));
    //   await troveManager.setLastFeeOpTimeToNow();

    //   // Check baseRate is now non-zero
    //   const baseRate_1 = await troveManager.getStableCoinBaseRate();
    //   assert.isTrue(baseRate_1.gt(toBN('0')));

    //   // 2 hours pass
    //   th.fastForwardTime(7200, web3.currentProvider);

    //   // D withdraws LUSD
    //   await borrowerOperations.increaseDebts(th._100pct, toBN(dec(37, 18)), D, D, { from: D });

    //   // Check LQTY contract LUSD fees-per-unit-staked has increased
    //   const F_LUSD_After = await lqtyStaking.F_LUSD();
    //   assert.isTrue(F_LUSD_After.gt(F_LUSD_Before));
    // });

    // it('Borrowing at non-zero base rate sends requested amount to the user', async () => {
    //   // time fast-forwards 1 year, and multisig stakes 1 LQTY
    //   await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider);
    //   await lqtyToken.approve(lqtyStaking.address, dec(1, 18), {
    //     from: multisig,
    //   });
    //   await lqtyStaking.stake(dec(1, 18), { from: multisig });

    //   // Check LQTY Staking contract balance before == 0
    //   const lqtyStaking_LUSDBalance_Before = await lusdToken.balanceOf(lqtyStaking.address);
    //   assert.equal(lqtyStaking_LUSDBalance_Before, '0');

    //   await openTrove({ ICR: toBN(dec(10, 18)), extraParams: { from: whale } });
    //   await openTrove({
    //     extraLUSDAmount: toBN(dec(30, 18)),
    //     ICR: toBN(dec(2, 18)),
    //     extraParams: { from: A },
    //   });
    //   await openTrove({
    //     extraLUSDAmount: toBN(dec(40, 18)),
    //     ICR: toBN(dec(2, 18)),
    //     extraParams: { from: B },
    //   });
    //   await openTrove({
    //     extraLUSDAmount: toBN(dec(50, 18)),
    //     ICR: toBN(dec(2, 18)),
    //     extraParams: { from: C },
    //   });
    //   await openTrove({
    //     extraLUSDAmount: toBN(dec(50, 18)),
    //     ICR: toBN(dec(2, 18)),
    //     extraParams: { from: D },
    //   });

    //   // Artificially make baseRate 5%
    //   await troveManager.setBaseRate(dec(5, 16));
    //   await troveManager.setLastFeeOpTimeToNow();

    //   // Check baseRate is now non-zero
    //   const baseRate_1 = await troveManager.getStableCoinBaseRate();
    //   assert.isTrue(baseRate_1.gt(toBN('0')));

    //   // 2 hours pass
    //   th.fastForwardTime(7200, web3.currentProvider);

    //   const D_LUSDBalanceBefore = await lusdToken.balanceOf(D);

    //   // D withdraws LUSD
    //   const D_LUSDRequest = toBN(dec(37, 18));
    //   await borrowerOperations.increaseDebts(th._100pct, D_LUSDRequest, D, D, {
    //     from: D,
    //   });

    //   // Check LQTY staking LUSD balance has increased
    //   const lqtyStaking_LUSDBalance_After = await lusdToken.balanceOf(lqtyStaking.address);
    //   assert.isTrue(lqtyStaking_LUSDBalance_After.gt(lqtyStaking_LUSDBalance_Before));

    //   // Check D's LUSD balance now equals their initial balance plus request LUSD
    //   const D_LUSDBalanceAfter = await lusdToken.balanceOf(D);
    //   assert.isTrue(D_LUSDBalanceAfter.eq(D_LUSDBalanceBefore.add(D_LUSDRequest)));
    // });

    // it('Borrowing at zero base rate changes LUSD fees-per-unit-staked', async () => {
    //   await openTrove({ ICR: toBN(dec(10, 18)), extraParams: { from: whale } });
    //   await openTrove({
    //     extraLUSDAmount: toBN(dec(30, 18)),
    //     ICR: toBN(dec(2, 18)),
    //     extraParams: { from: A },
    //   });
    //   await openTrove({
    //     extraLUSDAmount: toBN(dec(40, 18)),
    //     ICR: toBN(dec(2, 18)),
    //     extraParams: { from: B },
    //   });
    //   await openTrove({
    //     extraLUSDAmount: toBN(dec(50, 18)),
    //     ICR: toBN(dec(2, 18)),
    //     extraParams: { from: C },
    //   });
    //   await openTrove({
    //     extraLUSDAmount: toBN(dec(50, 18)),
    //     ICR: toBN(dec(2, 18)),
    //     extraParams: { from: D },
    //   });

    //   // Check baseRate is zero
    //   const baseRate_1 = await troveManager.getStableCoinBaseRate();
    //   assert.equal(baseRate_1, '0');

    //   // A artificially receives LQTY, then stakes it
    //   await lqtyToken.unprotectedMint(A, dec(100, 18));
    //   await lqtyStaking.stake(dec(100, 18), { from: A });

    //   // 2 hours pass
    //   th.fastForwardTime(7200, web3.currentProvider);

    //   // Check LQTY LUSD balance before == 0
    //   const F_LUSD_Before = await lqtyStaking.F_LUSD();
    //   assert.equal(F_LUSD_Before, '0');

    //   // D withdraws LUSD
    //   await borrowerOperations.increaseDebts(th._100pct, dec(37, 18), D, D, {
    //     from: D,
    //   });

    //   // Check LQTY LUSD balance after > 0
    //   const F_LUSD_After = await lqtyStaking.F_LUSD();
    //   assert.isTrue(F_LUSD_After.gt('0'));
    // });

    // it('Borrowing at zero base rate sends debt request to user', async () => {
    //   await openTrove({ ICR: toBN(dec(10, 18)), extraParams: { from: whale } });
    //   await openTrove({
    //     extraLUSDAmount: toBN(dec(30, 18)),
    //     ICR: toBN(dec(2, 18)),
    //     extraParams: { from: A },
    //   });
    //   await openTrove({
    //     extraLUSDAmount: toBN(dec(40, 18)),
    //     ICR: toBN(dec(2, 18)),
    //     extraParams: { from: B },
    //   });
    //   await openTrove({
    //     extraLUSDAmount: toBN(dec(50, 18)),
    //     ICR: toBN(dec(2, 18)),
    //     extraParams: { from: C },
    //   });
    //   await openTrove({
    //     extraLUSDAmount: toBN(dec(50, 18)),
    //     ICR: toBN(dec(2, 18)),
    //     extraParams: { from: D },
    //   });

    //   // Check baseRate is zero
    //   const baseRate_1 = await troveManager.getStableCoinBaseRate();
    //   assert.equal(baseRate_1, '0');

    //   // 2 hours pass
    //   th.fastForwardTime(7200, web3.currentProvider);

    //   const D_LUSDBalanceBefore = await lusdToken.balanceOf(D);

    //   // D withdraws LUSD
    //   const D_LUSDRequest = toBN(dec(37, 18));
    //   await borrowerOperations.increaseDebts(th._100pct, dec(37, 18), D, D, {
    //     from: D,
    //   });

    //   // Check D's LUSD balance now equals their requested LUSD
    //   const D_LUSDBalanceAfter = await lusdToken.balanceOf(D);

    //   // Check D's trove debt == D's LUSD balance + liquidation reserve
    //   assert.isTrue(D_LUSDBalanceAfter.eq(D_LUSDBalanceBefore.add(D_LUSDRequest)));
    // });

    it('reverts when calling address does not have active trove', async () => {
      await open(alice, parseUnits('1', 9), parseUnits('10000'));
      await open(bob, parseUnits('2', 9), parseUnits('20000'));

      // Bob successfully withdraws LUSD
      await increaseDebt(bob, contracts, [{ tokenAddress: STABLE, amount: parseUnits('100') }]);

      // Carol with no active trove attempts to withdraw LUSD
      await expect(
        increaseDebt(carol, contracts, [{ tokenAddress: STABLE, amount: parseUnits('100') }])
      ).to.be.revertedWithCustomError(borrowerOperations, 'TroveClosedOrNotExist');
    });
    it('reverts when requested withdrawal amount is zero LUSD', async () => {
      await open(alice, parseUnits('1', 9), parseUnits('10000'));
      await open(bob, parseUnits('2', 9), parseUnits('20000'));

      // Bob successfully withdraws 1e-18 LUSD
      await increaseDebt(bob, contracts, [{ tokenAddress: STABLE, amount: parseUnits('100') }]);

      // Alice attempts to withdraw 0 LUSD
      await expect(increaseDebt(alice, contracts, [{ tokenAddress: STABLE, amount: 0 }])).to.be.revertedWithCustomError(
        borrowerOperations,
        'ZeroDebtChange'
      );
    });
    it('reverts when system is in Recovery Mode', async () => {
      await open(alice, parseUnits('1', 9), parseUnits('10000'));
      await open(bob, parseUnits('2', 9), parseUnits('20000'));

      expect(await checkRecoveryMode(contracts)).to.be.false;

      // Withdrawal possible when recoveryMode == false
      await increaseDebt(alice, contracts, [{ tokenAddress: STABLE, amount: parseUnits('100') }]);

      await setPrice('BTC', '100', contracts);

      expect(await checkRecoveryMode(contracts)).to.be.true;

      //Check LUSD withdrawal impossible when recoveryMode == true
      await expect(increaseDebt(alice, contracts, [{ tokenAddress: STABLE, amount: 1 }])).to.be.revertedWithCustomError(
        borrowerOperations,
        'ICR_lt_CCR'
      );
    });
    it("reverts when withdrawal would bring the trove's ICR < MCR", async () => {
      await open(alice, parseUnits('1', 9), parseUnits('10000'));
      await open(bob, parseUnits('2', 9), parseUnits('20000'));

      // Bob tries to withdraw LUSD that would bring his ICR < MCR
      await expect(
        increaseDebt(bob, contracts, [{ tokenAddress: STABLE, amount: parseUnits('20000') }])
      ).to.be.revertedWithCustomError(borrowerOperations, 'ICR_lt_MCR');
    });
    it('reverts when a withdrawal would cause the TCR of the system to fall below the CCR', async () => {
      // Alice and Bob creates troves with 150% ICR.  System TCR = 150%.
      await open(alice, parseUnits('1', 9), parseUnits('13700'));
      await open(bob, parseUnits('1', 9), parseUnits('13700'));

      // TCR close to 150%
      const TCR = await getTCR(contracts);
      expect(TCR).to.be.closeTo(parseUnits('1.5'), parseUnits('0.005'));

      // Bob attempts to withdraw 1 LUSD and system TCR would be lower than CCR of 150%.
      await expect(
        increaseDebt(bob, contracts, [{ tokenAddress: STABLE, amount: parseUnits('100') }])
      ).to.be.revertedWithCustomError(borrowerOperations, 'TCR_lt_CCR');
    });
    it('reverts if system is in Recovery Mode', async () => {
      // --- SETUP ---
      await open(alice, parseUnits('1', 9), parseUnits('13700'));
      await open(bob, parseUnits('1', 9), parseUnits('13700'));

      // --- TEST ---

      // price drops to 1ETH:150LUSD, reducing TCR below 150%
      await setPrice('BTC', '150', contracts);
      expect(await getTCR(contracts)).to.be.lt(parseUnits('1.5'));
      expect(await checkRecoveryMode(contracts)).to.be.true;

      await expect(
        increaseDebt(alice, contracts, [{ tokenAddress: STABLE, amount: parseUnits('200') }])
      ).to.be.revertedWithCustomError(borrowerOperations, 'ICR_lt_CCR');
    });
    it("increases the Trove's LUSD debt by the correct amount", async () => {
      await open(alice, parseUnits('1', 9), parseUnits('10000'));

      // check before
      const aliceDebtBefore = await getTroveEntireDebt(contracts, alice);
      expect(aliceDebtBefore).to.be.gt(0n);

      await increaseDebt(alice, contracts, [{ tokenAddress: STABLE, amount: parseUnits('100') }]);

      // check after
      const aliceDebtAfter = await getTroveEntireDebt(contracts, alice);
      expect(aliceDebtAfter - aliceDebtBefore).to.be.equal(parseUnits('100') + parseUnits('100') / 200n);
    });
    it('increases Stable debt in StoragePool by correct amount', async () => {
      await open(alice, parseUnits('1', 9), parseUnits('10000'));

      // check before
      const aliceDebtBefore = await getTroveEntireDebt(contracts, alice);
      expect(aliceDebtBefore).to.be.gt(0n);

      // check before
      const storagePool_Debt_Before = await storagePool.getEntireSystemDebt();
      expect(storagePool_Debt_Before).to.be.eq(aliceDebtBefore);

      await increaseDebt(alice, contracts, [{ tokenAddress: STABLE, amount: parseUnits('100') }]);

      // check after
      const storagePool_Debt_After = await storagePool.getEntireSystemDebt();
      expect(storagePool_Debt_After - storagePool_Debt_Before).to.be.equal(
        parseUnits('100') + parseUnits('100') / 200n
      );
    });
    it('increases user Stable balance by correct amount', async () => {
      await open(alice, parseUnits('1', 9), parseUnits('10000'));

      // check before
      const alice_StableBalance_Before = await STABLE.balanceOf(alice);
      expect(alice_StableBalance_Before).to.be.equal(parseUnits('10000'));

      await increaseDebt(alice, contracts, [{ tokenAddress: STABLE, amount: parseUnits('100') }]);

      // check after
      const alice_StableBalance_After = await STABLE.balanceOf(alice);
      expect(alice_StableBalance_After - alice_StableBalance_Before).to.be.equal(parseUnits('100'));
    });
  });

  describe('repayDebt()', () => {
    it('reverts when repayment would leave trove with ICR < MCR', async () => {
      // alice creates a Trove and adds first collateral
      await open(alice, parseUnits('1', 9), parseUnits('1000'));
      await open(bob, parseUnits('10', 9), parseUnits('1000'));

      // Price drops
      await setPrice('BTC', '1000', contracts);
      const price = await priceFeed.getPrice(BTC);

      expect(await checkRecoveryMode(contracts)).to.be.false;
      const { ICR } = await troveManager.getCurrentICR(alice);
      expect(ICR).to.be.lt(parseUnits('1.1')); // 110%

      await expect(increaseDebt(alice, contracts, [{ tokenAddress: STABLE, amount: 1 }])).to.be.revertedWithCustomError(
        borrowerOperations,
        'ICR_lt_MCR'
      );
    });
    it('Succeeds when it would leave trove with net debt >= minimum net debt', async () => {
      // Make the LUSD request 2 wei above min net debt to correct for floor division, and make net debt = min net debt + 1 wei
      await open(alice, parseUnits('1', 9), parseUnits('1'));
      await repayDebt(alice, contracts, [{ tokenAddress: STABLE, amount: 1 }]);

      await open(bob, parseUnits('1', 9), parseUnits('20'));
      await repayDebt(bob, contracts, [{ tokenAddress: STABLE, amount: parseUnits('19') }]);
    });
    it.skip('reverts when it would leave trove with net debt < minimum net debt', async () => {
      //TODO: We don't have min net debt yet, check it out later
      // // Make the LUSD request 2 wei above min net debt to correct for floor division, and make net debt = min net debt + 1 wei
      // await borrowerOperations.openTrove(th._100pct, await getNetBorrowingAmount(MIN_NET_DEBT.add(toBN('2'))), A, A, {
      //   from: A,
      //   value: dec(100, 30),
      // });
      // const repayTxAPromise = borrowerOperations.repayLUSD(2, A, A, {
      //   from: A,
      // });
      // await assertRevert(repayTxAPromise, "BorrowerOps: Trove's net debt must be greater than minimum");
    });
    it('Reverts if repaid amount is greater than current debt', async () => {
      await open(alice, parseUnits('1', 9), parseUnits('1'));
      const STABLE_COIN_GAS_COMPENSATION = await borrowerOperations.STABLE_COIN_GAS_COMPENSATION();
      const totalDebt = await troveManager.getTroveDebt(alice);
      const repayAmount = totalDebt[0].amount - STABLE_COIN_GAS_COMPENSATION + 1n;

      await open(bob, parseUnits('1', 9), repayAmount);

      await STABLE.connect(bob).transfer(alice, repayAmount);

      await expect(
        repayDebt(alice, contracts, [{ tokenAddress: STABLE, amount: repayAmount }])
      ).to.be.revertedWithCustomError(borrowerOperations, 'Repaid_gt_CurrentDebt');
    });
    it('reverts when calling address does not have active trove', async () => {
      await open(alice, parseUnits('1', 9), parseUnits('1000'));
      await open(bob, parseUnits('1', 9), parseUnits('1000'));
      // Bob successfully repays some LUSD
      await repayDebt(bob, contracts, [{ tokenAddress: STABLE, amount: parseUnits('500') }]);

      // Carol with no active trove attempts to repayLUSD
      await expect(
        repayDebt(carol, contracts, [{ tokenAddress: STABLE, amount: parseUnits('500') }])
      ).to.be.revertedWithCustomError(borrowerOperations, 'TroveClosedOrNotExist');
    });
    it('reverts when attempted repayment is > the debt of the trove', async () => {
      await open(alice, parseUnits('1', 9), parseUnits('10000'));
      await open(bob, parseUnits('1', 9), parseUnits('10000'));
      const aliceDebt = await getTroveEntireDebt(contracts, alice);

      // Bob successfully repays some LUSD
      await repayDebt(bob, contracts, [{ tokenAddress: STABLE, amount: parseUnits('500') }]);

      // Alice attempts to repay more than her debt
      await expect(
        repayDebt(alice, contracts, [{ tokenAddress: STABLE, amount: aliceDebt + 1n }])
      ).to.be.revertedWithPanic();
      // TODO: should not reverted with panic error, check later
      // ).to.be.revertedWithCustomError(borrowerOperations, 'Repaid_gt_CurrentDebt');
    });
    it("reduces the Trove's stable debt by the correct amount", async () => {
      const aliceBorrowAmount = parseUnits('10000');
      await open(alice, parseUnits('1', 9), aliceBorrowAmount);
      await open(bob, parseUnits('1', 9), parseUnits('10000'));

      const aliceDebtBefore = await getTroveEntireDebt(contracts, alice);
      expect(aliceDebtBefore).to.be.equal(aliceBorrowAmount + aliceBorrowAmount / 200n + parseUnits('200'));

      const repayAmount = parseUnits('500');
      await repayDebt(alice, contracts, [{ tokenAddress: STABLE, amount: repayAmount }]);

      const aliceDebtAfter = await getTroveEntireDebt(contracts, alice);
      expect(aliceDebtAfter).to.be.equal(aliceDebtBefore - repayAmount);
    });

    it('decreases stable debt in ActivePool by correct amount', async () => {
      const aliceBorrowAmount = parseUnits('10000');
      await open(alice, parseUnits('1', 9), aliceBorrowAmount);
      await open(bob, parseUnits('1', 9), aliceBorrowAmount);

      const aliceDebtBefore = await getTroveEntireDebt(contracts, alice);
      expect(aliceDebtBefore).to.be.gt(aliceBorrowAmount);

      // Check before
      const activePool_LUSD_Before = await storagePool.getValue(STABLE, false, 0);
      expect(activePool_LUSD_Before).to.be.gt(aliceBorrowAmount * 2n);

      await repayDebt(alice, contracts, [{ tokenAddress: STABLE, amount: aliceDebtBefore / 10n }]);

      // check after
      const activePool_LUSD_After = await storagePool.getValue(STABLE, false, 0);
      expect(activePool_LUSD_After).to.be.equal(activePool_LUSD_Before - aliceDebtBefore / 10n);
    });

    it('decreases user stable token balance by correct amount', async () => {
      const borrowAmount = parseUnits('10000');
      await open(alice, parseUnits('1', 9), borrowAmount);
      await open(bob, parseUnits('1', 9), borrowAmount);

      const aliceDebtBefore = await getTroveEntireDebt(contracts, alice);
      expect(aliceDebtBefore).to.be.gt(borrowAmount);

      // check before
      const alice_StableBalance_Before = await STABLE.balanceOf(alice);
      expect(alice_StableBalance_Before).to.be.equal(borrowAmount);

      await repayDebt(alice, contracts, [{ tokenAddress: STABLE, amount: aliceDebtBefore / 10n }]);

      // check after
      const alice_StableBalance_After = await STABLE.balanceOf(alice);
      expect(alice_StableBalance_After).to.be.equal(alice_StableBalance_Before - aliceDebtBefore / 10n);
    });

    it('can repay debt in Recovery Mode', async () => {
      const borrowAmount = parseUnits('10000');
      await open(alice, parseUnits('1', 9), borrowAmount);
      await open(bob, parseUnits('1', 9), borrowAmount);

      const aliceDebtBefore = await getTroveEntireDebt(contracts, alice);
      expect(aliceDebtBefore).to.be.gt(borrowAmount);

      expect(await checkRecoveryMode(contracts)).to.be.false;
      await setPrice('BTC', '5000', contracts);
      expect(await checkRecoveryMode(contracts)).to.be.true;

      await repayDebt(alice, contracts, [{ tokenAddress: STABLE, amount: aliceDebtBefore / 10n }]);

      // Check Alice's debt: 110 (initial) - 50 (repaid)
      const aliceDebtAfter = await getTroveEntireDebt(contracts, alice);
      expect(aliceDebtAfter).to.be.equal(aliceDebtBefore - aliceDebtBefore / 10n);
    });

    it('Reverts if borrower has insufficient stable balance to cover his debt repayment', async () => {
      const borrowAmount = parseUnits('10000');
      await open(alice, parseUnits('1', 9), borrowAmount);
      await open(bob, parseUnits('1', 9), borrowAmount);

      const bobBalBefore = await STABLE.balanceOf(bob);
      expect(bobBalBefore).to.be.equal(borrowAmount);

      // Bob transfers all but 5 of his LUSD to Carol
      await STABLE.connect(bob).transfer(carol, bobBalBefore - parseUnits('5'));

      //Confirm B's LUSD balance has decreased to 5 LUSD
      const bobBalAfter = await STABLE.balanceOf(bob);
      expect(bobBalAfter).to.be.equal(parseUnits('5'));

      // Bob tries to repay 6 LUSD
      await expect(
        repayDebt(bob, contracts, [{ tokenAddress: STABLE, amount: parseUnits('6') }])
      ).to.be.revertedWithCustomError(borrowerOperations, 'InsufficientDebtToRepay');
    });
  });
  describe('adjustTrove()', () => {
    it.skip('No adjust func', () => {});
  });
  describe('closeTrove()', () => {
    it('reverts when it would lower the TCR below CCR', async () => {
      await open(alice, parseUnits('1', 9), parseUnits('100'));
      await open(bob, parseUnits('1', 9), parseUnits('17500'));

      // to compensate borrowing fees
      await STABLE.connect(bob).transfer(alice, parseUnits('10000'));

      expect(await checkRecoveryMode(contracts)).to.be.false;

      await expect(borrowerOperations.connect(alice).closeTrove()).to.be.revertedWithCustomError(
        borrowerOperations,
        'TCR_lt_CCR'
      );
    });

    it('reverts when calling address does not have active trove', async () => {
      await open(alice, parseUnits('1', 9), parseUnits('100'));
      await open(bob, parseUnits('1', 9), parseUnits('17500'));

      // Carol with no active trove attempts to close her trove
      await expect(borrowerOperations.connect(carol).closeTrove()).to.be.revertedWithCustomError(
        borrowerOperations,
        'TroveClosedOrNotExist'
      );
    });

    it('reverts when system is in Recovery Mode', async () => {
      await open(alice, parseUnits('1', 9), parseUnits('10000'));
      await open(bob, parseUnits('1', 9), parseUnits('10000'));
      await open(carol, parseUnits('1', 9), parseUnits('10000'));

      // Alice transfers her LUSD to Bob and Carol so they can cover fees
      const aliceBal = await STABLE.balanceOf(alice);
      await STABLE.connect(alice).transfer(bob, aliceBal / 2n);
      await STABLE.connect(alice).transfer(carol, aliceBal / 2n);

      // check Recovery Mode
      expect(await checkRecoveryMode(contracts)).to.be.false;

      // Bob successfully closes his trove
      await borrowerOperations.connect(bob).closeTrove();

      await setPrice('BTC', '1000', contracts);

      expect(await checkRecoveryMode(contracts)).to.be.true;

      // // Carol attempts to close her trove during Recovery Mode
      await expect(borrowerOperations.connect(carol).closeTrove()).to.be.revertedWithCustomError(
        borrowerOperations,
        'NotAllowedInRecoveryMode'
      );
    });

    it('reverts when trove is the only one in the system', async () => {
      await open(alice, parseUnits('1', 9), parseUnits('10000'));

      // Artificially mint to Alice so she has enough to close her trove
      await STABLE.unprotectedMint(alice, parseUnits('100000'));

      // Check she has more LUSD than her trove debt
      const aliceBal = await STABLE.balanceOf(alice);
      const aliceDebt = await getTroveEntireDebt(contracts, alice);
      expect(aliceBal).to.be.gt(aliceDebt);

      // check Recovery Mode
      expect(await checkRecoveryMode(contracts)).to.be.false;

      // Alice attempts to close her trove
      await expect(borrowerOperations.connect(alice).closeTrove()).to.be.revertedWithCustomError(
        troveManager,
        'OnlyOneTrove'
      );
    });

    it("reduces a Trove's collateral to zero", async () => {
      await open(alice, parseUnits('1', 9), parseUnits('10000'));
      await open(bob, parseUnits('1', 9), parseUnits('10000'));

      const aliceCollBefore = await getTroveEntireColl(contracts, alice);
      const bobBal = await STABLE.balanceOf(bob);
      expect(aliceCollBefore).to.be.equal(parseUnits('21000'));
      expect(bobBal).to.be.equal(parseUnits('10000'));

      // To compensate borrowing fees
      await STABLE.connect(bob).transfer(alice, bobBal / 2n);

      // Alice attempts to close trove
      await borrowerOperations.connect(alice).closeTrove();

      const aliceCollAfter = await getTroveEntireColl(contracts, alice);
      expect(aliceCollAfter).to.be.equal(0n);
    });

    it("reduces a Trove's debt to zero", async () => {
      await open(alice, parseUnits('1', 9), parseUnits('10000'));
      await open(bob, parseUnits('1', 9), parseUnits('10000'));

      const aliceDebtBefore = await getTroveEntireColl(contracts, alice);
      const bobBal = await STABLE.balanceOf(bob);
      expect(aliceDebtBefore).to.be.gt(parseUnits('10000'));
      expect(bobBal).to.be.equal(parseUnits('10000'));

      // To compensate borrowing fees
      await STABLE.connect(bob).transfer(alice, bobBal / 2n);

      // Alice attempts to close trove
      await borrowerOperations.connect(alice).closeTrove();

      const aliceDebtAfter = await getTroveEntireDebt(contracts, alice);
      expect(aliceDebtAfter).to.be.equal(0n);
    });

    it("sets Trove's stake to zero", async () => {
      await open(alice, parseUnits('1', 9), parseUnits('10000'));
      await open(bob, parseUnits('1', 9), parseUnits('10000'));

      const aliceStakeBefore = await getTroveStakeValue(contracts, alice);
      const bobBal = await STABLE.balanceOf(bob);
      expect(aliceStakeBefore).to.be.gte(parseUnits('21000'));
      expect(bobBal).to.be.equal(parseUnits('10000'));

      // To compensate borrowing fees
      await STABLE.connect(bob).transfer(alice, bobBal / 2n);

      // Alice attempts to close trove
      await borrowerOperations.connect(alice).closeTrove();

      const aliceStakeAfter = await getTroveStakeValue(contracts, alice);
      expect(aliceStakeAfter).to.be.equal(0n);
    });

    it("zero's the troves reward snapshots", async () => {
      // Dennis opens trove and transfers tokens to alice
      await open(dennis, parseUnits('1', 9), parseUnits('10000'));
      await open(bob, parseUnits('1', 9), parseUnits('10000'));

      // Price drops
      await setPrice('BTC', '5000', contracts);

      // Liquidate Bob
      await liquidationOperations.liquidate(bob);
      expect(await troveManager.getTroveStatus(bob)).to.be.equal(4n);

      // // Price bounces back
      await setPrice('BTC', '20000', contracts);

      // Alice and Carol open troves
      await open(alice, parseUnits('1', 9), parseUnits('10000'));
      await open(carol, parseUnits('1', 9), parseUnits('10000'));

      // Price drops ...again
      await setPrice('BTC', '5000', contracts);

      // Get Alice's pending reward snapshots
      const L_BTC_A_Snapshot = await troveManager.rewardSnapshots(alice, BTC, true);
      const L_StableDebt_A_Snapshot = await troveManager.rewardSnapshots(alice, STABLE, false);
      console.log(L_BTC_A_Snapshot, L_StableDebt_A_Snapshot);
      // TODO: Check reward snapshots again
      // expect(L_BTC_A_Snapshot).to.be.equal(0);
      // expect(L_StableDebt_A_Snapshot).to.be.equal(0);

      // Liquidate Carol
      await liquidationOperations.liquidate(carol);
      expect(await troveManager.getTroveStatus(bob)).to.be.equal(4n);

      // Get Alice's pending reward snapshots after Carol's liquidation. Check above 0
      const L_BTC_A_Snapshot_After = await troveManager.rewardSnapshots(alice, BTC, true);
      const L_StableDebt_A_Snapshot_After = await troveManager.rewardSnapshots(alice, STABLE, false);
      console.log(L_BTC_A_Snapshot_After, L_StableDebt_A_Snapshot_After);

      // expect(L_BTC_A_Snapshot).to.be.gt(0);
      // expect(L_StableDebt_A_Snapshot).to.be.gt(0);

      // // to compensate borrowing fees
      // await lusdToken.transfer(alice, await lusdToken.balanceOf(dennis), {
      //   from: dennis,
      // });

      // await priceFeed.setPrice(dec(200, 18));

      // // Alice closes trove
      // await borrowerOperations.closeTrove({ from: alice });

      // // Check Alice's pending reward snapshots are zero
      // const L_ETH_Snapshot_A_afterAliceCloses = (await troveManager.rewardSnapshots(alice))[0];
      // const L_LUSDDebt_Snapshot_A_afterAliceCloses = (await troveManager.rewardSnapshots(alice))[1];

      // assert.equal(L_ETH_Snapshot_A_afterAliceCloses, '0');
      // assert.equal(L_LUSDDebt_Snapshot_A_afterAliceCloses, '0');
    });

    it("sets trove's status to closed and removes it from sorted troves list", async () => {
      await open(alice, parseUnits('1', 9), parseUnits('10000'));
      await open(bob, parseUnits('1', 9), parseUnits('10000'));

      // Check Trove is active
      const alice_Trove_Before = await troveManager.Troves(alice);
      const status_Before = alice_Trove_Before.status;

      expect(status_Before).to.be.equal(1n);

      // to compensate borrowing fees
      await STABLE.connect(bob).transfer(alice, await STABLE.balanceOf(bob));

      // Close the trove
      await borrowerOperations.connect(alice).closeTrove();

      const alice_Trove_After = await troveManager.Troves(alice);
      const status_After = alice_Trove_After.status;

      expect(status_After).to.be.equal(2n);
    });

    it('reduces ActivePool ETH and raw ether by correct amount', async () => {
      await open(alice, parseUnits('1', 9), parseUnits('10000'));
      await open(dennis, parseUnits('1', 9), parseUnits('10000'));

      const dennisColl = await getTroveEntireColl(contracts, dennis);
      const aliceColl = await getTroveEntireColl(contracts, alice);
      expect(dennisColl).to.be.gt(0n);
      expect(aliceColl).to.be.gt(0n);

      // Check active Pool ETH before
      const activePool_ETH_before = await storagePool.getValue(BTC, true, 0);
      const activePool_RawEther_before = await BTC.balanceOf(storagePool);
      expect(activePool_ETH_before).to.be.equal((aliceColl + dennisColl) / (21000n * 10n ** 9n));
      expect(activePool_ETH_before).to.be.gt(0n);
      expect(activePool_RawEther_before).to.be.equal(activePool_ETH_before);

      // to compensate borrowing fees
      await STABLE.connect(dennis).transfer(alice, await STABLE.balanceOf(dennis));

      // // Close the trove
      await borrowerOperations.connect(alice).closeTrove();

      // // Check after
      const activePool_ETH_After = await storagePool.getValue(BTC, true, 0);
      const activePool_RawEther_After = await BTC.balanceOf(storagePool);
      expect(activePool_ETH_After).to.be.equal(dennisColl / (21000n * 10n ** 9n));
      expect(activePool_RawEther_After).to.be.equal(dennisColl / (21000n * 10n ** 9n));
    });

    it('reduces ActivePool debt by correct amount', async () => {
      await open(alice, parseUnits('1', 9), parseUnits('10000'));
      await open(dennis, parseUnits('1', 9), parseUnits('10000'));

      const dennisDebt = await getTroveEntireDebt(contracts, dennis);
      const aliceDebt = await getTroveEntireDebt(contracts, alice);
      expect(dennisDebt).to.be.gt(0n);
      expect(aliceDebt).to.be.gt(0n);

      // Check before
      const activePool_Debt_before = await storagePool.getValue(STABLE, false, 0);
      expect(activePool_Debt_before).to.be.equal(aliceDebt + dennisDebt - parseUnits('200') * 2n);
      expect(activePool_Debt_before).to.be.gt(0n);

      // to compensate borrowing fees
      await STABLE.connect(dennis).transfer(alice, await STABLE.balanceOf(dennis));

      // Close the trove
      await borrowerOperations.connect(alice).closeTrove();

      // Check after
      const activePool_Debt_After = await storagePool.getValue(STABLE, false, 0);
      expect(activePool_Debt_After).to.be.equal(dennisDebt - parseUnits('200'));
    });

    it('updates the the total stakes', async () => {
      await open(alice, parseUnits('1', 9), parseUnits('10000'));
      await open(bob, parseUnits('1', 9), parseUnits('10000'));
      await open(dennis, parseUnits('1', 9), parseUnits('10000'));

      // Get individual stakes
      const aliceStakeBefore = await getTroveStake(contracts, alice, BTC);
      const bobStakeBefore = await getTroveStake(contracts, bob, BTC);
      const dennisStakeBefore = await getTroveStake(contracts, dennis, BTC);
      expect(aliceStakeBefore).to.be.gt(0n);
      expect(bobStakeBefore).to.be.gt(0n);
      expect(dennisStakeBefore).to.be.gt(0n);

      const totalStakesBefore = await troveManager.totalStakes(BTC);

      expect(totalStakesBefore).to.be.eq(aliceStakeBefore + bobStakeBefore + dennisStakeBefore);

      // to compensate borrowing fees
      await STABLE.connect(dennis).transfer(alice, await STABLE.balanceOf(dennis));

      // Alice closes trove
      await borrowerOperations.connect(alice).closeTrove();

      // Check stake and total stakes get updated
      const aliceStakeAfter = await getTroveStake(contracts, alice, BTC);
      const totalStakesAfter = await troveManager.totalStakes(BTC);

      expect(aliceStakeAfter).to.be.equal(0n);
      expect(totalStakesAfter).to.be.eq(totalStakesBefore - aliceStakeBefore);
    });
    it("subtracts the debt of the closed Trove from the Borrower's LUSDToken balance", async () => {
      await open(alice, parseUnits('1', 9), parseUnits('10000'));
      await open(bob, parseUnits('1', 9), parseUnits('10000'));

      const aliceDebt = await getTroveEntireDebt(contracts, alice);
      expect(aliceDebt).to.be.gt(0n);

      // to compensate borrowing fees
      await STABLE.connect(bob).transfer(alice, await STABLE.balanceOf(bob));

      const alice_LUSDBalance_Before = await STABLE.balanceOf(alice);
      expect(alice_LUSDBalance_Before).to.be.gt(0n);

      // close trove
      await borrowerOperations.connect(alice).closeTrove();

      // check alice LUSD balance after
      const alice_LUSDBalance_After = await STABLE.balanceOf(alice);

      expect(alice_LUSDBalance_After).to.be.equal(alice_LUSDBalance_Before - aliceDebt + parseUnits('200'));
    });

    it('applies pending rewards', async () => {
      await open(whale, parseUnits('100', 9), parseUnits('20000'));
      await open(alice, parseUnits('2', 9), parseUnits('15000'));
      await open(bob, parseUnits('1', 9), parseUnits('5000'));
      await open(carol, parseUnits('1', 9), parseUnits('10000'));

      const carolDebt = await getTroveEntireDebt(contracts, carol);
      const carolColl = await getTroveEntireColl(contracts, carol);

      // Whale transfers to A and B to cover their fees
      await STABLE.connect(whale).transfer(alice, parseUnits('10000'));
      await STABLE.connect(whale).transfer(bob, parseUnits('10000'));

      // --- TEST ---

      // price drops to 1ETH:100LUSD, reducing Carol's ICR below MCR
      await setPrice('BTC', '10000', contracts);
      // const price = await priceFeed.getPrice();

      // liquidate Carol's Trove, Alice and Bob earn rewards.
      const liquidationTx = await liquidationOperations.liquidate(carol);
      const [liquidatedDebt_C, liquidatedColl_C, gasComp_C] = await getEmittedLiquidationValues(
        liquidationTx,
        contracts
      );

      // // Dennis opens a new Trove
      await open(dennis, parseUnits('4', 9), parseUnits('10000'));

      // check Alice and Bob's reward snapshots are zero before they alter their Troves
      const alice_ETHrewardSnapshot_Before = await troveManager.rewardSnapshots(alice, BTC, true);
      const alice_LUSDDebtRewardSnapshot_Before = await troveManager.rewardSnapshots(alice, STABLE, false);

      const bob_ETHrewardSnapshot_Before = await troveManager.rewardSnapshots(bob, BTC, true);
      const bob_LUSDDebtRewardSnapshot_Before = await troveManager.rewardSnapshots(bob, STABLE, false);

      expect(alice_ETHrewardSnapshot_Before).to.be.equal(0n);
      expect(alice_LUSDDebtRewardSnapshot_Before).to.be.equal(0n);
      expect(bob_ETHrewardSnapshot_Before).to.be.equal(0n);
      expect(bob_LUSDDebtRewardSnapshot_Before).to.be.equal(0n);

      const defaultPool_ETH = await storagePool.getValue(BTC, true, 1);
      const defaultPool_LUSDDebt = await storagePool.getValue(STABLE, false, 1);

      // Carol's liquidated coll (1 ETH) and drawn debt should have entered the Default Pool
      expect(defaultPool_ETH).to.be.equal(liquidatedColl_C[0][1]);
      expect(defaultPool_LUSDDebt).to.be.equal(liquidatedDebt_C[0][1]);

      const pendingCollReward_A = await troveManager.getPendingReward(alice, BTC, true);
      const pendingDebtReward_A = await troveManager.getPendingReward(alice, STABLE, false);
      expect(pendingCollReward_A).to.be.gt(0n);
      expect(pendingDebtReward_A).to.be.gt(0n);

      // Close Alice's trove. Alice's pending rewards should be removed from the DefaultPool when she close.
      await borrowerOperations.connect(alice).closeTrove();

      const defaultPool_ETH_afterAliceCloses = await storagePool.getValue(BTC, true, 1);
      const defaultPool_LUSDDebt_afterAliceCloses = await storagePool.getValue(STABLE, false, 1);

      expect(defaultPool_ETH_afterAliceCloses).to.be.equal(defaultPool_ETH - pendingCollReward_A);
      expect(defaultPool_LUSDDebt_afterAliceCloses).to.be.equal(defaultPool_LUSDDebt - pendingDebtReward_A);

      // whale adjusts trove, pulling their rewards out of DefaultPool
      await increaseDebt(whale, contracts, [{ tokenAddress: STABLE, amount: parseUnits('1') }]);

      // Close Bob's trove. Expect DefaultPool coll and debt to drop to 0, since closing pulls his rewards out.
      await borrowerOperations.connect(bob).closeTrove();

      const defaultPool_ETH_afterBobCloses = await storagePool.getValue(BTC, true, 1);
      const defaultPool_LUSDDebt_afterBobCloses = await storagePool.getValue(STABLE, false, 1);

      expect(defaultPool_ETH_afterBobCloses).to.be.closeTo(0, 100000n);
      // TODO: original test was close to 100k
      expect(defaultPool_LUSDDebt_afterBobCloses).to.be.closeTo(0, 300000n);
    });

    it('reverts if borrower has insufficient LUSD balance to repay his entire debt', async () => {
      await open(alice, parseUnits('2', 9), parseUnits('15000'));
      await open(bob, parseUnits('1', 9), parseUnits('5000'));

      //Confirm Bob's LUSD balance is less than his trove debt
      const B_LUSDBal = await STABLE.balanceOf(bob);
      const B_troveDebt = await getTroveEntireDebt(contracts, bob);

      expect(B_LUSDBal).to.be.lt(B_troveDebt);

      await expect(borrowerOperations.connect(bob).closeTrove()).to.be.revertedWithCustomError(
        borrowerOperations,
        'InsufficientDebtToRepay'
      );
    });
  });
  describe('openTrove()', () => {
    it.skip('openTrove(): emits a TroveUpdated event with the correct collateral and debt', async () => {
      // const txA = (
      //   await openTrove({
      //     extraLUSDAmount: toBN(dec(15000, 18)),
      //     ICR: toBN(dec(2, 18)),
      //     extraParams: { from: A },
      //   })
      // ).tx;
      // const txB = (
      //   await openTrove({
      //     extraLUSDAmount: toBN(dec(5000, 18)),
      //     ICR: toBN(dec(2, 18)),
      //     extraParams: { from: B },
      //   })
      // ).tx;
      // const txC = (
      //   await openTrove({
      //     extraLUSDAmount: toBN(dec(3000, 18)),
      //     ICR: toBN(dec(2, 18)),
      //     extraParams: { from: C },
      //   })
      // ).tx;
      // const A_Coll = await getTroveEntireColl(A);
      // const B_Coll = await getTroveEntireColl(B);
      // const C_Coll = await getTroveEntireColl(C);
      // const A_Debt = await getTroveEntireDebt(A);
      // const B_Debt = await getTroveEntireDebt(B);
      // const C_Debt = await getTroveEntireDebt(C);
      // const A_emittedDebt = toBN(th.getEventArgByName(txA, 'TroveUpdated', '_debt'));
      // const A_emittedColl = toBN(th.getEventArgByName(txA, 'TroveUpdated', '_coll'));
      // const B_emittedDebt = toBN(th.getEventArgByName(txB, 'TroveUpdated', '_debt'));
      // const B_emittedColl = toBN(th.getEventArgByName(txB, 'TroveUpdated', '_coll'));
      // const C_emittedDebt = toBN(th.getEventArgByName(txC, 'TroveUpdated', '_debt'));
      // const C_emittedColl = toBN(th.getEventArgByName(txC, 'TroveUpdated', '_coll'));
      // // Check emitted debt values are correct
      // assert.isTrue(A_Debt.eq(A_emittedDebt));
      // assert.isTrue(B_Debt.eq(B_emittedDebt));
      // assert.isTrue(C_Debt.eq(C_emittedDebt));
      // // Check emitted coll values are correct
      // assert.isTrue(A_Coll.eq(A_emittedColl));
      // assert.isTrue(B_Coll.eq(B_emittedColl));
      // assert.isTrue(C_Coll.eq(C_emittedColl));
      // const baseRateBefore = await troveManager.getStableCoinBaseRate();
      // // Artificially make baseRate 5%
      // await troveManager.setBaseRate(dec(5, 16));
      // await troveManager.setLastFeeOpTimeToNow();
      // assert.isTrue((await troveManager.getStableCoinBaseRate()).gt(baseRateBefore));
      // const txD = (
      //   await openTrove({
      //     extraLUSDAmount: toBN(dec(5000, 18)),
      //     ICR: toBN(dec(2, 18)),
      //     extraParams: { from: D },
      //   })
      // ).tx;
      // const txE = (
      //   await openTrove({
      //     extraLUSDAmount: toBN(dec(3000, 18)),
      //     ICR: toBN(dec(2, 18)),
      //     extraParams: { from: E },
      //   })
      // ).tx;
      // const D_Coll = await getTroveEntireColl(D);
      // const E_Coll = await getTroveEntireColl(E);
      // const D_Debt = await getTroveEntireDebt(D);
      // const E_Debt = await getTroveEntireDebt(E);
      // const D_emittedDebt = toBN(th.getEventArgByName(txD, 'TroveUpdated', '_debt'));
      // const D_emittedColl = toBN(th.getEventArgByName(txD, 'TroveUpdated', '_coll'));
      // const E_emittedDebt = toBN(th.getEventArgByName(txE, 'TroveUpdated', '_debt'));
      // const E_emittedColl = toBN(th.getEventArgByName(txE, 'TroveUpdated', '_coll'));
      // // Check emitted debt values are correct
      // assert.isTrue(D_Debt.eq(D_emittedDebt));
      // assert.isTrue(E_Debt.eq(E_emittedDebt));
      // // Check emitted coll values are correct
      // assert.isTrue(D_Coll.eq(D_emittedColl));
      // assert.isTrue(E_Coll.eq(E_emittedColl));
    });

    it('Opens a trove with net debt >= minimum net debt', async () => {
      // Add 1 wei to correct for rounding error in helper function
      await openTrove({
        from: alice,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('1', 9),
      });
      expect(await troveManager.getTroveStatus(alice)).to.be.equal(1);
    });

    it('opens a trove with permit', async () => {
      const amount = parseUnits('1', 9);
      const deadline = 100000000000000;
      const nonce = await BTC.nonces(alice);
      const domain = await getDomain(BTC);
      const signature = await alice.signTypedData(domain, PermitTypes, {
        owner: alice.address,
        spender: borrowerOperations.target,
        value: amount,
        nonce: nonce,
        deadline: deadline,
      });
      const { v, r, s } = Signature.from(signature);

      await BTC.unprotectedMint(alice, amount);
      await borrowerOperations.connect(alice).openTroveWithPermit(
        [
          {
            tokenAddress: BTC,
            amount: amount,
          },
        ],
        deadline,
        [v],
        [r],
        [s]
      );

      expect(await troveManager.getTroveStatus(alice)).to.be.equal(1);
    });

    it('decays a non-zero base rate', async () => {
      await open(whale, parseUnits('1', 9), parseUnits('10000'));
      await open(alice, parseUnits('2', 9), parseUnits('20000'));
      await open(bob, parseUnits('3', 9), parseUnits('30000'));
      await open(carol, parseUnits('4', 9), parseUnits('40000'));

      // Artificially make baseRate 5%
      await troveManager.setBaseRate(parseUnits('0.05'));
      await troveManager.setLastFeeOpTimeToNow();

      // Check baseRate is now non-zero
      const baseRate_1 = await troveManager.getStableCoinBaseRate();
      expect(baseRate_1).to.be.equal(parseUnits('0.05'));

      // 2 hours pass
      await time.increase(7200);

      // D opens trove
      await open(dennis, parseUnits('1', 9), parseUnits('1000'));

      // Check baseRate has decreased
      const baseRate_2 = await troveManager.getStableCoinBaseRate();
      expect(baseRate_2).to.be.lt(baseRate_1);

      // 1 hour passes
      await time.increase(3600);

      // E opens trove
      await open(erin, parseUnits('1', 9), parseUnits('1000'));

      const baseRate_3 = await troveManager.getStableCoinBaseRate();
      expect(baseRate_3).to.be.lt(baseRate_2);
    });

    it("doesn't change base rate if it is already zero", async () => {
      await open(whale, parseUnits('1', 9), parseUnits('10000'));
      await open(alice, parseUnits('2', 9), parseUnits('20000'));
      await open(bob, parseUnits('3', 9), parseUnits('30000'));
      await open(carol, parseUnits('4', 9), parseUnits('40000'));

      // Check baseRate is zero
      const baseRate_1 = await troveManager.getStableCoinBaseRate();
      expect(baseRate_1).to.be.equal(0n);

      // 2 hours pass
      await time.increase(7200);

      // D opens trove
      await open(dennis, parseUnits('1', 9), parseUnits('1000'));

      // Check baseRate is still 0
      const baseRate_2 = await troveManager.getStableCoinBaseRate();
      expect(baseRate_2).to.be.equal(0n);

      // 1 hour passes
      await time.increase(3600);

      // E opens trove
      await open(erin, parseUnits('1', 9), parseUnits('1000'));

      const baseRate_3 = await troveManager.getStableCoinBaseRate();
      expect(baseRate_3).to.be.equal(0n);
    });

    it("lastFeeOpTime doesn't update if less time than decay interval has passed since the last fee operation", async () => {
      await open(whale, parseUnits('1', 9), parseUnits('10000'));
      await open(alice, parseUnits('2', 9), parseUnits('20000'));
      await open(bob, parseUnits('3', 9), parseUnits('30000'));
      await open(carol, parseUnits('4', 9), parseUnits('40000'));

      // Artificially make baseRate 5%
      await troveManager.setBaseRate(parseUnits('0.05'));
      await troveManager.setLastFeeOpTimeToNow();

      // Check baseRate is now non-zero
      const baseRate_1 = await troveManager.getStableCoinBaseRate();
      expect(baseRate_1).to.be.equal(parseUnits('0.05'));

      const lastFeeOpTime_1 = await troveManager.lastFeeOperationTime();

      // Borrower D triggers a fee
      await open(dennis, parseUnits('1', 9), parseUnits('1000'));

      const lastFeeOpTime_2 = await troveManager.lastFeeOperationTime();

      // Check that the last fee operation time did not update, as borrower D's debt issuance occured
      // since before minimum interval had passed
      expect(lastFeeOpTime_2).to.be.eq(lastFeeOpTime_1);

      // 1 minute passes
      await time.increase(60);

      // Check that now, at least one minute has passed since lastFeeOpTime_1
      const timeNow = await time.latest();
      expect(BigInt(timeNow) - lastFeeOpTime_1).to.be.gte(60);

      // Borrower E triggers a fee
      await open(erin, parseUnits('1', 9), parseUnits('1000'));

      const lastFeeOpTime_3 = await troveManager.lastFeeOperationTime();

      // Check that the last fee operation time DID update, as borrower's debt issuance occured
      // after minimum interval had passed
      expect(lastFeeOpTime_3).to.be.gt(lastFeeOpTime_1);
    });

    it("borrower can't grief the baseRate and stop it decaying by issuing debt at higher frequency than the decay granularity", async () => {
      await open(whale, parseUnits('1', 9), parseUnits('10000'));
      await open(alice, parseUnits('2', 9), parseUnits('20000'));
      await open(bob, parseUnits('3', 9), parseUnits('30000'));
      await open(carol, parseUnits('4', 9), parseUnits('40000'));

      // Artificially make baseRate 5%
      await troveManager.setBaseRate(parseUnits('0.05'));
      await troveManager.setLastFeeOpTimeToNow();

      // Check baseRate is non-zero
      const baseRate_1 = await troveManager.getStableCoinBaseRate();
      expect(baseRate_1).to.be.gt(0);

      // 59 minutes pass
      await time.increase(3540);

      // Assume Borrower also owns accounts D and E
      // Borrower triggers a fee, before decay interval has passed
      await open(dennis, parseUnits('1', 9), parseUnits('1000'));

      // 1 minute pass
      await time.increase(3540);

      // Borrower triggers another fee
      await open(erin, parseUnits('1', 9), parseUnits('1000'));

      // Check base rate has decreased even though Borrower tried to stop it decaying
      const baseRate_2 = await troveManager.getStableCoinBaseRate();
      expect(baseRate_2).to.be.lt(baseRate_1);
    });

    it.skip('borrowing at non-zero base rate sends LUSD fee to LQTY staking contract', async () => {
      // time fast-forwards 1 year, and multisig stakes 1 LQTY
      await time.increase(60 * 60 * 24 * 365);
      // await lqtyToken.approve(lqtyStaking.address, dec(1, 18), {
      //   from: multisig,
      // });
      // await lqtyStaking.stake(dec(1, 18), { from: multisig });

      // Check LQTY LUSD balance before == 0
      // const lqtyStaking_LUSDBalance_Before = await STABLE.balanceOf(lqtyStaking.address);
      // expect(lqtyStaking_LUSDBalance_Before).to.be.equal(0);

      await open(whale, parseUnits('1', 9), parseUnits('10000'));
      await open(alice, parseUnits('2', 9), parseUnits('20000'));
      await open(bob, parseUnits('3', 9), parseUnits('30000'));
      await open(carol, parseUnits('4', 9), parseUnits('40000'));

      // Artificially make baseRate 5%
      await troveManager.setBaseRate(parseUnits('0.05'));
      await troveManager.setLastFeeOpTimeToNow();

      // Check baseRate is now non-zero
      const baseRate_1 = await troveManager.getStableCoinBaseRate();
      expect(baseRate_1).to.be.gt(0);

      // 2 hours pass
      await time.increase(7200);

      // D opens trove
      await open(dennis, parseUnits('1', 9), parseUnits('1000'));

      // Check LQTY LUSD balance after has increased
      // const lqtyStaking_LUSDBalance_After = await lusdToken.balanceOf(lqtyStaking.address);
      // assert.isTrue(lqtyStaking_LUSDBalance_After.gt(lqtyStaking_LUSDBalance_Before));
    });
    it.skip('borrowing at non-zero base records the (drawn debt + fee  + liq. reserve) on the Trove struct', async () => {
      // time fast-forwards 1 year, and multisig stakes 1 LQTY
      await time.increase(60 * 60 * 24 * 365);
      // await lqtyToken.approve(lqtyStaking.address, dec(1, 18), {
      //   from: multisig,
      // });
      // await lqtyStaking.stake(dec(1, 18), { from: multisig });

      await open(whale, parseUnits('1', 9), parseUnits('10000'));
      await open(alice, parseUnits('2', 9), parseUnits('20000'));
      await open(bob, parseUnits('3', 9), parseUnits('30000'));
      await open(carol, parseUnits('4', 9), parseUnits('40000'));

      // Artificially make baseRate 5%
      await troveManager.setBaseRate(parseUnits('0.05'));
      await troveManager.setLastFeeOpTimeToNow();

      // Check baseRate is now non-zero
      const baseRate_1 = await troveManager.getStableCoinBaseRate();
      expect(baseRate_1).to.be.gt(0);

      // 2 hours pass
      await time.increase(7200);

      const D_LUSDRequest = parseUnits('20000');

      // D withdraws LUSD
      const { openTx } = await open(dennis, parseUnits('4', 9), parseUnits('40000'));
      const emittedFee = getStableFeeFromStableBorrowingEvent(openTx, contracts);
      expect(emittedFee).to.be.gt(0n);

      // TODO: enable later
      // const newDebt = (await troveManager.Troves(D))[0];

      // Check debt on Trove struct equals drawn debt plus emitted fee
      // th.assertIsApproximatelyEqual(newDebt, D_LUSDRequest.add(emittedFee).add(LUSD_GAS_COMPENSATION), 100000);
    });

    it.skip('borrowing at non-zero base rate increases the LQTY staking contract LUSD fees-per-unit-staked', async () => {
      // time fast-forwards 1 year, and multisig stakes 1 LQTY
      await time.increase(60 * 60 * 24 * 365);
      // await lqtyToken.approve(lqtyStaking.address, dec(1, 18), {
      //   from: multisig,
      // });
      // await lqtyStaking.stake(dec(1, 18), { from: multisig });

      // Check LQTY contract LUSD fees-per-unit-staked is zero
      // const F_LUSD_Before = await lqtyStaking.F_LUSD();
      // assert.equal(F_LUSD_Before, '0');

      await open(whale, parseUnits('1', 9), parseUnits('10000'));
      await open(alice, parseUnits('2', 9), parseUnits('20000'));
      await open(bob, parseUnits('3', 9), parseUnits('30000'));
      await open(carol, parseUnits('4', 9), parseUnits('40000'));

      // Artificially make baseRate 5%
      await troveManager.setBaseRate(parseUnits('0.05'));
      await troveManager.setLastFeeOpTimeToNow();

      // Check baseRate is now non-zero
      const baseRate_1 = await troveManager.getStableCoinBaseRate();
      expect(baseRate_1).to.be.gt(0);

      // 2 hours pass
      await time.increase(7200);

      // D opens trove
      await open(dennis, parseUnits('1', 9), parseUnits('100'));

      // Check LQTY contract LUSD fees-per-unit-staked has increased
      // const F_LUSD_After = await lqtyStaking.F_LUSD();
      // assert.isTrue(F_LUSD_After.gt(F_LUSD_Before));
    });

    it.skip('Borrowing at non-zero base rate sends requested amount to the user', async () => {
      // time fast-forwards 1 year, and multisig stakes 1 LQTY
      await time.increase(60 * 60 * 24 * 365);
      // await lqtyToken.approve(lqtyStaking.address, dec(1, 18), {
      //   from: multisig,
      // });
      // await lqtyStaking.stake(dec(1, 18), { from: multisig });

      // Check LQTY Staking contract balance before == 0
      // const lqtyStaking_LUSDBalance_Before = await lusdToken.balanceOf(lqtyStaking.address);
      // assert.equal(lqtyStaking_LUSDBalance_Before, '0');

      await open(whale, parseUnits('1', 9), parseUnits('10000'));
      await open(alice, parseUnits('2', 9), parseUnits('20000'));
      await open(bob, parseUnits('3', 9), parseUnits('30000'));
      await open(carol, parseUnits('4', 9), parseUnits('40000'));

      // Artificially make baseRate 5%
      await troveManager.setBaseRate(parseUnits('0.05'));
      await troveManager.setLastFeeOpTimeToNow();

      // Check baseRate is non-zero
      const baseRate_1 = await troveManager.getStableCoinBaseRate();
      expect(baseRate_1).to.be.gt(0);

      // 2 hours pass
      await time.increase(7200);

      // D opens trove
      const LUSDRequest_D = parseUnits('40000');
      await open(dennis, parseUnits('4', 9), parseUnits('40000'));

      // // Check LQTY staking LUSD balance has increased
      // const lqtyStaking_LUSDBalance_After = await lusdToken.balanceOf(lqtyStaking.address);
      // assert.isTrue(lqtyStaking_LUSDBalance_After.gt(lqtyStaking_LUSDBalance_Before));

      // // Check D's LUSD balance now equals their requested LUSD
      // const LUSDBalance_D = await lusdToken.balanceOf(D);
      // assert.isTrue(LUSDRequest_D.eq(LUSDBalance_D));
    });

    it.skip('borrowing at zero base rate changes the LQTY staking contract LUSD fees-per-unit-staked', async () => {
      await open(alice, parseUnits('1', 9), parseUnits('5000'));
      await open(bob, parseUnits('1', 9), parseUnits('5000'));
      await open(carol, parseUnits('1', 9), parseUnits('5000'));

      // Check baseRate is zero
      const baseRate_1 = await troveManager.getStableCoinBaseRate();
      expect(baseRate_1).to.be.gt(0);

      // 2 hours pass
      await time.increase(7200);

      // Check LUSD reward per LQTY staked == 0
      // const F_LUSD_Before = await lqtyStaking.F_LUSD();
      // assert.equal(F_LUSD_Before, '0');

      // // A stakes LQTY
      // await lqtyToken.unprotectedMint(A, dec(100, 18));
      // await lqtyStaking.stake(dec(100, 18), { from: A });

      // D opens trove
      await open(dennis, parseUnits('1', 9), parseUnits('37'));

      // Check LUSD reward per LQTY staked > 0
      // const F_LUSD_After = await lqtyStaking.F_LUSD();
      // assert.isTrue(F_LUSD_After.gt(toBN('0')));
    });

    it.skip('Borrowing at zero base rate charges minimum fee', async () => {
      await open(alice, parseUnits('1', 9), parseUnits('5000'));
      await open(bob, parseUnits('1', 9), parseUnits('5000'));

      const LUSDRequest = parseUnits('10000');
      const { openTx } = await open(carol, parseUnits('1', 9), LUSDRequest);
      // const _LUSDFee = toBN(th.getEventArgByName(txC, 'LUSDBorrowingFeePaid', '_LUSDFee'));

      // const expectedFee = BORROWING_FEE_FLOOR.mul(toBN(LUSDRequest)).div(toBN(dec(1, 18)));
      // assert.isTrue(_LUSDFee.eq(expectedFee));
    });

    it('reverts when system is in Recovery Mode and ICR < CCR', async () => {
      await open(whale, parseUnits('1', 9), parseUnits('5000'));
      await open(alice, parseUnits('1', 9), parseUnits('5000'));
      expect(await checkRecoveryMode(contracts)).to.be.false;

      // price drops, and Recovery Mode kicks in
      await setPrice('BTC', '5000', contracts);

      expect(await checkRecoveryMode(contracts)).to.be.true;

      // Bob tries to open a trove with 149% ICR during Recovery Mode
      await expect(open(bob, parseUnits('1', 9), parseUnits('5000'))).to.be.revertedWithCustomError(
        borrowerOperations,
        'ICR_lt_CCR'
      );
    });

    it('reverts when trove ICR < MCR', async () => {
      await open(whale, parseUnits('1', 9), parseUnits('5000'));
      await open(alice, parseUnits('1', 9), parseUnits('5000'));
      expect(await checkRecoveryMode(contracts)).to.be.false;

      // Bob attempts to open a 109% ICR trove in Normal Mode
      await expect(open(bob, parseUnits('1', 9), parseUnits('19000'))).to.be.revertedWithCustomError(
        borrowerOperations,
        'ICR_lt_MCR'
      );

      // price drops, and Recovery Mode kicks in
      await setPrice('BTC', '5000', contracts);

      expect(await checkRecoveryMode(contracts)).to.be.true;

      // Bob attempts to open a 109% ICR trove in Recovery Mode
      await expect(open(carol, parseUnits('1', 9), parseUnits('19000'))).to.be.revertedWithCustomError(
        borrowerOperations,
        'ICR_lt_MCR'
      );
    });

    it('reverts when opening the trove would cause the TCR of the system to fall below the CCR', async () => {
      await setPrice('BTC', '15000', contracts);

      // Alice creates trove with 150% ICR.  System TCR = 150%.
      await open(alice, parseUnits('1', 9), parseUnits('9751.243')); // 9751.243 + 48.756215 + 200 = 9999.999215

      const TCR = await getTCR(contracts);
      expect(TCR).to.be.closeTo(parseUnits('1.5'), parseUnits('0.0001'));

      // Bob attempts to open a trove with ICR = 149%
      await expect(open(bob, parseUnits('1', 9), parseUnits('9752'))).to.be.revertedWithCustomError(
        borrowerOperations,
        'TCR_lt_CCR'
      );
    });
    it('reverts if trove is already active', async () => {
      await open(whale, parseUnits('1', 9), parseUnits('10000'));
      await open(alice, parseUnits('1', 9), parseUnits('5000'));
      await open(bob, parseUnits('1', 9), parseUnits('5000'));

      await expect(open(bob, parseUnits('1', 9), parseUnits('5000'))).to.be.revertedWithCustomError(
        borrowerOperations,
        'ActiveTrove'
      );

      await expect(open(alice, parseUnits('1', 9), parseUnits('5000'))).to.be.revertedWithCustomError(
        borrowerOperations,
        'ActiveTrove'
      );
    });

    it('Can open a trove with ICR >= CCR when system is in Recovery Mode', async () => {
      await setPrice('BTC', '15000', contracts);
      // --- SETUP ---
      //  Alice and Bob add coll and withdraw such  that the TCR is ~150%
      await open(alice, parseUnits('1', 9), parseUnits('9751.243'));
      await open(bob, parseUnits('1', 9), parseUnits('9751.243'));

      const TCR = await getTCR(contracts);
      expect(TCR).to.be.closeTo(parseUnits('1.5'), parseUnits('0.0001'));

      // price drops to 1ETH:100LUSD, reducing TCR below 150%
      await setPrice('BTC', '14900', contracts);

      expect(await checkRecoveryMode(contracts)).to.be.true;

      // Carol opens at 150% ICR in Recovery Mode
      await open(carol, parseUnits('1', 9), parseUnits('9550'));

      const carol_TroveStatus = await troveManager.getTroveStatus(carol);
      expect(carol_TroveStatus).to.be.equal(1n);

      const carolICR = await troveManager.getCurrentICR(carol);
      expect(carolICR.ICR).to.be.gt(parseUnits('1.5'));
    });

    it.skip('Reverts opening a trove with min debt when system is in Recovery Mode', async () => {
      // TODO: check the logics again
      // --- SETUP ---
      //  Alice and Bob add coll and withdraw such  that the TCR is ~150%
      await setPrice('BTC', '15000', contracts);
      // --- SETUP ---
      //  Alice and Bob add coll and withdraw such  that the TCR is ~150%
      await open(alice, parseUnits('1', 9), parseUnits('9751.243'));
      await open(bob, parseUnits('1', 9), parseUnits('9751.243'));

      const TCR = await getTCR(contracts);
      expect(TCR).to.be.closeTo(parseUnits('1.5'), parseUnits('0.0001'));

      // price drops to 1ETH:100LUSD, reducing TCR below 150%
      await setPrice('BTC', '14900', contracts);

      expect(await checkRecoveryMode(contracts)).to.be.true;

      await open(carol, parseUnits('1', 9), parseUnits('1'));
      // await assertRevert(
      //   borrowerOperations.openTrove(th._100pct, await getNetBorrowingAmount(MIN_NET_DEBT), carol, carol, {
      //     from: carol,
      //     value: dec(1, 'ether'),
      //   })
      // );
    });
  });
});
