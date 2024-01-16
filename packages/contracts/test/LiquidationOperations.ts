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
import { TroveStatus, assertRevert, getStabilityPool, openTrove, whaleShrimpTroveInit } from '../utils/testHelper';
import { assert, expect } from 'chai';
import { formatUnits, parseUnits } from 'ethers';

describe('LiquidationOperations', () => {
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

  describe('batchLiquidateTroves()', () => {
    it('should revert if no troves are passed', async () => {
      await whaleShrimpTroveInit(contracts, signers, false);

      await expect(liquidationOperations.batchLiquidateTroves([])).to.be.revertedWithCustomError(
        liquidationOperations,
        'EmptyArray'
      );
    });

    it('closes every trove with ICR < MCR in the given array', async () => {
      await whaleShrimpTroveInit(contracts, signers, false);

      const [isRecoveryMode] = await storagePool.checkRecoveryMode();
      assert.isFalse(isRecoveryMode);

      await priceFeed.setTokenPrice(STABLE, parseUnits('500000000000000000000'));

      const ICR = await troveManager.getCurrentICR(bob.address);
      console.log('ICR', ICR);

      const trove1Before = await STABLE.balanceOf(bob.address);
      const trove2Before = await STABLE.balanceOf(alice.address);
      const trove3Before = await STABLE.balanceOf(defaulter_1.address);

      console.log('Trove ========= ', trove1Before, trove2Before, trove3Before);

      await liquidationOperations.batchLiquidateTroves([bob, alice, defaulter_1]);

      const trove1After = await STABLE.balanceOf(bob);
      const trove2After = await STABLE.balanceOf(alice);
      const trove3After = await STABLE.balanceOf(defaulter_1);

      console.log('Trove', trove1After, trove2After, trove3After);
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

      await priceFeed.setTokenPrice(STABLE, parseUnits('5'));

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
  });
});
