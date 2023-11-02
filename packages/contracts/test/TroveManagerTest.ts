import { ethers } from 'hardhat';
import {
  MockDebtToken,
  MockERC20,
  MockPriceFeed,
  TroveManager,
  StabilityPoolManager,
  StoragePool,
  BorrowerOperationsTester,
} from '../typechain';
import { Contracts, deployCore, connectCoreContracts, deployAndLinkToken } from '../utils/deploymentHelpers';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { assertRevert, openTrove } from '../utils/testHelper';
import { assert, expect } from 'chai';
import { BigNumberish, parseEther, parseUnits } from 'ethers';
import { parse } from 'typechain';

describe('TroveManager', () => {
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

  let storagePool: StoragePool;

  let STABLE: MockDebtToken;
  let STOCK: MockDebtToken;
  let BTC: MockERC20;
  let USDT: MockERC20;

  let priceFeed: MockPriceFeed;
  let troveManager: TroveManager;

  let borrowerOperations: BorrowerOperationsTester;

  let stabilityPoolManager: StabilityPoolManager;

  let contracts: Contracts;

  let redemptionFee: bigint;

  before(async () => {
    signers = await ethers.getSigners();
    [owner, defaulter_1, defaulter_2, defaulter_3, whale, alice, bob, carol, dennis, erin, flyn] = signers;
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

    redemptionFee = await troveManager.REDEMPTION_FEE_FLOOR();
  });

  describe('TroveManager - in Recovery Mode', () => {
    it('liquidate(): closes a Trove that has ICR < MCR', async () => {
      const collToLiquidate = parseEther('300');
      // - GAS_COMPENSATION
      const collToDistribute = collToLiquidate - parseEther('200');

      // Add enough coll to not enter recovery mode
      await borrowerOperations.testStoragePool_addValue(USDT, true, 0, parseEther('1000'));
      // add value so that pool transfer can be made
      await borrowerOperations.testStoragePool_addValue(STABLE, false, 0, collToLiquidate);

      // Add enough coll to not enter recovery mode
      await openTrove({
        from: alice,
        contracts,
        collToken: USDT,
        collAmount: collToLiquidate,
      });

      await openTrove({
        from: bob,
        contracts,
        collToken: USDT,
        collAmount: parseEther('300'),
      });

      await borrowerOperations.testTroveManager_increaseTroveDebt(alice, [
        { debtToken: STABLE.target, borrowingFee: parseEther('0.01'), netDebt: parseEther('300') },
      ]);

      const [isInRecoveryMode] = await storagePool.checkRecoveryMode();
      assert.isFalse(isInRecoveryMode);

      // liquidate alice but spare bob
      await troveManager.liquidate(alice);

      // FIXME: Calculation makes no sense to me
      // packages/contracts/contracts/TroveManager.sol:1152
      // value assigned to liquidatedTokens seems arbitrary
      const liquidatedColl = await troveManager.liquidatedTokens(USDT.target, true);
      const deducableFee = (collToDistribute * redemptionFee) / parseEther('1');
      // assert.equal(liquidatedColl, collToDistribute - deducableFee);

      const troveOwnerCount = await troveManager.getTroveOwnersCount();
      assert.equal(troveOwnerCount, 1n);

      const activeTroveAddress = await troveManager.TroveOwners(0n);
      assert.equal(activeTroveAddress, bob.address);

      const aliceTrove = await troveManager.getTroveStatus(alice.address);
      // closedByLiquidation
      assert.equal(aliceTrove, 3n);

      const aliceTroveStake = await troveManager.getTroveStake(alice.address);
      assert.equal(aliceTroveStake, 0n);

      const aliceTroveDebt = await troveManager.getTroveDebt(alice.address);
      assert.lengthOf(aliceTroveDebt, 0);

      const aliceTroveColl = await troveManager.getTroveColl(alice.address);
      assert.lengthOf(aliceTroveColl, 0);
    });

    it('liquidate(): decreases ActivePool collateral by liquidated amount but keeps the redemptionFee', async () => {
      const initialColl = parseEther('1000');
      const collToLiquidate = parseEther('400');

      await borrowerOperations.testStoragePool_addValue(USDT, true, 0, initialColl);
      await borrowerOperations.testStoragePool_addValue(STABLE, false, 0, collToLiquidate);

      await openTrove({
        from: alice,
        contracts,
        collToken: USDT,
        collAmount: collToLiquidate,
      });

      const bystandingColl = parseEther('300');
      await openTrove({
        from: bob,
        contracts,
        collToken: USDT,
        collAmount: bystandingColl,
      });

      const storageActivePool_Before = await storagePool.getValue(USDT.target, true, 0);
      assert.equal(storageActivePool_Before, initialColl + collToLiquidate + bystandingColl);

      await borrowerOperations.testTroveManager_increaseTroveDebt(alice, [
        { debtToken: STABLE.target, borrowingFee: parseEther('0.01'), netDebt: parseEther('300') },
      ]);

      const [isInRecoveryMode] = await storagePool.checkRecoveryMode();
      assert.isFalse(isInRecoveryMode);

      await troveManager.liquidate(alice);

      const storageActivePool_After = await storagePool.getValue(USDT.target, true, 0);
      // minus liquidated collateral but we keep the redemptionFee of that amount
      assert.equal(
        storageActivePool_After,
        initialColl + bystandingColl + (collToLiquidate * redemptionFee) / parseEther('1')
      );
    });

    it('liquidate(): increases DefaultPool ETH and LUSD debt by correct amounts', async () => {
      const collToLiquidate = parseEther('300');

      await borrowerOperations.testStoragePool_addValue(USDT, true, 0, parseEther('1000'));
      await borrowerOperations.testStoragePool_addValue(STABLE, false, 0, collToLiquidate);

      await openTrove({
        from: alice,
        contracts,
        collToken: USDT,
        collAmount: collToLiquidate,
      });

      await openTrove({
        from: bob,
        contracts,
        collToken: USDT,
        collAmount: parseEther('300'),
      });

      await borrowerOperations.testTroveManager_increaseTroveDebt(alice, [
        { debtToken: STABLE.target, borrowingFee: parseEther('0.01'), netDebt: parseEther('300') },
      ]);

      const defaultPool_Before = await storagePool.getValue(USDT.target, true, 1);
      assert.equal(defaultPool_Before, 0n);

      await troveManager.liquidate(alice);

      const defaultPool_After = await storagePool.getValue(USDT.target, true, 1);
      assert.equal(defaultPool_After, collToLiquidate - (collToLiquidate * redemptionFee) / parseEther('1'));
    });

    it("liquidate(): removes the Trove's stake from the total stakes", async () => {
      const collToLiquidate = parseEther('300');

      await borrowerOperations.testStoragePool_addValue(USDT, true, 0, parseEther('1000'));
      await borrowerOperations.testStoragePool_addValue(STABLE, false, 0, collToLiquidate);

      await openTrove({
        from: alice,
        contracts,
        collToken: USDT,
        collAmount: collToLiquidate,
      });

      const bystandingColl = parseEther('300');
      await openTrove({
        from: bob,
        contracts,
        collToken: USDT,
        collAmount: bystandingColl,
      });

      await borrowerOperations.testTroveManager_increaseTroveDebt(alice, [
        { debtToken: STABLE.target, borrowingFee: parseEther('0.01'), netDebt: parseEther('300') },
      ]);

      const stakes_Before = await troveManager.totalStakes(USDT.target);
      assert.equal(stakes_Before, collToLiquidate + bystandingColl);

      await troveManager.liquidate(alice);

      const stakes_After = await troveManager.totalStakes(USDT.target);
      assert.equal(stakes_After, bystandingColl);
    });

    it('liquidate(): Removes the correct trove from the TroveOwners array, and moves the last array element to the new empty slot', async () => {
      const collToLiquidate = parseEther('300');

      await borrowerOperations.testStoragePool_addValue(USDT, true, 0, parseEther('1000'));
      await borrowerOperations.testStoragePool_addValue(STABLE, false, 0, collToLiquidate);

      await openTrove({
        from: bob,
        contracts,
        collToken: USDT,
        collAmount: parseEther('300'),
      });

      await openTrove({
        from: alice,
        contracts,
        collToken: USDT,
        collAmount: collToLiquidate,
      });

      await openTrove({
        from: carol,
        contracts,
        collToken: USDT,
        collAmount: parseEther('300'),
      });

      await borrowerOperations.testTroveManager_increaseTroveDebt(alice, [
        { debtToken: STABLE.target, borrowingFee: parseEther('0.01'), netDebt: parseEther('300') },
      ]);

      const totalTroveOwners_before = await troveManager.getTroveOwnersCount();
      assert.equal(totalTroveOwners_before, 3n);

      const bob_arrayIndex = (await troveManager.Troves(bob))[1];
      const alice_arrayIndex = (await troveManager.Troves(alice))[1];
      const carol_arrayIndex = (await troveManager.Troves(carol))[1];

      const trove_0 = await troveManager.TroveOwners(bob_arrayIndex);
      const trove_1 = await troveManager.TroveOwners(alice_arrayIndex);
      const trove_2 = await troveManager.TroveOwners(carol_arrayIndex);

      assert.equal(trove_0, bob.address);
      assert.equal(trove_1, alice.address);
      assert.equal(trove_2, carol.address);

      // liquidate alice but spare bob
      await troveManager.liquidate(alice);

      const totalTroveOwners_after = await troveManager.getTroveOwnersCount();
      assert.equal(totalTroveOwners_after, 2n);

      const bob_arrayIndex_after = (await troveManager.Troves(bob))[1];
      const carol_arrayIndex_after = (await troveManager.Troves(carol))[1];

      const trove_0_after = await troveManager.TroveOwners(bob_arrayIndex_after);
      const trove_1_after = await troveManager.TroveOwners(carol_arrayIndex_after);

      assert.equal(trove_0_after, bob.address);
      assert.equal(trove_1_after, carol.address);
    });

    it('liquidate(): updates the snapshots of total stakes and total collateral', async () => {
      const collToLiquidate = parseUnits('1000');
      await openTrove({
        from: alice,
        contracts,
        collToken: USDT,
        collAmount: collToLiquidate,
        debts: [{ tokenAddress: STABLE, amount: parseUnits('300') }],
      });

      const bystandingColl = parseUnits('300');
      await openTrove({
        from: bob,
        contracts,
        collToken: USDT,
        collAmount: bystandingColl,
      });

      const totalStakes_Before = await troveManager.totalStakes(USDT);
      const totalStakesSnapshot_Before = await troveManager.totalStakesSnapshot(USDT);
      const totalCollateralSnapshot_Before = await troveManager.totalCollateralSnapshots(USDT);
      assert.equal(totalStakes_Before, collToLiquidate + bystandingColl);
      assert.equal(totalStakesSnapshot_Before, 0n);
      assert.equal(totalCollateralSnapshot_Before, 0n);

      // drop the USDT price by 80% and liquidates alice
      await priceFeed.setTokenPrice(USDT, parseUnits('0.2'));
      await troveManager.liquidate(alice);

      const totalStakes_After = await troveManager.totalStakes(USDT);
      const totalStakesSnapshot_After = await troveManager.totalStakesSnapshot(USDT);
      const totalCollateralSnapshot_After = await troveManager.totalCollateralSnapshots(USDT);
      assert.equal(totalStakes_After, bystandingColl);
      assert.equal(totalStakesSnapshot_After, bystandingColl);
      assert.equal(
        totalCollateralSnapshot_After,
        bystandingColl + collToLiquidate - (collToLiquidate * redemptionFee) / parseUnits('1')
      );

      const activeUSDT = await storagePool.getValue(USDT, true, 0);
      const defaultUSDT = await storagePool.getValue(USDT, true, 1);
      assert.equal(activeUSDT, bystandingColl);
      assert.equal(defaultUSDT, collToLiquidate - (collToLiquidate * redemptionFee) / parseEther('1'));
    });

    // TODO: Still testable?
    it.skip('liquidate(): updates the L_ETH and L_LUSDDebt reward-per-unit-staked totals', async () => {});

    // TODO: Useless test, has been tested and asserted before
    it.skip('liquidate(): Liquidates undercollateralized trove if there are two troves in the system', async () => {});

    it('liquidate(): reverts if trove is non-existent', async () => {
      await borrowerOperations.testStoragePool_addValue(USDT, true, 0, parseEther('1000'));
      await borrowerOperations.testStoragePool_addValue(STABLE, false, 0, parseEther('300'));

      await openTrove({
        from: alice,
        contracts,
        collToken: USDT,
        collAmount: parseEther('300'),
      });

      await openTrove({
        from: bob,
        contracts,
        collToken: USDT,
        collAmount: parseEther('300'),
      });

      await borrowerOperations.testTroveManager_increaseTroveDebt(alice, [
        { debtToken: STABLE.target, borrowingFee: parseEther('0.01'), netDebt: parseEther('300') },
      ]);

      await borrowerOperations.testTroveManager_setTroveStatus(alice, 0); // set trove non-existent

      assert.equal(await troveManager.getTroveStatus(alice), 0n); // check trove non-existent

      const tx = troveManager.liquidate(alice);

      await assertRevert(tx, 'InvalidTrove');
    });

    it('liquidate(): reverts if trove is already closedByLiquidation', async () => {
      await borrowerOperations.testStoragePool_addValue(USDT, true, 0, parseEther('1000'));
      await borrowerOperations.testStoragePool_addValue(STABLE, false, 0, parseEther('300'));

      await openTrove({
        from: alice,
        contracts,
        collToken: USDT,
        collAmount: parseEther('300'),
      });

      await openTrove({
        from: bob,
        contracts,
        collToken: USDT,
        collAmount: parseEther('300'),
      });

      await borrowerOperations.testTroveManager_increaseTroveDebt(alice, [
        { debtToken: STABLE.target, borrowingFee: parseEther('0.01'), netDebt: parseEther('300') },
      ]);

      await borrowerOperations.testTroveManager_setTroveStatus(alice, 3); // set trove non-existent

      assert.equal(await troveManager.getTroveStatus(alice), 3n); // check trove non-existent

      const tx = troveManager.liquidate(alice);

      await assertRevert(tx, 'InvalidTrove');
    });

    it('liquidate(): reverts if trove has been closed', async () => {
      await borrowerOperations.testStoragePool_addValue(USDT, true, 0, parseEther('1000'));
      await borrowerOperations.testStoragePool_addValue(STABLE, false, 0, parseEther('300'));

      await openTrove({
        from: alice,
        contracts,
        collToken: USDT,
        collAmount: parseEther('300'),
      });

      await openTrove({
        from: bob,
        contracts,
        collToken: USDT,
        collAmount: parseEther('300'),
      });

      await borrowerOperations.testTroveManager_increaseTroveDebt(alice, [
        { debtToken: STABLE.target, borrowingFee: parseEther('0.01'), netDebt: parseEther('300') },
      ]);

      await borrowerOperations.testTroveManager_closeTrove([USDT.target], alice);

      assert.equal(await troveManager.getTroveStatus(alice), 2n); // check trove closedByOwner

      const tx = troveManager.liquidate(alice);

      await assertRevert(tx, 'InvalidTrove');
    });

    it('liquidate(): does nothing if trove has >= 110% ICR', async () => {
      const debtUnderICR = parseEther('300');
      const gasCompensation = parseEther('200');

      await borrowerOperations.testStoragePool_addValue(USDT, true, 0, parseEther('1000'));
      await borrowerOperations.testStoragePool_addValue(STABLE, false, 0, parseEther('300'));

      await openTrove({
        from: alice,
        contracts,
        collToken: USDT,
        collAmount: ((debtUnderICR + gasCompensation) * parseEther('1.11')) / parseEther('1'),
      });

      await openTrove({
        from: bob,
        contracts,
        collToken: USDT,
        collAmount: parseEther('300'),
      });

      await borrowerOperations.testTroveManager_increaseTroveDebt(alice, [
        { debtToken: STABLE.target, borrowingFee: parseEther('0.01'), netDebt: debtUnderICR },
      ]);

      await assertRevert(troveManager.liquidate(alice), 'NoLiquidatableTrove');
    });

    // TODO: Can not be tested because TCR doesnt exist anymore
    it.skip('liquidate(): Given the same price and no other trove changes, complete Pool offsets restore the TCR to its value prior to the defaulters opening troves', async () => {});
    it.skip('liquidate(): Pool offsets increase the TCR', async () => {});
    it.skip('liquidate(): a pure redistribution reduces the TCR only as a result of compensation', async () => {});

    it("liquidate(): does not affect the SP deposit or ETH gain when called on an SP depositor's address that has no trove", async () => {
      await borrowerOperations.testStoragePool_addValue(USDT, true, 0, parseEther('1000'));
      await borrowerOperations.testStoragePool_addValue(STABLE, false, 0, parseEther('300'));

      await openTrove({
        from: alice,
        contracts,
        collToken: USDT,
        collAmount: parseEther('300'),
      });

      await openTrove({
        from: bob,
        contracts,
        collToken: USDT,
        collAmount: parseEther('300'),
      });

      await borrowerOperations.testTroveManager_increaseTroveDebt(alice, [
        { debtToken: STABLE.target, borrowingFee: parseEther('0.01'), netDebt: parseEther('300') },
      ]);

      // Bob sends tokens to Dennis, who has no trove
      await borrowerOperations.testDebtToken_mint(bob, parseEther('1000'), STABLE);
      await STABLE.connect(bob).transfer(dennis, parseEther('500'));

      //Dennis provides LUSD to SP
      await stabilityPoolManager
        .connect(dennis)
        .provideStability([{ tokenAddress: STABLE.target, amount: parseEther('500') }]);

      // Alice gets liquidated
      await troveManager.liquidate(alice);

      const [[, dennisCompoundedDeposits_Before]] = await stabilityPoolManager.connect(dennis).getCompoundedDeposits();

      await assertRevert(troveManager.liquidate(dennis), 'InvalidTrove');
      const [[, dennisCompoundedDeposits_After]] = await stabilityPoolManager.connect(dennis).getCompoundedDeposits();

      assert.equal(dennisCompoundedDeposits_Before, dennisCompoundedDeposits_After);
    });

    it("liquidate(): liquidates a SP depositor's trove with ICR < 110%, and the liquidation correctly impacts their SP deposit and ETH gain", async () => {
      const liquidatedDebt = parseEther('300');

      await borrowerOperations.testStoragePool_addValue(USDT, true, 0, parseEther('1000'));
      await borrowerOperations.testStoragePool_addValue(STABLE, false, 0, parseEther('300'));

      await openTrove({
        from: alice,
        contracts,
        collToken: USDT,
        collAmount: parseEther('300'),
      });

      await openTrove({
        from: bob,
        contracts,
        collToken: USDT,
        collAmount: parseEther('300'),
      });

      await borrowerOperations.testTroveManager_increaseTroveDebt(alice, [
        { debtToken: STABLE.target, borrowingFee: parseEther('0.01'), netDebt: liquidatedDebt },
      ]);

      // Bob sends tokens to Dennis, who has no trove
      await borrowerOperations.testDebtToken_mint(carol, parseEther('1000'), STABLE);
      await STABLE.connect(carol).transfer(alice, parseEther('500'));

      //Dennis provides LUSD to SP

      await stabilityPoolManager
        .connect(alice)
        .provideStability([{ tokenAddress: STABLE.target, amount: parseEther('500') }]);

      const [[, aliceCompoundedDeposits_Before]] = await stabilityPoolManager.connect(alice).getCompoundedDeposits();

      await troveManager.liquidate(alice);

      const [[, aliceCompoundedDeposits_After]] = await stabilityPoolManager.connect(alice).getCompoundedDeposits();

      assert.equal(aliceCompoundedDeposits_Before - liquidatedDebt, aliceCompoundedDeposits_After);
    });
  });
});
