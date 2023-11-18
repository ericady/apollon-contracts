import { ethers } from 'hardhat';
import {
  MockDebtToken,
  MockERC20,
  MockPriceFeed,
  MockTroveManager,
  StabilityPoolManager,
  StoragePool,
  BorrowerOperationsTester,
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

  let borrowerOperations: BorrowerOperationsTester;
  let stabilityPoolManager: StabilityPoolManager;
  let redemptionOperations: RedemptionOperations;
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
    borrowerOperations = contracts.borrowerOperations;
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
        await troveManager.liquidate(defaulter_1);

        const trove = await troveManager.getTroveStatus(defaulter_1);
        assert.equal(trove, 3n); // closedByLiquidation

        const troveStake = await troveManager.getTroveStake(defaulter_1);
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
        await troveManager.liquidate(defaulter_1);

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
        await troveManager.liquidate(defaulter_1);

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
        await troveManager.liquidate(defaulter_1);

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
        await troveManager.liquidate(defaulter_1);

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
        await troveManager.liquidate(defaulter_1);

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

      // todo wrong outpouts
      it.skip('updates the L_coll reward-per-unit-staked totals', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);
        await priceFeed.setTokenPrice(BTC, parseUnits('5000'));

        const [isRecoveryMode] = await storagePool.checkRecoveryMode();
        assert.isFalse(isRecoveryMode);

        // 1. liquidation
        await troveManager.liquidate(defaulter_1);

        // defaulters coll and debt should be added to the DefaultPool.
        const L_BTC_A = await troveManager.getLiquidatedTokens(BTC, true);
        const L_STABLE_A = await troveManager.getLiquidatedTokens(STABLE, false);

        const remainingActiveBTC = parseUnits('5.02', 9);
        const totalStake = await priceFeed.getUSDValue(BTC, remainingActiveBTC);
        console.log(totalStake);
        const defaulterBTC = parseUnits('0.02', 9);
        const defaulterBTCWithoutFee = defaulterBTC - (await troveManager.getCollGasCompensation(defaulterBTC));
        console.log(await priceFeed.getUSDValue(BTC, defaulterBTCWithoutFee));
        expect(L_BTC_A).to.be.equal(
          ((await priceFeed.getUSDValue(BTC, defaulterBTCWithoutFee)) * parseUnits('1')) / totalStake
        );
        expect(L_STABLE_A).to.be.equal((parseUnits('100.5') * parseUnits('1', 18)) / parseUnits('5.02', 9));

        // 2. liquidation
        await troveManager.liquidate(defaulter_2);

        /* Alice now has all the active stake. totalStakes in the system is now 10 ether.

       Bob's pending collateral reward and debt reward are applied to his Trove
       before his liquidation.
       His total collateral*0.995 and debt are then added to the DefaultPool.

       The system rewards-per-unit-staked should now be:

       L_ETH = (0.995 / 20) + (10.4975*0.995  / 10) = 1.09425125 ETH
       L_LUSDDebt = (180 / 20) + (890 / 10) = 98 LUSD */
        const L_BTC_B = await troveManager.getLiquidatedTokens(BTC, true);
        const L_STABLE_B = await troveManager.getLiquidatedTokens(STABLE, false);

        const L_ETH_expected_2 = L_ETH_expected_1.add(
          th
            .applyLiquidationFee(B_collateral.add(B_collateral.mul(L_ETH_expected_1).div(mv._1e18BN)))
            .mul(mv._1e18BN)
            .div(A_collateral)
        );
        const L_LUSDDebt_expected_2 = L_LUSDDebt_expected_1.add(
          B_totalDebt.add(B_increasedTotalDebt)
            .add(B_collateral.mul(L_LUSDDebt_expected_1).div(mv._1e18BN))
            .mul(mv._1e18BN)
            .div(A_collateral)
        );
        assert.isAtMost(th.getDifference(L_ETH_AfterBobLiquidated, L_ETH_expected_2), 100);
        assert.isAtMost(th.getDifference(L_LUSDDebt_AfterBobLiquidated, L_LUSDDebt_expected_2), 100);
      });

      it('reverts if trove is non-existent', async () => {
        const tx = troveManager.liquidate(alice);
        await assertRevert(tx, 'InvalidTrove');
      });

      it('reverts if trove is already closedByLiquidation', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);
        await priceFeed.setTokenPrice(BTC, parseUnits('5000'));
        await troveManager.liquidate(defaulter_1);

        await assertRevert(troveManager.liquidate(defaulter_1), 'InvalidTrove');
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
        await assertRevert(troveManager.liquidate(defaulter_3), 'InvalidTrove');
      });

      it('does nothing if trove has >= 110% ICR', async () => {
        await whaleShrimpTroveInit(contracts, signers, false);
        await assertRevert(troveManager.liquidate(alice), 'NoLiquidatableTrove');
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
        await troveManager.liquidate(defaulter_1);

        const stabilityPool = await getStabilityPool(contracts, STABLE);
        const spGainBefore = await stabilityPool.getDepositorCollGain(erin, BTC);

        await assertRevert(troveManager.liquidate(erin), 'InvalidTrove');

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
        await troveManager.liquidate(defaulter_1);

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
        await troveManager.liquidate(defaulter_1);

        const [aliceICRAfter] = await troveManager.getCurrentICR(alice);
        const [d2ICRAfter] = await troveManager.getCurrentICR(defaulter_2);

        // gets a little bit higher/better because the 200 stable gas comp gets removed as debt from the defaulter, which results in a >110% ICR of the trove even after liquidation
        expect(aliceICRAfter).to.be.gt(aliceICRBefore);
        expect(d2ICRAfter).to.be.gt(d2ICRBefore);

        // defaulter gets liquidated
        await troveManager.liquidate(defaulter_2);

        const [aliceICRAfter2] = await troveManager.getCurrentICR(alice);
        expect(aliceICRAfter2).to.be.gt(aliceICRAfter);
      });

      // TODO: This is a StabilityPool test not a TroveManager test. If it still can be tested do it there.
      it.skip('liquidate(): when SP > 0, triggers LQTY reward event - increases the sum G', async () => {});
      it.skip("liquidate(): when SP is empty, doesn't update G", async () => {});
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
  });
});
