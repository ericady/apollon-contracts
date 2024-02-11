import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import {
  MockBorrowerOperations,
  MockDebtToken,
  MockERC20,
  TroveManager,
  SwapPair,
  SwapOperations,
  TokenManager,
} from '../typechain';
import { expect } from 'chai';
import { openTrove, getLatestBlockTimestamp, setPrice } from '../utils/testHelper';
import { parseUnits } from 'ethers';
import apollonTesting from '../ignition/modules/apollonTesting';

describe('SwapOperations', () => {
  let signers: SignerWithAddress[];
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;

  let STABLE: MockDebtToken;
  let STOCK: MockDebtToken;
  let BTC: MockERC20;
  let ETH: MockERC20;

  let contracts: any;
  let troveManager: TroveManager;
  let borrowerOperations: MockBorrowerOperations;
  let swapOperations: SwapOperations;
  let tokenManager: TokenManager;

  const open = async (user: SignerWithAddress, collAmount: bigint, debtAmount: bigint) => {
    return await openTrove({
      from: user,
      contracts,
      collToken: BTC,
      collAmount: collAmount,
      debts: debtAmount === parseUnits('0') ? [] : [{ tokenAddress: STABLE, amount: debtAmount }],
    });
  };

  const deadline = async (): Promise<number> => {
    return (await getLatestBlockTimestamp()) + 100;
  };

  const add = async (
    user: SignerWithAddress,
    tokenB: MockDebtToken | MockERC20,
    amountA: bigint,
    amountB: bigint,
    mint: boolean = true,
    create: boolean = true
  ): Promise<SwapPair> => {
    //create pair
    if (create) {
      await swapOperations.connect(owner).createPair(STABLE, tokenB);
    }

    //mint
    if (mint) {
      await STABLE.unprotectedMint(user, amountA);
      await tokenB.unprotectedMint(user, amountB);
    }

    //approve
    await STABLE.connect(user).approve(swapOperations, amountA);
    await tokenB.connect(user).approve(swapOperations, amountB);

    //add liquidty to pair
    await swapOperations
      .connect(user)
      .addLiquidity(STABLE, tokenB, amountA, amountB, 0, 0, await mintMeta(), await deadline());

    //get pair
    const pairAddress = await swapOperations.getPair(STABLE, tokenB);
    const pair: SwapPair = await ethers.getContractAt('SwapPair', pairAddress);

    return pair;
  };

  const mintMeta = async (): IBase.MintMetaStruct => {
    return [
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000',
      await swapOperations.MAX_BORROWING_FEE(),
    ];
  };

  const remove = async (signer: SignerWithAddress, tokenB: MockDebtToken | MockERC20, amount: bigint) => {
    //remove liquidity
    await swapOperations
      .connect(signer)
      .removeLiquidity(
        STABLE,
        tokenB,
        amount,
        0,
        0,
        '0x0000000000000000000000000000000000000000',
        '0x0000000000000000000000000000000000000000',
        await deadline()
      );
  };

  const tokenAmount = (token: MockDebtToken, amount: bigint) => {
    return {
      tokenAddress: token.getAddress(),
      amount,
    };
  };

  before(async () => {
    signers = await ethers.getSigners();
    [owner, alice, bob] = signers;
  });

  beforeEach(async () => {
    // @ts-ignore
    contracts = await ignition.deploy(apollonTesting);

    troveManager = contracts.troveManager;
    borrowerOperations = contracts.borrowerOperations;
    swapOperations = contracts.swapOperations;
    tokenManager = contracts.tokenManager;

    STABLE = contracts.STABLE;
    STOCK = contracts.STOCK;
    BTC = contracts.BTC;
    ETH = contracts.ETH;
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
          await mintMeta()
        )
    ).to.be.revertedWithCustomError(borrowerOperations, 'NotFromSwapOps');
  });

  it('SwapPair mint/burn should be only callable from the SwapOps', async () => {
    const amount = parseUnits('1000');

    //open trove
    await open(alice, parseUnits('1', 9), parseUnits('150'));

    //create pair & add liquidity
    const pair = await add(alice, STOCK, amount, amount, true, true);

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
    const pair = await add(alice, STOCK, amount, amount, true, true);

    //check if transfer function doesn't exist
    expect((pair as any).transfer).to.be.eql(undefined, 'Transfer function defined');

    //check if transferFrom function doesn't exist
    expect((pair as any).transferFrom).to.be.eql(undefined, 'TransferFrom function defined');
  });

  describe('remove liquidity', () => {
    it('default uniswap tests', async () => {
      const amount = parseUnits('1000');

      //create pair & add liquidity (alice)
      const pair = await add(alice, STOCK, amount, amount, true, true);

      //remove liquidity
      await remove(alice, STOCK, await pair.balanceOf(alice));
      expect(await pair.balanceOf(alice)).to.be.equal(0);
      expect(await STABLE.balanceOf(alice)).to.be.greaterThan(0);
      expect(await STOCK.balanceOf(alice)).to.be.greaterThan(0);
    });

    it('zero borrower debts (no active trove), default uniswap behavior', async () => {
      const amount = parseUnits('1000');

      //create pair & add liquidity (alice)
      const pair = await add(alice, STOCK, amount, amount, true, true);

      //remove liquidity
      await remove(alice, STOCK, await pair.balanceOf(alice));
      expect(await pair.balanceOf(alice)).to.be.equal(0);
    });

    it('empty trove (only stable gas comp debt), pool should not repay that', async () => {
      const amount = parseUnits('1000');

      //open trove
      await open(alice, parseUnits('1', 9), parseUnits('0'));

      //create pair & add liquidity (alice)
      const pair = await add(alice, STOCK, amount, amount, true, true);

      //remove liquidity
      await remove(alice, STOCK, await pair.balanceOf(alice));
      expect(await pair.balanceOf(alice)).to.be.equal(0);
    });

    it('smaller debts, complete repay expected', async () => {
      const amount = parseUnits('1000');

      //open trove
      await open(alice, parseUnits('1', 9), parseUnits('150'));

      //create pair & add liquidity (alice)
      const pair = await add(alice, STOCK, amount, amount, true, true);

      //remove liquidity
      await remove(alice, STOCK, await pair.balanceOf(alice));
      expect(await pair.balanceOf(alice)).to.be.equal(0);
      expect(await troveManager.getTroveRepayableDebt(alice, STABLE, false)).to.be.equal(0);
    });

    it('huge debts, partial repay expected', async () => {
      const amount = parseUnits('1000');

      //open trove
      await open(bob, parseUnits('1', 9), parseUnits('150'));
      await open(alice, parseUnits('1', 9), parseUnits('15000'));

      //create pair & add liquidity (alice)
      const pair = await add(alice, STOCK, amount, amount, true, true);

      //remove liquidity
      await remove(alice, STOCK, await pair.balanceOf(alice));
      expect(await pair.balanceOf(alice)).to.be.equal(0);
      expect(await troveManager.getTroveRepayableDebt(alice, STABLE, false)).to.be.greaterThan(0);
    });
  });

  describe('add liquidity', () => {
    it('default uniswap tests', async () => {
      const amount = parseUnits('1000');

      //create pair & add liquidity
      const pair = await add(alice, STOCK, amount, amount, true, true);
      expect(await STABLE.balanceOf(alice)).to.be.equal(0);
      expect(await STOCK.balanceOf(alice)).to.be.equal(0);

      //check reserves
      const res = await pair.getReserves();
      expect(res._reserve0).to.be.equal(res._reserve1);
    });

    it('borrower has enough funds for the op, no trove needed', async () => {
      const amount = parseUnits('1000');

      //create pair & add liquidity (bob)
      await add(bob, STOCK, amount, amount, true, true);

      //add liquidty (alice)
      const pair = await add(alice, STOCK, amount, amount, true, false);
      expect(await pair.balanceOf(alice)).to.be.greaterThan(0);
    });

    it('low collateral trove, minting should fail because of bad trove CR', async () => {
      const amount = parseUnits('1000');

      //create pair & add liquidity (bob)
      await add(bob, STOCK, amount, amount, true, true);

      //open troves
      await open(alice, parseUnits('1', 8), parseUnits('150'));

      //add liquidity (alice)
      await expect(add(alice, STOCK, amount, amount, false, false)).to.be.revertedWithCustomError(
        borrowerOperations,
        'ICR_lt_MCR'
      );
    });

    it('high collateral trove, missing token should be minted from senders trove', async () => {
      const amount = parseUnits('1000');

      //create pair & add liquidity (bob)
      await add(bob, STOCK, amount, amount, true, true);

      //open trove (alice)
      await open(alice, parseUnits('1000', 8), parseUnits('150'));

      //add liquidity without tokens (alice)
      const pair = await add(alice, STOCK, amount, amount, false, false);
      expect(await pair.balanceOf(alice)).to.be.greaterThan(0);
    });
  });

  describe('swaps', () => {
    it('test dynamic swap fee based on oracle/dex price diff', async () => {
      //open troves
      await open(alice, parseUnits('1', 9), parseUnits('150'));

      //create pair & add liquidity
      const pair = await add(
        alice,
        STOCK,
        parseUnits('15000'), //100 Stocks at price of 150$
        parseUnits('100'),
        true,
        true
      );

      //check initial fee
      const baseFee = await pair.SWAP_BASE_FEE();
      expect(await pair.getSwapFee()).to.be.eq(baseFee);

      //check dex price > oracle price
      await setPrice('STOCK', '140', contracts);
      expect(await pair.getSwapFee()).to.be.eq(baseFee);

      //check dex price < oracle price
      await setPrice('STOCK', '160', contracts);
      expect(await pair.getSwapFee()).to.not.be.eq(baseFee);
    });
  });

  describe('positions', () => {
    describe('long', () => {
      it('open without trove, should fail', async () => {
        const amount = parseUnits('1000');

        //open trove (bob)
        await open(bob, parseUnits('1', 9), parseUnits('150'));

        //create pair & add liquidity (bob)
        await add(bob, STOCK, amount, amount, true, true);

        //open STOCK long (alice)
        await expect(
          swapOperations
            .connect(alice)
            .openLongPosition(parseUnits('100'), 0, STOCK, alice, await mintMeta(), await deadline())
        ).to.be.revertedWithCustomError(borrowerOperations, 'TroveClosedOrNotExist');
      });

      it('open with unknown debt token', async () => {
        const amount = parseUnits('1000');

        //open troves
        await open(alice, parseUnits('1', 9), parseUnits('150'));
        await open(bob, parseUnits('1'), parseUnits('150'));

        //create pair & add liquidity
        await add(alice, BTC, amount, amount, true, true);

        //open BTC long (check balance before and after)
        expect(await BTC.balanceOf(alice)).to.eq(parseUnits('0'));
        await swapOperations
          .connect(alice)
          .openLongPosition(parseUnits('1'), 0, BTC, alice, await mintMeta(), await deadline());
        expect(await BTC.balanceOf(alice)).to.greaterThan(parseUnits('0'));

        //open ETH long
        expect(
          swapOperations
            .connect(alice)
            .openLongPosition(parseUnits('1'), 0, ETH, alice, await mintMeta(), await deadline())
        ).to.be.revertedWithCustomError(swapOperations, 'PairDoesNotExist');
      });

      it('open with no enough collateral, should fail', async () => {
        const amount = parseUnits('1000');

        //open troves
        await open(alice, parseUnits('1', 9), parseUnits('150'));
        await open(bob, parseUnits('1'), parseUnits('150'));

        //create pair & add liquidity
        await add(alice, STOCK, amount, amount, true, true);

        //open STOCK long
        await expect(
          swapOperations
            .connect(alice)
            .openLongPosition(parseUnits('1000000'), 0, STOCK, alice, await mintMeta(), await deadline())
        ).to.be.revertedWithCustomError(borrowerOperations, 'ICR_lt_MCR');
      });

      it('open', async () => {
        const amount = parseUnits('1000');

        //open troves
        await open(alice, parseUnits('1', 9), parseUnits('150'));
        await open(bob, parseUnits('1'), parseUnits('150'));

        //create pair & add liquidity
        await add(alice, STOCK, amount, amount, true, true);

        //open STOCK long (check balance before and after)
        expect(await STOCK.balanceOf(alice)).to.eq(parseUnits('0'));
        await swapOperations
          .connect(alice)
          .openLongPosition(parseUnits('1'), 0, STOCK, alice, await mintMeta(), await deadline());
        expect(await STOCK.balanceOf(alice)).to.greaterThan(parseUnits('0'));
      });
    });

    describe('short', () => {
      it('open without trove, should fail', async () => {
        const amount = parseUnits('1000');

        //open trove (bob)
        await open(bob, parseUnits('1', 9), parseUnits('150'));

        //create pair & add liquidity (bob)
        await add(bob, STOCK, amount, amount, true, true);

        //open STOCK short (alice)
        await expect(
          swapOperations
            .connect(alice)
            .openShortPosition(parseUnits('100'), 0, STOCK, alice, await mintMeta(), await deadline())
        ).to.be.revertedWithCustomError(borrowerOperations, 'TroveClosedOrNotExist');
      });

      it('open with unknown debt token (should fail)', async () => {
        const amount = parseUnits('1000');

        //open troves
        await open(alice, parseUnits('1', 9), parseUnits('150'));
        await open(bob, parseUnits('1'), parseUnits('150'));

        //create pair & add liquidity
        await add(alice, BTC, amount, amount, true, true);

        //open BTC short
        expect(
          swapOperations
            .connect(alice)
            .openShortPosition(parseUnits('1'), 0, BTC, alice, await mintMeta(), await deadline())
        ).to.be.revertedWithCustomError(tokenManager, 'InvalidDebtToken');
      });

      it('open with no enough collateral, should fail', async () => {
        const amount = parseUnits('1000');

        //open troves
        await open(alice, parseUnits('1', 9), parseUnits('150'));
        await open(bob, parseUnits('1'), parseUnits('150'));

        //create pair & add liquidity
        await add(alice, STOCK, amount, amount, true, true);

        //open STOCK short
        await expect(
          swapOperations
            .connect(alice)
            .openShortPosition(parseUnits('1000000'), 0, STOCK, alice, await mintMeta(), await deadline())
        ).to.be.revertedWithCustomError(borrowerOperations, 'ICR_lt_MCR');
      });

      it('open', async () => {
        const amount = parseUnits('1000');

        //open troves
        await open(alice, parseUnits('1', 9), parseUnits('150'));
        await open(bob, parseUnits('1'), parseUnits('150'));

        //create pair & add liquidity
        await add(alice, STOCK, amount, amount, true, true);

        //open short (check balance before and after)
        expect(await STABLE.balanceOf(alice)).to.eq(parseUnits('150')); //initial debts
        await swapOperations
          .connect(alice)
          .openShortPosition(parseUnits('1'), 0, STOCK, alice, await mintMeta(), await deadline());
        expect(await STABLE.balanceOf(alice)).to.greaterThan(parseUnits('150')); //initial debts
      });
    });
  });
});
