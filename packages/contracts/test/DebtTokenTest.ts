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
import { AbiCoder, keccak256, toUtf8Bytes } from 'ethers';

const PERMIT_TYPEHASH = keccak256(
  toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')
);

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

  const getDomainSeparator = (name: string, contractAddress: string, chainId: bigint, version: string) => {
    const abiCoder = AbiCoder.defaultAbiCoder();
    return ethers.keccak256(
      abiCoder.encode(
        ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
        [
          ethers.keccak256(
            ethers.toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')
          ),
          ethers.keccak256(ethers.toUtf8Bytes(name)),
          ethers.keccak256(ethers.toUtf8Bytes(version)),
          parseInt(chainId.toString()),
          contractAddress.toLowerCase(),
        ]
      )
    );
  };

  const getPermitDigest = (
    name: string,
    address: string,
    chainId: bigint,
    version: string,
    owner: string,
    spender: string,
    value: bigint,
    nonce: bigint,
    deadline: bigint | number
  ) => {
    const abiCoder = AbiCoder.defaultAbiCoder();
    const DOMAIN_SEPARATOR = getDomainSeparator(name, address, chainId, version);

    const defaultABIencoded = abiCoder.encode(
      ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
      [PERMIT_TYPEHASH, owner, spender, value, nonce, deadline]
    );
    console.log('defaultABIencoded', defaultABIencoded);

    return ethers.keccak256(
      ethers.solidityPacked(
        ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
        [
          '0x19',
          '0x01',
          DOMAIN_SEPARATOR,
          ethers.keccak256(
            abiCoder.encode(
              ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
              [PERMIT_TYPEHASH, owner, spender, value, nonce, deadline]
            )
          ),
        ]
      )
    );
  };

  it('balanceOf(): gets the balance of the account', async () => {
    // mint some debt tokens for alice
    await borrowerOperations.testDebtToken_mint(alice, 1);

    const aliceBalance = await STABLE.balanceOf(alice);
    assert.equal(aliceBalance, 1n);

    const bobBalance = await STABLE.balanceOf(bob);
    assert.equal(bobBalance, 0n);
  });

  it('totalSupply(): gets the total supply', async () => {
    // mint some debt tokens to increase total supply
    await borrowerOperations.testDebtToken_mint(alice, 1);
    await borrowerOperations.testDebtToken_mint(bob, 2);

    const totalSupply = await STABLE.totalSupply();
    assert.equal(totalSupply, 3n);
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
    assert.equal(decimals, 18n);
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
      assert.equal(allowance_before, 0n);

      await STABLE.approve(alice, 100);

      const allowance_after = await STABLE.allowance(owner, alice);
      assert.equal(allowance_after, 100n);
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
      assert.equal(bobBalance_before, 0n);

      await STABLE.connect(alice).transferFrom(owner, bob, 90);

      const bobBalance_after = await STABLE.balanceOf(bob);
      assert.equal(bobBalance_after, 90n);

      const myBalance = await STABLE.balanceOf(owner);
      assert.equal(myBalance, 10n);
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
      assert.equal(aliceBalance_before, 0n);

      await STABLE.transfer(alice, 40);

      const aliceBalance_after = await STABLE.balanceOf(alice);
      assert.equal(aliceBalance_after, 40n);

      const myBalance = await STABLE.balanceOf(owner);
      assert.equal(myBalance, 60n);
    });

    it('transfer(): emits "Transfer" event with expected arguments', async () => {
      await borrowerOperations.testDebtToken_mint(owner, 40);

      const tx = STABLE.transfer(alice, 40);

      await expect(tx).to.emit(STABLE, 'Transfer').withArgs(owner.address, alice.address, 40);
    });
  });

  it("increaseAllowance(): increases an account's allowance by the correct amount", async () => {
    const allowance_A_Before = await STABLE.allowance(owner, alice);
    assert.equal(allowance_A_Before, 0n);

    await STABLE.increaseAllowance(alice, 100);

    const allowance_A_After = await STABLE.allowance(owner, alice);
    assert.equal(allowance_A_After, 100n);
  });

  it('decreaseAllowance(): decreases allowance by the expected amount', async () => {
    await STABLE.approve(alice, 100);

    await STABLE.decreaseAllowance(alice, 25);

    const alice_allowanceAfter = await STABLE.allowance(owner, alice);
    assert.equal(alice_allowanceAfter, 75n);
  });

  it('decreaseAllowance(): fails trying to decrease more than previously allowed', async () => {
    await STABLE.approve(alice, 100);

    const tx = STABLE.decreaseAllowance(alice, 101);

    await assertRevert(tx);
  });

  describe('mint()', () => {
    it('mint(): issues correct amount of tokens to the given address', async () => {
      const alice_balanceBefore = await STABLE.balanceOf(alice);
      assert.equal(alice_balanceBefore, 0n);

      await borrowerOperations.testDebtToken_mint(alice, 100);

      const alice_balanceAfter = await STABLE.balanceOf(alice);
      assert.equal(alice_balanceAfter, 100n);
    });

    it('mint(): increases totalAmount incrementally', async () => {
      const totalSupply_before = await STABLE.totalSupply();
      assert.equal(totalSupply_before, 0n);

      await borrowerOperations.testDebtToken_mint(alice, 100);
      await borrowerOperations.testDebtToken_mint(bob, 50);

      const totalSupply_after = await STABLE.totalSupply();
      assert.equal(totalSupply_after, 150n);
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
      assert.equal(alice_BalanceAfter, 30n);
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
      assert.equal(totalSupply_before, 150n);

      await borrowerOperations.testDebtToken_burn(alice, 50);
      await borrowerOperations.testDebtToken_burn(bob, 25);

      const totalSupply_after = await STABLE.totalSupply();
      assert.equal(totalSupply_after, 75n);
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
      assert.equal(alice_balanceAfter, 25n);

      const bob_balanceAfter = await STABLE.balanceOf(bob);
      assert.equal(bob_balanceAfter, 75n);
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
  it('DOMAIN_SEPARATOR remains unchanged', async () => {
    const domainSeparator = await STABLE.domainSeparator();

    const tokenName = await STABLE.name();
    const version = await STABLE.version();
    const chainId = await STABLE.getChainId();
    const generatedDomain = getDomainSeparator(tokenName, STABLE.target.toString(), chainId, version);

    assert.equal(domainSeparator, generatedDomain);
  });

  it('Initial nonce for a given address is 0', async () => {
    const alicesNonde = await STABLE.nonces(alice);

    assert.equal(alicesNonde, 0n);
  });

  it.only('permits and emits an Approval event (replay protected)', async () => {
    const tokenName = await STABLE.name();
    const version = await STABLE.version();
    const chainId = await STABLE.getChainId();
    const nonce = await STABLE.nonces(alice);
    const deadline = 100000000000000;
    const value = 1n;

    const digest = getPermitDigest(
      tokenName,
      STABLE.target.toString(),
      chainId,
      version,
      alice.address,
      bob.address,
      value,
      nonce,
      deadline
    );

    const signature = await alice.signMessage(digest);
    const r = signature.slice(0, 66);
    const s = '0x' + signature.slice(66, 130);
    const v = '0x' + signature.slice(130, 132);

    const returnEncoded = await STABLE.testPermit(alice, bob, value, deadline, v, r, s);
    console.log('returnEncoded', returnEncoded.data);
  });

  // TODO: Add other permit tests once there is a usable signature.
});
