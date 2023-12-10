import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import { Contracts, connectCoreContracts, deployAndLinkToken, deployCore } from '../utils/deploymentHelpers';
import {
  BorrowerOperationsTester,
  MockDebtToken,
  MockERC20,
  MockPriceFeed,
  StabilityPoolManager,
  StoragePool,
  TroveManager,
} from '../typechain';
import { expect, assert } from 'chai';
import {
  getStabilityPool,
  openTrove,
  assertRevert,
  whaleShrimpTroveInit,
  fastForwardTime,
  TimeValues,
  getEmittedLiquidationValues,
  increaseDebt,
} from '../utils/testHelper';
import { parseUnits } from 'ethers';

describe('SwapOperations', () => {
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

  let STABLE: MockDebtToken;
  let STOCK: MockDebtToken;
  let BTC: MockERC20;
  let USDT: MockERC20;

  let contracts: Contracts;
  let priceFeed: MockPriceFeed;
  let troveManager: TroveManager;
  let borrowerOperations: BorrowerOperationsTester;
  let storagePool: StoragePool;
  let stabilityPoolManager: StabilityPoolManager;

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
  });

  it('should not be possible to mint directly from the borrowerOps', async () => {
    // todo
  });

  it('SwapPair mint/burn should be only callable from the SwapOps', async () => {
    // todo
  });

  describe('liquidity removal', () => {
    it('todo default uniswap tests...', async () => {
      // todo
    });

    it('zero borrower debts (no active trove), default uniswap behavior', async () => {
      // todo
    });

    it('empty trove (only stable gas comp debt), pool should not repay that', async () => {
      // todo
    });

    it('smaller debts, complete repay expected', async () => {
      // todo
    });

    it('huge debts, partial repay expected', async () => {
      // todo
    });
  });
});
