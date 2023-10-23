import { ethers, network } from 'hardhat';
import {
  MockDebtToken,
  MockERC20,
  MockPriceFeed,
  TroveManager,
  BorrowerOperations,
  StabilityPoolManager,
  StoragePool,
} from '../typechain';
import { Contracts, deployCore, connectCoreContracts, deployAndLinkToken } from '../utils/deploymentHelpers';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { assertRevert } from '../utils/testHelper';
import { assert } from 'chai';

const testHelpers = require('../utils/testHelpers.js');
const th = testHelpers.TestHelper;

describe('StoragePool', () => {
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

  let priceFeed: MockPriceFeed;
  let troveManager: TroveManager;

  let borrowerOperations: BorrowerOperations;
  let stabilityPoolManager: StabilityPoolManager;

  let contracts: Contracts;

  before(async () => {
    signers = await ethers.getSigners();
    [owner, defaulter_1, defaulter_2, defaulter_3, whale, alice, bob, carol, dennis, erin, flyn] = signers;
  });

  const commonSetup = async (contracts: Contracts) => {
    await connectCoreContracts(contracts);

    await deployAndLinkToken(contracts);

    priceFeed = contracts.priceFeed;
    troveManager = contracts.troveManager;
    borrowerOperations = contracts.borrowerOperations;
    storagePool = contracts.storagePool;
    stabilityPoolManager = contracts.stabilityPoolManager;

    STABLE = contracts.debtToken.STABLE;
    STOCK = contracts.debtToken.STOCK;
    BTC = contracts.collToken.BTC;
  };

  describe('StoragePool Mechanisms', async () => {
    beforeEach(async () => {
      contracts = await deployCore();
      commonSetup(contracts);
    });

    it('addValue() revert if caller is neither borrowerOperationsAddress nor troveManagerAddress nor stabilityPoolManagerAddress for all _poolType', async () => {
      const amount = th.dec(1, 'ether');
      const expectedErrorMsg = 'NotFromBOorTroveMorSP';

      await assertRevert(storagePool.addValue(BTC, false, 0, amount), expectedErrorMsg);
      await assertRevert(storagePool.addValue(BTC, false, 1, amount), expectedErrorMsg);
      await assertRevert(storagePool.addValue(BTC, false, 2, amount), expectedErrorMsg);

      // _isColl = true
      await assertRevert(storagePool.addValue(BTC, true, 0, amount), expectedErrorMsg);
      await assertRevert(storagePool.addValue(BTC, true, 1, amount), expectedErrorMsg);
      await assertRevert(storagePool.addValue(BTC, true, 2, amount), expectedErrorMsg);
    });

    it('subtractValue() revert if caller is neither borrowerOperationsAddress nor troveManagerAddress nor stabilityPoolManagerAddress for all _poolType)', async () => {
      const amount = th.dec(1, 'ether');
      const expectedErrorMsg = 'NotFromBOorTroveMorSP';

      await assertRevert(storagePool.subtractValue(BTC, false, 0, amount), expectedErrorMsg);
      await assertRevert(storagePool.subtractValue(BTC, false, 1, amount), expectedErrorMsg);
      await assertRevert(storagePool.subtractValue(BTC, false, 2, amount), expectedErrorMsg);
      // collateral
      await assertRevert(storagePool.subtractValue(BTC, true, 0, amount), expectedErrorMsg);
      await assertRevert(storagePool.subtractValue(BTC, true, 1, amount), expectedErrorMsg);
      await assertRevert(storagePool.subtractValue(BTC, true, 2, amount), expectedErrorMsg);
    });

    it('withdrawalValue() revert if caller is neither borrowerOperationsAddress nor troveManagerAddress nor stabilityPoolManagerAddress for all _poolType)', async () => {
      const amount = th.dec(1, 'ether');
      const expectedErrorMsg = 'NotFromBOorTroveMorSP';

      await assertRevert(storagePool.withdrawalValue(carol, BTC, false, 0, amount), expectedErrorMsg);
      await assertRevert(storagePool.withdrawalValue(carol, BTC, false, 1, amount), expectedErrorMsg);
      await assertRevert(storagePool.withdrawalValue(carol, BTC, false, 2, amount), expectedErrorMsg);
      // collateral
      await assertRevert(storagePool.withdrawalValue(carol, BTC, true, 0, amount), expectedErrorMsg);
      await assertRevert(storagePool.withdrawalValue(carol, BTC, true, 1, amount), expectedErrorMsg);
      await assertRevert(storagePool.withdrawalValue(carol, BTC, true, 2, amount), expectedErrorMsg);
    });

    it('transferBetweenTypes() revert if caller is neither borrowerOperationsAddress nor troveManagerAddress nor stabilityPoolManagerAddress for all _poolType)', async () => {
      const amount = th.dec(1, 'ether');
      const expectedErrorMsg = 'NotFromBOorTroveMorSP';

      await assertRevert(storagePool.transferBetweenTypes(BTC, false, 0, 1, amount), expectedErrorMsg);
      await assertRevert(storagePool.transferBetweenTypes(BTC, false, 1, 2, amount), expectedErrorMsg);
      await assertRevert(storagePool.transferBetweenTypes(BTC, false, 2, 0, amount), expectedErrorMsg);
      // collateral
      await assertRevert(storagePool.transferBetweenTypes(BTC, true, 0, 2, amount), expectedErrorMsg);
      await assertRevert(storagePool.transferBetweenTypes(BTC, true, 1, 0, amount), expectedErrorMsg);
      await assertRevert(storagePool.transferBetweenTypes(BTC, true, 2, 1, amount), expectedErrorMsg);
    });

    it('transferBetweenTypes() revert if caller is neither borrowerOperationsAddress nor troveManagerAddress nor stabilityPoolManagerAddress for all _poolType)', async () => {
      const amount = th.dec(1, 'ether');
      const expectedErrorMsg = 'NotFromBOorTroveMorSP';

      await assertRevert(storagePool.transferBetweenTypes(BTC, false, 0, 1, amount), expectedErrorMsg);
      await assertRevert(storagePool.transferBetweenTypes(BTC, false, 1, 2, amount), expectedErrorMsg);
      await assertRevert(storagePool.transferBetweenTypes(BTC, false, 2, 0, amount), expectedErrorMsg);
      // collateral
      await assertRevert(storagePool.transferBetweenTypes(BTC, true, 0, 2, amount), expectedErrorMsg);
      await assertRevert(storagePool.transferBetweenTypes(BTC, true, 1, 0, amount), expectedErrorMsg);
      await assertRevert(storagePool.transferBetweenTypes(BTC, true, 2, 1, amount), expectedErrorMsg);
    });

    it.skip('sendETHToActivePool(): fails if receiver cannot receive ETH', async () => {
      //  TODO: Is the initial implementation still testable?
    });
  });

  describe('ActivePool', async () => {
    beforeEach(async () => {
      contracts = await deployCore(true);
      commonSetup(contracts);
    });

    it('getValue(): gets the recorded token balance', async () => {
      const recordedTokenBalance = await storagePool.getValue(BTC, true, 0);

      assert.equal(recordedTokenBalance, 0);
    });

    it('getValue(): gets the recorded token debt', async () => {
      const recordedTokenDebt = await storagePool.getValue(STABLE, false, 0);

      assert.equal(recordedTokenDebt, 0);
    });

    it('addValue(): increases the recorded token debt by the correct amount', async () => {
      const borrowerOperationsAddress = await borrowerOperations.getAddress();

      // make call from required borrowerOperationsAddress
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [borrowerOperationsAddress],
      });
      const borrowerOperationsSigner = await ethers.getSigner(borrowerOperationsAddress);
      const storagePoolContract = await ethers.getContractAt('StoragePool', await storagePool.getAddress());

      await storagePoolContract.connect(borrowerOperationsSigner).addValue(STABLE, false, 0, 100);

      // Stop impersonating
      await network.provider.request({
        method: 'hardhat_stopImpersonatingAccount',
        params: [borrowerOperationsAddress],
      });

      const tokenDebt_balanceAfter = await storagePool.getValue(STABLE, false, 0);
      assert.equal(tokenDebt_balanceAfter, 100);
    });

    it('subtractValue(): decreases the recorded token balance by the correct amount', async () => {
      const borrowerOperationsAddress = await borrowerOperations.getAddress();

      // make call from required borrowerOperationsAddress
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [borrowerOperationsAddress],
      });
      const borrowerOperationsSigner = await ethers.getSigner(borrowerOperationsAddress);
      const storagePoolContract = await ethers.getContractAt('StoragePool', await storagePool.getAddress());

      // First add anything to add default pool entry
      await storagePoolContract.connect(borrowerOperationsSigner).addValue(STABLE, false, 0, 101);
      await storagePoolContract.connect(borrowerOperationsSigner).subtractValue(STABLE, false, 0, 100);

      // Stop impersonating
      await network.provider.request({
        method: 'hardhat_stopImpersonatingAccount',
        params: [borrowerOperationsAddress],
      });

      const tokenDebt_balanceAfter = await storagePool.getValue(STABLE, false, 0);
      assert.equal(tokenDebt_balanceAfter, 1);
    });

    it('transferBetweenTypes(): exchanges the recorded token balance by the correct amount', async () => {
      const borrowerOperationsAddress = await borrowerOperations.getAddress();

      // make call from required borrowerOperationsAddress
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [borrowerOperationsAddress],
      });
      const borrowerOperationsSigner = await ethers.getSigner(borrowerOperationsAddress);
      const storagePoolContract = await ethers.getContractAt('StoragePool', await storagePool.getAddress());

      // First add anything to add default pool entry
      await storagePoolContract.connect(borrowerOperationsSigner).addValue(STABLE, false, 0, 100);

      await storagePoolContract.connect(borrowerOperationsSigner).transferBetweenTypes(STABLE, false, 0, 2, 10);

      // Stop impersonating
      await network.provider.request({
        method: 'hardhat_stopImpersonatingAccount',
        params: [borrowerOperationsAddress],
      });

      const defaultPoolTokenDebt_balanceAfter = await storagePool.getValue(STABLE, false, 0);
      assert.equal(defaultPoolTokenDebt_balanceAfter, 90);

      const activePoolTokenDebt_balanceAfter = await storagePool.getValue(STABLE, false, 2);
      assert.equal(activePoolTokenDebt_balanceAfter, 10);
    });
  });

  describe('DefaultPool', async () => {
    beforeEach(async () => {
      contracts = await deployCore(true);
      commonSetup(contracts);
    });

    it('getValue(): gets the recorded token balance', async () => {
      const recordedTokenBalance = await storagePool.getValue(BTC, true, 1);

      assert.equal(recordedTokenBalance.toString(), '0');
    });

    it('getValue(): gets the recorded token debt', async () => {
      const recordedTokenDebt = await storagePool.getValue(STABLE, false, 1);

      assert.equal(recordedTokenDebt.toString(), '0');
    });

    it('addValue(): increases the recorded token debt by the correct amount', async () => {
      const borrowerOperationsAddress = await borrowerOperations.getAddress();

      // make call from required borrowerOperationsAddress
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [borrowerOperationsAddress],
      });
      const borrowerOperationsSigner = await ethers.getSigner(borrowerOperationsAddress);
      const storagePoolContract = await ethers.getContractAt('StoragePool', await storagePool.getAddress());

      await storagePoolContract.connect(borrowerOperationsSigner).addValue(STABLE, false, 1, 100);

      // Stop impersonating
      await network.provider.request({
        method: 'hardhat_stopImpersonatingAccount',
        params: [borrowerOperationsAddress],
      });

      const tokenDebt_balanceAfter = await storagePool.getValue(STABLE, false, 1);
      assert.equal(tokenDebt_balanceAfter, 100);
    });

    it('subtractValue(): decreases the recorded token balance by the correct amount', async () => {
      const borrowerOperationsAddress = await borrowerOperations.getAddress();

      // make call from required borrowerOperationsAddress
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [borrowerOperationsAddress],
      });
      const borrowerOperationsSigner = await ethers.getSigner(borrowerOperationsAddress);
      const storagePoolContract = await ethers.getContractAt('StoragePool', await storagePool.getAddress());

      // First add anything to add default pool entry
      await storagePoolContract.connect(borrowerOperationsSigner).addValue(STABLE, false, 1, 101);
      await storagePoolContract.connect(borrowerOperationsSigner).subtractValue(STABLE, false, 1, 100);

      // Stop impersonating
      await network.provider.request({
        method: 'hardhat_stopImpersonatingAccount',
        params: [borrowerOperationsAddress],
      });

      const tokenDebt_balanceAfter = await storagePool.getValue(STABLE, false, 1);
      assert.equal(tokenDebt_balanceAfter, 1);
    });

    it('transferBetweenTypes(): exchanges the recorded token balance by the correct amount', async () => {
      const borrowerOperationsAddress = await borrowerOperations.getAddress();

      // make call from required borrowerOperationsAddress
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [borrowerOperationsAddress],
      });
      const borrowerOperationsSigner = await ethers.getSigner(borrowerOperationsAddress);
      const storagePoolContract = await ethers.getContractAt('StoragePool', await storagePool.getAddress());

      // First add anything to add default pool entry
      await storagePoolContract.connect(borrowerOperationsSigner).addValue(STABLE, false, 1, 100);

      await storagePoolContract.connect(borrowerOperationsSigner).transferBetweenTypes(STABLE, false, 1, 0, 10);

      // Stop impersonating
      await network.provider.request({
        method: 'hardhat_stopImpersonatingAccount',
        params: [borrowerOperationsAddress],
      });

      const defaultPoolTokenDebt_balanceAfter = await storagePool.getValue(STABLE, false, 1);
      assert.equal(defaultPoolTokenDebt_balanceAfter, 90);

      const activePoolTokenDebt_balanceAfter = await storagePool.getValue(STABLE, false, 0);
      assert.equal(activePoolTokenDebt_balanceAfter, 10);
    });
  });
});
