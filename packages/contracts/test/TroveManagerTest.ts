import { ethers } from 'hardhat';
import {
  MockDebtToken,
  MockERC20,
  MockPriceFeed,
  MockTroveManager,
  StabilityPoolManager,
  StoragePool,
  LiquidationOperations,
  RedemptionOperations,
  StabilityPool,
  BorrowerOperations,
} from '../typechain';
import { Contracts, deployCore, connectCoreContracts, deployAndLinkToken } from '../utils/deploymentHelpers';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import {
  assertRevert,
  getStabilityPool,
  openTrove,
  whaleShrimpTroveInit,
  getTCR,
  TroveStatus,
  getEmittedLiquidationValues,
} from '../utils/testHelper';
import { assert, expect } from 'chai';
import { parseUnits } from 'ethers';

describe('TroveManager', () => {
  let signers: SignerWithAddress[];
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let whale: SignerWithAddress;
  let erin: SignerWithAddress;
  let carol: SignerWithAddress;
  let dennis: SignerWithAddress;

  let defaulter_1: SignerWithAddress;
  let defaulter_2: SignerWithAddress;
  let defaulter_3: SignerWithAddress;

  let storagePool: StoragePool;

  let STABLE: MockDebtToken;
  let STOCK: MockDebtToken;
  let BTC: MockERC20;
  let USDT: MockERC20;

  let priceFeed: MockPriceFeed;
  let troveManager: MockTroveManager;

  let stabilityPoolManager: StabilityPoolManager;
  let redemptionOperations: RedemptionOperations;
  let liquidationOperations: LiquidationOperations;
  let contracts: Contracts;
  let stabilityPool: StabilityPool;
  let borrowerOperations: BorrowerOperations;

  before(async () => {
    signers = await ethers.getSigners();
    [, defaulter_1, defaulter_2, defaulter_3, whale, alice, bob, carol, dennis, erin] = signers;
  });

  beforeEach(async () => {
    contracts = await deployCore();
    await connectCoreContracts(contracts);
    await deployAndLinkToken(contracts);

    priceFeed = contracts.priceFeed;
    troveManager = contracts.troveManager;
    redemptionOperations = contracts.redemptionOperations;
    liquidationOperations = contracts.liquidationOperations;
    storagePool = contracts.storagePool;
    stabilityPoolManager = contracts.stabilityPoolManager;
    borrowerOperations = contracts.borrowerOperations;

    STABLE = contracts.debtToken.STABLE;
    STOCK = contracts.debtToken.STOCK;
    BTC = contracts.collToken.BTC;
    USDT = contracts.collToken.USDT;
  });

  describe('in Normal Mode', () => {
    describe('liquidate()', () => {
      it('closes a Trove that has ICR < MCR', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);
        await priceFeed.setTokenPrice(BTC, parseUnits('5000'));

        const [isRecoveryMode] = await storagePool.checkRecoveryMode();
        assert.isFalse(isRecoveryMode);

        // liquidate
        await liquidationOperations.liquidate(defaulter_1);

        const trove = await troveManager.getTroveStatus(defaulter_1);
        assert.equal(trove, 3n); // closedByLiquidation

        const troveStake = await troveManager.getTroveStakeValue(defaulter_1);
        assert.equal(troveStake, 0n);

        const troveDebt = await troveManager.getTroveDebt(defaulter_1);
        assert.lengthOf(troveDebt, 0);

        const troveColl = await troveManager.getTroveColl(defaulter_1);
        assert.lengthOf(troveColl, 0);
      });

      it('decreases ActivePool collateral by liquidated amount', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);
        await priceFeed.setTokenPrice(BTC, parseUnits('5000'));

        const [isRecoveryMode] = await storagePool.checkRecoveryMode();
        assert.isFalse(isRecoveryMode);

        const storageActivePool_Before = await storagePool.getValue(BTC, true, 0);
        const activePoolDebt_Before = await storagePool.getValue(STABLE, false, 0);
        expect(storageActivePool_Before).to.be.gt(parseUnits('1', 9));
        expect(activePoolDebt_Before).to.be.gt(parseUnits('6000'));

        // liquidate
        await liquidationOperations.liquidate(defaulter_1);

        const storageActivePool_After = await storagePool.getValue(BTC, true, 0);
        assert.equal(storageActivePool_After, storageActivePool_Before - parseUnits('0.02', 9));

        const borrowedDebt = parseUnits('100');
        const activePoolDebt_After = await storagePool.getValue(STABLE, false, 0);
        assert.equal(
          activePoolDebt_After,
          activePoolDebt_Before - borrowedDebt - (await troveManager.getBorrowingFee(borrowedDebt))
        );
      });

      it('increases DefaultPool coll and debt by correct amounts', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);
        await priceFeed.setTokenPrice(BTC, parseUnits('5000'));

        const [isRecoveryMode] = await storagePool.checkRecoveryMode();
        assert.isFalse(isRecoveryMode);

        const defaultPoolCollBefore = await storagePool.getValue(BTC, true, 1);
        const defaultPoolDebtBefore = await storagePool.getValue(STABLE, false, 1);
        expect(defaultPoolCollBefore).to.be.equal(0n);
        expect(defaultPoolDebtBefore).to.be.equal(0n);

        // liquidate
        await liquidationOperations.liquidate(defaulter_1);

        const liquidatedColl = parseUnits('0.02', 9);
        const defaultPollCollAfter = await storagePool.getValue(BTC, true, 1);
        expect(defaultPollCollAfter).to.be.equal(
          liquidatedColl - (await troveManager.getCollGasCompensation(liquidatedColl))
        );

        const liquidatedDebt = parseUnits('100');
        const defaultPoolDebtAfter = await storagePool.getValue(STABLE, false, 1);
        expect(defaultPoolDebtAfter).to.be.equal(liquidatedDebt + (await troveManager.getBorrowingFee(liquidatedDebt)));
      });

      it("removes the Trove's stake from the total stakes", async () => {
        await whaleShrimpTroveInit(contracts, signers, false);
        await priceFeed.setTokenPrice(BTC, parseUnits('5000'));

        const [isRecoveryMode] = await storagePool.checkRecoveryMode();
        assert.isFalse(isRecoveryMode);

        const stakes_Before = await troveManager.totalStakes(BTC);
        assert.equal(stakes_Before, parseUnits('5.04', 9));

        // liquidate
        await liquidationOperations.liquidate(defaulter_1);

        const stakes_After = await troveManager.totalStakes(BTC);
        assert.equal(stakes_After, parseUnits('5.02', 9));
      });

      it('Removes the correct trove from the TroveOwners array, and moves the last array element to the new empty slot', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);

        //price drops
        await priceFeed.setTokenPrice(BTC, parseUnits('5000'));

        const [isRecoveryMode] = await storagePool.checkRecoveryMode();
        assert.isFalse(isRecoveryMode);

        const totalTroveOwners_before = await troveManager.getTroveOwnersCount();
        assert.equal(totalTroveOwners_before, 7n);

        const bob_arrayIndex = (await troveManager.Troves(bob))[1];
        const alice_arrayIndex = (await troveManager.Troves(alice))[1];
        const defaulter2 = (await troveManager.Troves(defaulter_2))[1];

        const trove_0 = await troveManager.TroveOwners(bob_arrayIndex);
        const trove_1 = await troveManager.TroveOwners(alice_arrayIndex);
        const trove_2 = await troveManager.TroveOwners(defaulter2);

        assert.equal(trove_0, bob.address);
        assert.equal(trove_1, alice.address);
        assert.equal(trove_2, defaulter_2.address);

        // liquidate
        await liquidationOperations.liquidate(defaulter_1);

        const totalTroveOwners_after = await troveManager.getTroveOwnersCount();
        assert.equal(totalTroveOwners_after, 6n);

        const bob_arrayIndex_after = (await troveManager.Troves(bob))[1];
        const defaulter_arrayIndex_after = (await troveManager.Troves(defaulter_2))[1];

        const trove_0_after = await troveManager.TroveOwners(bob_arrayIndex_after);
        const trove_1_after = await troveManager.TroveOwners(defaulter_arrayIndex_after);

        assert.equal(trove_0_after, bob.address);
        assert.equal(trove_1_after, defaulter_2.address);
      });

      it('updates the snapshots of total stakes and total collateral', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);

        //price drops
        await priceFeed.setTokenPrice(BTC, parseUnits('5000'));

        const [isRecoveryMode] = await storagePool.checkRecoveryMode();
        assert.isFalse(isRecoveryMode);

        const totalStakes_Before = await troveManager.totalStakes(BTC);
        const totalStakesSnapshot_Before = await troveManager.totalStakesSnapshot(BTC);
        const totalCollateralSnapshot_Before = await troveManager.totalCollateralSnapshots(BTC);

        const totalBTC = parseUnits('5.04', 9);
        assert.equal(totalStakes_Before, totalBTC);
        assert.equal(totalStakesSnapshot_Before, 0n);
        assert.equal(totalCollateralSnapshot_Before, 0n);

        // liquidate
        await liquidationOperations.liquidate(defaulter_1);

        const totalStakes_After = await troveManager.totalStakes(BTC);
        const totalStakesSnapshot_After = await troveManager.totalStakesSnapshot(BTC);
        const totalCollateralSnapshot_After = await troveManager.totalCollateralSnapshots(BTC);

        const defaulterBTC = parseUnits('0.02', 9);
        assert.equal(totalStakes_After, totalBTC - defaulterBTC);
        assert.equal(totalStakesSnapshot_After, totalBTC - defaulterBTC);
        assert.equal(
          totalCollateralSnapshot_After,
          totalBTC - (await troveManager.getCollGasCompensation(defaulterBTC))
        );
      });

      // todo tests the pending rewards on changing coll prices!!!
      // pretty sure that everything will break
      it('updates the L_coll reward-per-unit-staked totals', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);
        await priceFeed.setTokenPrice(BTC, parseUnits('5000'));

        const [isRecoveryMode] = await storagePool.checkRecoveryMode();
        assert.isFalse(isRecoveryMode);

        // 1. liquidation
        await liquidationOperations.liquidate(defaulter_1);

        const defaulterBTC = parseUnits('0.02', 9);
        const defaulterBTCWithoutFee = defaulterBTC - (await troveManager.getCollGasCompensation(defaulterBTC));
        let remainingActiveBTC = parseUnits('5.04', 9) - defaulterBTC;
        const totalStake = await priceFeed.getUSDValue(BTC, remainingActiveBTC);

        // checking liquidated snapshots
        const L_BTC_A = await troveManager.getLiquidatedTokens(BTC, true);
        const L_STABLE_A = await troveManager.getLiquidatedTokens(STABLE, false);
        expect(L_BTC_A).to.be.equal((defaulterBTCWithoutFee * parseUnits('1')) / totalStake);
        expect(L_STABLE_A).to.be.equal((parseUnits('100.5') * parseUnits('1')) / totalStake);

        // checking alice pending btc rewards
        const alicePendingBTC = await troveManager.getPendingReward(alice, BTC, true);
        const aliceBTCCollStake = (parseUnits('1', 9) * parseUnits('1', 9)) / remainingActiveBTC;
        const aliceExpectedBTCPending = (defaulterBTCWithoutFee * aliceBTCCollStake) / parseUnits('1', 9);
        expect(alicePendingBTC - aliceExpectedBTCPending).to.be.lt(5);

        // 2. liquidation
        const defaulterStableRewards = await troveManager.getPendingReward(defaulter_2, STABLE, false);
        const defaulterBTCRewards = await troveManager.getPendingReward(defaulter_2, BTC, true);
        await liquidationOperations.liquidate(defaulter_2);

        remainingActiveBTC -= defaulterBTC;
        const totalStakeB = await priceFeed.getUSDValue(BTC, remainingActiveBTC);

        // checking liquidated snapshots
        const L_BTC_B = await troveManager.getLiquidatedTokens(BTC, true);
        const L_STABLE_B = await troveManager.getLiquidatedTokens(STABLE, false);
        expect(
          L_BTC_B - ((2n * defaulterBTCWithoutFee + defaulterBTCRewards) * parseUnits('1')) / totalStakeB
        ).to.be.lt(1);
        expect(
          L_STABLE_B - ((2n * parseUnits('100.5') + defaulterStableRewards) * parseUnits('1')) / totalStakeB
        ).to.be.lt(17000000000000);

        // checking alice pending btc rewards
        const alicePendingBTCB = await troveManager.getPendingReward(alice, BTC, true);
        const aliceBTCCollStakeB = (parseUnits('1', 9) * parseUnits('1', 9)) / remainingActiveBTC;
        const aliceExpectedBTCPendingB = (defaulterBTCWithoutFee * 2n * aliceBTCCollStakeB) / parseUnits('1', 9);
        expect(alicePendingBTCB - aliceExpectedBTCPendingB).to.be.lt(5001);
      });

      it('reverts if trove is non-existent', async () => {
        await expect(liquidationOperations.liquidate(alice)).to.be.revertedWithCustomError(
          liquidationOperations,
          'NoLiquidatableTrove'
        );
      });

      it('reverts if trove is already closedByLiquidation', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);
        await priceFeed.setTokenPrice(BTC, parseUnits('5000'));
        await liquidationOperations.liquidate(defaulter_1);

        await expect(liquidationOperations.liquidate(defaulter_1)).to.be.revertedWithCustomError(
          liquidationOperations,
          'NoLiquidatableTrove'
        );
      });

      it('reverts if trove has been closed', async () => {
        await openTrove({
          from: defaulter_2,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('0.02', 9), // 0.02 BTC
        });
        await openTrove({
          from: defaulter_3,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('0.02', 9), // 0.02 BTC
        });
        await contracts.borrowerOperations.connect(defaulter_3).closeTrove();
        await expect(liquidationOperations.liquidate(defaulter_3)).to.be.revertedWithCustomError(
          liquidationOperations,
          'NoLiquidatableTrove'
        );
      });

      it('does nothing if trove has >= 110% ICR', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);
        await assertRevert(liquidationOperations.liquidate(alice), 'NoLiquidatableTrove');
      });

      // todo
      // it.skip('liquidate(): Given the same price and no other trove changes, complete Pool offsets restore the TCR to its value prior to the defaulters opening troves', async () => {}); DONE
      // it.skip('liquidate(): Pool offsets increase the TCR', async () => {}); DONE
      // it.skip('liquidate(): a pure redistribution reduces the TCR only as a result of compensation', async () => {}); WORKING
      // todo
      // it.skip("liquidates a SP depositor's trove with ICR < 110%, and the liquidation correctly impacts their SP deposit and ETH gain", async () => {}); DONE

      it("does not affect the SP deposit or coll gain when called on an SP depositor's address that has no trove", async () => {
        await whaleShrimpTroveInit(contracts, signers, false);

        // Bob sends tokens to erin, who has no trove
        await STABLE.connect(bob).transfer(erin, parseUnits('500'));

        //erin provides stable to SP
        await stabilityPoolManager
          .connect(erin)
          .provideStability([{ tokenAddress: STABLE, amount: parseUnits('500') }]);

        // defaulter gets liquidated
        await priceFeed.setTokenPrice(BTC, parseUnits('5000'));
        await liquidationOperations.liquidate(defaulter_1);

        const stabilityPool = await getStabilityPool(contracts, STABLE);
        const spGainBefore = await stabilityPool.getDepositorCollGain(erin, BTC);

        await expect(liquidationOperations.liquidate(erin)).to.be.revertedWithCustomError(
          liquidationOperations,
          'NoLiquidatableTrove'
        );

        const spGainAfter = await stabilityPool.getDepositorCollGain(erin, BTC);
        assert.equal(spGainBefore, spGainAfter);
      });

      it("does not alter the liquidated user's token balance", async () => {
        await whaleShrimpTroveInit(contracts, signers, false);

        const btcBalanceBefore = await BTC.balanceOf(defaulter_1);

        // defaulter gets liquidated
        await priceFeed.setTokenPrice(BTC, parseUnits('5000'));
        await liquidationOperations.liquidate(defaulter_1);

        const btcBalanceAfter = await BTC.balanceOf(defaulter_1);
        assert.equal(btcBalanceBefore, btcBalanceAfter);
      });

      it('liquidates based on entire collateral/debt (including pending rewards), not raw collateral/debt', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);
        await priceFeed.setTokenPrice(BTC, parseUnits('5000'));

        const [aliceICRBefore] = await troveManager.getCurrentICR(alice);
        const [d1ICRBefore] = await troveManager.getCurrentICR(defaulter_1);
        const [d2ICRBefore] = await troveManager.getCurrentICR(defaulter_2);
        expect(d1ICRBefore).to.be.equal(d2ICRBefore);

        // defaulter gets liquidated
        await liquidationOperations.liquidate(defaulter_1);

        const [aliceICRAfter] = await troveManager.getCurrentICR(alice);
        const [d2ICRAfter] = await troveManager.getCurrentICR(defaulter_2);

        // gets a little bit higher/better because the 200 stable gas comp gets removed as debt from the defaulter, which results in a >110% ICR of the trove even after liquidation
        expect(aliceICRAfter).to.be.gt(aliceICRBefore);
        expect(d2ICRAfter).to.be.gt(d2ICRBefore);

        // defaulter gets liquidated
        await liquidationOperations.liquidate(defaulter_2);

        const [aliceICRAfter2] = await troveManager.getCurrentICR(alice);
        expect(aliceICRAfter2).to.be.gt(aliceICRAfter);
      });

      it('liquidateTroves(): closes every Trove with ICR < MCR, when n > number of undercollateralized troves', async () => {
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
          debts: [{ tokenAddress: STABLE, amount: parseUnits('2000') }],
        });
        await openTrove({
          from: carol,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('2', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('500') }],
        });
        await openTrove({
          from: whale,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('2', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('500') }],
        });

        // whale provides stable to SP
        await stabilityPoolManager
          .connect(whale)
          .provideStability([{ tokenAddress: STABLE, amount: parseUnits('300') }]);

        // Price drops
        await priceFeed.setTokenPrice(BTC, parseUnits('1300'));

        // check recovery mode
        const [isRecoveryModeAfter] = await storagePool.checkRecoveryMode();
        assert.isFalse(isRecoveryModeAfter);
        const MCR = await troveManager.MCR();

        // Confirm troves are ICR < 110%
        const aliceICR = (await troveManager.getCurrentICR(alice)).ICR;
        expect(aliceICR).to.be.lte(MCR);
        const bobICR = (await troveManager.getCurrentICR(bob)).ICR;
        expect(bobICR).to.be.lte(MCR);

        // Confirm ICR > 110% for the rest
        const carolICR = (await troveManager.getCurrentICR(carol)).ICR;
        expect(carolICR).to.be.gte(MCR);

        // Confirm Whale has ICR > 110%
        const whaleICR = (await troveManager.getCurrentICR(whale)).ICR;
        expect(whaleICR).to.be.gte(MCR);
        const troveLengthBefore = await troveManager.getTroveOwnersCount();

        // liquidateTroves used batch for liquidation
        await liquidationOperations.batchLiquidateTroves([alice, bob]);

        // Confirm troves are closed by liquidation in normal mode
        const aliceStatus = await troveManager.getTroveStatus(alice);
        expect(aliceStatus).to.be.equal(TroveStatus.CLOSED_BY_LIQUIDATION_IN_NORMAL_MODE);
        const bobStatus = await troveManager.getTroveStatus(bob);
        expect(bobStatus).to.be.equal(TroveStatus.CLOSED_BY_LIQUIDATION_IN_NORMAL_MODE);
        const troveLengthAfter = await troveManager.getTroveOwnersCount();

        // Confirm Troves count
        expect(troveLengthBefore - troveLengthAfter).to.be.equal(2);
      });

      it('Pool offsets increase the TCR ', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);

        //drop the price
        await priceFeed.setTokenPrice(BTC, parseUnits('5000'));

        const TCR_1 = await getTCR(contracts);

        // Confirm system is not in Recovery Mode
        const [isRecoveryMode] = await storagePool.checkRecoveryMode();
        assert.isFalse(isRecoveryMode);

        //liquidate defaulter_1
        await liquidationOperations.liquidate(defaulter_1);
        assert.equal(
          (await troveManager.getTroveStatus(defaulter_1)).toString(),
          TroveStatus.CLOSED_BY_LIQUIDATION_IN_NORMAL_MODE.toString()
        );
        const TCR_2 = await getTCR(contracts);
        expect(TCR_2).to.be.gt(TCR_1);

        //liquidate defaulter_2
        await liquidationOperations.liquidate(defaulter_2);
        assert.equal(
          (await troveManager.getTroveStatus(defaulter_2)).toString(),
          TroveStatus.CLOSED_BY_LIQUIDATION_IN_NORMAL_MODE.toString()
        );
        const TCR_3 = await getTCR(contracts);
        expect(TCR_3).to.be.gt(TCR_2);
      });

      it('a pure redistribution reduces the TCR only as a result of compensation', async () => {
        await openTrove({
          from: alice,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('2', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('8000') }],
        });
        await openTrove({
          from: bob,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('2', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('9500') }],
        });
        await openTrove({
          from: carol,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('2', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('18000') }],
        });
        await openTrove({
          from: dennis,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('2', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('18500') }],
        });
        await openTrove({
          from: whale,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('3', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
        });

        //decrease price
        await priceFeed.setTokenPrice(BTC, parseUnits('10000'));

        //get entire system coll & debt
        const entireSystemColl_Before = await storagePool.getEntireSystemColl();
        const entireSystemDebt_Before = await storagePool.getEntireSystemDebt();

        const TCR_0 = await getTCR(contracts);
        const expectedTCR_0 = (entireSystemColl_Before * parseUnits('1')) / entireSystemDebt_Before;
        expect(expectedTCR_0).to.be.equal(TCR_0);

        // Confirm system is not in Recovery Mode
        const [isRecoveryModeBefore] = await storagePool.checkRecoveryMode();
        assert.isFalse(isRecoveryModeBefore);

        // Check TCR does not decrease with each liquidation for carol
        const carolLiquidate = await liquidationOperations.liquidate(carol);
        assert.isFalse(await troveManager.isTroveActive(carol));
        const [, , stableGasComp_1, collGasComp_1] = await getEmittedLiquidationValues(carolLiquidate, contracts);
        const btcGasComp_1 = collGasComp_1.find((e: MockERC20[]) => e[0] === BTC.target)[1];
        const btcGasComp_1_USD = await priceFeed.getUSDValue(BTC, btcGasComp_1);

        // Expect only change to TCR to be due to the issued gas compensation
        const TCR_1 = await getTCR(contracts);
        const expectedTCR_1 =
          ((entireSystemColl_Before - btcGasComp_1_USD) * parseUnits('1')) /
          (entireSystemDebt_Before - stableGasComp_1);
        expect(expectedTCR_1).to.be.equal(TCR_1);

        // Check TCR does not decrease with each liquidation for dennis
        const denisLiquidate = await liquidationOperations.liquidate(dennis);
        const [, , stableGasComp_2, collGasComp_2] = await getEmittedLiquidationValues(denisLiquidate, contracts);
        const btcGasComp_2 = collGasComp_2.find((e: MockERC20[]) => e[0] === BTC.target)[1];
        const btcGasComp_2_USD = await priceFeed.getUSDValue(BTC, btcGasComp_2);

        // Expect only change to TCR to be due to the issued gas compensation
        const TCR_2 = await getTCR(contracts);
        const expectedTCR_2 =
          ((entireSystemColl_Before - btcGasComp_1_USD - btcGasComp_2_USD) * parseUnits('1')) /
          (entireSystemDebt_Before - stableGasComp_1 - stableGasComp_2);
        expect(expectedTCR_2).to.be.equal(TCR_2);
      });

      it("does not liquidate a SP depositor's trove with ICR > 110%, and does not affect their SP deposit or collateral gain", async () => {
        await openTrove({
          from: whale,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('3', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
        });
        await openTrove({
          from: bob,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('2', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
        });
        await openTrove({
          from: carol,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('1', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
        });

        //bob provides stable to SP
        const bobSPDeposit = parseUnits('10000');
        await stabilityPoolManager.connect(bob).provideStability([{ tokenAddress: STABLE, amount: bobSPDeposit }]);

        // carol gets liquidated
        await priceFeed.setTokenPrice(BTC, parseUnits('10000'));
        const [isInRecoveryMode] = await storagePool.checkRecoveryMode();
        assert.isFalse(isInRecoveryMode);
        const liquidateCarol = await liquidationOperations.liquidate(carol);
        const [liquidatedDebt, liquidatedColl] = await getEmittedLiquidationValues(liquidateCarol, contracts);
        const liquidateCarolTroveStatus = await troveManager.getTroveStatus(carol);
        assert.equal(liquidateCarolTroveStatus.toString(), TroveStatus.CLOSED_BY_LIQUIDATION_IN_NORMAL_MODE.toString());

        // price increases, dennis ICR > 110% again
        await priceFeed.setTokenPrice(BTC, parseUnits('17000'));
        const getDennisCurrentICR = (await troveManager.getCurrentICR(bob)).ICR;
        expect(getDennisCurrentICR).to.be.gt(parseUnits('110', 16));

        // Check Bob' SP deposit has absorbed Carol's debt, and he has received her liquidated ETH
        const stabilityPool = await getStabilityPool(contracts, STABLE);
        const bobDeposit_Before = await stabilityPool.getCompoundedDebtDeposit(bob);
        const bobGain_Before = await stabilityPool.getDepositorCollGain(bob, BTC);
        assert.isAtMost(Number(bobDeposit_Before - liquidatedDebt.find(e => e[0] === STABLE.target)[1]), 1000);
        assert.isAtMost(bobGain_Before - liquidatedColl.find(e => e[0] === BTC.target)[1], 1000);

        // Attempt to liquidate bob
        await expect(liquidationOperations.liquidate(bob)).to.be.revertedWithCustomError(
          liquidationOperations,
          'NoLiquidatableTrove'
        );
        assert.isTrue(await troveManager.isTroveActive(bob));

        // Check bob's SP deposit does not change after liquidation attempt
        const bobDeposit_After = await stabilityPool.getCompoundedDebtDeposit(bob);
        const bobGain_After = await stabilityPool.getDepositorCollGain(bob, BTC);
        assert.equal(bobDeposit_Before, bobDeposit_After);
        assert.equal(bobGain_Before, bobGain_After);
      });

      it("liquidates a SP depositor's trove with ICR < 110%, and the liquidation correctly impacts their SP deposit and collateral gain", async () => {
        await openTrove({
          from: alice,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('2', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('8000') }],
        });
        const aliceICR = (await troveManager.getCurrentICR(alice)).ICR;

        await openTrove({
          from: bob,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('2', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('9500') }],
        });
        const bobICR = (await troveManager.getCurrentICR(bob)).ICR;

        await openTrove({
          from: carol,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('1', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('18000') }],
        });
        const carolICR = (await troveManager.getCurrentICR(carol)).ICR;

        await openTrove({
          from: dennis,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('2', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('22000') }],
        });
        const dennisICR = (await troveManager.getCurrentICR(dennis)).ICR;

        await openTrove({
          from: whale,
          contracts,
          collToken: BTC,

          collAmount: parseUnits('3', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
        });

        //SP value for dennis & alice
        const dennisSPValue = parseUnits('16300');
        const aliceSPValue = parseUnits('5000');

        const stabilityPool = await getStabilityPool(contracts, STABLE);

        //dennis provides stable to SP
        await stabilityPoolManager.connect(dennis).provideStability([{ tokenAddress: STABLE, amount: dennisSPValue }]);

        // carol gets liquidated
        await priceFeed.setTokenPrice(BTC, parseUnits('11000'));

        // check not in recovery mode
        const [isInRecoveryMode] = await storagePool.checkRecoveryMode();
        assert.isFalse(isInRecoveryMode);

        const liquidateCarol = await liquidationOperations.liquidate(carol);

        assert.equal(
          (await troveManager.getTroveStatus(carol)).toString(),
          TroveStatus.CLOSED_BY_LIQUIDATION_IN_NORMAL_MODE.toString()
        );

        // const [liquidatedDebt, liquidatedColl, stableGasComp, collGasComp] = await getEmittedLiquidationValues(
        //   liquidateCarol,
        //   contracts
        // );

        const dennis_Deposit_Before = await stabilityPool.getCompoundedDebtDeposit(dennis);
        const depositDiff = dennisSPValue - parseUnits('18000');

        expect(dennis_Deposit_Before - depositDiff).to.be.lte(dennisSPValue);

        await stabilityPoolManager.connect(alice).provideStability([{ tokenAddress: STABLE, amount: aliceSPValue }]);

        const [isRecoveryMode] = await storagePool.checkRecoveryMode();
        assert.isFalse(isRecoveryMode);

        await liquidationOperations.liquidate(dennis);

        assert.equal(
          (await troveManager.getTroveStatus(dennis)).toString(),
          TroveStatus.CLOSED_BY_LIQUIDATION_IN_NORMAL_MODE.toString()
        );

        const alice_Deposit_Before = await stabilityPool.getCompoundedDebtDeposit(alice);
        const totalDeposit = dennisSPValue + aliceSPValue; // Bob + Alice deposits
        const aliceDepositShare = (parseUnits('22000') * aliceSPValue) / totalDeposit; // Alice's share of the debt
        const alice_DepositGain = alice_Deposit_Before - aliceDepositShare;
        expect(alice_DepositGain).to.be.lte(aliceSPValue);

        const dennis_Deposit_After = await stabilityPool.getCompoundedDebtDeposit(dennis);

        const dennis_SpGainAfter = await stabilityPool.getDepositorCollGain(dennis, BTC);

        let dennisDepositCalc = dennis_Deposit_Before - (dennisSPValue * parseUnits('22000')) / totalDeposit; // Dennis's debt and SP deposit divided by total deposit

        dennisDepositCalc = dennisDepositCalc * BigInt(-1);

        expect(dennis_Deposit_After).to.be.lte(dennisDepositCalc);
      });

      it('Given the same price and no other trove changes, complete Pool offsets restore the TCR to its value prior to the defaulters opening troves', async () => {
        await openTrove({
          from: whale,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('3', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('20000') }],
        });
        await stabilityPoolManager
          .connect(whale)
          .provideStability([{ tokenAddress: STABLE, amount: parseUnits('1000') }]);

        await openTrove({
          from: alice,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('2', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('15000') }],
        });

        await openTrove({
          from: bob,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('2', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('17000') }],
        });
        const bobICR = (await troveManager.getCurrentICR(bob)).ICR;

        //get System TCR
        const TCR_BEFORE = await getTCR(contracts);
        console.log('🔥 ~ it ~ TCR_BEFORE:', TCR_BEFORE);

        await openTrove({
          from: defaulter_1,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('1', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('16000') }],
        });

        await openTrove({
          from: defaulter_2,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('0.5', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('8000') }],
        });

        //drop price
        await priceFeed.setTokenPrice(BTC, parseUnits('15000'));

        //get System TCR
        const TCR = await getTCR(contracts);

        // Confirm system is not in Recovery Mode
        const [isRecoveryModeBefore] = await storagePool.checkRecoveryMode();
        assert.isFalse(isRecoveryModeBefore);

        //liquidate defaulters
        await liquidationOperations.liquidate(defaulter_1);
        assert.equal(
          (await troveManager.getTroveStatus(defaulter_1)).toString(),
          TroveStatus.CLOSED_BY_LIQUIDATION_IN_NORMAL_MODE.toString()
        );
        await liquidationOperations.liquidate(defaulter_2);
        assert.equal(
          (await troveManager.getTroveStatus(defaulter_2)).toString(),
          TroveStatus.CLOSED_BY_LIQUIDATION_IN_NORMAL_MODE.toString()
        );

        // Price bounces back
        await priceFeed.setTokenPrice(BTC, parseUnits('21000'));

        const aliceAfterBounce = (await troveManager.getCurrentICR(alice)).ICR;
        console.log('🔥 ~ it ~ aliceAfterBounce:', aliceAfterBounce);

        const bobAfterBounce = (await troveManager.getCurrentICR(bob)).ICR;
        console.log('🔥 ~ it ~ bobAfterBounce:', bobAfterBounce);

        const whaleAfterBounce = (await troveManager.getCurrentICR(whale)).ICR;
        console.log('🔥 ~ it ~ whaleAfterBounce:', whaleAfterBounce);

        //TCR should be same as before
        const TCR_AFTER = await getTCR(contracts);
        console.log('🔥 ~ it ~ TCR_AFTER:', TCR_AFTER);
        expect(TCR_BEFORE).to.be.equal(TCR_AFTER); // working on commented, getting error
      });
    });
  });

  describe('redeemCollateral()', () => {
    it('from one open Trove', async () => {
      await whaleShrimpTroveInit(contracts, signers, false);

      const bobStableBalanceBefore = await STABLE.balanceOf(bob);
      const btcStableBalanceBefore = await storagePool.getValue(BTC, true, 0);

      const toRedeem = parseUnits('50');

      await redemptionOperations.connect(bob).redeemCollateral(toRedeem, parseUnits('0.01'), [defaulter_1]);
      const bobStableBalanceAfter = await STABLE.balanceOf(bob);

      expect(bobStableBalanceAfter).to.be.equal(bobStableBalanceBefore - toRedeem);
      const collTokenBalance = await BTC.balanceOf(bob);

      let expectedBTCPayout = toRedeem / (await priceFeed.getUSDValue(BTC, 1));
      expectedBTCPayout -= await redemptionOperations.getRedemptionFeeWithDecay(expectedBTCPayout);
      assert.equal(collTokenBalance, expectedBTCPayout);

      const btcStableBalanceAfter = await storagePool.getValue(BTC, true, 0);
      assert.equal(btcStableBalanceAfter, btcStableBalanceBefore - expectedBTCPayout);
    });
    it('Should add collateral to the trove and update the stats', async function () {
      await whaleShrimpTroveInit(contracts, signers, false);

      const collAmountToAdd = parseUnits('0.0001', 9);
      const bobAddress = bob.address;
      const borrowerOperationsAddress = await contracts.borrowerOperations.getAddress();
      const storagePoolAddress = await storagePool.getAddress();
      const btcAddress = await BTC.getAddress();

      await expect(BTC.unprotectedMint(bobAddress, collAmountToAdd))
        .to.emit(BTC, 'Transfer')
        .withArgs(ethers.ZeroAddress, bobAddress, collAmountToAdd);

      await expect(BTC.connect(bob).approve(borrowerOperationsAddress, collAmountToAdd))
        .to.emit(BTC, 'Approval')
        .withArgs(bobAddress, borrowerOperationsAddress, collAmountToAdd);

      const prevPoolValue = await storagePool.getValue(BTC, true, 0);
      const prevTotalCollateralStake = await troveManager.totalStakes(btcAddress);
      const prevTroveStake = await troveManager.getTroveStakes(bobAddress, btcAddress);

      await expect(contracts.borrowerOperations.connect(bob).addColl([{ tokenAddress: BTC, amount: collAmountToAdd }]))
        .to.emit(storagePool, 'StoragePoolValueUpdated')
        .withArgs(btcAddress, true, '0', prevPoolValue + collAmountToAdd)
        .and.to.emit(BTC, 'Transfer')
        .withArgs(bobAddress, storagePoolAddress, collAmountToAdd);

      const newPoolValue = await storagePool.getValue(BTC, true, 0);
      const newTotalCollateralStake = await troveManager.totalStakes(btcAddress);
      const newTroveStake = await troveManager.getTroveStakes(bobAddress, btcAddress);

      expect(newPoolValue).to.be.equal(prevPoolValue + collAmountToAdd);
      expect(newTotalCollateralStake).to.be.equal(prevTotalCollateralStake + collAmountToAdd);
      expect(newTroveStake).to.be.equal(prevTroveStake + collAmountToAdd);
    });
  });

  describe('TroveOwners', () => {
    it('Should add new trove owner to the Trove Owners array', async function () {
      const prevTroveOwnersCount = await troveManager.getTroveOwnersCount();

      await openTrove({
        from: whale,
        contracts,
        collToken: contracts.collToken.BTC,
        collAmount: parseUnits('1', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('1850') }],
      });

      const oTrove = await troveManager.Troves(whale.address);
      const newTroveOwnersCount = await troveManager.getTroveOwnersCount();

      expect(oTrove.arrayIndex).to.be.equal(prevTroveOwnersCount);
      expect(newTroveOwnersCount).to.be.equal(prevTroveOwnersCount + '1');
    });
  });

  describe('getPendingReward()', () => {
    it('liquidates a Trove that a) was skipped in a previous liquidation and b) has pending rewards', async () => {
      await openTrove({
        from: alice,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('1', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('8000') }],
      });
      await stabilityPoolManager
        .connect(alice)
        .provideStability([{ tokenAddress: STABLE, amount: parseUnits('1000') }]);
      await openTrove({
        from: bob,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('2', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('10000') }],
      });
      await openTrove({
        from: carol,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('1', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('14000') }],
      });
      await openTrove({
        from: dennis,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('1', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('15000') }],
      });

      //decrease price
      await priceFeed.setTokenPrice(BTC, parseUnits('15000'));

      // Confirm system is not in Recovery Mode
      const [isRecoveryModeBefore] = await storagePool.checkRecoveryMode();
      assert.isFalse(isRecoveryModeBefore);

      // carol gets liquidated, creates pending rewards for all
      await liquidationOperations.liquidate(carol);
      const carol_Status = await troveManager.getTroveStatus(carol);
      assert.equal(carol_Status.toString(), TroveStatus.CLOSED_BY_LIQUIDATION_IN_NORMAL_MODE.toString());
      await stabilityPoolManager.connect(carol).provideStability([{ tokenAddress: STABLE, amount: parseUnits('100') }]);

      //drop price again
      await priceFeed.setTokenPrice(BTC, parseUnits('12000'));

      //check recovery mode
      const [isRecoveryModeAfter] = await storagePool.checkRecoveryMode();
      assert.isTrue(isRecoveryModeAfter);

      // Confirm alice has ICR > TCR
      const TCR = await getTCR(contracts);
      const ICR_A = await troveManager.getCurrentICR(alice);
      expect(ICR_A[0]).to.be.gt(TCR);

      // Attempt to liquidate alice and dennis, which skips alice in the liquidation since it is immune
      await liquidationOperations.liquidate(alice);
      await liquidationOperations.liquidate(dennis);
      const alice_Status = await troveManager.getTroveStatus(alice);
      assert.equal(alice_Status.toString(), TroveStatus.ACTIVE.toString());
      const dennis_Status = await troveManager.getTroveStatus(dennis);
      assert.equal(dennis_Status.toString(), TroveStatus.CLOSED_BY_LIQUIDATION_IN_RECOVERY_MODE.toString());

      // remaining troves bob repay a little debt, applying their pending rewards
      await borrowerOperations.connect(bob).repayDebt([{ tokenAddress: STABLE, amount: parseUnits('1000') }]);

      // Check alice is the only trove that has pending rewards
      const alicePendingBTCReward = await troveManager.getPendingReward(alice, BTC, true);
      assert.isTrue(alicePendingBTCReward > 0);
      const bobPendingReward = await troveManager.getPendingReward(bob, BTC, true);
      assert.isFalse(bobPendingReward > 0);

      // Check alice's pending coll and debt rewards are <= the coll and debt in the DefaultPool
      const PendingDebtSTABLE_A = await troveManager.getPendingReward(alice, STABLE, false);
      const entireSystemCollUsd = await storagePool.getEntireSystemColl();
      const entireSystemCollAmount = await priceFeed.getAmountFromUSDValue(BTC, entireSystemCollUsd);
      const entireSystemDebt = await storagePool.getEntireSystemDebt();
      expect(PendingDebtSTABLE_A).to.be.lte(entireSystemDebt);
      expect(alicePendingBTCReward).to.be.lte(entireSystemCollUsd);

      //Check only difference is dust
      expect(alicePendingBTCReward - entireSystemCollAmount).to.be.lt(1000);
      expect(PendingDebtSTABLE_A - entireSystemDebt).to.be.lt(1000);

      // Confirm system is still in Recovery Mode
      const [isRecoveryModeAfter_Active] = await storagePool.checkRecoveryMode();
      assert.isTrue(isRecoveryModeAfter_Active);

      //drop price again
      await priceFeed.setTokenPrice(BTC, parseUnits('5000'));

      //check trove length before liquidation
      const troveLengthBefore = await troveManager.getTroveOwnersCount();

      // Try to liquidate alice again. Check it succeeds and closes alice's trove
      const liquidateAgain_alice = await liquidationOperations.liquidate(alice);
      const liquidateAgain_aliceReceipt = await liquidateAgain_alice.wait();
      assert.isTrue(!!liquidateAgain_aliceReceipt?.status);
      const bobStatusFinal = await troveManager.getTroveStatus(bob);
      assert.equal(bobStatusFinal.toString(), TroveStatus.ACTIVE.toString());
      const troveLengthAfter = await troveManager.getTroveOwnersCount();

      // Confirm Troves count
      expect(troveLengthBefore - troveLengthAfter).to.be.equal(1);
    });
    it('Pending reward not affected after collateral price change', async () => {
      await whaleShrimpTroveInit(contracts, signers);

      //decrease price
      await priceFeed.setTokenPrice(BTC, parseUnits('5000'));

      //check recovery mode status
      const [isRecoveryMode] = await storagePool.checkRecoveryMode();
      assert.isFalse(isRecoveryMode);

      //liquidae defaulter_1
      await liquidationOperations.liquidate(defaulter_1);
      const defaulter_1TroveStatus = await troveManager.getTroveStatus(defaulter_1);
      assert.equal(defaulter_1TroveStatus.toString(), TroveStatus.CLOSED_BY_LIQUIDATION_IN_NORMAL_MODE.toString());
      const carolBtcRewardBefore = await troveManager.getPendingReward(carol, BTC, true);
      const amountBeforePriceChange = await priceFeed.getAmountFromUSDValue(BTC, carolBtcRewardBefore);

      //drop price again
      await priceFeed.setTokenPrice(BTC, parseUnits('3000'));
      const isRecoveryModeAfterPriceChange = await storagePool.checkRecoveryMode();
      assert.isFalse(isRecoveryModeAfterPriceChange[0]);

      const carolBtcRewardAfter = await troveManager.getPendingReward(carol, BTC, true);
      const amountAfterPriceChange = await priceFeed.getAmountFromUSDValue(BTC, carolBtcRewardAfter);
      assert.equal(amountBeforePriceChange, amountAfterPriceChange);
    });
    it('Returns 0 if there is no pending reward', async () => {
      await whaleShrimpTroveInit(contracts, signers, false);

      //decrease price
      await priceFeed.setTokenPrice(BTC, parseUnits('5000'));
      const [isRecoveryMode] = await storagePool.checkRecoveryMode();
      assert.isFalse(isRecoveryMode);
      await liquidationOperations.liquidate(defaulter_1);

      const defaulter_1TroveStatus = await troveManager.getTroveStatus(defaulter_1);
      assert.equal(defaulter_1TroveStatus.toString(), TroveStatus.CLOSED_BY_LIQUIDATION_IN_NORMAL_MODE.toString());
      const defaulter_3Snapshot_L_LUSDDebt = await troveManager.rewardSnapshots(defaulter_3, STABLE, false);
      assert.equal(defaulter_3Snapshot_L_LUSDDebt.toString(), '0');

      //after price drop
      const defaulter_3PendingReward = await troveManager.getPendingReward(defaulter_3, BTC, true);
      assert.equal(defaulter_3PendingReward.toString(), '0');
    });
  });
});
