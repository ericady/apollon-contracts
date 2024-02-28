import { ethers } from 'hardhat';
import {
  MockDebtToken,
  MockERC20,
  PriceFeed,
  MockTroveManager,
  StabilityPoolManager,
  StoragePool,
  LiquidationOperations,
  RedemptionOperations,
  BorrowerOperations,
  SortedTroves,
} from '../typechain';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import {
  TroveStatus,
  assertRevert,
  getEmittedLiquidationValues,
  getStabilityPool,
  getTCR,
  getTroveStake,
  openTrove,
  whaleShrimpTroveInit,
  repayDebt,
  addColl,
  withdrawalColl,
  ZERO_ADDRESS,
  deployTesting,
} from '../utils/testHelper';
import { assert, expect } from 'chai';
import { parseUnits } from 'ethers';
import apollonTesting from '../ignition/modules/apollonTesting';

describe('SortedTroves', () => {
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

  let priceFeed: PriceFeed;
  let troveManager: MockTroveManager;

  let stabilityPoolManager: StabilityPoolManager;
  let liquidationOperations: LiquidationOperations;
  let borrowerOperations: BorrowerOperations;
  let redemptionOperations: RedemptionOperations;
  let sortedTroves: SortedTroves;
  let contracts: any;

  let redemptionFee: bigint;

  before(async () => {
    signers = await ethers.getSigners();
    [owner, defaulter_1, defaulter_2, defaulter_3, whale, alice, bob, carol, dennis, erin] = signers;
  });

  beforeEach(async () => {
    // @ts-ignore
    contracts = await deployTesting();

    priceFeed = contracts.priceFeed;
    troveManager = contracts.troveManager;
    redemptionOperations = contracts.redemptionOperations;
    liquidationOperations = contracts.liquidationOperations;
    storagePool = contracts.storagePool;
    stabilityPoolManager = contracts.stabilityPoolManager;
    borrowerOperations = contracts.borrowerOperations;
    sortedTroves = contracts.sortedTroves;
    STABLE = contracts.STABLE;
    STOCK = contracts.STOCK;
    BTC = contracts.BTC;
    USDT = contracts.USDT;

    redemptionFee = await redemptionOperations.getRedemptionRate();
  });

  describe('contains():', () => {
    it('returns true for addresses that have opened troves', async () => {
      //open trove
      await openTrove({
        from: whale,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('5', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('2000') }],
      });

      await openTrove({
        from: alice,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('5', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('2000') }],
      });

      const bobColl = parseUnits('1', 9);

      await openTrove({
        from: bob,
        contracts,
        collToken: BTC,
        collAmount: bobColl,
        debts: [{ tokenAddress: STABLE, amount: parseUnits('1000') }],
      });

      //check trove status
      const whaleTroveStatus = await troveManager.getTroveStatus(whale.address);
      const aliceTroveStatus = await troveManager.getTroveStatus(alice.address);
      const bobTroveStatus = await troveManager.getTroveStatus(bob.address);

      assert.equal(whaleTroveStatus.toString(), TroveStatus.ACTIVE.toString());
      assert.equal(aliceTroveStatus.toString(), TroveStatus.ACTIVE.toString());
      assert.equal(bobTroveStatus.toString(), TroveStatus.ACTIVE.toString());

      //check sorted list contains trove
      assert.isTrue(await sortedTroves.contains(whale));
      assert.isTrue(await sortedTroves.contains(alice));
      assert.isTrue(await sortedTroves.contains(bob));
    });

    it('returns false for addresses that have not opened troves', async () => {
      //open trove
      await openTrove({
        from: whale,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('5', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('2000') }],
      });

      await openTrove({
        from: alice,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('5', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('2000') }],
      });

      const bobColl = parseUnits('1', 9);

      await openTrove({
        from: bob,
        contracts,
        collToken: BTC,
        collAmount: bobColl,
        debts: [{ tokenAddress: STABLE, amount: parseUnits('1000') }],
      });

      //check trove status
      const carolTroveStatus = await troveManager.getTroveStatus(carol);
      const dennisTroveStatus = await troveManager.getTroveStatus(dennis);

      assert.equal(carolTroveStatus.toString(), TroveStatus.NON_EXISTENT.toString());
      assert.equal(dennisTroveStatus.toString(), TroveStatus.NON_EXISTENT.toString());

      //check sorted list contains trove
      assert.isFalse(await sortedTroves.contains(carol));
      assert.isFalse(await sortedTroves.contains(dennis));
    });

    it('returns false for addresses that have open and then closed troves', async () => {
      //open trove
      await openTrove({
        from: whale,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('5', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('3000') }],
      });

      await openTrove({
        from: alice,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('5', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('2000') }],
      });

      const bobColl = parseUnits('1', 9);

      await openTrove({
        from: bob,
        contracts,
        collToken: BTC,
        collAmount: bobColl,
        debts: [{ tokenAddress: STABLE, amount: parseUnits('1000') }],
      });

      await openTrove({
        from: carol,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('5', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('2000') }],
      });

      //to compensate borrowing fee
      await STABLE.connect(whale).transfer(alice, parseUnits('1000'));
      await STABLE.connect(whale).transfer(bob, parseUnits('1000'));
      await STABLE.connect(whale).transfer(carol, parseUnits('1000'));

      //close trove
      await borrowerOperations.connect(alice).closeTrove();
      await borrowerOperations.connect(bob).closeTrove();
      await borrowerOperations.connect(carol).closeTrove();

      //check trove status
      const aliceTroveStatus = await troveManager.getTroveStatus(alice);
      const bobTroveStatus = await troveManager.getTroveStatus(bob);
      const carolTroveStatus = await troveManager.getTroveStatus(carol);

      assert.equal(aliceTroveStatus.toString(), TroveStatus.CLOSED_BY_OWNER.toString());
      assert.equal(bobTroveStatus.toString(), TroveStatus.CLOSED_BY_OWNER.toString());
      assert.equal(carolTroveStatus.toString(), TroveStatus.CLOSED_BY_OWNER.toString());

      //check sorted list contains trove
      assert.isFalse(await sortedTroves.contains(alice));
      assert.isFalse(await sortedTroves.contains(bob));
      assert.isFalse(await sortedTroves.contains(carol));
    });

    it('returns true for addresses that opened, closed and then re-opened a trove', async () => {
      //open trove
      await openTrove({
        from: whale,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('5', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('3000') }],
      });
      await openTrove({
        from: alice,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('5', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('2000') }],
      });
      await openTrove({
        from: bob,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('1', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('1000') }],
      });
      await openTrove({
        from: carol,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('5', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('2000') }],
      });

      //to compensate borrowing fee
      await STABLE.connect(whale).transfer(alice, parseUnits('1000'));
      await STABLE.connect(whale).transfer(bob, parseUnits('1000'));
      await STABLE.connect(whale).transfer(carol, parseUnits('1000'));

      //close trove
      await borrowerOperations.connect(alice).closeTrove();
      await borrowerOperations.connect(bob).closeTrove();
      await borrowerOperations.connect(carol).closeTrove();

      //check trove status
      const aliceTroveStatus = await troveManager.getTroveStatus(alice);
      const bobTroveStatus = await troveManager.getTroveStatus(bob);
      const carolTroveStatus = await troveManager.getTroveStatus(carol);

      assert.equal(aliceTroveStatus.toString(), TroveStatus.CLOSED_BY_OWNER.toString());
      assert.equal(bobTroveStatus.toString(), TroveStatus.CLOSED_BY_OWNER.toString());
      assert.equal(carolTroveStatus.toString(), TroveStatus.CLOSED_BY_OWNER.toString());

      //open trove
      await openTrove({
        from: alice,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('5', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('2000') }],
      });
      await openTrove({
        from: bob,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('5', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('1000') }],
      });
      await openTrove({
        from: carol,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('5', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('1000') }],
      });

      //check trove status
      const aliceTroveStatusAfter = await troveManager.getTroveStatus(alice);
      const bobTroveStatusAfter = await troveManager.getTroveStatus(bob);
      const carolTroveStatusAfter = await troveManager.getTroveStatus(carol);

      assert.equal(aliceTroveStatusAfter.toString(), TroveStatus.ACTIVE.toString());
      assert.equal(bobTroveStatusAfter.toString(), TroveStatus.ACTIVE.toString());
      assert.equal(carolTroveStatusAfter.toString(), TroveStatus.ACTIVE.toString());

      //check sorted list contains trove
      assert.isTrue(await sortedTroves.contains(alice));
      assert.isTrue(await sortedTroves.contains(bob));
      assert.isTrue(await sortedTroves.contains(carol));
    });

    it('returns false when there are no troves in the system', async () => {
      assert.isFalse(await sortedTroves.contains(alice));
      assert.isFalse(await sortedTroves.contains(bob));
      assert.isFalse(await sortedTroves.contains(carol));
    });

    it('true when list size is 1 and the trove the only one in system', async () => {
      //open trove
      await openTrove({
        from: whale,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('5', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('3000') }],
      });

      assert.isTrue(await sortedTroves.contains(whale));
    });

    it('false when list size is 1 and the trove is not in the system', async () => {
      //open trove
      await openTrove({
        from: whale,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('5', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('3000') }],
      });

      assert.isFalse(await sortedTroves.contains(alice));
    });
  });

  describe('findInsertPosition():', () => {
    it('Finds the correct insert position given two addresses that loosely bound the correct position', async () => {
      await whaleShrimpTroveInit(contracts, signers, false);

      const targetNICR = parseUnits('1500', 16);

      const insertPosition = await sortedTroves.findInsertPosition(targetNICR, dennis, defaulter_1);
      console.warn('☢️ ~ it ~ insertPosition:', insertPosition);

      assert.equal(insertPosition[0], alice.address);
      assert.equal(insertPosition[1], whale.address);
    });

    it('No prevId for hint - ascend list starting from nextId, result is after the tail', async () => {
      await whaleShrimpTroveInit(contracts, signers, false);

      const pos = await sortedTroves.findInsertPosition(parseUnits('100', 16), ZERO_ADDRESS, defaulter_1);

      assert.equal(pos[0], defaulter_1.address, 'prevId result should be nextId param');
      assert.equal(pos[1], ZERO_ADDRESS, 'nextId result should be zero');
    });
  });

  describe('validInsertPosition():', () => {
    it('fails if id is zero', async () => {
      const validInsertPosition = await sortedTroves.validInsertPosition(
        parseUnits('100', 16),
        ZERO_ADDRESS,
        ZERO_ADDRESS
      );

      expect(validInsertPosition).to.be.true;
    });
  });

  describe('remove():', () => {
    it('fails if id is not in the list', async () => {
      await assertRevert(sortedTroves.remove(alice));
    });
  });
});
