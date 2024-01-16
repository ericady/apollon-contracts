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
      const COLLATERAL_AMOUNT = '10000';
      const REDEMPTION_AMOUNT = '500';

      const { collateral: a_totalCollateral, debtInUSD: a_totalDebtInUsd } = await openTrove({
        from: alice,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('1', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits(COLLATERAL_AMOUNT) }],
      });

      const { collateral: b_totalCollateral, debtInUSD: b_totalDebtInUsd } = await openTrove({
        from: bob,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('1.5', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits(COLLATERAL_AMOUNT) }],
      });

      await STABLE.unprotectedMint(bob, parseUnits(COLLATERAL_AMOUNT));

      await STABLE.connect(bob).approve(await redemptionOperations.getAddress(), parseUnits(COLLATERAL_AMOUNT));

      const bobBalanceBefore = await BTC.balanceOf(bob);

      const baseRate = await troveManager.getBaseRate();

      const REDEMPTION_FEE = await troveManager.REDEMPTION_FEE_FLOOR();

      const DECIMAL_PRECISION = 1e18;

      /* EXPERIMENTAL */

      const redemptionAmountInUSD = await priceFeed.getUSDValue(STABLE, REDEMPTION_AMOUNT);

      // _redeemCollateralFromTrove
      const COLL_TOKEN_AMOUNT = await priceFeed.getAmountFromUSDValue(
        BTC,
        parseUnits(redemptionAmountInUSD.toString(), 'ether')
      );

      // _calcRedemptionFee
      const redemptionFee = (BigInt(REDEMPTION_FEE + baseRate) * BigInt(COLL_TOKEN_AMOUNT)) / BigInt(DECIMAL_PRECISION);

      // 2 * 1e18 / REDEMPTION_AMOUNT

      const userAcceptanceFee = (redemptionFee * BigInt(DECIMAL_PRECISION)) / BigInt(COLL_TOKEN_AMOUNT);

      /* EXPERIMENTAL */

      const tx = await redemptionOperations
        .connect(bob)
        .redeemCollateral(parseUnits(REDEMPTION_AMOUNT), REDEMPTION_FEE, [alice]);
      const mined = await tx.wait();

      const bobBalanceAfter = await BTC.balanceOf(bob);

      const balanceDifference = bobBalanceAfter - bobBalanceBefore;

      console.log(
        'USD Value of the difference: ',
        formatUnits(await priceFeed.getUSDValue(BTC, balanceDifference), 'ether')
      );
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
