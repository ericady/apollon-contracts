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
} from '../typechain';
import { Contracts, deployCore, connectCoreContracts, deployAndLinkToken } from '../utils/deploymentHelpers';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { assertRevert, getStabilityPool, openTrove, whaleShrimpTroveInit } from '../utils/testHelper';
import { assert, expect } from 'chai';
import { parseUnits } from 'ethers';

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
  let troveManager: MockTroveManager;

  let stabilityPoolManager: StabilityPoolManager;
  let redemptionOperations: RedemptionOperations;
  let liquidationOperations: LiquidationOperations;
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
    redemptionOperations = contracts.redemptionOperations;
    liquidationOperations = contracts.liquidationOperations;
    storagePool = contracts.storagePool;
    stabilityPoolManager = contracts.stabilityPoolManager;

    STABLE = contracts.debtToken.STABLE;
    STOCK = contracts.debtToken.STOCK;
    BTC = contracts.collToken.BTC;
    USDT = contracts.collToken.USDT;

    redemptionFee = await redemptionOperations.getRedemptionRate();
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
      it.skip('liquidate(): Given the same price and no other trove changes, complete Pool offsets restore the TCR to its value prior to the defaulters opening troves', async () => {});
      it.skip('liquidate(): Pool offsets increase the TCR', async () => {});
      it.skip('liquidate(): a pure redistribution reduces the TCR only as a result of compensation', async () => {});

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

      // todo
      it.skip("liquidates a SP depositor's trove with ICR < 110%, and the liquidation correctly impacts their SP deposit and ETH gain", async () => {});

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
      const borrowerOperationsAddress = await borrowerOperations.getAddress();
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

      await expect(borrowerOperations.connect(bob).addColl([{ tokenAddress: BTC, amount: collAmountToAdd }]))
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
});
