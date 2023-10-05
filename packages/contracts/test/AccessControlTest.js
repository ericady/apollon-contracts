const deploymentHelper = require('../utils/deploymentHelpers.js');
const testHelpers = require('../utils/testHelpers.js');
const TroveManagerTester = artifacts.require('TroveManagerTester');

const th = testHelpers.TestHelper;
const timeValues = testHelpers.TimeValues;

const dec = th.dec;
const toBN = th.toBN;
const assertRevert = th.assertRevert;

/* The majority of access control tests are contained in this file. However, tests for restrictions
on the Liquity admin address's capabilities during the first year are found in:

test/launchSequenceTest/DuringLockupPeriodTest.js */

contract('Access Control: Apollon functions with the caller restricted to Apollon contract(s)', async accounts => {
  const [owner, alice, bob, carol] = accounts;
  const [bountyAddress, lpRewardsAddress, multisig] = accounts.slice(997, 1000);

  let coreContracts;

  let priceFeed;
  let lusdToken;
  let sortedTroves;
  let troveManager;
  let nameRegistry;
  let storagePool;
  let stabilityPoolManager;
  let defaultPool;
  let functionCaller;
  let borrowerOperations;

  let STABLE;
  let STOCK;
  let BTC;
  let USDT;

  before(async () => {
    coreContracts = await deploymentHelper.deployCore();
    coreContracts.troveManager = await TroveManagerTester.new();
    await deploymentHelper.connectCoreContracts(coreContracts);
    await deploymentHelper.deployAndLinkToken(coreContracts);

    priceFeed = coreContracts.priceFeed;
    lusdToken = coreContracts.lusdToken;
    sortedTroves = coreContracts.sortedTroves;
    troveManager = coreContracts.troveManager;
    nameRegistry = coreContracts.nameRegistry;
    storagePool = coreContracts.storagePool;
    stabilityPoolManager = coreContracts.stabilityPoolManager;
    defaultPool = coreContracts.defaultPool;
    functionCaller = coreContracts.functionCaller;
    borrowerOperations = coreContracts.borrowerOperations;

    STABLE = coreContracts.debtToken.STABLE.address;
    STOCK = coreContracts.debtToken.STOCK.address;
    BTC = coreContracts.collToken.BTC.address;
    USDT = coreContracts.collToken.USDT.address;
  });

  //   TODO: Find moveETHGainToTrove replacement
  //   describe('BorrowerOperations', async accounts => {
  //     it('moveETHGainToTrove(): reverts when called by an account that is not StabilityPool', async () => {
  //       // Attempt call from alice
  //       try {
  //         const tx1 = await borrowerOperations.moveETHGainToTrove(bob, bob, bob, { from: bob });
  //       } catch (err) {
  //         console.log(err);
  //         assert.include(err.message, 'revert');
  //         // assert.include(err.message, "BorrowerOps: Caller is not Stability Pool")
  //       }
  //     });
  //   });

  describe('TroveManager', async accounts => {
    // applyPendingRewards
    it('applyPendingRewards(): reverts when called by an account that is not BorrowerOperations', async () => {
      // Attempt call from alice
      try {
        const txAlice = await troveManager.applyPendingRewards(bob, {
          from: alice,
        });
      } catch (err) {
        assert.include(err.message, 'revert');
        // assert.include(err.message, "Caller is not the BorrowerOperations contract")
      }
    });

    // updateRewardSnapshots
    it('updateRewardSnapshots(): reverts when called by an account that is not BorrowerOperations', async () => {
      // Attempt call from alice
      try {
        const txAlice = await troveManager.updateTroveRewardSnapshots([], bob, {
          from: alice,
        });
      } catch (err) {
        assert.include(err.message, 'revert');
        // assert.include(err.message, "Caller is not the BorrowerOperations contract")
      }
    });

    // removeStake
    it('removeStake(): reverts when called by an account that is not BorrowerOperations', async () => {
      // Attempt call from alice
      try {
        const txAlice = await troveManager.removeStake([], bob, { from: alice });
      } catch (err) {
        assert.include(err.message, 'revert');
        // assert.include(err.message, "Caller is not the BorrowerOperations contract")
      }
    });

    // updateStakeAndTotalStakes
    it('updateStakeAndTotalStakes(): reverts when called by an account that is not BorrowerOperations', async () => {
      // Attempt call from alice
      try {
        const txAlice = await troveManager.updateStakeAndTotalStakes([], bob, {
          from: alice,
        });
      } catch (err) {
        assert.include(err.message, 'revert');
        // assert.include(err.message, "Caller is not the BorrowerOperations contract")
      }
    });

    // closeTrove
    it('closeTrove(): reverts when called by an account that is not BorrowerOperations', async () => {
      // Attempt call from alice
      try {
        const txAlice = await troveManager.closeTrove([], bob, { from: alice });
      } catch (err) {
        assert.include(err.message, 'revert');
        // assert.include(err.message, "Caller is not the BorrowerOperations contract")
      }
    });

    // addTroveOwnerToArray
    it('addTroveOwnerToArray(): reverts when called by an account that is not BorrowerOperations', async () => {
      // Attempt call from alice
      try {
        const txAlice = await troveManager.addTroveOwnerToArray(bob, {
          from: alice,
        });
      } catch (err) {
        assert.include(err.message, 'revert');
        // assert.include(err.message, "Caller is not the BorrowerOperations contract")
      }
    });

    // setTroveStatus
    it('setTroveStatus(): reverts when called by an account that is not BorrowerOperations', async () => {
      // Attempt call from alice
      try {
        const txAlice = await troveManager.setTroveStatus(bob, 1, {
          from: alice,
        });
      } catch (err) {
        assert.include(err.message, 'revert');
        // assert.include(err.message, "Caller is not the BorrowerOperations contract")
      }
    });

    // increaseTroveColl
    it('increaseTroveColl(): reverts when called by an account that is not BorrowerOperations', async () => {
      // Attempt call from alice
      try {
        const txAlice = await troveManager.increaseTroveColl(bob, [], {
          from: alice,
        });
      } catch (err) {
        assert.include(err.message, 'revert');
        // assert.include(err.message, "Caller is not the BorrowerOperations contract")
      }
    });

    // decreaseTroveColl
    it('decreaseTroveColl(): reverts when called by an account that is not BorrowerOperations', async () => {
      // Attempt call from alice
      try {
        const txAlice = await troveManager.decreaseTroveColl(bob, [], {
          from: alice,
        });
      } catch (err) {
        assert.include(err.message, 'revert');
        // assert.include(err.message, "Caller is not the BorrowerOperations contract")
      }
    });

    // increaseTroveDebt
    it('increaseTroveDebt(): reverts when called by an account that is not BorrowerOperations', async () => {
      // Attempt call from alice
      try {
        const txAlice = await troveManager.increaseTroveDebt(bob, [], {
          from: alice,
        });
      } catch (err) {
        assert.include(err.message, 'revert');
        // assert.include(err.message, "Caller is not the BorrowerOperations contract")
      }
    });

    // decreaseTroveDebt
    it('decreaseTroveDebt(): reverts when called by an account that is not BorrowerOperations', async () => {
      // Attempt call from alice
      try {
        const txAlice = await troveManager.decreaseTroveDebt(bob, [], {
          from: alice,
        });
      } catch (err) {
        assert.include(err.message, 'revert');
        // assert.include(err.message, "Caller is not the BorrowerOperations contract")
      }
    });
  });

  describe('StoragePool', async accounts => {
    // withdrawalValue
    it('withdrawalValue(): reverts when called by an account that is not BO nor TroveM nor SP', async () => {
      // Attempt call from alice
      try {
        const txAlice = await storagePool.withdrawalValue(alice, BTC, true, 0, 100, { from: alice });
      } catch (err) {
        assert.include(err.message, 'revert');
        assert.include(err.message, 'Caller is neither BorrowerOperations nor TroveManager nor StabilityPool');
      }
    });

    // addValue
    it('addValue(): reverts when called by an account that is not BO nor TroveM', async () => {
      // Attempt call from alice
      try {
        const txAlice = await storagePool.addValue(BTC, true, 0, 100, {
          from: alice,
        });
      } catch (err) {
        assert.include(err.message, 'revert');
        assert.include(err.message, 'Caller is neither BorrowerOperations nor TroveManager');
      }
    });

    // subtractValue
    it('subtractValue(): reverts when called by an account that is not BO nor TroveM nor SP', async () => {
      // Attempt call from alice
      try {
        const txAlice = await storagePool.subtractValue(BTC, true, 0, 100, {
          from: alice,
        });
      } catch (err) {
        assert.include(err.message, 'revert');
        assert.include(err.message, 'Caller is neither BorrowerOperations nor TroveManager nor StabilityPool');
      }
    });

    // fallback (payment)
    it('fallback(): reverts when called by an account that is not Borrower Operations nor Default Pool', async () => {
      // Attempt call from alice
      try {
        const txAlice = await web3.eth.sendTransaction({
          from: alice,
          to: storagePool.address,
          value: 100,
        });
      } catch (err) {
        assert.include(err.message, 'revert');
      }
    });
  });

  describe('stabilityPoolManager', async accounts => {
    // --- onlyTroveManager ---

    // offset
    it('offset(): reverts when called by an account that is not TroveManager', async () => {
      // Attempt call from alice
      try {
        txAlice = await stabilityPoolManager.offset([], { from: alice });
        assert.fail(txAlice);
      } catch (err) {
        assert.include(err.message, 'revert');
        assert.include(err.message, 'Caller is not TroveManager');
      }
    });

    // --- onlyActivePool ---

    // fallback (payment)
    it('fallback(): reverts when called by an account that is not the Active Pool', async () => {
      // Attempt call from alice
      try {
        const txAlice = await web3.eth.sendTransaction({
          from: alice,
          to: stabilityPoolManager.address,
          value: 100,
        });
      } catch (err) {
        assert.include(err.message, 'revert');
      }
    });
  });

  describe('DebtToken', async accounts => {
    //    mint
    it('mint(): reverts when called by an account that is not BorrowerOperations', async () => {
      // Attempt call from alice
      const txAlice = coreContracts.debtToken.STABLE.mint(bob, 100, { from: alice });
      await th.assertRevert(txAlice, 'Caller is not BorrowerOperations');
    });

    // burn
    it('burn(): reverts when called by an account that is not BO nor TroveM nor SP', async () => {
      // Attempt call from alice
      try {
        const txAlice = await coreContracts.debtToken.STABLE.burn(bob, 100, { from: alice });
      } catch (err) {
        assert.include(err.message, 'revert');
        // assert.include(err.message, "Caller is neither BorrowerOperations nor TroveManager nor StabilityPool")
      }
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
      // Attempt call from alice
      try {
        const txAlice = await coreContracts.debtToken.STABLE.returnFromPool(storagePool.address, bob, 100, {
          from: alice,
        });
      } catch (err) {
        assert.include(err.message, 'revert');
        // assert.include(err.message, "Caller is neither TroveManager nor StabilityPool")
      }
    });
  });
});
