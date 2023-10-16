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
import { getStabilityPool, openTrove } from '../utils/testHelper';
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
});
