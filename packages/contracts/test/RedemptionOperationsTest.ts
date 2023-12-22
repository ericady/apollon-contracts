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
import { formatUnits, parseUnits } from 'ethers';

describe('RedemptionOperations', () => {
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

  describe('redeemCollateral()', () => {
    // it('from one open Trove', async () => {
    //   await whaleShrimpTroveInit(contracts, signers, false);

    //   const bobStableBalanceBefore = await STABLE.balanceOf(bob);
    //   const btcStableBalanceBefore = await storagePool.getValue(BTC, true, 0);

    //   const toRedeem = parseUnits('50');
    //   await redemptionOperations.connect(bob).redeemCollateral(toRedeem, parseUnits('0.01'), [defaulter_1]);

    //   const bobStableBalanceAfter = await STABLE.balanceOf(bob);
    //   expect(bobStableBalanceAfter).to.be.equal(bobStableBalanceBefore - toRedeem);

    //   const collTokenBalance = await BTC.balanceOf(bob);
    //   let expectedBTCPayout = toRedeem / (await priceFeed.getUSDValue(BTC, 1));
    //   expectedBTCPayout -= await redemptionOperations.getRedemptionFeeWithDecay(expectedBTCPayout);
    //   assert.equal(collTokenBalance, expectedBTCPayout);

    //   const btcStableBalanceAfter = await storagePool.getValue(BTC, true, 0);
    //   assert.equal(btcStableBalanceAfter, btcStableBalanceBefore - expectedBTCPayout);
    // });

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

    it('Should not touch Troves with ICR < 110%', async function () {
      console.log('STABLE Balance Before Trove: ', formatUnits(await STABLE.balanceOf(alice), 'ether'));

      const COLLATERAL_AMOUNT = '10000';
      const REDEMPTION_AMOUNT = '500';

      const { collateral: a_totalCollateral, debtInUSD: a_totalDebtInUsd } = await openTrove({
        from: alice,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('1', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits(COLLATERAL_AMOUNT) }],
      });

      console.log('STABLE Balance After Trove: ', formatUnits(await STABLE.balanceOf(alice), 'ether'));

      const { collateral: b_totalCollateral, debtInUSD: b_totalDebtInUsd } = await openTrove({
        from: bob,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('1.5', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits(COLLATERAL_AMOUNT) }],
      });

      console.log('Collateral Token Address [BTC]: ', await BTC.getAddress());
      console.log('Collateral Amount: ', parseUnits('1', 9));
      console.log();
      console.log('BTC Price: ', formatUnits(await priceFeed.getPrice(BTC), 'ether'));
      console.log(
        'Total Collateral Value in USD: ',
        formatUnits(await priceFeed.getUSDValue(BTC, parseUnits('1', 9)), 'ether')
      );
      console.log('STABLE Price: ', formatUnits(await priceFeed.getPrice(STABLE), 'ether'));
      console.log(
        'Total Debt Value in USD: ',
        formatUnits(await priceFeed.getUSDValue(STABLE, parseUnits(COLLATERAL_AMOUNT)), 'ether')
      );
      console.log();
      console.log('Total Trove Debt in USD: ', formatUnits(a_totalDebtInUsd, 'ether'));
      console.log('Total Collateral Amount:', a_totalCollateral);
      console.log();
      // console.log('getNominalICR(): ', (await troveManager.getNominalICR(alice)) / BigInt(1e16));

      console.log();
      console.log('Trove Collateral: ', await troveManager.getTroveColl(alice));
      console.log('Trove Debt: ', await troveManager.getTroveDebt(alice));

      await STABLE.unprotectedMint(bob, parseUnits(COLLATERAL_AMOUNT));

      await STABLE.connect(bob).approve(await redemptionOperations.getAddress(), parseUnits(COLLATERAL_AMOUNT));

      // console.log(await storagePool.checkRecoveryMode());
      console.log('Alice ICR: ', (await troveManager.getCurrentICR(alice))[0] / BigInt(1e16));
      // console.log('Bob ICR: ', (await troveManager.getCurrentICR(bob))[0] / BigInt(1e16));

      const bobBalanceBefore = await BTC.balanceOf(bob);

      console.log('BTC Balance Before: ', formatUnits(bobBalanceBefore, 'gwei'));

      const baseRate = await troveManager.getBaseRate();
      console.log('🔥 ~ file: RedemptionOperationsTest.ts:157 ~ baseRate:', baseRate);

      const REDEMPTION_FEE = await troveManager.REDEMPTION_FEE_FLOOR();
      console.log('🔥 ~ file: RedemptionOperationsTest.ts:159 ~ REDEMPTION_FEE:', REDEMPTION_FEE);

      const DECIMAL_PRECISION = 1e18;
      console.log('🔥 ~ file: RedemptionOperationsTest.ts:163 ~ DECIMAL_PRECISION:', DECIMAL_PRECISION);

      const comparision = `min( ${REDEMPTION_FEE + baseRate} | ${DECIMAL_PRECISION} )`;
      console.log('🔥 ~ file: RedemptionOperationsTest.ts:167 ~ comparision:', comparision);

      /* EXPERIMENTAL */

      const redemptionAmountInUSD = await priceFeed.getUSDValue(STABLE, REDEMPTION_AMOUNT);
      console.log(
        '🔥 ~ file: RedemptionOperationsTest.ts:171 ~ redemptionAmountInUSD:',
        parseUnits(redemptionAmountInUSD.toString(), 'ether')
      );

      // _redeemCollateralFromTrove
      const COLL_TOKEN_AMOUNT = await priceFeed.getAmountFromUSDValue(
        BTC,
        parseUnits(redemptionAmountInUSD.toString(), 'ether')
      );
      console.log('🔥 ~ file: RedemptionOperationsTest.ts:174 ~ COLL_TOKEN_AMOUNT:', COLL_TOKEN_AMOUNT);

      // _calcRedemptionFee
      const redemptionFee = (BigInt(REDEMPTION_FEE + baseRate) * BigInt(COLL_TOKEN_AMOUNT)) / BigInt(DECIMAL_PRECISION);
      console.log('🔥 ~ file: RedemptionOperationsTest.ts:169 ~ redemptionFee:', redemptionFee);

      // 2 * 1e18 / REDEMPTION_AMOUNT

      const userAcceptanceFee = (redemptionFee * BigInt(DECIMAL_PRECISION)) / BigInt(COLL_TOKEN_AMOUNT);
      console.log('🔥 ~ file: RedemptionOperationsTest.ts:174 ~ userAcceptanceFee:', userAcceptanceFee);

      console.log('Given Fee:    ', REDEMPTION_FEE);
      console.log('Expected Fee: ', userAcceptanceFee);

      /* EXPERIMENTAL */

      const tx = await redemptionOperations
        .connect(bob)
        .redeemCollateral(parseUnits(REDEMPTION_AMOUNT), REDEMPTION_FEE, [alice]);
      const mined = await tx.wait();

      const bobBalanceAfter = await BTC.balanceOf(bob);

      console.log('BTC Balance After: ', formatUnits(bobBalanceAfter, 'gwei'));

      const balanceDifference = bobBalanceAfter - bobBalanceBefore;

      console.log('Balance Difference: ', formatUnits(balanceDifference, 'gwei'));

      console.log(
        'USD Value of the difference: ',
        formatUnits(await priceFeed.getUSDValue(BTC, balanceDifference), 'ether')
      );

      // console.log('BTC Value in USD BEFORE: ', (await priceFeed.getUSDValue(BTC, parseUnits('1', 9))) / BigInt(1e18));
      // await priceFeed.setTokenPrice(BTC, parseUnits('210000'));
      // console.log('BTC Value in USD AFTER: ', (await priceFeed.getUSDValue(BTC, parseUnits('1', 9))) / BigInt(1e18));

      //   console.log(mined);
      console.log('Alice ICR AFTER: ', (await troveManager.getCurrentICR(alice))[0] / BigInt(1e16));
      // console.log((await troveManager.getCurrentICR(bob))[0] / BigInt(1e16));
    });

    it('Should revert if stable coin amount is zero', async function () {
      const stableCoinAmount = parseUnits('10');
      const maxFeePercentage = parseUnits('0.05');
      await expect(
        redemptionOperations.connect(owner).redeemCollateral(0, maxFeePercentage, [alice])
      ).to.be.revertedWithCustomError(redemptionOperations, 'ZeroAmount');
    });

    it('Should revert if max fee percentage is less than REDEMPTION_FEE_FLOOR', async function () {
      const lowMaxFeePercentage = parseUnits('0.01');
      const stableCoinAmount = parseUnits('1');
      const sourceTroves = [alice];

      await expect(
        redemptionOperations.connect(owner).redeemCollateral(stableCoinAmount, lowMaxFeePercentage, sourceTroves)
      ).to.be.revertedWithCustomError(redemptionOperations, 'InvalidMaxFeePercent');
    });

    it('Should revert if stable coin amount exceeds debt balance', async function () {
      const maxFeePercentage = parseUnits('0.05');
      const highStableCoinAmount = parseUnits('1000');
      const sourceTroves = [alice];

      await expect(
        redemptionOperations.connect(owner).redeemCollateral(highStableCoinAmount, maxFeePercentage, sourceTroves)
      ).to.be.revertedWithCustomError(redemptionOperations, 'ExceedDebtBalance');
    });
  });
});
