import { ethers } from 'hardhat';
import {
  MockDebtToken,
  MockERC20,
  PriceFeed,
  MockTroveManager,
  StabilityPoolManager,
  StoragePool,
  LiquidationOperations,
  BorrowerOperations,
} from '../typechain';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import {
  TroveStatus,
  assertRevert,
  getEmittedLiquidationValues,
  getStabilityPool,
  getTCR,
  openTrove,
  whaleShrimpTroveInit,
  repayDebt,
  setPrice,
  deployTesting,
  buildPriceCache,
} from '../utils/testHelper';
import { assert, expect } from 'chai';
import { parseUnits } from 'ethers';

describe('LiquidationOperations', () => {
  let signers: SignerWithAddress[];
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carol: SignerWithAddress;
  let whale: SignerWithAddress;
  let dennis: SignerWithAddress;
  let erin: SignerWithAddress;

  let defaulter_1: SignerWithAddress;
  let defaulter_2: SignerWithAddress;
  let defaulter_3: SignerWithAddress;

  let storagePool: StoragePool;

  let STABLE: MockDebtToken;
  let BTC: MockERC20;

  let priceFeed: PriceFeed;
  let troveManager: MockTroveManager;

  let stabilityPoolManager: StabilityPoolManager;
  let liquidationOperations: LiquidationOperations;
  let borrowerOperations: BorrowerOperations;
  let contracts: any;

  before(async () => {
    signers = await ethers.getSigners();
    [, defaulter_1, defaulter_2, defaulter_3, whale, alice, bob, carol, dennis, erin] = signers;
  });

  beforeEach(async () => {
    contracts = await deployTesting();
    priceFeed = contracts.priceFeed;
    troveManager = contracts.troveManager;
    liquidationOperations = contracts.liquidationOperations;
    storagePool = contracts.storagePool;
    stabilityPoolManager = contracts.stabilityPoolManager;
    borrowerOperations = contracts.borrowerOperations;
    STABLE = contracts.STABLE;
    BTC = contracts.BTC;
  });

  describe('in Normal Mode', () => {
    describe('liquidate()', () => {
      it('closes a Trove that has ICR < MCR', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);
        await setPrice('BTC', '5000', contracts);

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
        await setPrice('BTC', '5000', contracts);

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
          activePoolDebt_Before - borrowedDebt - (await troveManager.getBorrowingFee(borrowedDebt, true))
        );
      });

      it('increases DefaultPool coll and debt by correct amounts', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);
        await setPrice('BTC', '5000', contracts);

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
        expect(defaultPoolDebtAfter).to.be.equal(
          liquidatedDebt + (await troveManager.getBorrowingFee(liquidatedDebt, true))
        );
      });

      it("removes the Trove's stake from the total stakes", async () => {
        await whaleShrimpTroveInit(contracts, signers, false);
        await setPrice('BTC', '5000', contracts);

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
        await setPrice('BTC', '5000', contracts);

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
        await setPrice('BTC', '5000', contracts);

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

      it('updates the L_coll reward-per-unit-staked totals', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);
        await setPrice('BTC', '5000', contracts);

        const [isRecoveryMode] = await storagePool.checkRecoveryMode();
        assert.isFalse(isRecoveryMode);

        // 1. liquidation
        await liquidationOperations.liquidate(defaulter_1);

        const defaulterBTC = parseUnits('0.02', 9);
        const defaulterBTCWithoutFee = defaulterBTC - (await troveManager.getCollGasCompensation(defaulterBTC));
        let remainingActiveBTC = parseUnits('5.04', 9) - defaulterBTC;
        const totalStake = await priceFeed['getUSDValue(address,uint256)'](BTC, remainingActiveBTC);

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
        const totalStakeB = await priceFeed['getUSDValue(address,uint256)'](BTC, remainingActiveBTC);

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
        await setPrice('BTC', '5000', contracts);
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
      // it.skip('liquidate(): a pure redistribution reduces the TCR only as a result of compensation', async () => {}); DONE
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
        await setPrice('BTC', '5000', contracts);
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
        await setPrice('BTC', '5000', contracts);
        await liquidationOperations.liquidate(defaulter_1);

        const btcBalanceAfter = await BTC.balanceOf(defaulter_1);
        assert.equal(btcBalanceBefore, btcBalanceAfter);
      });

      it('liquidates based on entire collateral/debt (including pending rewards), not raw collateral/debt', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);
        await setPrice('BTC', '5000', contracts);

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

      it('closes every Trove with ICR < MCR, when n > number of undercollateralized troves', async () => {
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
        await setPrice('BTC', '1300', contracts);

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
        await setPrice('BTC', '5000', contracts);

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
        await setPrice('BTC', '10000', contracts);

        //get entire system coll & debt
        const priceCache = await buildPriceCache(contracts);
        const entireSystemColl_Before = await storagePool.getEntireSystemColl(priceCache);
        const entireSystemDebt_Before = await storagePool.getEntireSystemDebt(priceCache);

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
        const btcGasComp_1_USD = await priceFeed['getUSDValue(address,uint256)'](BTC, btcGasComp_1);

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
        const btcGasComp_2_USD = await priceFeed['getUSDValue(address,uint256)'](BTC, btcGasComp_2);

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
        await setPrice('BTC', '10000', contracts);
        const [isInRecoveryMode] = await storagePool.checkRecoveryMode();
        assert.isFalse(isInRecoveryMode);
        const liquidateCarol = await liquidationOperations.liquidate(carol);
        const [liquidatedDebt, liquidatedColl] = await getEmittedLiquidationValues(liquidateCarol, contracts);
        const liquidateCarolTroveStatus = await troveManager.getTroveStatus(carol);
        assert.equal(liquidateCarolTroveStatus.toString(), TroveStatus.CLOSED_BY_LIQUIDATION_IN_NORMAL_MODE.toString());

        // price increases, dennis ICR > 110% again
        await setPrice('BTC', '17000', contracts);
        const getDennisCurrentICR = (await troveManager.getCurrentICR(bob)).ICR;
        expect(getDennisCurrentICR).to.be.gt(parseUnits('110', 16));

        // Check Bob' SP deposit has absorbed Carol's debt, and he has received her liquidated ETH
        const stabilityPool = await getStabilityPool(contracts, STABLE);
        const bobDeposit_Before = await stabilityPool.getCompoundedDebtDeposit(bob);
        const bobGain_Before = await stabilityPool.getDepositorCollGain(bob, BTC);
        assert.isAtMost(Number(bobDeposit_Before - liquidatedDebt.find(e => e[0] === STABLE.target)[1]), 1000);
        assert.isAtMost(Number(bobGain_Before - liquidatedColl.find(e => e[0] === BTC.target)[1]), 1000);

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
        await setPrice('BTC', '11000', contracts);

        // check not in recovery mode
        const [isInRecoveryMode] = await storagePool.checkRecoveryMode();
        assert.isFalse(isInRecoveryMode);

        const liquidateCarol = await liquidationOperations.liquidate(carol);

        assert.equal(
          (await troveManager.getTroveStatus(carol)).toString(),
          TroveStatus.CLOSED_BY_LIQUIDATION_IN_NORMAL_MODE.toString()
        );

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

      it('Liquidates undercollateralized trove if there are two troves in the system', async () => {
        await openTrove({
          from: alice,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('5', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('1000') }],
        });
        // log alice's ICR
        const aliceICR = (await troveManager.getCurrentICR(alice)).ICR;
        await openTrove({
          from: bob,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('1', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('1000') }],
        });
        // log bob's ICR
        const bobICR = (await troveManager.getCurrentICR(bob)).ICR;

        // provide stable to SP
        await stabilityPoolManager.connect(bob).provideStability([{ tokenAddress: STABLE, amount: parseUnits('800') }]);

        //drop price
        await setPrice('BTC', '1000', contracts);

        // Confirm system is not in Recovery Mode
        const [isRecoveryModeBefore] = await storagePool.checkRecoveryMode();
        assert.isFalse(isRecoveryModeBefore);

        const bobICRAfter = (await troveManager.getCurrentICR(bob)).ICR;
        assert.isTrue(bobICRAfter < parseUnits('110', 16));

        const totalActiveTrovesBefore = await troveManager.getTroveOwnersCount();
        assert.equal(totalActiveTrovesBefore.toString(), '2');

        // Confirm system is not in Recovery Mode
        const [isRecoveryModeAfter] = await storagePool.checkRecoveryMode();
        assert.isFalse(isRecoveryModeAfter);

        //liquidate bob
        await liquidationOperations.liquidate(bob);
        assert.equal(
          (await troveManager.getTroveStatus(bob)).toString(),
          TroveStatus.CLOSED_BY_LIQUIDATION_IN_NORMAL_MODE.toString()
        );

        const totalActiveTrovesAfter = await troveManager.getTroveOwnersCount();
        assert.equal(totalActiveTrovesAfter.toString(), '1');

        assert.equal((await troveManager.getTroveStatus(alice)).toString(), TroveStatus.ACTIVE.toString());
      });

      it('Given the same price and no other trove changes, complete Pool offsets restore the TCR to its value prior to the defaulters opening troves', async () => {
        await openTrove({
          from: whale,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('30', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('200000') }],
        });
        await stabilityPoolManager
          .connect(whale)
          .provideStability([{ tokenAddress: STABLE, amount: parseUnits('100000') }]);

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

        //get System TCR
        const TCR_BEFORE = await getTCR(contracts);

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
        await setPrice('BTC', '15000', contracts);

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
        await setPrice('BTC', '21000', contracts);

        //TCR should be same as before
        const TCR_AFTER = await getTCR(contracts);
        expect(TCR_BEFORE).to.be.equal(TCR_AFTER);
      });
    });
  });

  describe('batchLiquidateTroves()', () => {
    it('should revert if no troves are passed', async () => {
      await whaleShrimpTroveInit(contracts, signers, false);

      await expect(liquidationOperations.batchLiquidateTroves([])).to.be.revertedWithCustomError(
        liquidationOperations,
        'EmptyArray'
      );
    });

    it('closes every trove with ICR < MCR in the given array', async () => {
      await openTrove({
        from: whale,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('3', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('20000') }],
      });

      await openTrove({
        from: alice,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('1', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('16000') }],
      });

      await openTrove({
        from: bob,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('1', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('15000') }],
      });

      await openTrove({
        from: carol,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('1', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('12000') }],
      });

      await openTrove({
        from: dennis,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('1', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('11000') }],
      });

      await stabilityPoolManager
        .connect(whale)
        .provideStability([{ tokenAddress: STABLE, amount: parseUnits('10000') }]);

      const MCR = await troveManager.MCR();

      //drop price
      await setPrice('BTC', '16500', contracts);

      //check system is not in recovery
      const [isRecoveryMode] = await storagePool.checkRecoveryMode();
      assert.isFalse(isRecoveryMode);

      //confirm troves alice & bob are ICR < 110%
      expect((await troveManager.getCurrentICR(alice)).ICR).to.be.lt(MCR);
      expect((await troveManager.getCurrentICR(bob)).ICR).to.be.lt(MCR);

      //confirm troves carol & dennis are ICR > 110%
      expect((await troveManager.getCurrentICR(carol)).ICR).to.be.gt(MCR);
      expect((await troveManager.getCurrentICR(dennis)).ICR).to.be.gt(MCR);

      //confirm whale is ICR > 110%
      expect((await troveManager.getCurrentICR(whale)).ICR).to.be.gt(MCR);

      //batch liquidate except whale
      await liquidationOperations.batchLiquidateTroves([alice, bob, carol, dennis]);

      //check all troves are closed
      const aliceTroveStatus = await troveManager.getTroveStatus(alice);
      assert.equal(aliceTroveStatus.toString(), TroveStatus.CLOSED_BY_LIQUIDATION_IN_NORMAL_MODE.toString());
      const bobTroveStatus = await troveManager.getTroveStatus(bob);
      assert.equal(bobTroveStatus.toString(), TroveStatus.CLOSED_BY_LIQUIDATION_IN_NORMAL_MODE.toString());

      //check carol, denis & whale are still active
      const carolTroveStatus = await troveManager.getTroveStatus(carol);
      assert.equal(carolTroveStatus.toString(), TroveStatus.ACTIVE.toString());
      const dennisTroveStatus = await troveManager.getTroveStatus(dennis);
      assert.equal(dennisTroveStatus.toString(), TroveStatus.ACTIVE.toString());
      const whaleTroveStatus = await troveManager.getTroveStatus(whale);
      assert.equal(whaleTroveStatus.toString(), TroveStatus.ACTIVE.toString());
    });

    it('skips if trove is non-existent', async () => {
      await whaleShrimpTroveInit(contracts, signers, false);

      const [isRecoveryMode] = await storagePool.checkRecoveryMode();
      assert.isFalse(isRecoveryMode);

      await expect(liquidationOperations.batchLiquidateTroves([defaulter_3])).to.be.revertedWithCustomError(
        liquidationOperations,
        'NoLiquidatableTrove'
      );
    });

    it('does not close troves with ICR >= MCR in the given array', async () => {
      await whaleShrimpTroveInit(contracts, signers, false);

      const [isRecoveryMode] = await storagePool.checkRecoveryMode();
      assert.isFalse(isRecoveryMode);

      await setPrice('STABLE', '5', contracts);

      const MCR = await troveManager.MCR();

      // Validate ICR >= MCR
      const aliceICR = await troveManager.getCurrentICR(alice.address);
      expect(aliceICR[0]).to.be.gte(MCR);

      const bobICR = await troveManager.getCurrentICR(bob.address);
      expect(bobICR[0]).to.be.gte(MCR);

      const carolICR = await troveManager.getCurrentICR(carol.address);
      expect(carolICR[0]).to.be.gte(MCR);

      const dennisICR = await troveManager.getCurrentICR(dennis.address);
      expect(dennisICR[0]).to.be.gte(MCR);

      // Validate ICR < MCR
      const defaulter_1ICR = await troveManager.getCurrentICR(defaulter_1.address);
      expect(defaulter_1ICR[0]).to.be.lte(MCR);

      const defaulter_2ICR = await troveManager.getCurrentICR(defaulter_2.address);
      expect(defaulter_2ICR[0]).to.be.lte(MCR);

      // Batch liquidate all the troves
      await liquidationOperations.batchLiquidateTroves([alice, bob, carol, dennis, defaulter_1, defaulter_2]);

      // Validate Troves with ICR >= MCR are not liquidated
      const aliceTrove = await troveManager.getTroveStatus(alice.address);
      expect(aliceTrove).to.be.equal(TroveStatus.ACTIVE);

      const bobTrove = await troveManager.getTroveStatus(bob.address);
      expect(bobTrove).to.be.equal(TroveStatus.ACTIVE);

      const carolTrove = await troveManager.getTroveStatus(carol.address);
      expect(carolTrove).to.be.equal(TroveStatus.ACTIVE);

      const dennisTrove = await troveManager.getTroveStatus(dennis.address);
      expect(dennisTrove).to.be.equal(TroveStatus.ACTIVE);

      // Validate Troves with ICR < MCR are liquidated
      const defaulter_1Trove = await troveManager.getTroveStatus(defaulter_1.address);
      expect(defaulter_1Trove).to.be.equal(TroveStatus.CLOSED_BY_LIQUIDATION_IN_NORMAL_MODE);

      const defaulter_2Trove = await troveManager.getTroveStatus(defaulter_2.address);
      expect(defaulter_2Trove).to.be.equal(TroveStatus.CLOSED_BY_LIQUIDATION_IN_NORMAL_MODE);
    });

    it('does not close troves with ICR >= MCR in the given array', async () => {
      await whaleShrimpTroveInit(contracts, signers, false);

      const [isRecoveryMode] = await storagePool.checkRecoveryMode();
      assert.isFalse(isRecoveryMode);

      await setPrice('STABLE', '5', contracts);

      const MCR = await troveManager.MCR();

      // Validate ICR >= MCR
      const aliceICR = await troveManager.getCurrentICR(alice.address);
      expect(aliceICR[0]).to.be.gte(MCR);

      const bobICR = await troveManager.getCurrentICR(bob.address);
      expect(bobICR[0]).to.be.gte(MCR);

      const carolICR = await troveManager.getCurrentICR(carol.address);
      expect(carolICR[0]).to.be.gte(MCR);

      const dennisICR = await troveManager.getCurrentICR(dennis.address);
      expect(dennisICR[0]).to.be.gte(MCR);

      // Validate ICR < MCR
      const defaulter_1ICR = await troveManager.getCurrentICR(defaulter_1.address);
      expect(defaulter_1ICR[0]).to.be.lte(MCR);

      const defaulter_2ICR = await troveManager.getCurrentICR(defaulter_2.address);
      expect(defaulter_2ICR[0]).to.be.lte(MCR);

      // Batch liquidate all the troves
      await liquidationOperations.batchLiquidateTroves([alice, bob, carol, dennis, defaulter_1, defaulter_2]);

      // Validate Troves with ICR >= MCR are not liquidated
      const aliceTrove = await troveManager.getTroveStatus(alice.address);
      expect(aliceTrove).to.be.equal(TroveStatus.ACTIVE);

      const bobTrove = await troveManager.getTroveStatus(bob.address);
      expect(bobTrove).to.be.equal(TroveStatus.ACTIVE);

      const carolTrove = await troveManager.getTroveStatus(carol.address);
      expect(carolTrove).to.be.equal(TroveStatus.ACTIVE);

      const dennisTrove = await troveManager.getTroveStatus(dennis.address);
      expect(dennisTrove).to.be.equal(TroveStatus.ACTIVE);

      // Validate Troves with ICR < MCR are liquidated
      const defaulter_1Trove = await troveManager.getTroveStatus(defaulter_1.address);
      expect(defaulter_1Trove).to.be.equal(TroveStatus.CLOSED_BY_LIQUIDATION_IN_NORMAL_MODE);

      const defaulter_2Trove = await troveManager.getTroveStatus(defaulter_2.address);
      expect(defaulter_2Trove).to.be.equal(TroveStatus.CLOSED_BY_LIQUIDATION_IN_NORMAL_MODE);
    });

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
      await setPrice('BTC', '15000', contracts);

      // Confirm system is not in Recovery Mode
      const [isRecoveryModeBefore] = await storagePool.checkRecoveryMode();
      assert.isFalse(isRecoveryModeBefore);

      // carol gets liquidated, creates pending rewards for all
      await liquidationOperations.liquidate(carol);
      const carol_Status = await troveManager.getTroveStatus(carol);
      assert.equal(carol_Status.toString(), TroveStatus.CLOSED_BY_LIQUIDATION_IN_NORMAL_MODE.toString());
      await stabilityPoolManager.connect(carol).provideStability([{ tokenAddress: STABLE, amount: parseUnits('100') }]);

      //drop price again
      await setPrice('BTC', '12000', contracts);

      //check recovery mode
      const [isRecoveryModeAfter] = await storagePool.checkRecoveryMode();
      assert.isTrue(isRecoveryModeAfter);

      // Confirm alice has ICR > TCR
      const TCR = await getTCR(contracts);
      const ICR_A = await troveManager.getCurrentICR(alice);
      expect(ICR_A[0]).to.be.gt(TCR);

      // Attempt to liquidate alice and dennis, which skips alice in the liquidation since it is immune
      await liquidationOperations.batchLiquidateTroves([alice, dennis]);
      const alice_Status = await troveManager.getTroveStatus(alice);
      assert.equal(alice_Status.toString(), TroveStatus.ACTIVE.toString());
      const dennis_Status = await troveManager.getTroveStatus(dennis);
      assert.equal(dennis_Status.toString(), TroveStatus.CLOSED_BY_LIQUIDATION_IN_RECOVERY_MODE.toString());

      // remaining troves bob repay a little debt, applying their pending rewards
      await repayDebt(bob, contracts, [{ tokenAddress: STABLE, amount: parseUnits('1000') }]);

      // Check alice is the only trove that has pending rewards
      const alicePendingBTCReward = await troveManager.getPendingReward(alice, BTC, true);
      assert.isTrue(alicePendingBTCReward > 0);
      const bobPendingReward = await troveManager.getPendingReward(bob, BTC, true);
      assert.isFalse(bobPendingReward > 0);

      // Check alice's pending coll and debt rewards are <= the coll and debt in the DefaultPool
      const priceCache = await buildPriceCache(contracts);
      const PendingDebtSTABLE_A = await troveManager.getPendingReward(alice, STABLE, false);
      const entireSystemCollUsd = await storagePool.getEntireSystemColl(priceCache);
      const entireSystemCollAmount = await priceFeed['getAmountFromUSDValue(address,uint256)'](
        BTC,
        entireSystemCollUsd
      );
      const entireSystemDebt = await storagePool.getEntireSystemDebt(priceCache);
      expect(PendingDebtSTABLE_A).to.be.lte(entireSystemDebt);
      expect(alicePendingBTCReward).to.be.lte(entireSystemCollUsd);

      //Check only difference is dust
      expect(alicePendingBTCReward - entireSystemCollAmount).to.be.lt(1000);
      expect(PendingDebtSTABLE_A - entireSystemDebt).to.be.lt(1000);

      // Confirm system is still in Recovery Mode
      const [isRecoveryModeAfter_Active] = await storagePool.checkRecoveryMode();
      assert.isTrue(isRecoveryModeAfter_Active);

      //drop price again
      await setPrice('BTC', '5000', contracts);

      //check trove length before liquidation
      const troveLengthBefore = await troveManager.getTroveOwnersCount();

      // Try to liquidate alice again. Check it succeeds and closes alice's trove
      const liquidateAgain_alice = await liquidationOperations.batchLiquidateTroves([alice, bob]);
      const liquidateAgain_aliceReceipt = await liquidateAgain_alice.wait();
      assert.isTrue(!!liquidateAgain_aliceReceipt?.status);
      const bobStatusFinal = await troveManager.getTroveStatus(bob);
      assert.equal(bobStatusFinal.toString(), TroveStatus.ACTIVE.toString());
      const troveLengthAfter = await troveManager.getTroveOwnersCount();

      // Confirm Troves count
      expect(troveLengthBefore - troveLengthAfter).to.be.equal(1);
    });

    it('reverts if array is empty', async () => {
      await expect(liquidationOperations.batchLiquidateTroves([])).to.be.revertedWithCustomError(
        liquidationOperations,
        'EmptyArray'
      );
    });

    it('skips if a trove has been closed', async () => {
      await whaleShrimpTroveInit(contracts, signers, false);

      assert.equal((await troveManager.getTroveOwnersCount()).toString(), '7');

      //provide to SP
      await stabilityPoolManager.connect(whale).provideStability([{ tokenAddress: STABLE, amount: parseUnits('500') }]);

      await STABLE.connect(whale).transfer(bob.address, parseUnits('500'));

      //drop price
      await setPrice('BTC', '5000', contracts);

      //check recovery mode
      const [isRecoveryModeBefore] = await storagePool.checkRecoveryMode();
      assert.isFalse(isRecoveryModeBefore);

      const txBobTroveClose = await borrowerOperations.connect(bob).closeTrove();
      const txBobTroveCloseReceipt = await txBobTroveClose.wait();
      assert.isTrue(!!txBobTroveCloseReceipt?.status);

      assert.equal((await troveManager.getTroveStatus(bob)).toString(), TroveStatus.CLOSED_BY_OWNER.toString());

      //check recovery mode
      const [isRecoveryModeAfter] = await storagePool.checkRecoveryMode();
      assert.isFalse(isRecoveryModeAfter);

      //check ICR is less then 110%
      const defaulter_1ICR = await troveManager.getCurrentICR(defaulter_1.address);
      expect(defaulter_1ICR[0]).to.be.lt(parseUnits('110', 16));

      //transfer stable to defaulter 2
      await STABLE.connect(carol).transfer(defaulter_1.address, parseUnits('500'));

      //liquidate
      await liquidationOperations.batchLiquidateTroves([defaulter_1, bob, carol, dennis, alice]);

      //check trove status
      assert.equal(
        (await troveManager.getTroveStatus(defaulter_1)).toString(),
        TroveStatus.CLOSED_BY_LIQUIDATION_IN_NORMAL_MODE.toString()
      );

      //check trove status is active
      assert.equal((await troveManager.getTroveStatus(defaulter_2)).toString(), TroveStatus.ACTIVE.toString());
      assert.equal((await troveManager.getTroveStatus(carol)).toString(), TroveStatus.ACTIVE.toString());
      assert.equal((await troveManager.getTroveStatus(dennis)).toString(), TroveStatus.ACTIVE.toString());
      assert.equal((await troveManager.getTroveStatus(alice)).toString(), TroveStatus.ACTIVE.toString());

      //check defaulter 1 is still closed by owner
      assert.equal((await troveManager.getTroveStatus(bob)).toString(), TroveStatus.CLOSED_BY_OWNER.toString());

      //check trove length
      assert.equal((await troveManager.getTroveOwnersCount()).toString(), '5');
    });

    it('does not liquidate troves that are not in the given array', async () => {
      await whaleShrimpTroveInit(contracts, signers, false);

      //provide to SP
      await stabilityPoolManager
        .connect(whale)
        .provideStability([{ tokenAddress: STABLE, amount: parseUnits('1000') }]);

      //Check trove owner length
      assert.equal((await troveManager.getTroveOwnersCount()).toString(), '7');

      //drop price
      await setPrice('BTC', '5000', contracts);

      const [isRecoveryMode] = await storagePool.checkRecoveryMode();
      assert.isFalse(isRecoveryMode);

      //batchliquidate defaulter 1 and 2
      await liquidationOperations.batchLiquidateTroves([defaulter_1, defaulter_2]);

      //check trove status
      assert.equal(
        (await troveManager.getTroveStatus(defaulter_1)).toString(),
        TroveStatus.CLOSED_BY_LIQUIDATION_IN_NORMAL_MODE.toString()
      );
      assert.equal(
        (await troveManager.getTroveStatus(defaulter_2)).toString(),
        TroveStatus.CLOSED_BY_LIQUIDATION_IN_NORMAL_MODE.toString()
      );

      //check active troves
      assert.equal((await troveManager.getTroveStatus(bob)).toString(), TroveStatus.ACTIVE.toString());
      assert.equal((await troveManager.getTroveStatus(alice)).toString(), TroveStatus.ACTIVE.toString());
      assert.equal((await troveManager.getTroveStatus(carol)).toString(), TroveStatus.ACTIVE.toString());
      assert.equal((await troveManager.getTroveStatus(dennis)).toString(), TroveStatus.ACTIVE.toString());
      assert.equal((await troveManager.getTroveStatus(whale)).toString(), TroveStatus.ACTIVE.toString());

      //check trove length
      assert.equal((await troveManager.getTroveOwnersCount()).toString(), '5');
    });
  });

  describe('in Recovery Mode', () => {
    describe('checkRecoveryMode()', () => {
      it('Returns true if TCR falls below CCR', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);

        // find TCR
        const TCR = await getTCR(contracts);
        assert.isTrue(TCR / parseUnits('1', 16) > 150n);

        const [isRecoveryMode] = await storagePool['checkRecoveryMode()']();
        assert.isFalse(isRecoveryMode);

        //decrease price
        await setPrice('BTC', '2000', contracts);

        //check TCR
        const TCR_after = await getTCR(contracts);
        assert.isTrue(TCR_after / parseUnits('1', 16) < 150n);

        const [isRecoveryModeAfter] = await storagePool['checkRecoveryMode()']();
        assert.isTrue(isRecoveryModeAfter);
      });

      it('Returns true if TCR stays less than CCR', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);

        const TCR = await getTCR(contracts);
        assert.isTrue(TCR / parseUnits('1', 16) > 150n);

        //drop price
        await setPrice('BTC', '2000', contracts);

        const [isRecoveryMode] = await storagePool['checkRecoveryMode()']();
        assert.isTrue(isRecoveryMode);

        // // mint into alice's account
        // await BTC.connect(alice).unprotectedMint(alice.address, parseUnits('1', 9));

        // //increase allowance of alice
        // await BTC.connect(alice).approve(borrowerOperations, parseUnits('4', 9));

        await addColl(alice, contracts, [{ tokenAddress: BTC, amount: parseUnits('0.1', 9) }], true);

        // await borrowerOperations.connect(alice).addColl([{ tokenAddress: BTC, amount: parseUnits('1', 9) }]);

        const [isRecoveryMode_After] = await storagePool['checkRecoveryMode()']();
        assert.isTrue(isRecoveryMode_After);
      });

      it('returns false if TCR stays above CCR', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);

        const TCR = await getTCR(contracts);
        assert.isTrue(TCR / parseUnits('1', 16) > 150n);

        await withdrawalColl(dennis, contracts, [{ tokenAddress: BTC, amount: parseUnits('0.1', 9) }]);

        // await borrowerOperations.connect(dennis).withdrawColl([{ tokenAddress: BTC, amount: parseUnits('0.1', 9) }]);

        const [isRecoveryMode] = await storagePool['checkRecoveryMode()']();
        assert.isFalse(isRecoveryMode);
      });

      it('returns false if TCR rises above CCR', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);

        // get TCR
        const TCR = await getTCR(contracts);
        assert.isTrue(TCR / parseUnits('1', 16) > 150n);

        //drop price
        await setPrice('BTC', '2900', contracts);

        //check recovery mode
        const [isRecoveryMode] = await storagePool['checkRecoveryMode()']();
        assert.isTrue(isRecoveryMode);

        // // mint into alice's account
        // await BTC.connect(alice).unprotectedMint(alice.address, parseUnits('1', 9));

        // //increase allowance
        // await BTC.connect(alice).approve(borrowerOperations, parseUnits('4', 9));

        // add collateral to alice's trove
        await addColl(alice, contracts, [{ tokenAddress: BTC, amount: parseUnits('0.1', 9) }], true);
        // await borrowerOperations.connect(alice).addColl([{ tokenAddress: BTC, amount: parseUnits('1', 9) }]);

        //check recovery mode
        const [isRecoveryMode_After] = await storagePool['checkRecoveryMode()']();
        assert.isFalse(isRecoveryMode_After);
      });
    });

    describe('liquidate()', () => {
      it('with ICR < 100%: removes stake and updates totalStakes', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);

        // get TCR
        const TCR = await getTCR(contracts);
        assert.isTrue(TCR / parseUnits('1', 16) > 150n);

        const bobStakeBefore = await getTroveStake(contracts, bob, BTC);
        assert.equal(bobStakeBefore, parseUnits('1', 9));

        const totalStakesBefore = await troveManager.totalStakes(BTC);
        assert.equal(totalStakesBefore, parseUnits('5.04', 9));

        //decrease price
        await setPrice('BTC', '2000', contracts);

        //check bob ICR
        const [bobICR] = await troveManager.getCurrentICR(bob);
        assert.isTrue(bobICR / parseUnits('1', 16) < 110n);

        //liquidate bob
        await liquidationOperations.liquidate(bob);
        expect(await troveManager.getTroveStatus(bob)).to.be.equal(TroveStatus.CLOSED_BY_LIQUIDATION_IN_RECOVERY_MODE);

        const bobStakeAfter = await getTroveStake(contracts, bob, BTC);
        assert.equal(bobStakeAfter, 0n);

        const totalStakesAfter = await troveManager.totalStakes(BTC);
        assert.equal(totalStakesAfter, totalStakesBefore - bobStakeBefore);
      });

      it('with ICR < 100%: updates system snapshots correctly', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);

        //get TCR
        const TCR = await getTCR(contracts);
        assert.isTrue(TCR / parseUnits('1', 16) > 150n);

        //decrease price
        await setPrice('BTC', '2000', contracts);

        //check recovery mode
        const [isRecoveryMode] = await storagePool['checkRecoveryMode()']();
        assert.isTrue(isRecoveryMode);

        const totalStakes = await troveManager.totalStakes(BTC);
        assert.equal(totalStakes, parseUnits('5.04', 9));

        const defaulter_1Stakes = await getTroveStake(contracts, defaulter_1, BTC);

        //liquidate defaulter_1
        await liquidationOperations.liquidate(defaulter_1);
        expect(await troveManager.getTroveStatus(defaulter_1)).to.be.equal(
          TroveStatus.CLOSED_BY_LIQUIDATION_IN_RECOVERY_MODE
        );

        //get value
        const defaultPoolValue = await storagePool.getValue(BTC, true, 1);

        const gasCompValue = await storagePool.getValue(BTC, true, 2);

        //total stake snapshot
        const totalStakesSnapshot_Before = await troveManager.totalStakesSnapshot(BTC);
        assert.equal(totalStakesSnapshot_Before, totalStakes - defaulter_1Stakes);

        //total collateral snapshot
        const totalCollateralSnapshot_Before = await troveManager.totalCollateralSnapshots(BTC);
        assert.equal(totalCollateralSnapshot_Before, totalStakesSnapshot_Before + defaultPoolValue - gasCompValue);

        const defaulter_2Stakes = await getTroveStake(contracts, defaulter_2, BTC);

        //liquidate defaulter_2
        await liquidationOperations.liquidate(defaulter_2);
        expect(await troveManager.getTroveStatus(defaulter_2)).to.be.equal(
          TroveStatus.CLOSED_BY_LIQUIDATION_IN_RECOVERY_MODE
        );

        //get value
        const defaultPoolValue_After = await storagePool.getValue(BTC, true, 1);

        const gasCompValue_After = await storagePool.getValue(BTC, true, 2);

        const totalStakesSnapshot_After = await troveManager.totalStakesSnapshot(BTC);
        assert.equal(totalStakesSnapshot_After, totalStakesSnapshot_Before - defaulter_2Stakes);

        const totalCollateralSnapshot_After = await troveManager.totalCollateralSnapshots(BTC);

        assert.equal(
          totalCollateralSnapshot_After,
          totalStakesSnapshot_After + defaultPoolValue_After - gasCompValue_After
        );
      });

      it('with 100% < ICR < 110%: closes the Trove and removes it from the Trove array', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);

        const defaulter_1TroveStatusBefore = await troveManager.getTroveStatus(defaulter_1);
        assert.equal(defaulter_1TroveStatusBefore.toString(), TroveStatus.ACTIVE.toString());

        const troveLengthBefore = await troveManager.getTroveOwnersCount();
        assert.equal(troveLengthBefore.toString(), '7');

        //decrease price
        await setPrice('BTC', '2000', contracts);

        //check recovery mode
        const [isRecoveryModeBefore] = await storagePool['checkRecoveryMode()']();
        assert.isTrue(isRecoveryModeBefore);

        //get currentICR
        const [defaulter_1ICR] = await troveManager.getCurrentICR(defaulter_1);
        assert.isTrue(defaulter_1ICR / parseUnits('1', 16) < 110n);

        //liquidate defaulter_1
        await liquidationOperations.liquidate(defaulter_1);

        const defaulter_1TroveStatusAfter = await troveManager.getTroveStatus(defaulter_1);
        assert.equal(
          defaulter_1TroveStatusAfter.toString(),
          TroveStatus.CLOSED_BY_LIQUIDATION_IN_RECOVERY_MODE.toString()
        );

        //check trove length
        const troveLengthAfter = await troveManager.getTroveOwnersCount();
        assert.equal(troveLengthAfter.toString(), '6');
      });

      it('with 100% < ICR < 110%: offsets as much debt as possible with the Stability Pool, then redistributes the remainder coll and debt', async () => {
        await openTrove({
          from: whale,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('30', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('200000') }],
        });
        await stabilityPoolManager
          .connect(whale)
          .provideStability([{ tokenAddress: STABLE, amount: parseUnits('100000') }]);

        await openTrove({
          from: alice,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('2', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('15000') }],
        });

        const bobColl = parseUnits('2', 9);

        await openTrove({
          from: bob,
          contracts,
          collToken: BTC,
          collAmount: bobColl,
          debts: [{ tokenAddress: STABLE, amount: parseUnits('17000') }],
        });

        //drop price
        await setPrice('BTC', '5000', contracts);

        // Confirm system is in Recovery Mode
        const [isRecoveryModeBefore] = await storagePool['checkRecoveryMode()']();
        assert.isTrue(isRecoveryModeBefore);

        //check carol ICR
        const [bobICR] = await troveManager.getCurrentICR(bob);
        assert.isTrue(bobICR / parseUnits('1', 16) < 110n);

        //get total Debt deposit in SP
        const totalDebtSPBefore = await stabilityPoolManager.getTotalDeposit(STABLE);
        assert.equal(totalDebtSPBefore, parseUnits('200000'));

        //liquidate carol
        await liquidationOperations.liquidate(carol);

        const whaleDeposit = await stabilityPoolManager.connect(whale).getCompoundedDeposits();
        const whaleCollGain = await stabilityPoolManager.getDepositorCollGains(whale, [BTC]);

        //get value
        const defaultPoolValue = await storagePool.getValue(BTC, true, 1);
        const gasCompValue = await storagePool.getValue(BTC, true, 2);

        //get total trove stakes
        const totalStakes = await getTroveStake(contracts, whale, BTC);

        assert.equal(totalStakes, 0n);
      });

      // Gives Panic Mode error
      it('with  110% < ICR < TCR, and StabilityPool debt > debt to liquidate: updates system snapshots', async () => {
        await openTrove({
          from: whale,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('2', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('5500') }],
        });

        await openTrove({
          from: alice,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('2', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('5500') }],
        });

        const bobColl = parseUnits('1', 9);

        await openTrove({
          from: bob,
          contracts,
          collToken: BTC,
          collAmount: bobColl,
          debts: [{ tokenAddress: STABLE, amount: parseUnits('4000') }],
        });

        const provideToSP = parseUnits('4021');

        // provide to SP by alice
        await stabilityPoolManager.connect(alice).provideStability([{ tokenAddress: STABLE, amount: provideToSP }]);

        //decrease price
        await setPrice('BTC', '4700', contracts);

        //carol ICR
        const [aliceICR] = await troveManager.getCurrentICR(alice);
        console.warn('☢️ ~ it ~ aliceICR:', aliceICR / parseUnits('1', 16));
        //get TCR
        const TCR = await getTCR(contracts);
        console.warn('☢️ ~ it ~ TCR:', TCR / parseUnits('1', 16));

        //check bob ICR
        const [bobICR] = await troveManager.getCurrentICR(bob);
        console.warn('☢️ ~ it ~ bobICR:', bobICR / parseUnits('1', 16));

        //check recovery mode
        const [isRecoveryModeBefore] = await storagePool['checkRecoveryMode()']();
        assert.isTrue(isRecoveryModeBefore);

        expect(bobICR / parseUnits('1', 16)).to.be.gt(110n);
        expect(bobICR / parseUnits('1', 16)).to.be.lt(150n);

        //get total trove stakes
        const bobTotalStakes = await getTroveStake(contracts, bob, BTC);

        //total stake snapshot
        const totalStakesSnapshot_Before = await troveManager.totalStakesSnapshot(BTC);
        assert.equal(totalStakesSnapshot_Before, 0n);

        //total collateral snapshot
        const totalCollateralSnapshot_Before = await troveManager.totalCollateralSnapshots(BTC);
        assert.equal(totalCollateralSnapshot_Before, 0n);

        //liquidate bob
        await liquidationOperations.liquidate(bob);
        expect(await troveManager.getTroveStatus(bob)).to.be.equal(TroveStatus.CLOSED_BY_LIQUIDATION_IN_RECOVERY_MODE);

        //get total coll
        const priceCache = await buildPriceCache(contracts);
        const totalCollateral = await storagePool.getEntireSystemColl(priceCache);

        // get amount from USD value
        const totalCollateralAmount = await priceFeed['getAmountFromUSDValue(address,uint256)'](BTC, totalCollateral);

        // Below code is not complete
        //get value
        const defaultPoolValue = await storagePool.getValue(BTC, true, 1);
        const gasCompValue = await storagePool.getValue(BTC, true, 2);

        //total stake snapshot after
        const totalStakesSnapshot_After = await troveManager.totalStakesSnapshot(BTC);
        assert.equal(totalStakesSnapshot_After, totalCollateralAmount - defaultPoolValue);

        //get total collateral snapshot
        const totalCollateralSnapshot_After = await troveManager.totalCollateralSnapshots(BTC);
        assert.equal(totalCollateralSnapshot_After, totalCollateralAmount);
      });

      /**
       * Goes into panic mode after liquidating a trove with ICR < 110% and StabilityPool debt > debt to liquidate
      it('with  110% < ICR < TCR, and StabilityPool debt > debt to liquidate: updates system snapshots', async () => {
          await openTrove({
              from: whale,
              contracts,
              collToken: BTC,
              collAmount: parseUnits('2', 9),
              debts: [
                  { tokenAddress: STABLE, amount: parseUnits('5500') },
              ],
          });

          await openTrove({
              from: alice,
              contracts,
              collToken: BTC,
              collAmount: parseUnits('2', 9),
              debts: [
                  { tokenAddress: STABLE, amount: parseUnits('5500') },
              ],
          });

          const bobColl = parseUnits('1', 9);

          await openTrove({
              from: bob,
              contracts,
              collToken: BTC,
              collAmount: bobColl,
              debts: [
                  { tokenAddress: STABLE, amount: parseUnits('4000') },
              ],
          });

          const provideToSP = parseUnits('5000');

          //provide to SP by alice
          await stabilityPoolManager
              .connect(alice)
              .provideStability([
                  { tokenAddress: STABLE, amount: provideToSP },
              ]);

          //decrease price
          await priceFeed.setTokenPrice(BTC, parseUnits('4700'));

          //check and log TCR
          const TCR = await getTCR(contracts);
          console.warn('☢️ ~ it ~ TCR:', TCR / parseUnits('1', 16));

          //check recovery mode
          const [isRecoveryModeBefore] =
              await storagePool['checkRecoveryMode()']();
          assert.isTrue(isRecoveryModeBefore);

          //check bob ICR
          const [bobICR] = await troveManager.getCurrentICR(bob);
          console.warn('☢️ ~ it ~ bobICR:', bobICR)
          expect(bobICR / parseUnits('1', 16)).to.be.gt(110n);
          expect(bobICR / parseUnits('1', 16)).to.be.lt(150n);

          //total stake snapshot
          const totalStakesSnapshot_Before =
              await troveManager.totalStakesSnapshot(BTC);
          assert.equal(totalStakesSnapshot_Before, 0n);

          //total collateral snapshot
          const totalCollateralSnapshot_Before =
              await troveManager.totalCollateralSnapshots(BTC);
          assert.equal(totalCollateralSnapshot_Before, 0n);

          //liquidate bob
          await liquidationOperations.connect(alice).liquidate(bob);
          expect(await troveManager.getTroveStatus(bob)).to.be.equal(
              TroveStatus.CLOSED_BY_LIQUIDATION_IN_RECOVERY_MODE
          );

          //get value
          const defaultPoolValue = await storagePool.getValue(
              BTC,
              true,
              1
          );

          //get total coll
          const priceCache = await buildPriceCache(contracts);
          const totalCollateral = await storagePool.getEntireSystemColl(priceCache);

          // get amount from USD value
          const totalCollateralAmount =
              await priceFeed['getAmountFromUSDValue(address,uint256)'](BTC, totalCollateral);

          //total stake snapshot after
          const totalStakesSnapshot_After =
              await troveManager.totalStakesSnapshot(BTC);
          assert.equal(
              totalStakesSnapshot_After,
              totalCollateralAmount - defaultPoolValue
          );

          //get total collateral snapshot
          const totalCollateralSnapshot_After =
              await troveManager.totalCollateralSnapshots(BTC);
          assert.equal(
              totalCollateralSnapshot_After,
              totalCollateralAmount
          );
      });

      it('with 110% < ICR < TCR, and StabilityPool debt > debt to liquidate: closes the Trove', async () => {
          await openTrove({
              from: whale,
              contracts,
              collToken: BTC,
              collAmount: parseUnits('2', 9),
              debts: [
                  { tokenAddress: STABLE, amount: parseUnits('5500') },
              ],
          });

          await openTrove({
              from: alice,
              contracts,
              collToken: BTC,
              collAmount: parseUnits('2', 9),
              debts: [
                  { tokenAddress: STABLE, amount: parseUnits('5500') },
              ],
          });

          const bobColl = parseUnits('1', 9);

          await openTrove({
              from: bob,
              contracts,
              collToken: BTC,
              collAmount: bobColl,
              debts: [
                  { tokenAddress: STABLE, amount: parseUnits('4000') },
              ],
          });

          const provideToSP = parseUnits('5000');

          //provide to SP by alice
          await stabilityPoolManager
              .connect(alice)
              .provideStability([
                  { tokenAddress: STABLE, amount: provideToSP },
              ]);

          const getSPDebt = await stabilityPoolManager.getTotalDeposit(STABLE);
          console.warn('☢️ ~ it ~ getSPDebt:', getSPDebt)
          assert.equal(getSPDebt, '5000', contracts);

          //decrease price
          await priceFeed.setTokenPrice(BTC, parseUnits('4700'));

          //check and log TCR
          const TCR = await getTCR(contracts);
          console.warn('☢️ ~ it ~ TCR:', TCR / parseUnits('1', 16));

          //check recovery mode
          const [isRecoveryModeBefore] =
              await storagePool['checkRecoveryMode()']();
          assert.isTrue(isRecoveryModeBefore);

          //check bob trove status
          const bobTroveStatusBefore = await troveManager.getTroveStatus(bob);
          assert.equal(bobTroveStatusBefore.toString(), TroveStatus.ACTIVE.toString());

          //check bob ICR
          const [bobICR] = await troveManager.getCurrentICR(bob);
          console.warn('☢️ ~ it ~ bobICR:', bobICR/parseUnits('1', 16));
          expect(bobICR / parseUnits('1', 16)).to.be.gt(110n);
          expect(bobICR / parseUnits('1', 16)).to.be.lt(150n);

          // return;

          //liquidate bob
          await liquidationOperations.liquidate(bob);
          expect(await troveManager.getTroveStatus(bob)).to.be.equal(
              TroveStatus.CLOSED_BY_LIQUIDATION_IN_RECOVERY_MODE
          );

      });
      */

      // Gives Panic Mode error
      it('with ICR > 110%, and StabilityPool debt < liquidated debt: Trove remains active', async () => {
        // await whaleShrimpTroveInit(contracts, signers, false);

        //open trove
        await openTrove({
          from: whale,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('2', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('5500') }],
        });

        //open trove
        await openTrove({
          from: alice,
          contracts,
          collToken: BTC,
          collAmount: parseUnits('2', 9),
          debts: [{ tokenAddress: STABLE, amount: parseUnits('5500') }],
        });

        //open trove
        const bobColl = parseUnits('1', 9);

        await openTrove({
          from: bob,
          contracts,
          collToken: BTC,
          collAmount: bobColl,
          debts: [{ tokenAddress: STABLE, amount: parseUnits('4000') }],
        });

        //provide to SP
        await stabilityPoolManager
          .connect(alice)
          .provideStability([{ tokenAddress: STABLE, amount: parseUnits('3000') }]);

        //decrease price
        await await setPrice('BTC', '4700', contracts);

        //get stable token price
        const stablePrice = await priceFeed.getPrice(STABLE);
        console.warn('☢️ ~ it ~ stablePrice:', stablePrice);

        //get TCR
        const TCR = await getTCR(contracts);
        console.warn('☢️ ~ it ~ TCR:', TCR / parseUnits('1', 16));

        //check recovery mode
        const [isRecoveryModeBefore] = await storagePool['checkRecoveryMode()']();
        assert.isTrue(isRecoveryModeBefore);

        //check bob ICR
        const [bobICR] = await troveManager.getCurrentICR(bob);
        console.warn('☢️ ~ it.only ~ bobICR ~:', bobICR / parseUnits('1', 16));
        expect(bobICR / parseUnits('1', 16)).to.be.gt(110n);
        expect(await troveManager.getTroveStatus(bob)).to.be.equal(TroveStatus.ACTIVE);
        expect(await sortedTroves.contains(bob)).to.be.equal(true);

        //liquidate bob
        // await liquidationOperations.liquidate(bob);
        await assertRevert(liquidationOperations.liquidate(bob));
        expect(await troveManager.getTroveStatus(bob)).to.be.equal(TroveStatus.ACTIVE);
        expect(await sortedTroves.contains(bob)).to.be.equal(true);
      });
    });

    describe('batchLiquidateTroves()', () => {
      it('Liquidates all troves with ICR < 110%, transitioning Normal -> Recovery Mode', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);

        //provide to SP
        await stabilityPoolManager
          .connect(alice)
          .provideStability([{ tokenAddress: STABLE, amount: parseUnits('1000') }]);

        //decrease price
        await await setPrice('BTC', '2800', contracts);

        //get TCR
        const TCR = await getTCR(contracts);
        assert.isTrue(TCR / parseUnits('1', 16) < 150n);

        //check recovery mode
        const [isRecoveryModeBefore] = await storagePool['checkRecoveryMode()']();
        assert.isTrue(isRecoveryModeBefore);

        //check ICR
        const [bobICR] = await troveManager.getCurrentICR(bob);
        expect(bobICR / parseUnits('1', 16)).to.be.lt(150n);

        const [defaulter_1ICR] = await troveManager.getCurrentICR(defaulter_1);
        expect(defaulter_1ICR / parseUnits('1', 16)).to.be.lt(150n);

        const [defaulter_2ICR] = await troveManager.getCurrentICR(defaulter_2);
        expect(defaulter_2ICR / parseUnits('1', 16)).to.be.lt(150n);

        const [carolICR] = await troveManager.getCurrentICR(carol);
        expect(carolICR / parseUnits('1', 16)).to.be.lt(150n);

        const [dennisICR] = await troveManager.getCurrentICR(dennis);
        expect(dennisICR / parseUnits('1', 16)).to.be.gt(150n);

        const [aliceICR] = await troveManager.getCurrentICR(alice);
        expect(aliceICR / parseUnits('1', 16)).to.be.gt(150n);

        //batchliquidate bob
        await liquidationOperations.batchLiquidateTroves([dennis, alice, defaulter_1, defaulter_2, bob, carol]);

        //get TCR
        const TCR_After = await getTCR(contracts);
        assert.isTrue(TCR_After / parseUnits('1', 16) > 150n);

        //check recovery mode
        const [isRecoveryModeAfter] = await storagePool['checkRecoveryMode()']();
        assert.isFalse(isRecoveryModeAfter);

        //check trove status
        expect(await troveManager.getTroveStatus(defaulter_1)).to.be.equal(
          TroveStatus.CLOSED_BY_LIQUIDATION_IN_RECOVERY_MODE
        );
        expect(await troveManager.getTroveStatus(defaulter_2)).to.be.equal(
          TroveStatus.CLOSED_BY_LIQUIDATION_IN_RECOVERY_MODE
        );
        expect(await troveManager.getTroveStatus(bob)).to.be.equal(TroveStatus.CLOSED_BY_LIQUIDATION_IN_RECOVERY_MODE);
        expect(await troveManager.getTroveStatus(carol)).to.be.equal(
          TroveStatus.CLOSED_BY_LIQUIDATION_IN_RECOVERY_MODE
        );
        expect(await troveManager.getTroveStatus(dennis)).to.be.equal(TroveStatus.ACTIVE);
        expect(await troveManager.getTroveStatus(alice)).to.be.equal(TroveStatus.ACTIVE);

        expect(await sortedTroves.contains(defaulter_1)).to.be.equal(false);
        expect(await sortedTroves.contains(defaulter_2)).to.be.equal(false);
        expect(await sortedTroves.contains(bob)).to.be.equal(false);
        expect(await sortedTroves.contains(carol)).to.be.equal(false);
        expect(await sortedTroves.contains(dennis)).to.be.equal(true);
        expect(await sortedTroves.contains(alice)).to.be.equal(true);
      });

      it('Liquidates all troves with ICR < 110%, transitioning Recovery -> Normal Mode', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);

        //provide to SP
        await stabilityPoolManager
          .connect(alice)
          .provideStability([{ tokenAddress: STABLE, amount: parseUnits('1000') }]);

        //decrease price
        await await setPrice('BTC', '2800', contracts);

        //get TCR
        const TCR = await getTCR(contracts);
        assert.isTrue(TCR / parseUnits('1', 16) < 150n);

        //check recovery mode
        const [isRecoveryModeBefore] = await storagePool['checkRecoveryMode()']();
        assert.isTrue(isRecoveryModeBefore);

        //check ICR
        const [bobICR] = await troveManager.getCurrentICR(bob);
        expect(bobICR / parseUnits('1', 16)).to.be.lt(150n);

        const [defaulter_1ICR] = await troveManager.getCurrentICR(defaulter_1);
        expect(defaulter_1ICR / parseUnits('1', 16)).to.be.lt(150n);

        const [defaulter_2ICR] = await troveManager.getCurrentICR(defaulter_2);
        expect(defaulter_2ICR / parseUnits('1', 16)).to.be.lt(150n);

        const [carolICR] = await troveManager.getCurrentICR(carol);
        expect(carolICR / parseUnits('1', 16)).to.be.lt(150n);

        const [dennisICR] = await troveManager.getCurrentICR(dennis);
        expect(dennisICR / parseUnits('1', 16)).to.be.gt(150n);

        const [aliceICR] = await troveManager.getCurrentICR(alice);
        expect(aliceICR / parseUnits('1', 16)).to.be.gt(150n);

        //batchliquidate bob
        await liquidationOperations.batchLiquidateTroves([defaulter_1, defaulter_2, bob, carol, dennis, alice]);

        //get TCR
        const TCR_After = await getTCR(contracts);
        assert.isTrue(TCR_After / parseUnits('1', 16) > 150n);

        //check recovery mode
        const [isRecoveryModeAfter] = await storagePool['checkRecoveryMode()']();
        assert.isFalse(isRecoveryModeAfter);

        //check trove status
        expect(await troveManager.getTroveStatus(defaulter_1)).to.be.equal(
          TroveStatus.CLOSED_BY_LIQUIDATION_IN_RECOVERY_MODE
        );
        expect(await troveManager.getTroveStatus(defaulter_2)).to.be.equal(
          TroveStatus.CLOSED_BY_LIQUIDATION_IN_RECOVERY_MODE
        );
        expect(await troveManager.getTroveStatus(bob)).to.be.equal(TroveStatus.CLOSED_BY_LIQUIDATION_IN_RECOVERY_MODE);
        expect(await troveManager.getTroveStatus(carol)).to.be.equal(
          TroveStatus.CLOSED_BY_LIQUIDATION_IN_RECOVERY_MODE
        );
        expect(await troveManager.getTroveStatus(dennis)).to.be.equal(TroveStatus.ACTIVE);
        expect(await troveManager.getTroveStatus(alice)).to.be.equal(TroveStatus.ACTIVE);

        expect(await sortedTroves.contains(defaulter_1)).to.be.equal(false);
        expect(await sortedTroves.contains(defaulter_2)).to.be.equal(false);
        expect(await sortedTroves.contains(bob)).to.be.equal(false);
        expect(await sortedTroves.contains(carol)).to.be.equal(false);
        expect(await sortedTroves.contains(dennis)).to.be.equal(true);
        expect(await sortedTroves.contains(alice)).to.be.equal(true);
      });

      it('Liquidates all troves with ICR < 110%, transitioning Normal -> Recovery Mode', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);

        //total debt
        const bobDebt = parseUnits('2000');
        const carolDebt = parseUnits('3000');
        const dennisDebt = parseUnits('300');
        const defaulter_1Debt = parseUnits('100');
        const defaulter_2Debt = parseUnits('100');

        //provide to SP
        const provideToSP = bobDebt + carolDebt + dennisDebt + defaulter_1Debt + defaulter_2Debt;

        await stabilityPoolManager.connect(alice).provideStability([{ tokenAddress: STABLE, amount: provideToSP }]);
      });

      it('with a non fullfilled liquidation: non liquidated trove remains in Trove Owners array', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);

        //provide to SP
        await stabilityPoolManager
          .connect(whale)
          .provideStability([{ tokenAddress: STABLE, amount: parseUnits('1000') }]);

        //decrease price
        await setPrice('BTC', '2800', contracts);

        //check recovery mode
        const [isRecoveryModeBefore] = await storagePool['checkRecoveryMode()']();
        assert.isTrue(isRecoveryModeBefore);

        //check ICR
        const [bobICR] = await troveManager.getCurrentICR(bob);
        console.warn('☢️ ~ it ~ bobICR:', bobICR);
        expect(bobICR / parseUnits('1', 16)).to.be.lt(150n);
        expect(bobICR / parseUnits('1', 16)).to.be.gt(110n);

        const [carolICR] = await troveManager.getCurrentICR(carol);
        console.warn('☢️ ~ it ~ carolICR:', carolICR);
        expect(carolICR / parseUnits('1', 16)).to.be.lt(150n);
        expect(bobICR / parseUnits('1', 16)).to.be.gt(110n);

        const [dennisICR] = await troveManager.getCurrentICR(dennis);
        console.warn('☢️ ~ it ~ dennisICR:', dennisICR);
        expect(dennisICR / parseUnits('1', 16)).to.be.gt(150n);

        await liquidationOperations.batchLiquidateTroves([bob, carol, dennis]);

        //get trove length
        const troveLength = await troveManager.getTroveOwnersCount();

        let addressFound = false;
        let addressIdx = 0;

        for (let i = 0; i < troveLength; i++) {
          const address = await troveManager.TroveOwners(i);
          if (address === carol.address) {
            addressFound = true;
            addressIdx = i;
          }
        }

        assert.isTrue(addressFound);

        const idxOnStruct = await troveManager.Troves(carol.address);
        console.warn('☢️ ~ it ~ idxOnStruct:', idxOnStruct);

        // assert.equal(addressIdx, idxOnStruct);
      });
    });
  });
});
