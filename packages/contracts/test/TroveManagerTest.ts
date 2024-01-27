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
  BorrowerOperations,
} from '../typechain';
import { Contracts, deployCore, connectCoreContracts, deployAndLinkToken } from '../utils/deploymentHelpers';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { openTrove, whaleShrimpTroveInit, getTCR, TroveStatus, addColl, repayDebt, redeem } from '../utils/testHelper';
import { assert, expect } from 'chai';
import { parseUnits } from 'ethers';

describe('TroveManager', () => {
  let signers: SignerWithAddress[];
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let whale: SignerWithAddress;
  let carol: SignerWithAddress;
  let dennis: SignerWithAddress;

  let defaulter_1: SignerWithAddress;
  let defaulter_3: SignerWithAddress;

  let storagePool: StoragePool;

  let STABLE: MockDebtToken;
  let BTC: MockERC20;

  let priceFeed: MockPriceFeed;
  let troveManager: MockTroveManager;

  let stabilityPoolManager: StabilityPoolManager;
  let redemptionOperations: RedemptionOperations;
  let liquidationOperations: LiquidationOperations;
  let contracts: Contracts;
  let borrowerOperations: BorrowerOperations;

  before(async () => {
    signers = await ethers.getSigners();
    [, defaulter_1, , defaulter_3, whale, alice, bob, carol, dennis] = signers;
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
    BTC = contracts.collToken.BTC;
  });

  describe('redeemCollateral()', () => {
    it('from one open Trove', async () => {
      await whaleShrimpTroveInit(contracts, signers, false);
      console.log('after setup');

      const bobStableBalanceBefore = await STABLE.balanceOf(bob);
      const btcStableBalanceBefore = await storagePool.getValue(BTC, true, 0);

      const toRedeem = parseUnits('50');

      console.log('redeeming....');
      await redeem(bob, toRedeem, contracts);
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

      await expect(addColl(bob, contracts, [{ tokenAddress: BTC, amount: collAmountToAdd }]))
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
      await repayDebt(bob, contracts, [{ tokenAddress: STABLE, amount: parseUnits('1000') }]);

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
