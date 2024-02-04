import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import {
  MockBorrowerOperations,
  MockDebtToken,
  MockERC20,
  MockPriceFeed,
  StabilityPoolManager,
  StoragePool,
  TroveManager,
  SwapPair,
  SwapOperations,
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
  MAX_BORROWING_FEE,
  getLatestBlockTimestamp,
} from '../utils/testHelper';
import { parseUnits } from 'ethers';
import { MockERC20Interface } from '../typechain/contracts/Mock/MockERC20';
import apollonTesting from '../ignition/modules/apollonTesting';

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

  let contracts: any;
  let priceFeed: MockPriceFeed;
  let troveManager: TroveManager;
  let borrowerOperations: MockBorrowerOperations;
  let storagePool: StoragePool;
  let stabilityPoolManager: StabilityPoolManager;
  let swapOperations: SwapOperations;

  const open = async (user: SignerWithAddress, collAmount: bigint, debtAmount: bigint) => {
    return await openTrove({
      from: user,
      contracts,
      collToken: BTC,
      collAmount: collAmount,
      debts: [{ tokenAddress: STABLE, amount: debtAmount }],
    });
  };

  const increase = async (user: SignerWithAddress, debts: any[], maxFeePercentage = MAX_BORROWING_FEE) => {
    return increaseDebt(user, contracts, debts, maxFeePercentage);
  };

  const deadline = async (): Promise<number> => {
    return (await getLatestBlockTimestamp()) + 100;
  };

  const add = async (
    user: SignerWithAddress,
    tokenA: MockERC20,
    tokenB: MockERC20,
    amountA: bigint,
    amountB: bigint,
    create: boolean = false
  ): Promise<SwapPair> => {
    //create pair
    if (create) {
      await swapOperations.connect(owner).createPair(tokenA, tokenB);
    }

    //get pair
    const pairAddress = await swapOperations.getPair(tokenA, tokenB);
    const pair: SwapPair = await ethers.getContractAt('SwapPair', pairAddress);

    //add liquidty to another pair
    await tokenA.unprotectedMint(user, amountA);
    await tokenB.unprotectedMint(user, amountB);
    await tokenA.connect(user).approve(swapOperations, amountA);
    await tokenB.connect(user).approve(swapOperations, amountB);
    await swapOperations.connect(user).addLiquidity(tokenA, tokenB, amountA, amountB, 0, 0, 0, await deadline());

    return pair;
  };

  const tokenAmount = (token: MockDebtToken, amount: bigint) => {
    return {
      tokenAddress: token.getAddress(),
      amount,
    };
  };

  before(async () => {
    signers = await ethers.getSigners();
    [owner, defaulter_1, defaulter_2, defaulter_3, whale, alice, bob, carol, dennis, erin, flyn] = signers;
  });

  beforeEach(async () => {
    // @ts-ignore
    contracts = await ignition.deploy(apollonTesting);

    priceFeed = contracts.priceFeed;
    troveManager = contracts.troveManager;
    borrowerOperations = contracts.borrowerOperations;
    storagePool = contracts.storagePool;
    stabilityPoolManager = contracts.stabilityPoolManager;
    swapOperations = contracts.swapOperations;

    STABLE = contracts.STABLE;
    STOCK = contracts.STOCK;
    BTC = contracts.BTC;
    USDT = contracts.USDT;
  });

  it('should not be possible to mint directly from the borrowerOps', async () => {
    //increase debt
    await expect(
      borrowerOperations
        .connect(alice)
        .increaseDebt(
          alice.getAddress(),
          alice.getAddress(),
          [tokenAmount(STABLE, parseUnits('100'))],
          MAX_BORROWING_FEE
        )
    ).to.be.revertedWithCustomError(borrowerOperations, 'NotFromSwapOps');
  });

  it('SwapPair mint/burn should be only callable from the SwapOps', async () => {
    const amount = parseUnits('1000');

    //open trove
    await open(alice, parseUnits('1', 9), parseUnits('150'));

    //create pair & add liquidity
    const pair = await add(alice, STABLE, STOCK, amount, amount, true);

    //mint
    await expect(pair.connect(alice).mint(alice)).to.be.revertedWithCustomError(pair, 'NotFromSwapOperations');

    //burn
    const balance = await pair.balanceOf(alice);
    await expect(pair.connect(alice).burn(alice, balance, 0, 0)).to.be.revertedWithCustomError(
      pair,
      'NotFromSwapOperations'
    );
  });

  it('liquidity token should not be transferable', async () => {
    const amount = parseUnits('1000');

    //open trove
    await open(alice, parseUnits('1', 9), parseUnits('150'));

    //create pair & add liquidity
    const pair = await add(alice, STABLE, STOCK, amount, amount, true);

    //check if transfer function doesn't exist
    expect((pair as any).transfer).to.be.eql(undefined, 'Transfer function defined');

    //check if transferFrom function doesn't exist
    expect((pair as any).transferFrom).to.be.eql(undefined, 'TransferFrom function defined');
  });

  describe('remove liquidity', () => {
    it.skip('todo default uniswap tests...', async () => {
      // todo
    });

    it.skip('zero borrower debts (no active trove), default uniswap behavior', async () => {
      // todo
    });

    it.skip('empty trove (only stable gas comp debt), pool should not repay that', async () => {
      // todo
    });

    it.skip('smaller debts, complete repay expected', async () => {
      // todo
    });

    it.skip('huge debts, partial repay expected', async () => {
      // todo
    });
  });

  describe('add liquidity', () => {
    it.skip('todo default uniswap tests...', async () => {
      // todo
    });

    it.skip('borrower has enough funds for the op, no trove needed', async () => {
      // todo
    });

    it.skip('low collateral trove, minting should fail because of bad trove CR', async () => {
      // todo
    });

    it.skip('high collateral trove, missing token should be minted from senders trove', async () => {
      // todo
    });
  });

  describe('swaps', () => {
    it.skip('test dynamic swap fee based on oracle/dex price diff', async () => {
      // todo
    });
  });

  describe('positions', () => {
    describe('long', () => {
      it('open without trove, should fail', async () => {
        const amount = parseUnits('1000');

        //open trove (bob)
        await open(bob, parseUnits('1', 9), parseUnits('150'));

        //create pair & add liquidity (bob)
        await add(bob, STABLE, STOCK, amount, amount, true);

        //open long (alice)
        await expect(
          swapOperations
            .connect(alice)
            .openLongPosition(
              parseUnits('100'),
              0,
              STOCK,
              alice,
              await swapOperations.MAX_BORROWING_FEE(),
              await deadline()
            )
        ).to.be.revertedWithCustomError(borrowerOperations, 'TroveClosedOrNotExist');
      });

      it.skip('open with unknown debt token', async () => {
        // todo
      });

      it('open with no enough collateral, should fail', async () => {
        const amount = parseUnits('1000');

        //open troves
        await open(alice, parseUnits('1', 9), parseUnits('150'));
        await open(bob, parseUnits('1'), parseUnits('150'));

        //create pair & add liquidity
        await add(alice, STABLE, STOCK, amount, amount, true);

        //open long
        await expect(
          swapOperations
            .connect(alice)
            .openLongPosition(
              parseUnits('1000000'),
              0,
              STOCK,
              alice,
              await swapOperations.MAX_BORROWING_FEE(),
              await deadline()
            )
        ).to.be.revertedWithCustomError(borrowerOperations, 'ICR_lt_MCR');
      });

      it('open', async () => {
        const amount = parseUnits('1000');

        //open troves
        await open(alice, parseUnits('1', 9), parseUnits('150'));
        await open(bob, parseUnits('1'), parseUnits('150'));

        //create pair & add liquidity
        await add(alice, STABLE, STOCK, amount, amount, true);

        //open long (check balance before and after)
        expect(await STOCK.balanceOf(alice)).to.eq(0);
        await swapOperations
          .connect(alice)
          .openLongPosition(
            parseUnits('1'),
            0,
            STOCK,
            alice,
            await swapOperations.MAX_BORROWING_FEE(),
            await deadline()
          );
        expect(await STOCK.balanceOf(alice)).to.greaterThan(0);
      });
    });
  });
});
