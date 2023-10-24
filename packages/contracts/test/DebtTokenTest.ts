import { ethers } from 'hardhat';
import {
  MockDebtToken,
  MockERC20,
  MockPriceFeed,
  TroveManager,
  StoragePool,
  BorrowerOperationsTester,
  StabilityPoolManagerTester,
} from '../typechain';
import { Contracts, deployCore, connectCoreContracts, deployAndLinkToken } from '../utils/deploymentHelpers';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { assertRevert } from '../utils/testHelper';
import { assert } from 'chai';

describe.only('DebtToken', () => {
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

  let borrowerOperations: BorrowerOperationsTester;

  let stabilityPoolManager: StabilityPoolManagerTester;

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

  beforeEach(async () => {
    contracts = await deployCore();
    await commonSetup(contracts);

    await borrowerOperations.setDebtToken(STABLE);
    await stabilityPoolManager.setDebtToken(STABLE);
  });

  describe('DebtToken Mechanisms', () => {
    it('balanceOf(): gets the balance of the account', async () => {
      // mint some debt tokens for alice
      await borrowerOperations.testDebtToken_mint(alice, 1);

      const aliceBalance = await STABLE.balanceOf(alice);
      assert.equal(aliceBalance, 1);

      const bobBalance = await STABLE.balanceOf(bob);
      assert.equal(bobBalance, 0);
    });

    it('totalSupply(): gets the total supply', async () => {
      // mint some debt tokens to increase total supply
      await borrowerOperations.testDebtToken_mint(alice, 1);
      await borrowerOperations.testDebtToken_mint(bob, 2);

      const totalSupply = await STABLE.totalSupply();
      assert.equal(totalSupply, 3);
    });

    it("name(): returns the token's name", async () => {
      const name = await STABLE.name();
      assert.equal(name, 'STABLE');
    });

    it("symbol(): returns the token's symbol", async () => {
      const symbol = await STABLE.symbol();
      assert.equal(symbol, 'STABLE');
    });

    it('decimal(): returns the number of decimal digits used', async () => {
      const decimals = await STABLE.decimals();
      assert.equal(decimals, 18);
    });

    it("allowance(): returns an account's spending allowance for another account's balance", async () => {
      const allowance_before = await STABLE.allowance(owner, alice);
      assert.equal(allowance_before, 0);

      await STABLE.approve(alice, 100);

      const allowance_after = await STABLE.allowance(owner, alice);
      assert.equal(allowance_after, 100);
    });

    // TODO: Is it possible to mock msg.sender
    it.skip('approve(): reverts when spender param is address(0)', async () => {
      // const txPromise = lusdTokenTester.approve(ZERO_ADDRESS, 100, {
      //   from: bob,
      // });
      // await assertAssert(txPromise);
    });

    it('approve(): reverts when owner param is address(0)', async () => {
      const txPromise = STABLE.approve(ethers.ZeroAddress, 100);
      await assertRevert(txPromise);
    });

    it('transferFrom(): successfully transfers from an account which is it approved to transfer from', async () => {
      await borrowerOperations.testDebtToken_mint(owner, 100);
      await STABLE.approve(alice, 100);

      const bobBalance_before = await STABLE.balanceOf(bob);
      assert.equal(bobBalance_before, 0);

      await STABLE.connect(alice).transferFrom(owner, bob, 90);

      const bobBalance_after = await STABLE.balanceOf(bob);
      assert.equal(bobBalance_after, 90);

      const myBalance = await STABLE.balanceOf(owner);
      assert.equal(myBalance, 10);
    });

    it("transfer(): increases the recipient's balance by the correct amount", async () => {
      await borrowerOperations.testDebtToken_mint(owner, 100);

      const aliceBalance_before = await STABLE.balanceOf(alice);
      assert.equal(aliceBalance_before, 0);

      await STABLE.transfer(alice, 40);

      const aliceBalance_after = await STABLE.balanceOf(alice);
      assert.equal(aliceBalance_after, 40);

      const myBalance = await STABLE.balanceOf(owner);
      assert.equal(myBalance, 60);
    });

    it("transfer(): reverts if amount exceeds sender's balance", async () => {
      await borrowerOperations.testDebtToken_mint(owner, 100);

      const txPromise = STABLE.transfer(alice, 101);

      await assertRevert(txPromise, 'InsufficientBalance');
    });

    it('transfer(): transferring to a blacklisted address reverts', async () => {
      await borrowerOperations.testDebtToken_mint(owner, 100);

      await assertRevert(STABLE.transfer(STABLE.target, 1));
      await assertRevert(STABLE.transfer(ethers.ZeroAddress, 1));
      await assertRevert(STABLE.transfer(troveManager.target, 1));
      await assertRevert(STABLE.transfer(stabilityPoolManager.target, 1));
      await assertRevert(STABLE.transfer(borrowerOperations.target, 1));
    });

    it("increaseAllowance(): increases an account's allowance by the correct amount", async () => {
      const allowance_A_Before = await STABLE.allowance(owner, alice);
      assert.equal(allowance_A_Before, 0);

      await STABLE.increaseAllowance(alice, 100);

      const allowance_A_After = await STABLE.allowance(owner, alice);
      assert.equal(allowance_A_After, 100);
    });

    it('mint(): issues correct amount of tokens to the given address', async () => {
      const alice_balanceBefore = await STABLE.balanceOf(alice);
      assert.equal(alice_balanceBefore, 0);

      await borrowerOperations.testDebtToken_mint(owner, 100);

      const alice_balanceAfter = await STABLE.balanceOf(alice);
      assert.equal(alice_balanceAfter, 0);
    });

    it('burn(): burns correct amount of tokens from the given address', async () => {
      await borrowerOperations.testDebtToken_mint(alice, 100);
      await borrowerOperations.testDebtToken_burn(alice, 70);

      const alice_BalanceAfter = await STABLE.balanceOf(alice);
      assert.equal(alice_BalanceAfter, 30);
    });

    it('sendToPool(): changes balances of Stability pool and user by the correct amounts', async () => {
      await borrowerOperations.testDebtToken_mint(alice, 100);

      await stabilityPoolManager.testDebtToken_sendToPool(alice, bob, 75);

      const alice_balanceAfter = await STABLE.balanceOf(alice);
      assert.equal(alice_balanceAfter, 25);

      const bob_balanceAfter = await STABLE.balanceOf(bob);
      assert.equal(bob_balanceAfter, 75);
    });

    it.skip('returnFromPool(): changes balances of Stability pool and user by the correct amounts', async () => {
      //   TODO: Can the original implementation still be tested?
    });

    it('decreaseAllowance(): decreases allowance by the expected amount', async () => {
      await STABLE.approve(alice, 100);

      await STABLE.decreaseAllowance(alice, 25);

      const alice_allowanceAfter = await STABLE.allowance(owner, alice);
      assert.equal(alice_allowanceAfter, 75);
    });

    it('decreaseAllowance(): fails trying to decrease more than previously allowed', async () => {
      await STABLE.approve(alice, 100);

      const tx = STABLE.decreaseAllowance(alice, 101);

      await assertRevert(tx);
    });
  });
});
