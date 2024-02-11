import { ethers } from 'hardhat';
import { MockDebtToken, MockERC20, PriceFeed, MockTroveManager, StoragePool, RedemptionOperations } from '../typechain';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import {
  buildPriceCache,
  getRedemptionMeta,
  MAX_BORROWING_FEE,
  openTrove,
  redeem,
  whaleShrimpTroveInit,
} from '../utils/testHelper';
import { assert, expect } from 'chai';
import { parseUnits, ZeroAddress } from 'ethers';
import apollonTesting from '../ignition/modules/apollonTesting';

describe('RedemptionOperations', () => {
  let signers: SignerWithAddress[];
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let defaulter_1: SignerWithAddress;
  let defaulter_2: SignerWithAddress;
  let erin: SignerWithAddress;

  let contracts: any;
  let priceFeed: PriceFeed;
  let troveManager: MockTroveManager;
  let redemptionOperations: RedemptionOperations;
  let storagePool: StoragePool;
  let STABLE: MockDebtToken;
  let BTC: MockERC20;

  before(async () => {
    signers = await ethers.getSigners();
    [, defaulter_1, defaulter_2, , , alice, bob, , , erin] = signers;
  });

  beforeEach(async () => {
    // @ts-ignore
    contracts = await ignition.deploy(apollonTesting);
    priceFeed = contracts.priceFeed;
    troveManager = contracts.troveManager;
    redemptionOperations = contracts.redemptionOperations;
    storagePool = contracts.storagePool;
    STABLE = contracts.STABLE;
    BTC = contracts.BTC;
  });

  describe('redeemCollateral()', () => {
    describe('working exmaples', () => {
      let bobStableBalanceBefore: bigint,
        btcStableBalanceBefore: bigint,
        defaulterTroveStableDebtBefore: bigint,
        defaulterTroveBTCBefore: bigint,
        defaulter2TroveStableDebtBefore: bigint,
        defaulter2TroveBTCBefore: bigint,
        toRedeem: bigint,
        redemptionMeta: any;

      beforeEach(async () => {
        await whaleShrimpTroveInit(contracts, signers, false);

        bobStableBalanceBefore = await STABLE.balanceOf(bob);
        btcStableBalanceBefore = await storagePool.getValue(BTC, true, 0);

        const priceCache = await buildPriceCache(contracts);
        defaulterTroveStableDebtBefore = await troveManager.getTroveRepayableDebt(
          priceCache,
          defaulter_1,
          STABLE,
          true
        );
        defaulterTroveBTCBefore = await troveManager.getTroveWithdrawableColl(defaulter_1, BTC);

        defaulter2TroveStableDebtBefore = await troveManager.getTroveRepayableDebt(
          priceCache,
          defaulter_2,
          STABLE,
          true
        );
        defaulter2TroveBTCBefore = await troveManager.getTroveWithdrawableColl(defaulter_2, BTC);
      });

      it('one partial', async () => {
        toRedeem = parseUnits('50');
      });

      it('one fully', async () => {
        toRedeem = parseUnits('100.5');
      });

      it('first fully, second partial', async () => {
        toRedeem = parseUnits('150');
      });

      it('two fully', async () => {
        toRedeem = parseUnits('201');
      });

      afterEach(async () => {
        redemptionMeta = await getRedemptionMeta(await redeem(bob, toRedeem, contracts), contracts);
        const priceCache = await buildPriceCache(contracts);

        const bobStableBalanceAfter = await STABLE.balanceOf(bob);
        expect(bobStableBalanceAfter).to.be.equal(bobStableBalanceBefore - toRedeem);

        const [, btcDrawn, , btcPayout] = redemptionMeta.totals[2].find((f: any) => f[0] === BTC.target);
        assert.equal(await BTC.balanceOf(bob), btcPayout);
        assert.isAtMost(
          (toRedeem * parseUnits('1', 9)) / (await priceFeed['getUSDValue(address,uint256)'](BTC, parseUnits('1', 9))) -
            btcDrawn,
          10n
        );

        // checking totals
        const btcStorageBalanceAfter = await storagePool.getValue(BTC, true, 0);
        assert.equal(btcStorageBalanceAfter, btcStableBalanceBefore - btcDrawn);

        // checking defaulter 1
        const [, stableDrawn, collDrawn] = redemptionMeta.redemptions.find((f: any) => f[0] === defaulter_1.address);
        const defaulterTroveStableDebtAfter = await troveManager.getTroveRepayableDebt(
          priceCache,
          defaulter_1,
          STABLE,
          true
        );
        expect(defaulterTroveStableDebtAfter).to.be.equal(defaulterTroveStableDebtBefore - stableDrawn);

        const defaulterTroveBTCAfter = await troveManager.getTroveWithdrawableColl(defaulter_1, BTC);
        expect(defaulterTroveBTCAfter).to.be.equal(
          defaulterTroveBTCBefore - collDrawn.find((f: any) => f[0] === BTC.target)[1]
        );

        // checking defaulter 2
        if (redemptionMeta.redemptions.length === 2) {
          const [, stableDrawn2, collDrawn2] = redemptionMeta.redemptions.find(
            (f: any) => f[0] === defaulter_2.address
          );
          const defaulter2TroveStableDebtAfter = await troveManager.getTroveRepayableDebt(
            priceCache,
            defaulter_2,
            STABLE,
            true
          );
          expect(defaulter2TroveStableDebtAfter).to.be.equal(defaulter2TroveStableDebtBefore - stableDrawn2);

          const defaulter2TroveBTCAfter = await troveManager.getTroveWithdrawableColl(defaulter_2, BTC);
          expect(defaulter2TroveBTCAfter).to.be.equal(
            defaulter2TroveBTCBefore - collDrawn2.find((f: any) => f[0] === BTC.target)[1]
          );
        }
      });
    });

    it('Should revert if stable coin amount is zero', async function () {
      await expect(redeem(alice, 0n, contracts)).to.be.revertedWithCustomError(redemptionOperations, 'ZeroAmount');
    });

    it('Should revert if max fee percentage is less than REDEMPTION_FEE_FLOOR', async function () {
      await expect(
        contracts.redemptionOperations.connect(alice).redeemCollateral(parseUnits('1'), [], 0.004e18)
      ).to.be.revertedWithCustomError(redemptionOperations, 'InvalidMaxFeePercent');
    });

    it('Should revert if stable coin amount exceeds debt balance', async function () {
      await expect(
        contracts.redemptionOperations.connect(alice).redeemCollateral(parseUnits('10000'), [], MAX_BORROWING_FEE)
      ).to.be.revertedWithCustomError(redemptionOperations, 'ExceedDebtBalance');
    });

    it('Should fail with invalid hint, non-existent trove', async function () {
      await whaleShrimpTroveInit(contracts, signers, false);

      await expect(
        contracts.redemptionOperations
          .connect(bob)
          .redeemCollateral(
            parseUnits('50'),
            [{ trove: ZeroAddress, lowerHint: ZeroAddress, upperHint: ZeroAddress, expectedCR: 0n }],
            MAX_BORROWING_FEE
          )
      ).to.be.revertedWithCustomError(redemptionOperations, 'HintUnknown');
    });

    it('Should fail with invalid hint, trove with stable', async function () {
      await whaleShrimpTroveInit(contracts, signers, false);

      await openTrove({
        from: erin,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('1', 9),
      });
      await expect(
        contracts.redemptionOperations
          .connect(bob)
          .redeemCollateral(
            parseUnits('50'),
            [{ trove: erin, lowerHint: ZeroAddress, upperHint: ZeroAddress, expectedCR: parseUnits('1') }],
            MAX_BORROWING_FEE
          )
      ).to.be.revertedWithCustomError(redemptionOperations, 'InvalidRedemptionHint');
    });

    it('Should fail with invalid hint, trove with higher CR', async function () {
      await whaleShrimpTroveInit(contracts, signers, false);

      const toRedeem = parseUnits('50');
      const simulatedRedemption = await contracts.redemptionOperations.calculateTroveRedemption(alice, toRedeem, true);
      await expect(
        contracts.redemptionOperations.connect(bob).redeemCollateral(
          toRedeem,
          [
            {
              trove: alice,
              lowerHint: ZeroAddress,
              upperHint: ZeroAddress,
              expectedCR: simulatedRedemption.resultingCR,
            },
          ],
          MAX_BORROWING_FEE
        )
      ).to.be.revertedWithCustomError(redemptionOperations, 'InvalidHintLowerCRExists');
    });
  });
});
