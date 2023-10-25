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
import { assert, expect } from 'chai';

describe('DebtToken', () => {
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

    await borrowerOperations.setDebtToken(STABLE);
    await stabilityPoolManager.setDebtToken(STABLE);
  });

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

  it("version(): returns the token contract's version", async () => {
    const version = await STABLE.version();
    assert.equal(version, '1');
  });

  it('isStableCoin(): returns true if token is initialized as stable or false if not', async () => {
    const isStableCointStable = await STABLE.isStableCoin();
    assert.isTrue(isStableCointStable);

    const isStockTokenStable = await STOCK.isStableCoin();
    assert.isFalse(isStockTokenStable);
  });

  // TODO: Can I test this more usefully here?
  it('Initializes PERMIT_TYPEHASH correctly', async () => {
    const hash = await STABLE.permitTypeHash();
    assert.equal(hash, '0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9');
  });

  describe('approve()', () => {
    it('approve(): reverts when owner param is address(0)', async () => {
      const txPromise = STABLE.approve(ethers.ZeroAddress, 100);
      await assertRevert(txPromise);
    });

    // TODO: Is it possible to mock msg.sender
    it.skip('approve(): reverts when spender param is address(0)', async () => {
      // const txPromise = lusdTokenTester.approve(ZERO_ADDRESS, 100, {
      //   from: bob,
      // });
      // await assertAssert(txPromise);
    });

    it('approve(): emits "Approval" event with expected arguments', async () => {
      const tx = STABLE.approve(alice, 100);

      await expect(tx).to.emit(STABLE, 'Approval').withArgs(owner.address, alice.address, 100);
    });

    it("allowance(): returns an account's spending allowance for another account's balance", async () => {
      const allowance_before = await STABLE.allowance(owner, alice);
      assert.equal(allowance_before, 0);

      await STABLE.approve(alice, 100);

      const allowance_after = await STABLE.allowance(owner, alice);
      assert.equal(allowance_after, 100);
    });
  });

  describe('transferFrom()', () => {
    it('transferFrom(): reverts if recipient is ZeroAddress', async () => {
      const tx = STABLE.transferFrom(alice, ethers.ZeroAddress, 40);

      await assertRevert(tx, 'ZeroAddress');
    });

    it('transferFrom(): reverts if recipient is self', async () => {
      const tx = STABLE.transferFrom(alice, STABLE, 40);

      await assertRevert(tx, 'ZeroAddress');
    });

    it('transferFrom(): reverts if recipient is stabilityPoolManagerAddress or troveManagerAddress, borrowerOperationsAddress', async () => {
      const txSPM = STABLE.transferFrom(alice, stabilityPoolManager, 40);
      await assertRevert(txSPM, 'NotAllowedDirectTransfer');

      const txTM = STABLE.transferFrom(alice, troveManager, 40);
      await assertRevert(txTM, 'NotAllowedDirectTransfer');

      const txBO = STABLE.transferFrom(alice, borrowerOperations, 40);
      await assertRevert(txBO, 'NotAllowedDirectTransfer');
    });

    it('transferFrom(): reverts if more is transfered than allowed', async () => {
      await borrowerOperations.testDebtToken_mint(owner, 100);
      await STABLE.approve(alice, 40);

      const tx = STABLE.connect(alice).transferFrom(owner, bob, 41);

      await assertRevert(tx);
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
  });

  describe('transfer()', () => {
    it('transfer(): reverts if recipient is ZeroAddress', async () => {
      const tx = STABLE.transfer(ethers.ZeroAddress, 40);

      await assertRevert(tx, 'ZeroAddress');
    });

    it('transfer(): reverts if recipient is self', async () => {
      const tx = STABLE.transfer(STABLE, 40);

      await assertRevert(tx, 'ZeroAddress');
    });

    it('transfer(): reverts if recipient is stabilityPoolManagerAddress or troveManagerAddress, borrowerOperationsAddress', async () => {
      const txSPM = STABLE.transfer(stabilityPoolManager, 40);
      await assertRevert(txSPM, 'NotAllowedDirectTransfer');

      const txTM = STABLE.transfer(troveManager, 40);
      await assertRevert(txTM, 'NotAllowedDirectTransfer');

      const txBO = STABLE.transfer(borrowerOperations, 40);
      await assertRevert(txBO, 'NotAllowedDirectTransfer');
    });

    it("transfer(): reverts if amount exceeds sender's balance", async () => {
      await borrowerOperations.testDebtToken_mint(owner, 100);

      const txPromise = STABLE.transfer(alice, 101);

      await assertRevert(txPromise, 'InsufficientBalance');
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

    it('transfer(): emits "Transfer" event with expected arguments', async () => {
      await borrowerOperations.testDebtToken_mint(owner, 40);

      const tx = STABLE.transfer(alice, 40);

      await expect(tx).to.emit(STABLE, 'Transfer').withArgs(owner.address, alice.address, 40);
    });
  });

  it("increaseAllowance(): increases an account's allowance by the correct amount", async () => {
    const allowance_A_Before = await STABLE.allowance(owner, alice);
    assert.equal(allowance_A_Before, 0);

    await STABLE.increaseAllowance(alice, 100);

    const allowance_A_After = await STABLE.allowance(owner, alice);
    assert.equal(allowance_A_After, 100);
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

  describe('mint()', () => {
    it('mint(): issues correct amount of tokens to the given address', async () => {
      const alice_balanceBefore = await STABLE.balanceOf(alice);
      assert.equal(alice_balanceBefore, 0);

      await borrowerOperations.testDebtToken_mint(alice, 100);

      const alice_balanceAfter = await STABLE.balanceOf(alice);
      assert.equal(alice_balanceAfter, 100);
    });

    it('mint(): increases totalAmount incrementally', async () => {
      const totalSupply_before = await STABLE.totalSupply();
      assert.equal(totalSupply_before, 0);

      await borrowerOperations.testDebtToken_mint(alice, 100);
      await borrowerOperations.testDebtToken_mint(bob, 50);

      const totalSupply_after = await STABLE.totalSupply();
      assert.equal(totalSupply_after, 150);
    });

    it('mint(): reverts if not borrowerOperations', async () => {
      const tx = STABLE.mint(alice, 100);

      await assertRevert(tx, 'NotFromBorrowerOps');
    });

    it('mint(): reverts if account is ZeroAddress', async () => {
      const tx = borrowerOperations.testDebtToken_mint(ethers.ZeroAddress, 100);

      await assertRevert(tx);
    });

    it('mint(): emits "Transfer" event with expected arguments', async () => {
      const tx = borrowerOperations.testDebtToken_mint(alice, 100);

      await expect(tx).to.emit(STABLE, 'Transfer').withArgs(ethers.ZeroAddress, alice.address, 100);
    });
  });

  describe('burn()', () => {
    it('burn(): burns correct amount of tokens from the given address', async () => {
      await borrowerOperations.testDebtToken_mint(alice, 100);
      await borrowerOperations.testDebtToken_burn(alice, 70);

      const alice_BalanceAfter = await STABLE.balanceOf(alice);
      assert.equal(alice_BalanceAfter, 30);
    });

    it('burn(): reverts if not borrowerOperations or troveManager or stabilityPoolManger', async () => {
      const tx = STABLE.burn(alice, 100);

      await assertRevert(tx, 'NotFromBOorTroveMorSP');
    });

    it('burn(): reverts if account is ZeroAddress', async () => {
      const tx = STABLE.burn(ethers.ZeroAddress, 100);

      await assertRevert(tx);
    });

    it('burn(): reduces totalAmount incrementally', async () => {
      await borrowerOperations.testDebtToken_mint(alice, 100);
      await borrowerOperations.testDebtToken_mint(bob, 50);

      const totalSupply_before = await STABLE.totalSupply();
      assert.equal(totalSupply_before, 150);

      await borrowerOperations.testDebtToken_burn(alice, 50);
      await borrowerOperations.testDebtToken_burn(bob, 25);

      const totalSupply_after = await STABLE.totalSupply();
      assert.equal(totalSupply_after, 75);
    });

    it('burn(): emits "Transfer" event with expected arguments', async () => {
      await borrowerOperations.testDebtToken_mint(alice, 100);
      const tx = borrowerOperations.testDebtToken_burn(alice, 100);

      await expect(tx).to.emit(STABLE, 'Transfer').withArgs(alice.address, ethers.ZeroAddress, 100);
    });
  });

  describe('sendToPool()', () => {
    it('sendToPool(): changes balances of Stability pool and user by the correct amounts', async () => {
      await borrowerOperations.testDebtToken_mint(alice, 100);

      await stabilityPoolManager.testDebtToken_sendToPool(alice, bob, 75);

      const alice_balanceAfter = await STABLE.balanceOf(alice);
      assert.equal(alice_balanceAfter, 25);

      const bob_balanceAfter = await STABLE.balanceOf(bob);
      assert.equal(bob_balanceAfter, 75);
    });

    it('sendToPool(): reverts if not stabilityPoolManger', async () => {
      const tx = STABLE.sendToPool(alice, bob, 75);

      await assertRevert(tx, 'NotFromSPManager');
    });
  });

  it.skip('returnFromPool(): changes balances of Stability pool and user by the correct amounts', async () => {
    //   TODO: Can the original implementation still be tested?
  });

  // TODO: Can I test this better. Original implementation seems useless.
  it.skip('DOMAIN_SEPARATOR remains unchanged', async () => {
    const domainSeparator = await STABLE.domainSeparator();

    assert.equal(domainSeparator, '0xb818b099015716584ffb41e7c25a7c873e22a118e5365f304cf5d2b1e475c13a');
  });

  it('Initial nonce for a given address is 0', async () => {
    const alicesNonde = await STABLE.nonces(alice);

    assert.equal(alicesNonde, 0);
  });

  // TODO: How to test this with modern hardhat
  it.skip('permits and emits an Approval event (replay protected)', async () => {});

  // TODO: Add other permit tests once there is a usable signature.
});
