import { ethers } from 'hardhat';
import {
  MockDebtToken,
  MockERC20,
  MockPriceFeed,
  TroveManager,
  StabilityPoolManager,
  StoragePool,
  BorrowerOperationsTester,
} from '../typechain';
import { Contracts, deployCore, connectCoreContracts, deployAndLinkToken } from '../utils/deploymentHelpers';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { assertRevert, openTrove } from '../utils/testHelper';
import { assert, expect } from 'chai';
import { BigNumberish, parseEther, parseUnits } from 'ethers';

describe.only('TroveManager', () => {
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
  let troveManager: TroveManager;

  let borrowerOperations: BorrowerOperationsTester;

  let stabilityPoolManager: StabilityPoolManager;

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
    borrowerOperations = contracts.borrowerOperations;
    storagePool = contracts.storagePool;
    stabilityPoolManager = contracts.stabilityPoolManager;

    STABLE = contracts.debtToken.STABLE;
    STOCK = contracts.debtToken.STOCK;
    BTC = contracts.collToken.BTC;
    USDT = contracts.collToken.USDT;

    await borrowerOperations.setDebtToken(STABLE);
    redemptionFee = await troveManager.REDEMPTION_FEE_FLOOR();
  });

  describe('TroveManager - in Recovery Mode', () => {
    it.only('liquidate(): closes a Trove that has ICR < MCR', async () => {
      const collToLiquidate = parseEther('300');
      // - GAS_COMPENSATION
      const collToDistribute = collToLiquidate - parseEther('200');

      // Add enough coll to not enter recovery mode
      await borrowerOperations.testStoragePool_addValue(USDT, true, 0, parseEther('1000'));
      // add value so that pool transfer can be made
      await borrowerOperations.testStoragePool_addValue(STABLE, false, 0, collToLiquidate);

      // Add enough coll to not enter recovery mode
      await openTrove({
        from: alice,
        contracts,
        collToken: USDT,
        collAmount: collToLiquidate,
      });

      await openTrove({
        from: bob,
        contracts,
        collToken: USDT,
        collAmount: parseEther('300'),
      });

      await borrowerOperations.testTroveManager_increaseTroveDebt(alice, [
        { debtToken: STABLE.target, borrowingFee: parseEther('0.01'), netDebt: parseEther('300') },
      ]);

      const [isInRecoveryMode] = await storagePool.checkRecoveryMode();
      assert.isFalse(isInRecoveryMode);

      // liquidate alice but spare bob
      await troveManager.liquidate(alice);

      // FIXME: Calculation makes no sense to me
      // packages/contracts/contracts/TroveManager.sol:1152
      // value assigned to liquidatedTokens seems arbitrary
      const liquidatedColl = await troveManager.liquidatedTokens(USDT.target, true);
      const deducableFee = (collToDistribute * redemptionFee) / parseEther('1');
      // assert.equal(liquidatedColl, collToDistribute - deducableFee);

      const troveOwnerCount = await troveManager.getTroveOwnersCount();
      assert.equal(troveOwnerCount, 1n);

      const activeTroveAddress = await troveManager.TroveOwners(0n);
      assert.equal(activeTroveAddress, bob.address);

      const aliceTrove = await troveManager.getTroveStatus(alice.address);
      // closedByLiquidation
      assert.equal(aliceTrove, 3n);

      const aliceTroveStake = await troveManager.getTroveStake(alice.address);
      assert.equal(aliceTroveStake, 0n);

      const aliceTroveDebt = await troveManager.getTroveDebt(alice.address);
      assert.lengthOf(aliceTroveDebt, 0);

      const aliceTroveColl = await troveManager.getTroveColl(alice.address);
      assert.lengthOf(aliceTroveColl, 0);
    });

    it.only('liquidate(): decreases ActivePool collateral by liquidated amount but keeps the redemptionFee', async () => {
      const initialColl = parseEther('1000');
      const collToLiquidate = parseEther('400');

      // Add enough coll to not enter recovery mode
      await borrowerOperations.testStoragePool_addValue(USDT, true, 0, initialColl);
      // add value so that pool transfer can be made
      await borrowerOperations.testStoragePool_addValue(STABLE, false, 0, collToLiquidate);

      // Add enough coll to not enter recovery mode
      await openTrove({
        from: alice,
        contracts,
        collToken: USDT,
        collAmount: collToLiquidate,
      });

      const bystandingColl = parseEther('300');
      await openTrove({
        from: bob,
        contracts,
        collToken: USDT,
        collAmount: bystandingColl,
      });

      const storageActivePool_Before = await storagePool.getValue(USDT.target, true, 0);
      assert.equal(storageActivePool_Before, initialColl + collToLiquidate + bystandingColl);

      await borrowerOperations.testTroveManager_increaseTroveDebt(alice, [
        { debtToken: STABLE.target, borrowingFee: parseEther('0.01'), netDebt: parseEther('300') },
      ]);

      const [isInRecoveryMode] = await storagePool.checkRecoveryMode();
      assert.isFalse(isInRecoveryMode);

      // liquidate alice but spare bob
      await troveManager.liquidate(alice);

      const storageActivePool_After = await storagePool.getValue(USDT.target, true, 0);
      // minus liquidated collateral but we keep the redemptionFee of that amount
      assert.equal(
        storageActivePool_After,
        initialColl + bystandingColl + (collToLiquidate * redemptionFee) / parseEther('1')
      );
    });
  });
});
