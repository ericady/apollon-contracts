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
  checkRecoveryMode,
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
  let troveManager: TroveManager;
  let borrowerOperations: BorrowerOperations;
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
    const { debtInStable: aliceDebtBefore } = await openTrove({
      from: alice,
      contracts,
      collToken: BTC,
      collAmount: aliceColl,
      debts: [{ tokenAddress: STABLE, amount: aliceDebt }],
    });

    const bobColl = parseUnits('1', 9);
    const bobDebt = parseUnits('10000');
    const { debtInStable: bobDebtBefore } = await openTrove({
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
    expect(carolTroveStatus).to.be.equal(3n); // ClosedByLiquidation

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
});
