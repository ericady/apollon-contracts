import { artifacts, ethers } from 'hardhat';
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
  CollSurplusPool,
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
  setPrice,
} from '../utils/testHelper';
import { assert, expect } from 'chai';
import { parseUnits } from 'ethers';
import apollonTesting from '../ignition/modules/apollonTesting';

// const NonPayable = artifacts.require('NonPayable.sol')

describe('CollSurplusPool', () => {
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
  let collSurplusPool: CollSurplusPool;
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
    collSurplusPool = contracts.collSurplusPool;
    STABLE = contracts.STABLE;
    STOCK = contracts.STOCK;
    BTC = contracts.BTC;
    USDT = contracts.USDT;

    redemptionFee = await redemptionOperations.getRedemptionRate();
  });

  describe('getCollateral():', () => {
    it('Returns the Coll balance of the CollSurplusPool after redemption', async () => {
      const eth_1 = await collSurplusPool.getCollateral(alice);
      expect(eth_1.length).to.be.equal(0);

      await whaleShrimpTroveInit(contracts, signers, false);

      await setPrice('BTC', '2700', contracts);

      //check recovery mode
      const [isRecoveryMode] = await storagePool.checkRecoveryMode();
      assert.isTrue(isRecoveryMode);

      // Confirm alice has ICR > MCR
      const [ICR_B] = await troveManager.getCurrentICR(bob);
      expect(ICR_B).to.be.gt(110n);

      await liquidationOperations.liquidate(bob);
      expect(await troveManager.getTroveStatus(bob)).to.be.equal(TroveStatus.CLOSED_BY_LIQUIDATION_IN_RECOVERY_MODE);

      const [[, coll_bob]] = await collSurplusPool.getCollateral(bob);

      assert.isTrue(coll_bob > 0n)

    });
  });

  describe('claimColl(): ', () => {
    it('Reverts if caller is not Borrower Operations', async () => {
      await assertRevert(collSurplusPool.connect(alice).claimColl(alice), 'NotFromProtocol');
    });

    it('Reverts if nothing to claim', async () => {
      await borrowerOperations.connect(alice).claimCollateral();
    });

    it('Deletes caller coll surplus balances after coll claim', async () => {
      await whaleShrimpTroveInit(contracts, signers, false);

      await setPrice('BTC', '2700', contracts);

      //check recovery mode
      const [isRecoveryMode] = await storagePool.checkRecoveryMode();
      assert.isTrue(isRecoveryMode);

      // Confirm alice has ICR > MCR
      const [ICR_B] = await troveManager.getCurrentICR(bob);
      expect(ICR_B).to.be.gt(110n);

      await liquidationOperations.liquidate(bob);
      expect(await troveManager.getTroveStatus(bob)).to.be.equal(TroveStatus.CLOSED_BY_LIQUIDATION_IN_RECOVERY_MODE);

      const [[, coll_bob]] = await collSurplusPool.getCollateral(bob);

      await borrowerOperations.connect(bob).claimCollateral();

      const coll_bob_after = await collSurplusPool.getCollateral(bob);

      const bobBlance = await BTC.balanceOf(bob);

      assert.equal(bobBlance, coll_bob);
      assert.equal(coll_bob_after.length, 0);
    });
  });

  describe('accountSurplus(): ', () => {
    it('Reverts if caller is not Trove Manager', async () => {
      await assertRevert(collSurplusPool.connect(alice).accountSurplus(alice, []), 'NotFromProtocol');
    });

    it('Patch the collSurplus claim', async () => {
      await whaleShrimpTroveInit(contracts, signers, false);

      await setPrice('BTC', '2700', contracts);

      //check recovery mode
      const [isRecoveryMode] = await storagePool.checkRecoveryMode();
      assert.isTrue(isRecoveryMode);

      // Confirm alice has ICR > MCR
      const [ICR_B] = await troveManager.getCurrentICR(bob);
      expect(ICR_B).to.be.gt(110n);

      await liquidationOperations.liquidate(bob);
      expect(await troveManager.getTroveStatus(bob)).to.be.equal(TroveStatus.CLOSED_BY_LIQUIDATION_IN_RECOVERY_MODE);

      const collSurplus = await collSurplusPool.getCollateral(bob);

      expect(collSurplus.length).to.be.equal(1);
    });
  });
});
