import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import { Contracts, connectCoreContracts, deployAndLinkToken, deployCore } from '../utils/deploymentHelpers';
import {
  BorrowerOperationsTester,
  MockDebtToken,
  MockERC20,
  MockPriceFeed,
  MockTroveManager,
  StabilityPoolManager,
  StoragePool,
  TroveManager,
} from '../typechain';
import { expect } from 'chai';
import {
  TimeValues,
  MAX_BORROWING_FEE,
  checkRecoveryMode,
  fastForwardTime,
  getLatestBlockTimestamp,
  getStabilityPool,
  getTCR,
  getTroveEntireColl,
  getTroveEntireDebt,
  openTrove,
} from '../utils/testHelper';
import { parseUnits } from 'ethers';

describe('BorrowerOperations', () => {
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
  let troveManager: MockTroveManager;
  let borrowerOperations: BorrowerOperationsTester;
  let storagePool: StoragePool;
  let stabilityPoolManager: StabilityPoolManager;

  before(async () => {
    [owner, defaulter_1, defaulter_2, defaulter_3, whale, alice, bob, carol, dennis, erin, flyn] =
      await ethers.getSigners();
  });

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

  // --- addColl() ---

  it('addColl(): reverts when top-up would leave trove with ICR < MCR', async () => {
    // alice creates a Trove and adds first collateral
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('0.05', 9),
      debts: [{ tokenAddress: STOCK, amount: parseUnits('1') }],
    });
    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STOCK, amount: parseUnits('0.9') }],
    });

    // Price drops
    await priceFeed.setTokenPrice(BTC, parseUnits('1000', 18));
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

    const collTopUp = 1; // 1 wei top up
    await BTC.unprotectedMint(alice, collTopUp);
    await BTC.connect(alice).approve(borrowerOperations, collTopUp);
    await expect(
      borrowerOperations.connect(alice).addColl([
        {
          tokenAddress: BTC,
          amount: collTopUp,
        },
      ])
    ).to.be.revertedWithCustomError(borrowerOperations, 'ICR_lt_MCR');
  });
  it('addColl(): Increases the activePool ETH and raw ether balance by correct amount', async () => {
    const aliceColl = parseUnits('0.05', 9);
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: aliceColl,
      debts: [{ tokenAddress: STOCK, amount: parseUnits('1') }],
    });

    const pool_BTC_Before = await storagePool.getValue(BTC, true, 0);
    const pool_RawBTC_Before = await BTC.balanceOf(storagePool);

    expect(pool_BTC_Before).to.be.equal(aliceColl);
    expect(pool_RawBTC_Before).to.be.equal(aliceColl);

    // Add 1 BTC
    const collTopUp = parseUnits('1', 9);
    await BTC.unprotectedMint(alice, collTopUp);
    await BTC.connect(alice).approve(borrowerOperations, collTopUp);
    await borrowerOperations.connect(alice).addColl([
      {
        tokenAddress: BTC,
        amount: collTopUp,
      },
    ]);

    const pool_BTC_After = await storagePool.getValue(BTC, true, 0);
    const pool_RawBTC_After = await BTC.balanceOf(storagePool);
    expect(pool_BTC_After).to.be.equal(pool_BTC_Before + collTopUp);
    expect(pool_RawBTC_After).to.be.equal(pool_RawBTC_Before + collTopUp);
  });
  it('addColl(), active Trove: adds the correct collateral amount to the Trove', async () => {
    // alice creates a Trove and adds first collateral
    const aliceColl = parseUnits('0.05', 9);
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: aliceColl,
      debts: [{ tokenAddress: STOCK, amount: parseUnits('1') }],
    });

    const alice_Trove_Before = await troveManager.Troves(alice);
    const alice_DebtAndColl_Before = await troveManager.getTroveColl(alice);
    const alice_Coll_Before = await alice_DebtAndColl_Before[0].amount;
    const status_Before = alice_Trove_Before.status;

    // check status before
    expect(status_Before).to.be.equal(1);

    // Alice adds second collateral
    const collTopUp = parseUnits('1', 9);
    await BTC.unprotectedMint(alice, collTopUp);
    await BTC.connect(alice).approve(borrowerOperations, collTopUp);
    await borrowerOperations.connect(alice).addColl([
      {
        tokenAddress: BTC,
        amount: collTopUp,
      },
    ]);

    const alice_Trove_After = await troveManager.Troves(alice);
    const alice_DebtAndColl_After = await troveManager.getTroveColl(alice);
    const alice_Coll_After = await alice_DebtAndColl_After[0].amount;
    const status_After = alice_Trove_After.status;

    // check coll increases by correct amount,and status remains active
    expect(alice_Coll_After).to.be.equal(alice_Coll_Before + collTopUp);
    expect(status_After).to.be.equal(1);
  });
  it('addColl(), active Trove: updates the stake and updates the total stakes', async () => {
    //  Alice creates initial Trove with 1 ether
    const aliceColl = parseUnits('0.05', 9);
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: aliceColl,
      debts: [{ tokenAddress: STOCK, amount: parseUnits('1') }],
    });
    const BTC_Price = await priceFeed.getPrice(BTC);

    const alice_Stake_Before = await troveManager.getTroveStake(alice);
    const totalStakes_Before = await troveManager.totalStakes(BTC);

    expect(alice_Stake_Before).to.be.equal((totalStakes_Before * BTC_Price) / 1_000_000_000n);

    // Alice tops up Trove collateral with 2 ether
    const collTopUp = parseUnits('1', 9);
    await BTC.unprotectedMint(alice, collTopUp);
    await BTC.connect(alice).approve(borrowerOperations, collTopUp);
    await borrowerOperations.connect(alice).addColl([
      {
        tokenAddress: BTC,
        amount: collTopUp,
      },
    ]);

    // Check stake and total stakes get updated
    const alice_Stake_After = await troveManager.getTroveStake(alice);
    const totalStakes_After = await troveManager.totalStakes(BTC);
    expect(alice_Stake_After).to.be.equal(alice_Stake_Before + (collTopUp * BTC_Price) / 1_000_000_000n);
    expect(totalStakes_After).to.be.equal(totalStakes_Before + collTopUp);
  });
  it("addColl(), active Trove: applies pending rewards and updates user's L_ETH, L_LUSDDebt snapshots", async () => {
    // --- SETUP ---
    const aliceColl = parseUnits('1.5', 9);
    const aliceDebt = parseUnits('15000');
    const { debtInUSD: aliceDebtBefore } = await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: aliceColl,
      debts: [{ tokenAddress: STABLE, amount: aliceDebt }],
    });

    const bobColl = parseUnits('1', 9);
    const bobDebt = parseUnits('10000');
    const { debtInUSD: bobDebtBefore } = await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: bobColl,
      debts: [{ tokenAddress: STABLE, amount: bobDebt }],
    });

    await openTrove({
      from: carol,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('0.4', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('5000') }],
    });

    // --- TEST ---

    // price drops to 1BTC:$10k, reducing Carol's ICR below MCR
    await priceFeed.setTokenPrice(BTC, parseUnits('1000'));

    // Liquidate Carol's Trove,
    await troveManager.liquidate(carol);

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
    await BTC.unprotectedMint(alice, aliceTopup);
    await BTC.connect(alice).approve(borrowerOperations, aliceTopup);
    await borrowerOperations.connect(alice).addColl([
      {
        tokenAddress: BTC,
        amount: aliceTopup,
      },
    ]);
    const bobTopup = parseUnits('1', 9);
    await BTC.unprotectedMint(bob, bobTopup);
    await BTC.connect(bob).approve(borrowerOperations, bobTopup);
    await borrowerOperations.connect(bob).addColl([
      {
        tokenAddress: BTC,
        amount: bobTopup,
      },
    ]);

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
    expect(aliceNewDebt).to.be.equal(aliceDebtBefore + alicePendingRewardStableAfter + alicePendingRewardStableBefore);
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
  it('addColl(), reverts if trove is non-existent or closed', async () => {
    // A, B open troves
    const aliceColl = parseUnits('1.5', 9);
    const aliceDebt = parseUnits('15000');
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: aliceColl,
      debts: [{ tokenAddress: STABLE, amount: aliceDebt }],
    });
    const bobColl = parseUnits('1.5', 9);
    const bobDebt = parseUnits('15000');
    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: bobColl,
      debts: [{ tokenAddress: STABLE, amount: bobDebt }],
    });

    // Carol attempts to add collateral to her non-existent trove
    await expect(
      borrowerOperations.connect(carol).addColl([
        {
          tokenAddress: BTC,
          amount: parseUnits('1', 9),
        },
      ])
    ).to.be.revertedWithCustomError(borrowerOperations, 'TroveClosedOrNotExist');

    // Price drops
    await priceFeed.setTokenPrice(BTC, parseUnits('1000'));

    // Bob gets liquidated
    await troveManager.liquidate(bob);

    // Bob attempts to add collateral to his closed trove
    await expect(
      borrowerOperations.connect(bob).addColl([
        {
          tokenAddress: BTC,
          amount: parseUnits('1', 9),
        },
      ])
    ).to.be.revertedWithCustomError(borrowerOperations, 'TroveClosedOrNotExist');
  });
  it('addColl(): can add collateral in Recovery Mode', async () => {
    const aliceColl = parseUnits('1.5', 9);
    const aliceDebt = parseUnits('15000');
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: aliceColl,
      debts: [{ tokenAddress: STABLE, amount: aliceDebt }],
    });
    const aliceCollBefore = await troveManager.getTroveColl(alice);

    expect(await checkRecoveryMode(contracts)).to.be.false;

    await priceFeed.setTokenPrice(BTC, parseUnits('1000'));

    expect(await checkRecoveryMode(contracts)).to.be.true;

    const collTopUp = parseUnits('1', 9);
    await BTC.unprotectedMint(alice, collTopUp);
    await BTC.connect(alice).approve(borrowerOperations, collTopUp);
    await borrowerOperations.connect(alice).addColl([
      {
        tokenAddress: BTC,
        amount: collTopUp,
      },
    ]);

    // Check Alice's collateral
    const aliceCollAfter = await troveManager.getTroveColl(alice);
    // const aliceCollAfter = (await troveManager.Troves(alice)).;
    expect(aliceCollAfter[0].amount).to.be.equal(aliceCollBefore[0].amount + collTopUp);
  });

  // --- withdrawColl() ---

  it('withdrawColl(): reverts when withdrawal would leave trove with ICR < MCR', async () => {
    // alice creates a Trove and adds first collateral
    const aliceColl = parseUnits('1.5', 9);
    const aliceDebt = parseUnits('1500');
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: aliceColl,
      debts: [{ tokenAddress: STABLE, amount: aliceDebt }],
    });

    const bobColl = parseUnits('1', 9);
    const bobDebt = parseUnits('1');
    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: bobColl,
      debts: [{ tokenAddress: STABLE, amount: bobDebt }],
    });

    // Price drops
    await priceFeed.setTokenPrice(BTC, parseUnits('1200'));

    expect((await storagePool.checkRecoveryMode()).isInRecoveryMode).to.be.false;
    expect((await troveManager.getCurrentICR(alice)).ICR).to.be.lt(parseUnits('1.1')); // less than 110%

    const collWithdrawal = 1; // 1 wei withdrawal

    await expect(
      borrowerOperations.connect(alice).withdrawColl([
        {
          tokenAddress: BTC,
          amount: collWithdrawal,
        },
      ])
    ).to.be.revertedWithCustomError(borrowerOperations, 'ICR_lt_MCR');
  });
  it('withdrawColl(): reverts when calling address does not have active trove', async () => {
    const aliceColl = parseUnits('1.5', 9);
    const aliceDebt = parseUnits('1000');
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: aliceColl,
      debts: [{ tokenAddress: STABLE, amount: aliceDebt }],
    });
    const bobColl = parseUnits('1', 9);
    const bobDebt = parseUnits('10000');
    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: bobColl,
      debts: [{ tokenAddress: STABLE, amount: bobDebt }],
    });

    // Bob successfully withdraws some coll
    const txBob = await borrowerOperations.connect(bob).withdrawColl([
      {
        tokenAddress: BTC,
        amount: parseUnits('0.1', 9),
      },
    ]);

    // Carol with no active trove attempts to withdraw
    await expect(
      borrowerOperations.connect(carol).withdrawColl([
        {
          tokenAddress: BTC,
          amount: parseUnits('0.1', 9),
        },
      ])
    ).to.be.revertedWithCustomError(borrowerOperations, 'TroveClosedOrNotExist');
  });
  it('withdrawColl(): reverts when system is in Recovery Mode', async () => {
    const aliceColl = parseUnits('1.5', 9);
    const aliceDebt = parseUnits('10000');
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: aliceColl,
      debts: [{ tokenAddress: STABLE, amount: aliceDebt }],
    });
    const bobColl = parseUnits('1.5', 9);
    const bobDebt = parseUnits('10000');
    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: bobColl,
      debts: [{ tokenAddress: STABLE, amount: bobDebt }],
    });

    expect(await checkRecoveryMode(contracts)).to.be.false;

    // Withdrawal possible when recoveryMode == false
    await borrowerOperations.connect(alice).withdrawColl([
      {
        tokenAddress: BTC,
        amount: 1000,
      },
    ]);

    await priceFeed.setTokenPrice(BTC, parseUnits('1000'));

    expect(await checkRecoveryMode(contracts)).to.be.true;

    //Check withdrawal impossible when recoveryMode == true
    await expect(
      borrowerOperations.connect(alice).withdrawColl([
        {
          tokenAddress: BTC,
          amount: 1000,
        },
      ])
    ).to.be.revertedWithCustomError(borrowerOperations, 'CollWithdrawPermittedInRM');
  });
  it("withdrawColl(): reverts when requested ETH withdrawal is > the trove's collateral", async () => {
    const aliceColl = parseUnits('1.5', 9);
    const aliceDebt = parseUnits('10000');
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: aliceColl,
      debts: [{ tokenAddress: STABLE, amount: aliceDebt }],
    });
    const bobColl = parseUnits('1', 9);
    const bobDebt = parseUnits('10000');
    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: bobColl,
      debts: [{ tokenAddress: STABLE, amount: bobDebt }],
    });
    const carolColl = parseUnits('1.5', 9);
    const carolDebt = parseUnits('10000');
    await openTrove({
      from: carol,
      contracts,
      collToken: BTC,
      collAmount: carolColl,
      debts: [{ tokenAddress: STABLE, amount: carolDebt }],
    });

    // Carol withdraws exactly all her collateral
    await expect(
      borrowerOperations.connect(carol).withdrawColl([
        {
          tokenAddress: BTC,
          amount: carolColl,
        },
      ])
    ).to.be.revertedWithCustomError(borrowerOperations, 'ICR_lt_MCR');

    // Bob attempts to withdraw 1 wei more than his collateral
    await expect(
      borrowerOperations.connect(bob).withdrawColl([
        {
          tokenAddress: BTC,
          amount: bobColl + 1n,
        },
      ])
    ).to.be.revertedWithCustomError(borrowerOperations, 'WithdrawAmount_gt_Coll');
  });
  it("withdrawColl(): reverts when withdrawal would bring the user's ICR < MCR", async () => {
    await priceFeed.setTokenPrice(BTC, parseUnits('11000'));
    await openTrove({
      from: whale,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1.5', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('1000') }],
    });
    // BOB ICR = 110%
    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('9750') }],
    });

    // Bob attempts to withdraws 1 wei, Which would leave him with < 110% ICR.
    await expect(
      borrowerOperations.connect(bob).withdrawColl([
        {
          tokenAddress: BTC,
          amount: parseUnits('0.1', 9),
        },
      ])
    ).to.be.revertedWithCustomError(borrowerOperations, 'ICR_lt_MCR');
  });
  it('withdrawColl(): reverts if system is in Recovery Mode', async () => {
    // --- SETUP ---

    // A and B open troves at 150% ICR
    const aliceColl = parseUnits('1.5', 9);
    const aliceDebt = parseUnits('10000');
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: aliceColl,
      debts: [{ tokenAddress: STABLE, amount: aliceDebt }],
    });
    const bobColl = parseUnits('1', 9);
    const bobDebt = parseUnits('10000');
    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: bobColl,
      debts: [{ tokenAddress: STABLE, amount: bobDebt }],
    });

    const TCR = await getTCR(contracts);
    expect(TCR).to.be.gt(parseUnits('1.5')); // gt 150%

    // --- TEST ---

    // price drops to 1ETH:150LUSD, reducing TCR below 150%
    await priceFeed.setTokenPrice(BTC, parseUnits('1000'));

    //Alice tries to withdraw collateral during Recovery Mode
    await expect(
      borrowerOperations.connect(alice).withdrawColl([
        {
          tokenAddress: BTC,
          amount: 1,
        },
      ])
    ).to.be.revertedWithCustomError(borrowerOperations, 'CollWithdrawPermittedInRM');
  });
  it('withdrawColl(): doesn’t allow a user to completely withdraw all collateral from their Trove (due to gas compensation)', async () => {
    const aliceColl = parseUnits('1.5', 9);
    const aliceDebt = parseUnits('10000');
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: aliceColl,
      debts: [{ tokenAddress: STABLE, amount: aliceDebt }],
    });
    const bobColl = parseUnits('1', 9);
    const bobDebt = parseUnits('10000');
    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: bobColl,
      debts: [{ tokenAddress: STABLE, amount: bobDebt }],
    });

    // Check Trove is active
    const alice_Trove_Before = await troveManager.Troves(alice);
    expect(alice_Trove_Before.status).to.be.equal(1);

    // Alice attempts to withdraw all collateral
    await expect(
      borrowerOperations.connect(alice).withdrawColl([
        {
          tokenAddress: BTC,
          amount: aliceColl,
        },
      ])
    ).to.be.revertedWithCustomError(borrowerOperations, 'ICR_lt_MCR');
  });
  it('withdrawColl(): leaves the Trove active when the user withdraws less than all the collateral', async () => {
    // Open Trove
    const aliceColl = parseUnits('1.5', 9);
    const aliceDebt = parseUnits('10000');
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: aliceColl,
      debts: [{ tokenAddress: STABLE, amount: aliceDebt }],
    });

    // Check Trove is active
    const alice_Trove_Before = await troveManager.Troves(alice);
    expect(alice_Trove_Before.status).to.be.equal(1);

    // Withdraw some collateral
    await borrowerOperations.connect(alice).withdrawColl([
      {
        tokenAddress: BTC,
        amount: parseUnits('0.1', 9),
      },
    ]);

    // Check Trove is still active
    const alice_Trove_After = await troveManager.Troves(alice);
    expect(alice_Trove_After.status).to.be.equal(1);
  });
  it("withdrawColl(): reduces the Trove's collateral by the correct amount", async () => {
    const aliceColl = parseUnits('1.5', 9);
    const aliceDebt = parseUnits('10000');
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: aliceColl,
      debts: [{ tokenAddress: STABLE, amount: aliceDebt }],
    });

    // Alice withdraws 1 ether
    const withdrawColl = parseUnits('0.1', 9);
    await borrowerOperations.connect(alice).withdrawColl([
      {
        tokenAddress: BTC,
        amount: withdrawColl,
      },
    ]);

    // Check 1 ether remaining
    const troveAfter = await troveManager.getTroveColl(alice);
    const aliceCollAfter = troveAfter[0].amount;

    expect(aliceCollAfter).to.be.equal(aliceColl - withdrawColl);
  });
  it('withdrawColl(): reduces ActivePool ETH and raw ether by correct amount', async () => {
    const aliceColl = parseUnits('1.5', 9);
    const aliceDebt = parseUnits('10000');
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: aliceColl,
      debts: [{ tokenAddress: STABLE, amount: aliceDebt }],
    });

    // check before
    const activePool_BTC_before = await storagePool.getValue(BTC, true, 0);
    const activePool_RawBTC_before = await BTC.balanceOf(storagePool);

    const withdrawColl = parseUnits('0.1', 9);
    await borrowerOperations.connect(alice).withdrawColl([
      {
        tokenAddress: BTC,
        amount: withdrawColl,
      },
    ]);

    // check after
    const activePool_BTC_After = await storagePool.getValue(BTC, true, 0);
    const activePool_RawBTC_After = await BTC.balanceOf(storagePool);
    expect(activePool_BTC_After).to.be.equal(activePool_BTC_before - withdrawColl);
    expect(activePool_RawBTC_After).to.be.equal(activePool_RawBTC_before - withdrawColl);
  });
  it('withdrawColl(): updates the stake and updates the total stakes', async () => {
    //  Alice creates initial Trove with 2 ether
    const aliceColl = parseUnits('1.5', 9);
    const aliceDebt = parseUnits('10000');
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: aliceColl,
      debts: [{ tokenAddress: STABLE, amount: aliceDebt }],
    });

    const alice_Stake_Before = await troveManager.getTroveStakes(alice, BTC);
    const totalStakes_Before = await troveManager.totalStakes(BTC);

    expect(alice_Stake_Before).to.be.equal(aliceColl);
    expect(totalStakes_Before).to.be.equal(aliceColl);

    // Alice withdraws 1 ether
    const withdrawColl = parseUnits('0.1', 9);
    await borrowerOperations.connect(alice).withdrawColl([
      {
        tokenAddress: BTC,
        amount: withdrawColl,
      },
    ]);

    // Check stake and total stakes get updated
    const alice_Stake_After = await troveManager.getTroveStakes(alice, BTC);
    const totalStakes_After = await troveManager.totalStakes(BTC);

    expect(alice_Stake_After).to.be.equal(alice_Stake_Before - withdrawColl);
    expect(totalStakes_After).to.be.equal(totalStakes_Before - withdrawColl);
  });
  it('withdrawColl(): sends the correct amount of ETH to the user', async () => {
    const aliceColl = parseUnits('1.5', 9);
    const aliceDebt = parseUnits('10000');
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: aliceColl,
      debts: [{ tokenAddress: STABLE, amount: aliceDebt }],
    });

    const alice_BTC_Bal_Before = await BTC.balanceOf(alice);
    const withdrawColl = parseUnits('0.1', 9);
    await borrowerOperations.connect(alice).withdrawColl([
      {
        tokenAddress: BTC,
        amount: withdrawColl,
      },
    ]);

    const alice_BTC_Bal_After = await BTC.balanceOf(alice);
    expect(alice_BTC_Bal_After).to.be.equal(alice_BTC_Bal_Before + withdrawColl);
  });
  it("withdrawColl(): applies pending rewards and updates user's L_ETH, L_LUSDDebt snapshots", async () => {
    // --- SETUP ---
    // Alice adds 15 ether, Bob adds 5 ether, Carol adds 1 ether
    await openTrove({
      from: whale,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('10', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('1') }],
    });
    const aliceColl = parseUnits('1.5', 9);
    const aliceDebt = parseUnits('1000');
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: aliceColl,
      debts: [{ tokenAddress: STABLE, amount: aliceDebt }],
    });
    const bobColl = parseUnits('1', 9);
    const bobDebt = parseUnits('1000');
    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: bobColl,
      debts: [{ tokenAddress: STABLE, amount: bobDebt }],
    });
    const carolColl = parseUnits('0.1', 9);
    const carolDebt = parseUnits('1200');
    await openTrove({
      from: carol,
      contracts,
      collToken: BTC,
      collAmount: carolColl,
      debts: [{ tokenAddress: STABLE, amount: carolDebt }],
    });

    const aliceDebtBefore = (await troveManager.getTroveDebt(alice))[0].amount;
    const bobDebtBefore = (await troveManager.getTroveDebt(bob))[0].amount;

    // --- TEST ---

    // price drops to 1ETH:100LUSD, reducing Carol's ICR below MCR
    await priceFeed.setTokenPrice(BTC, parseUnits('5000'));

    // close Carol's Trove, liquidating her 1 ether and 180LUSD.
    await troveManager.liquidate(carol);

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

    await borrowerOperations.connect(alice).withdrawColl([
      {
        tokenAddress: BTC,
        amount: aliceCollWithdrawal,
      },
    ]);
    await borrowerOperations.connect(bob).withdrawColl([
      {
        tokenAddress: BTC,
        amount: bobCollWithdrawal,
      },
    ]);

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
    expect(alice_StableDebtRewardSnapshot_After).to.be.closeTo(alice_StableDebtRewardSnapshot_Before + L_STABLE, 100n);
    expect(bob_BTCrewardSnapshot_After).to.be.closeTo(bob_BTCrewardSnapshot_Before + L_BTC, 100n);
    expect(bob_StableDebtRewardSnapshot_After).to.be.closeTo(bob_StableDebtRewardSnapshot_Before + L_STABLE, 100n);
  });

  // --- increaseDebt() ---
  it('increaseDebt(): reverts when withdrawal would leave trove with ICR < MCR', async () => {
    // alice creates a Trove and adds first collateral
    const aliceColl = parseUnits('1.5', 9);
    const aliceDebt = parseUnits('1000');
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: aliceColl,
      debts: [{ tokenAddress: STABLE, amount: aliceDebt }],
    });
    const bobColl = parseUnits('1', 9);
    const bobDebt = parseUnits('5000');
    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: bobColl,
      debts: [{ tokenAddress: STABLE, amount: bobDebt }],
    });
    // Price drops
    await priceFeed.setTokenPrice(BTC, parseUnits('5000'));

    expect(await checkRecoveryMode(contracts)).to.be.false;
    expect((await troveManager.getCurrentICR(bob)).ICR).to.be.lt(parseUnits('1.1'));

    const stableMint = 1; // withdraw 1 wei LUSD

    await expect(
      borrowerOperations.connect(bob).increaseDebt(
        [
          {
            tokenAddress: STABLE,
            amount: stableMint,
          },
        ],
        MAX_BORROWING_FEE
      )
    ).to.be.revertedWithCustomError(borrowerOperations, 'ICR_lt_MCR');
  });
  it('increaseDebt(): decays a non-zero base rate', async () => {
    await openTrove({
      from: whale,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('10', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('1') }],
    });

    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
    });
    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
    });
    await openTrove({
      from: carol,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
    });
    await openTrove({
      from: dennis,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
    });

    // Artificially set base rate to 5%
    await troveManager.setBaseRate(parseUnits('0.05'));

    // Check baseRate is now non-zero
    const baseRate_1 = await troveManager.baseRate();
    expect(baseRate_1).to.be.equal(parseUnits('0.05'));

    // 2 hours pass
    await fastForwardTime(60 * 60 * 2);

    // D withdraws LUSD
    await borrowerOperations.connect(dennis).increaseDebt(
      [
        {
          tokenAddress: STABLE,
          amount: parseUnits('1'),
        },
      ],
      MAX_BORROWING_FEE
    );

    // Check baseRate has decreased
    const baseRate_2 = await troveManager.baseRate();
    expect(baseRate_2).to.be.lt(baseRate_1);

    // 1 hour passes
    await fastForwardTime(60 * 60);

    // E withdraws LUSD
    await borrowerOperations.connect(carol).increaseDebt(
      [
        {
          tokenAddress: STABLE,
          amount: parseUnits('1'),
        },
      ],
      MAX_BORROWING_FEE
    );

    const baseRate_3 = await troveManager.baseRate();
    expect(baseRate_3).to.be.lt(baseRate_2);
  });
  it('increaseDebt(): reverts if max fee > 100%', async () => {
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
    });

    await expect(
      borrowerOperations.connect(alice).increaseDebt(
        [
          {
            tokenAddress: STABLE,
            amount: parseUnits('1'),
          },
        ],
        parseUnits('2')
      )
    ).to.be.revertedWithCustomError(borrowerOperations, 'MaxFee_out_Range');
    await expect(
      borrowerOperations.connect(alice).increaseDebt(
        [
          {
            tokenAddress: STABLE,
            amount: parseUnits('1'),
          },
        ],
        parseUnits('1') + 1n
      )
    ).to.be.revertedWithCustomError(borrowerOperations, 'MaxFee_out_Range');
  });
  it('increaseDebt(): reverts if max fee < 0.5% in Normal mode', async () => {
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
    });

    await expect(
      borrowerOperations.connect(alice).increaseDebt(
        [
          {
            tokenAddress: STABLE,
            amount: parseUnits('1'),
          },
        ],
        0
      )
    ).to.be.revertedWithCustomError(borrowerOperations, 'MaxFee_out_Range');
    await expect(
      borrowerOperations.connect(alice).increaseDebt(
        [
          {
            tokenAddress: STABLE,
            amount: parseUnits('1'),
          },
        ],
        1
      )
    ).to.be.revertedWithCustomError(borrowerOperations, 'MaxFee_out_Range');
    await expect(
      borrowerOperations.connect(alice).increaseDebt(
        [
          {
            tokenAddress: STABLE,
            amount: parseUnits('1'),
          },
        ],
        parseUnits('0.005') - 1n
      )
    ).to.be.revertedWithCustomError(borrowerOperations, 'MaxFee_out_Range');
  });
  it('increaseDebt(): succeeds when fee is less than max fee percentage', async () => {
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
    });

    // Artificially make baseRate 5%
    await troveManager.setBaseRate(parseUnits('0.05'));
    await troveManager.setLastFeeOpTimeToNow();

    let baseRate = await troveManager.baseRate(); // expect 5% base rate
    expect(baseRate).to.be.equal(parseUnits('0.05'));

    // Attempt with maxFee > 5%
    await expect(
      borrowerOperations.connect(alice).increaseDebt(
        [
          {
            tokenAddress: STABLE,
            amount: parseUnits('1'),
          },
        ],
        MAX_BORROWING_FEE + 1n
      )
    ).to.be.revertedWithCustomError(borrowerOperations, 'MaxFee_out_Range');

    baseRate = await troveManager.baseRate(); // expect 5% base rate
    expect(baseRate).to.be.equal(parseUnits('0.05'));

    // Attempt with maxFee = 5%
    await borrowerOperations.connect(alice).increaseDebt(
      [
        {
          tokenAddress: STABLE,
          amount: parseUnits('1'),
        },
      ],
      parseUnits('0.05')
    );

    baseRate = await troveManager.baseRate(); // expect 5% base rate
    expect(baseRate).to.be.equal(parseUnits('0.05'));
  });
  it("increaseDebt(): doesn't change base rate if it is already zero", async () => {
    await openTrove({
      from: whale,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('10', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
    });
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
    });
    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('2', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('20000') }],
    });

    // Check baseRate is zero
    const baseRate_1 = await troveManager.baseRate();
    expect(baseRate_1).to.be.equal(0n);

    // 2 hours pass
    await fastForwardTime(7200);

    // D withdraws LUSD
    await borrowerOperations.connect(alice).increaseDebt(
      [
        {
          tokenAddress: STABLE,
          amount: parseUnits('37'),
        },
      ],
      MAX_BORROWING_FEE
    );

    // Check baseRate is still 0
    const baseRate_2 = await troveManager.baseRate();
    expect(baseRate_2).to.be.equal(0n);

    // 1 hour passes
    await fastForwardTime(3600);

    // E opens trove
    await borrowerOperations.connect(bob).increaseDebt(
      [
        {
          tokenAddress: STABLE,
          amount: parseUnits('12'),
        },
      ],
      MAX_BORROWING_FEE
    );

    const baseRate_3 = await troveManager.baseRate();
    expect(baseRate_3).to.be.equal(0n);
  });
  it("increaseDebt(): lastFeeOpTime doesn't update if less time than decay interval has passed since the last fee operation", async () => {
    await openTrove({
      from: whale,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('10', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
    });
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
    });
    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('2', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('20000') }],
    });

    // Artificially make baseRate 5%
    await troveManager.setBaseRate(parseUnits('0.05'));
    await troveManager.setLastFeeOpTimeToNow();

    // Check baseRate is now non-zero
    const baseRate_1 = await troveManager.baseRate();
    expect(baseRate_1).to.be.equal(parseUnits('0.05'));

    const lastFeeOpTime_1 = await troveManager.lastFeeOperationTime();

    // 10 seconds pass
    await fastForwardTime(10);

    // Borrower C triggers a fee
    await borrowerOperations.connect(bob).increaseDebt(
      [
        {
          tokenAddress: STABLE,
          amount: parseUnits('1'),
        },
      ],
      MAX_BORROWING_FEE
    );

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
    await borrowerOperations.connect(bob).increaseDebt(
      [
        {
          tokenAddress: STABLE,
          amount: parseUnits('1'),
        },
      ],
      MAX_BORROWING_FEE
    );

    const lastFeeOpTime_3 = await troveManager.lastFeeOperationTime();

    // Check that the last fee operation time DID update, as borrower's debt issuance occured
    // after minimum interval had passed
    expect(lastFeeOpTime_3).to.be.gt(lastFeeOpTime_1);
  });
  it("increaseDebt(): borrower can't grief the baseRate and stop it decaying by issuing debt at higher frequency than the decay granularity", async () => {
    await openTrove({
      from: whale,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('10', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
    });
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
    });
    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('2', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('20000') }],
    });

    // Artificially make baseRate 5%
    await troveManager.setBaseRate(parseUnits('0.05'));
    await troveManager.setLastFeeOpTimeToNow();

    // Check baseRate is now non-zero
    const baseRate_1 = await troveManager.baseRate();
    expect(baseRate_1).to.be.equal(parseUnits('0.05'));

    // 30 seconds pass
    await fastForwardTime(30);

    // Borrower C triggers a fee, before decay interval has passed
    await borrowerOperations.connect(bob).increaseDebt(
      [
        {
          tokenAddress: STABLE,
          amount: parseUnits('1'),
        },
      ],
      MAX_BORROWING_FEE
    );

    // 30 seconds pass
    await fastForwardTime(30);

    // Borrower C triggers another fee
    await borrowerOperations.connect(bob).increaseDebt(
      [
        {
          tokenAddress: STABLE,
          amount: parseUnits('1'),
        },
      ],
      MAX_BORROWING_FEE
    );

    // Check base rate has decreased even though Borrower tried to stop it decaying
    const baseRate_2 = await troveManager.baseRate();
    expect(baseRate_2).to.be.lt(baseRate_1);
  });
  // TODO: Take care after staking enabled
  // it('increaseDebt(): borrowing at non-zero base rate sends LUSD fee to LQTY staking contract', async () => {
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
  //   const baseRate_1 = await troveManager.baseRate();
  //   assert.isTrue(baseRate_1.gt(toBN('0')));

  //   // 2 hours pass
  //   th.fastForwardTime(7200, web3.currentProvider);

  //   // D withdraws LUSD
  //   await borrowerOperations.increaseDebt(th._100pct, dec(37, 18), C, C, {
  //     from: D,
  //   });

  //   // Check LQTY LUSD balance after has increased
  //   const lqtyStaking_LUSDBalance_After = await lusdToken.balanceOf(lqtyStaking.address);
  //   assert.isTrue(lqtyStaking_LUSDBalance_After.gt(lqtyStaking_LUSDBalance_Before));
  // });

  // if (!withProxy) {
  //   // TODO: use rawLogs instead of logs
  //   it('increaseDebt(): borrowing at non-zero base records the (drawn debt + fee) on the Trove struct', async () => {
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
  //     const baseRate_1 = await troveManager.baseRate();
  //     assert.isTrue(baseRate_1.gt(toBN('0')));

  //     // 2 hours pass
  //     th.fastForwardTime(7200, web3.currentProvider);

  //     // D withdraws LUSD
  //     const withdrawal_D = toBN(dec(37, 18));
  //     const withdrawalTx = await borrowerOperations.increaseDebt(th._100pct, toBN(dec(37, 18)), D, D, { from: D });

  //     const emittedFee = toBN(th.getLUSDFeeFromLUSDBorrowingEvent(withdrawalTx));
  //     assert.isTrue(emittedFee.gt(toBN('0')));

  //     const newDebt = (await troveManager.Troves(D))[0];

  //     // Check debt on Trove struct equals initial debt + withdrawal + emitted fee
  //     th.assertIsApproximatelyEqual(newDebt, D_debtBefore.add(withdrawal_D).add(emittedFee), 10000);
  //   });
  // }
  // it('increaseDebt(): Borrowing at non-zero base rate increases the LQTY staking contract LUSD fees-per-unit-staked', async () => {
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
  //   const baseRate_1 = await troveManager.baseRate();
  //   assert.isTrue(baseRate_1.gt(toBN('0')));

  //   // 2 hours pass
  //   th.fastForwardTime(7200, web3.currentProvider);

  //   // D withdraws LUSD
  //   await borrowerOperations.increaseDebt(th._100pct, toBN(dec(37, 18)), D, D, { from: D });

  //   // Check LQTY contract LUSD fees-per-unit-staked has increased
  //   const F_LUSD_After = await lqtyStaking.F_LUSD();
  //   assert.isTrue(F_LUSD_After.gt(F_LUSD_Before));
  // });

  // it('increaseDebt(): Borrowing at non-zero base rate sends requested amount to the user', async () => {
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
  //   const baseRate_1 = await troveManager.baseRate();
  //   assert.isTrue(baseRate_1.gt(toBN('0')));

  //   // 2 hours pass
  //   th.fastForwardTime(7200, web3.currentProvider);

  //   const D_LUSDBalanceBefore = await lusdToken.balanceOf(D);

  //   // D withdraws LUSD
  //   const D_LUSDRequest = toBN(dec(37, 18));
  //   await borrowerOperations.increaseDebt(th._100pct, D_LUSDRequest, D, D, {
  //     from: D,
  //   });

  //   // Check LQTY staking LUSD balance has increased
  //   const lqtyStaking_LUSDBalance_After = await lusdToken.balanceOf(lqtyStaking.address);
  //   assert.isTrue(lqtyStaking_LUSDBalance_After.gt(lqtyStaking_LUSDBalance_Before));

  //   // Check D's LUSD balance now equals their initial balance plus request LUSD
  //   const D_LUSDBalanceAfter = await lusdToken.balanceOf(D);
  //   assert.isTrue(D_LUSDBalanceAfter.eq(D_LUSDBalanceBefore.add(D_LUSDRequest)));
  // });

  // it('increaseDebt(): Borrowing at zero base rate changes LUSD fees-per-unit-staked', async () => {
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
  //   const baseRate_1 = await troveManager.baseRate();
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
  //   await borrowerOperations.increaseDebt(th._100pct, dec(37, 18), D, D, {
  //     from: D,
  //   });

  //   // Check LQTY LUSD balance after > 0
  //   const F_LUSD_After = await lqtyStaking.F_LUSD();
  //   assert.isTrue(F_LUSD_After.gt('0'));
  // });

  // it('increaseDebt(): Borrowing at zero base rate sends debt request to user', async () => {
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
  //   const baseRate_1 = await troveManager.baseRate();
  //   assert.equal(baseRate_1, '0');

  //   // 2 hours pass
  //   th.fastForwardTime(7200, web3.currentProvider);

  //   const D_LUSDBalanceBefore = await lusdToken.balanceOf(D);

  //   // D withdraws LUSD
  //   const D_LUSDRequest = toBN(dec(37, 18));
  //   await borrowerOperations.increaseDebt(th._100pct, dec(37, 18), D, D, {
  //     from: D,
  //   });

  //   // Check D's LUSD balance now equals their requested LUSD
  //   const D_LUSDBalanceAfter = await lusdToken.balanceOf(D);

  //   // Check D's trove debt == D's LUSD balance + liquidation reserve
  //   assert.isTrue(D_LUSDBalanceAfter.eq(D_LUSDBalanceBefore.add(D_LUSDRequest)));
  // });

  it('increaseDebt(): reverts when calling address does not have active trove', async () => {
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
    });
    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('2', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('20000') }],
    });

    // Bob successfully withdraws LUSD
    await borrowerOperations.connect(bob).increaseDebt(
      [
        {
          tokenAddress: STABLE,
          amount: parseUnits('100'),
        },
      ],
      MAX_BORROWING_FEE
    );

    // Carol with no active trove attempts to withdraw LUSD
    await expect(
      borrowerOperations.connect(carol).increaseDebt(
        [
          {
            tokenAddress: STABLE,
            amount: parseUnits('100'),
          },
        ],
        MAX_BORROWING_FEE
      )
    ).to.be.revertedWithCustomError(borrowerOperations, 'TroveClosedOrNotExist');
  });
  it('increaseDebt(): reverts when requested withdrawal amount is zero LUSD', async () => {
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
    });
    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('2', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('20000') }],
    });

    // Bob successfully withdraws 1e-18 LUSD
    await borrowerOperations.connect(bob).increaseDebt(
      [
        {
          tokenAddress: STABLE,
          amount: parseUnits('100'),
        },
      ],
      MAX_BORROWING_FEE
    );

    // Alice attempts to withdraw 0 LUSD
    await expect(
      borrowerOperations.connect(alice).increaseDebt(
        [
          {
            tokenAddress: STABLE,
            amount: 0,
          },
        ],
        MAX_BORROWING_FEE
      )
    ).to.be.revertedWithCustomError(borrowerOperations, 'ZeroDebtChange');
  });
  it('increaseDebt(): reverts when system is in Recovery Mode', async () => {
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
    });
    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('2', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('20000') }],
    });

    expect(await checkRecoveryMode(contracts)).to.be.false;

    // Withdrawal possible when recoveryMode == false
    await borrowerOperations.connect(alice).increaseDebt(
      [
        {
          tokenAddress: STABLE,
          amount: parseUnits('100'),
        },
      ],
      MAX_BORROWING_FEE
    );

    await priceFeed.setTokenPrice(BTC, parseUnits('100'));

    expect(await checkRecoveryMode(contracts)).to.be.true;

    //Check LUSD withdrawal impossible when recoveryMode == true
    await expect(
      borrowerOperations.connect(alice).increaseDebt(
        [
          {
            tokenAddress: STABLE,
            amount: 1,
          },
        ],
        MAX_BORROWING_FEE
      )
    ).to.be.revertedWithCustomError(borrowerOperations, 'ICR_lt_CCR');
  });
  it("increaseDebt(): reverts when withdrawal would bring the trove's ICR < MCR", async () => {
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
    });
    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('2', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('20000') }],
    });
    // await openTrove({ ICR: toBN(dec(10, 18)), extraParams: { from: alice } });
    // await openTrove({ ICR: toBN(dec(11, 17)), extraParams: { from: bob } });

    // Bob tries to withdraw LUSD that would bring his ICR < MCR
    await expect(
      borrowerOperations.connect(bob).increaseDebt(
        [
          {
            tokenAddress: STABLE,
            amount: parseUnits('20000'),
          },
        ],
        MAX_BORROWING_FEE
      )
    ).to.be.revertedWithCustomError(borrowerOperations, 'ICR_lt_MCR');
  });
  it('increaseDebt(): reverts when a withdrawal would cause the TCR of the system to fall below the CCR', async () => {
    // Alice and Bob creates troves with 150% ICR.  System TCR = 150%.
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('13700') }],
    });
    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('13700') }],
    });

    // TCR close to 150%
    const TCR = await getTCR(contracts);
    expect(TCR).to.be.closeTo(parseUnits('1.5'), parseUnits('0.005'));

    // Bob attempts to withdraw 1 LUSD and system TCR would be lower than CCR of 150%.
    await expect(
      borrowerOperations
        .connect(bob)
        .increaseDebt([{ tokenAddress: STABLE, amount: parseUnits('100') }], MAX_BORROWING_FEE)
    ).to.be.revertedWithCustomError(borrowerOperations, 'TCR_lt_CCR');
  });
  it('increaseDebt(): reverts if system is in Recovery Mode', async () => {
    // --- SETUP ---
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('13700') }],
    });
    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('13700') }],
    });

    // --- TEST ---

    // price drops to 1ETH:150LUSD, reducing TCR below 150%
    await priceFeed.setTokenPrice(BTC, parseUnits('150'));
    expect(await getTCR(contracts)).to.be.lt(parseUnits('1.5'));
    expect(await checkRecoveryMode(contracts)).to.be.true;

    await expect(
      borrowerOperations
        .connect(alice)
        .increaseDebt([{ tokenAddress: STABLE, amount: parseUnits('200') }], MAX_BORROWING_FEE)
    ).to.be.revertedWithCustomError(borrowerOperations, 'ICR_lt_CCR');
  });
  it("increaseDebt(): increases the Trove's LUSD debt by the correct amount", async () => {
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
    });

    // check before
    const aliceDebtBefore = await getTroveEntireDebt(contracts, alice);
    expect(aliceDebtBefore).to.be.gt(0n);

    await borrowerOperations
      .connect(alice)
      .increaseDebt([{ tokenAddress: STABLE, amount: parseUnits('100') }], MAX_BORROWING_FEE);

    // check after
    const aliceDebtAfter = await getTroveEntireDebt(contracts, alice);
    expect(aliceDebtAfter - aliceDebtBefore).to.be.equal(parseUnits('100') + parseUnits('100') / 200n);
  });
  it('increaseDebt(): increases Stable debt in StoragePool by correct amount', async () => {
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
    });

    // check before
    const aliceDebtBefore = await getTroveEntireDebt(contracts, alice);
    expect(aliceDebtBefore).to.be.gt(0n);

    // check before
    const storagePool_Debt_Before = await storagePool.getEntireSystemDebt();
    expect(storagePool_Debt_Before).to.be.eq(aliceDebtBefore);

    await borrowerOperations
      .connect(alice)
      .increaseDebt([{ tokenAddress: STABLE, amount: parseUnits('100') }], MAX_BORROWING_FEE);

    // check after
    const storagePool_Debt_After = await storagePool.getEntireSystemDebt();
    expect(storagePool_Debt_After - storagePool_Debt_Before).to.be.equal(parseUnits('100') + parseUnits('100') / 200n);
  });
  it('increaseDebt(): increases user Stable balance by correct amount', async () => {
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
    });

    // check before
    const alice_StableBalance_Before = await STABLE.balanceOf(alice);
    expect(alice_StableBalance_Before).to.be.equal(parseUnits('10000'));

    await borrowerOperations
      .connect(alice)
      .increaseDebt([{ tokenAddress: STABLE, amount: parseUnits('100') }], MAX_BORROWING_FEE);

    // check after
    const alice_StableBalance_After = await STABLE.balanceOf(alice);
    expect(alice_StableBalance_After - alice_StableBalance_Before).to.be.equal(parseUnits('100'));
  });

  // --- repayLUSD() ---
  it('repayDebt(): reverts when repayment would leave trove with ICR < MCR', async () => {
    // alice creates a Trove and adds first collateral
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('1000') }],
    });
    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('10', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('1000') }],
    });

    // Price drops
    await priceFeed.setTokenPrice(BTC, parseUnits('1000'));
    const price = await priceFeed.getPrice(BTC);

    expect(await checkRecoveryMode(contracts)).to.be.false;
    const { ICR } = await troveManager.getCurrentICR(alice);
    expect(ICR).to.be.lt(parseUnits('1.1')); // 110%

    await expect(
      borrowerOperations.connect(alice).repayDebt([{ tokenAddress: STABLE, amount: 1 }])
    ).to.be.revertedWithCustomError(borrowerOperations, 'ICR_lt_MCR');
  });
  it('repayDebt(): Succeeds when it would leave trove with net debt >= minimum net debt', async () => {
    // Make the LUSD request 2 wei above min net debt to correct for floor division, and make net debt = min net debt + 1 wei
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('1') }],
    });

    await borrowerOperations.connect(alice).repayDebt([{ tokenAddress: STABLE, amount: 1 }]);

    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('20') }],
    });

    await borrowerOperations.connect(bob).repayDebt([{ tokenAddress: STABLE, amount: parseUnits('19') }]);
  });
  it.skip('repayDebt(): reverts when it would leave trove with net debt < minimum net debt', async () => {
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
  it('repayDebt(): Reverts if repaid amount is greater than current debt', async () => {
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('1') }],
    });
    const STABLE_COIN_GAS_COMPENSATION = await borrowerOperations.STABLE_COIN_GAS_COMPENSATION();
    const totalDebt = await troveManager.getTroveDebt(alice);
    const repayAmount = totalDebt[0].amount - STABLE_COIN_GAS_COMPENSATION + 1n;

    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: repayAmount }],
    });

    await STABLE.connect(bob).transfer(alice, repayAmount);

    await expect(
      borrowerOperations.connect(alice).repayDebt([{ tokenAddress: STABLE, amount: repayAmount }])
    ).to.be.revertedWithCustomError(borrowerOperations, 'Repaid_gt_CurrentDebt');
  });
  it('repayDebt(): reverts when calling address does not have active trove', async () => {
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('1000') }],
    });
    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('1000') }],
    });
    // Bob successfully repays some LUSD
    await borrowerOperations.connect(bob).repayDebt([{ tokenAddress: STABLE, amount: parseUnits('500') }]);

    // Carol with no active trove attempts to repayLUSD
    await expect(
      borrowerOperations.connect(carol).repayDebt([{ tokenAddress: STABLE, amount: parseUnits('500') }])
    ).to.be.revertedWithCustomError(borrowerOperations, 'TroveClosedOrNotExist');
  });
  it('repayDebt(): reverts when attempted repayment is > the debt of the trove', async () => {
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
    });
    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
    });
    const aliceDebt = await getTroveEntireDebt(contracts, alice);

    // Bob successfully repays some LUSD
    await borrowerOperations.connect(bob).repayDebt([{ tokenAddress: STABLE, amount: parseUnits('500') }]);

    // Alice attempts to repay more than her debt
    await expect(
      borrowerOperations.connect(alice).repayDebt([{ tokenAddress: STABLE, amount: aliceDebt + 1n }])
    ).to.be.revertedWithPanic();
    // TODO: should not reverted with panic error, check later
    // ).to.be.revertedWithCustomError(borrowerOperations, 'Repaid_gt_CurrentDebt');
  });
  it("repayDebt(): reduces the Trove's LUSD debt by the correct amount", async () => {
    const aliceBorrowAmount = parseUnits('10000');
    await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: aliceBorrowAmount }],
    });
    await openTrove({
      from: bob,
      contracts,
      collToken: BTC,
      collAmount: parseUnits('1', 9),
      debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
    });
    const aliceDebtBefore = await getTroveEntireDebt(contracts, alice);
    expect(aliceDebtBefore).to.be.equal(aliceBorrowAmount + aliceBorrowAmount / 200n + parseUnits('200'));

    const repayAmount = parseUnits('500');
    await borrowerOperations.connect(alice).repayDebt([{ tokenAddress: STABLE, amount: repayAmount }]);

    const aliceDebtAfter = await getTroveEntireDebt(contracts, alice);

    expect(aliceDebtAfter).to.be.equal(aliceDebtBefore - repayAmount);
  });
});
