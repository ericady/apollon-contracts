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
  BorrowerOperations,
} from '../typechain';
import { Contracts, deployCore, connectCoreContracts, deployAndLinkToken } from '../utils/deploymentHelpers';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { whaleShrimpTroveInit } from '../utils/testHelper';
import { assert, expect } from 'chai';
import { formatUnits, parseUnits } from 'ethers';
import { check } from 'prettier';

describe('StabilityPoolManager', () => {
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
  let borrowerOperations: BorrowerOperations;
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
    borrowerOperations = contracts.borrowerOperations;

    STABLE = contracts.debtToken.STABLE;
    STOCK = contracts.debtToken.STOCK;
    BTC = contracts.collToken.BTC;
    USDT = contracts.collToken.USDT;

    redemptionFee = await redemptionOperations.getRedemptionRate();
  });

  describe('provideStability():', () => {
    it('Should revert if pool does not exist', async () => {
      whaleShrimpTroveInit(contracts, signers, false);

      await expect(
        stabilityPoolManager.connect(alice).provideStability([{ tokenAddress: USDT, amount: parseUnits('1000') }])
      ).to.be.revertedWithCustomError(stabilityPoolManager, 'PoolNotExist');
    });
  });

  describe('withdrawStability():', () => {
    it('Should revert if pool does not exist', async () => {
      whaleShrimpTroveInit(contracts, signers, false);

      await expect(
        stabilityPoolManager.connect(alice).withdrawStability([{ tokenAddress: USDT, amount: parseUnits('1000') }])
      ).to.be.revertedWithCustomError(stabilityPoolManager, 'PoolNotExist');
    });
  });

  describe('getTotalDeposit():', () => {
    it('updates totalDebtDeposits by correct amount', async () => {
      await whaleShrimpTroveInit(contracts, signers, false);

      const totalDeposit_Before = await stabilityPoolManager.getTotalDeposit(STABLE);

      const provideToSP = parseUnits('1000');

      await stabilityPoolManager.connect(alice).provideStability([{ tokenAddress: STABLE, amount: provideToSP }]);

      const totalDeposit_After = await stabilityPoolManager.getTotalDeposit(STABLE);

      assert.equal(totalDeposit_After, totalDeposit_Before + provideToSP);

      await stabilityPoolManager.connect(alice).withdrawStability([{ tokenAddress: STABLE, amount: provideToSP }]);

      const totalDeposit_After_Withdraw = await stabilityPoolManager.getTotalDeposit(STABLE);

      assert.equal(totalDeposit_After_Withdraw, totalDeposit_Before);
    });
  });

  describe('getDepositorDeposits():', async () => {
    it('Should return depositors all deposit', async () => {
      await whaleShrimpTroveInit(contracts, signers, false);

      const provideToSP = parseUnits('1000');

      const depositorDeposits_Before = await stabilityPoolManager.getDepositorDeposits(alice);

      await stabilityPoolManager.connect(alice).provideStability([{ tokenAddress: STABLE, amount: provideToSP }]);

      const depositorDeposits = await stabilityPoolManager.getDepositorDeposits(alice);

      await expect(depositorDeposits_Before[0][1] + provideToSP).to.be.equal(depositorDeposits[0][1]);
    });
  });
});
