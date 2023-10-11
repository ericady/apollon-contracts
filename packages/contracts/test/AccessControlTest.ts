import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  BorrowerOperations,
  MockDebtToken,
  MockERC20,
  MockPriceFeed,
  StabilityPoolManager,
  StoragePool,
  TroveManager,
} from '../typechain';

describe('Access Control: Apollon functions with the caller restricted to Apollon contract(s)', () => {
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carol: SignerWithAddress;

  let troveManager: TroveManager;
  let storagePool: StoragePool;
  let stabilityPoolManager: StabilityPoolManager;
  let borrowerOperations: BorrowerOperations;
  let priceFeed: MockPriceFeed;

  let BTC: MockERC20;
  let stableDebt: MockDebtToken;

  before(async () => {
    [owner, alice, bob, carol] = await ethers.getSigners();

    const borrowerOperationsFactory = await ethers.getContractFactory('BorrowerOperations');
    borrowerOperations = await borrowerOperationsFactory.deploy();

    const troveManagerFactory = await ethers.getContractFactory('TroveManager');
    troveManager = await troveManagerFactory.deploy();

    const stabilityPoolManagerFactory = await ethers.getContractFactory('StabilityPoolManager');
    stabilityPoolManager = await stabilityPoolManagerFactory.deploy();

    const storagePoolFactory = await ethers.getContractFactory('StoragePool');
    storagePool = await storagePoolFactory.deploy();

    const priceFeedFactory = await ethers.getContractFactory('MockPriceFeed');
    priceFeed = await priceFeedFactory.deploy();

    const mockTokenFactory = await ethers.getContractFactory('MockERC20');
    BTC = await mockTokenFactory.deploy('Bitcoin', 'BTC');

    const mockDebtTokenFactory = await ethers.getContractFactory('MockDebtToken');
    stableDebt = await mockDebtTokenFactory.deploy(
      troveManager,
      borrowerOperations,
      stabilityPoolManager,
      priceFeed,
      'STABLE',
      'STABLE',
      '1',
      true
    );
  });

  describe('TroveManager', () => {
    // applyPendingRewards
    it('applyPendingRewards(): reverts when called by an account that is not BorrowerOperations', async () => {
      await expect(troveManager.applyPendingRewards(bob)).to.be.revertedWithCustomError(
        troveManager,
        'NotFromBorrowerOps'
      );
    });

    // updateRewardSnapshots
    it('updateRewardSnapshots(): reverts when called by an account that is not BorrowerOperations', async () => {
      await expect(troveManager.updateTroveRewardSnapshots([], bob)).to.be.revertedWithCustomError(
        troveManager,
        'NotFromBorrowerOps'
      );
    });

    // removeStake
    it('removeStake(): reverts when called by an account that is not BorrowerOperations', async () => {
      await expect(troveManager.removeStake([], bob)).to.be.revertedWithCustomError(troveManager, 'NotFromBorrowerOps');
    });

    // updateStakeAndTotalStakes
    it('updateStakeAndTotalStakes(): reverts when called by an account that is not BorrowerOperations', async () => {
      await expect(troveManager.updateStakeAndTotalStakes([], bob)).to.be.revertedWithCustomError(
        troveManager,
        'NotFromBorrowerOps'
      );
    });

    // closeTrove
    it('closeTrove(): reverts when called by an account that is not BorrowerOperations', async () => {
      await expect(troveManager.closeTrove([], bob)).to.be.revertedWithCustomError(troveManager, 'NotFromBorrowerOps');
    });

    // addTroveOwnerToArray
    it('addTroveOwnerToArray(): reverts when called by an account that is not BorrowerOperations', async () => {
      await expect(troveManager.addTroveOwnerToArray(bob)).to.be.revertedWithCustomError(
        troveManager,
        'NotFromBorrowerOps'
      );
    });

    // setTroveStatus
    it('setTroveStatus(): reverts when called by an account that is not BorrowerOperations', async () => {
      await expect(troveManager.setTroveStatus(bob, 1)).to.be.revertedWithCustomError(
        troveManager,
        'NotFromBorrowerOps'
      );
    });

    // increaseTroveColl
    it('increaseTroveColl(): reverts when called by an account that is not BorrowerOperations', async () => {
      await expect(troveManager.increaseTroveColl(bob, [])).to.be.revertedWithCustomError(
        troveManager,
        'NotFromBorrowerOps'
      );
    });

    // decreaseTroveColl
    it('decreaseTroveColl(): reverts when called by an account that is not BorrowerOperations', async () => {
      await expect(troveManager.decreaseTroveColl(bob, [])).to.be.revertedWithCustomError(
        troveManager,
        'NotFromBorrowerOps'
      );
    });

    // increaseTroveDebt
    it('increaseTroveDebt(): reverts when called by an account that is not BorrowerOperations', async () => {
      await expect(troveManager.increaseTroveDebt(bob, [])).to.be.revertedWithCustomError(
        troveManager,
        'NotFromBorrowerOps'
      );
    });

    // decreaseTroveDebt
    it('decreaseTroveDebt(): reverts when called by an account that is not BorrowerOperations', async () => {
      await expect(troveManager.decreaseTroveDebt(bob, [])).to.be.revertedWithCustomError(
        troveManager,
        'NotFromBorrowerOps'
      );
    });
  });

  describe('StoragePool', () => {
    // withdrawalValue
    it('withdrawalValue(): reverts when called by an account that is not BO nor TroveM nor SP', async () => {
      await expect(storagePool.withdrawalValue(alice, BTC, true, 0, 100)).to.be.revertedWithCustomError(
        storagePool,
        'NotFromBOorTroveMorSP'
      );
    });

    // addValue
    it('addValue(): reverts when called by an account that is not BO nor TroveM', async () => {
      await expect(storagePool.addValue(BTC, true, 0, 100)).to.be.revertedWithCustomError(
        storagePool,
        'NotFromBOorTroveMorSP'
      );
    });

    // subtractValue
    it('subtractValue(): reverts when called by an account that is not BO nor TroveM nor SP', async () => {
      await expect(storagePool.subtractValue(BTC, true, 0, 100)).to.be.revertedWithCustomError(
        storagePool,
        'NotFromBOorTroveMorSP'
      );
    });

    // fallback (payment)
    it('fallback(): reverts when called by an account that is not Borrower Operations nor Default Pool', async () => {
      await expect(
        alice.sendTransaction({
          to: storagePool,
          value: 100n,
        })
      ).to.be.revertedWithoutReason();
    });
  });

  describe('StabilityPoolManager', () => {
    before(async () => {});
    // --- onlyTroveManager ---

    // offset
    it('offset(): reverts when called by an account that is not TroveManager', async () => {
      await expect(stabilityPoolManager.offset([])).to.be.revertedWithCustomError(
        stabilityPoolManager,
        'NotFromTroveManager'
      );
    });

    // --- onlyActivePool ---

    // fallback (payment)
    it('fallback(): reverts when called by an account that is not the Active Pool', async () => {
      await expect(
        alice.sendTransaction({
          to: stabilityPoolManager,
          value: 100n,
        })
      ).to.be.revertedWithoutReason();
    });
  });

  describe('DebtToken', () => {
    //    mint
    it('mint(): reverts when called by an account that is not BorrowerOperations', async () => {
      await expect(stableDebt.mint(bob, 100)).to.be.revertedWithCustomError(stableDebt, 'NotFromBorrowerOps');
    });

    // burn
    it('burn(): reverts when called by an account that is not BO nor TroveM nor SP', async () => {
      await expect(stableDebt.burn(bob, 100)).to.be.revertedWithCustomError(stableDebt, 'NotFromBOorTroveMorSP');
    });

    // sendToPool
    // TODO:
    // it('sendToPool(): reverts when called by an account that is not StabilityPool', async () => {
    //   // Attempt call from alice
    //   try {
    //     const txAlice = await coreContracts.debtToken.STABLE.sendToPool(bob, activePool.address, 100, { from: alice });
    //   } catch (err) {
    //     assert.include(err.message, 'revert');
    //     assert.include(err.message, 'Caller is not the StabilityPool');
    //   }
    // });

    // returnFromPool
    it('returnFromPool(): reverts when called by an account that is not TroveManager nor StabilityPool', async () => {
      await expect(stableDebt.returnFromPool(storagePool, bob, 100)).to.be.revertedWithCustomError(
        stableDebt,
        'NotFromTroveMorSP'
      );
    });
  });
});
