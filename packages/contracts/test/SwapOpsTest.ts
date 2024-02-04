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
  DebtTokenManager
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

describe.only('SwapOperations', () => {
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
  let ETH: MockERC20;
  let USDT: MockERC20;

  let contracts: any;
  let priceFeed: MockPriceFeed;
  let troveManager: TroveManager;
  let borrowerOperations: MockBorrowerOperations;
  let storagePool: StoragePool;
  let stabilityPoolManager: StabilityPoolManager;
  let swapOperations: SwapOperations;
  let debtTokenManager: DebtTokenManager;

  const open = async (user: SignerWithAddress, collAmount: bigint, debtAmount: bigint) => {
    return await openTrove({
      from: user,
      contracts,
      collToken: BTC,
      collAmount: collAmount,
      debts: (debtAmount === parseUnits('0')
        ? []
        : [{ tokenAddress: STABLE, amount: debtAmount }]
      ),
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
    mint: boolean = true, 
    create: boolean = true
  ) : Promise<SwapPair> => {
    //create pair
    if (create)
    {
      await swapOperations.connect(owner).createPair(
        tokenA,
        tokenB
      );
    }    

    //mint
    if (mint)
    {
      await tokenA.unprotectedMint(user, amountA);
      await tokenB.unprotectedMint(user, amountB);
    }

    //approve
    await tokenA.connect(user).approve(swapOperations, amountA);
    await tokenB.connect(user).approve(swapOperations, amountB);

    //add liquidty to pair
    await swapOperations.connect(user).addLiquidity(
      tokenA,
      tokenB,
      amountA,
      amountB,
      0,
      0,
      await swapOperations.MAX_BORROWING_FEE(),
      await deadline()
    );

    //get pair    
    const pairAddress = await swapOperations.getPair(
      tokenA,
      tokenB
    );
    const pair: SwapPair = await ethers.getContractAt('SwapPair', pairAddress);   

    return pair;
  };

  const remove = async (
    signer: SignerWithAddress,
    tokenA: MockERC20, 
    tokenB: MockERC20,
    amount: bigint
  ) =>
  {
    await swapOperations.connect(signer).removeLiquidity(
      tokenA,
      tokenB,
      amount,
      0,
      0,
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
    debtTokenManager = contracts.debtTokenManager;

    STABLE = contracts.debtToken.STABLE;
    STOCK = contracts.debtToken.STOCK;
    BTC = contracts.collToken.BTC;
    ETH = contracts.collToken.ETH;
    USDT = contracts.collToken.USDT;
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
    const pair = await add(
      alice,
      STABLE,
      STOCK,
      amount,
      amount,
      true,
      true
    );
    
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
    const pair = await add(
      alice,
      STABLE,
      STOCK,
      amount,
      amount,
      true,
      true
    );

    //check if transfer function doesn't exist
    expect((pair as any).transfer).to.be.eql(undefined, 'Transfer function defined');

    //check if transferFrom function doesn't exist
    expect((pair as any).transferFrom).to.be.eql(undefined, 'TransferFrom function defined');
  });

  describe.only('remove liquidity', () => {
    it.skip('todo default uniswap tests...', async () => {
      // todo
    });

    it('zero borrower debts (no active trove), default uniswap behavior', async () => {
      const amount = parseUnits('1000');

      //create pair & add liquidity (alice)
      const pair = await add(
        alice,
        STABLE,
        STOCK,
        amount,
        amount,
        true,
        true
      );

      //remove liquidity
      await remove(
        alice,
        STABLE,
        STOCK,
        await pair.balanceOf(alice)
      );
      expect(await pair.balanceOf(alice)).to.be.equal(0);
    });

    it('empty trove (only stable gas comp debt), pool should not repay that', async () => {
      const amount = parseUnits('1000');

      //open trove
      await open(alice, parseUnits('1', 9), parseUnits('0'));

      //create pair & add liquidity (alice)
      const pair = await add(
        alice,
        STABLE,
        STOCK,
        amount,
        amount,
        true,
        true
      );

      //remove liquidity
      await remove(
        alice,
        STABLE,
        STOCK,
        await pair.balanceOf(alice)
      );
      expect(await pair.balanceOf(alice)).to.be.equal(0);
    });

    it('smaller debts, complete repay expected', async () => {
      const amount = parseUnits('1000');

      //open trove
      await open(alice, parseUnits('1', 9), parseUnits('150'));

      //create pair & add liquidity (alice)
      const pair = await add(
        alice,
        STABLE,
        STOCK,
        amount,
        amount,
        true,
        true
      );

      //remove liquidity
      await remove(
        alice,
        STABLE,
        STOCK,
        await pair.balanceOf(alice)
      );
      expect(await pair.balanceOf(alice)).to.be.equal(0);
    });

    it('huge debts, partial repay expected', async () => {
      const amount = parseUnits('1000');

      //open trove
      await open(bob, parseUnits('1', 9), parseUnits('150'));
      await open(alice, parseUnits('1', 9), parseUnits('15000'));

      //create pair & add liquidity (alice)
      const pair = await add(
        alice,
        STABLE,
        STOCK,
        amount,
        amount,
        true,
        true
      );

      //remove liquidity
      await remove(
        alice,
        STABLE,
        STOCK,
        await pair.balanceOf(alice)
      );
      expect(await pair.balanceOf(alice)).to.be.equal(0);
    });
  });

  describe('add liquidity', () => {
    it.skip('todo default uniswap tests...', async () => {
      // todo
    });

    it('borrower has enough funds for the op, no trove needed', async () => {
      const amount = parseUnits('1000');

      //create pair & add liquidity (bob)
      await add(
        bob,
        STABLE,
        STOCK,
        amount,
        amount,
        true,
        true
      );

      //add liquidty (alice)
      const pair = await add(
        alice,
        STABLE,
        STOCK,
        amount,
        amount,
        true,
        false
      );
      expect(await pair.balanceOf(alice)).to.be.greaterThan(0);
    });

    it('low collateral trove, minting should fail because of bad trove CR', async () => {
      const amount = parseUnits('1000');

      //create pair & add liquidity (bob)
      await add(
        bob,
        STABLE,
        STOCK,
        amount,
        amount,
        true,
        true
      );

      //open troves
      await open(alice, parseUnits('1', 8), parseUnits('150'));

      //add liquidity (alice)
      await expect(
        add(
          alice,
          STABLE,
          STOCK,
          amount,
          amount,
          false,
          false
        )
      ).to.be.revertedWithCustomError(borrowerOperations, 'ICR_lt_MCR');
    });

    it('high collateral trove, missing token should be minted from senders trove', async () => {
      const amount = parseUnits('1000');

      //create pair & add liquidity (bob)
      await add(
        bob,
        STABLE,
        STOCK,
        amount,
        amount,
        true,
        true
      );

      //open trove (alice)
      await open(alice, parseUnits('1000', 8), parseUnits('150'));

      //add liquidity without tokens (alice)
      const pair = await add(
        alice,
        STABLE,
        STOCK,
        amount,
        amount,
        false,
        false
      );
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
        STABLE,
        STOCK,
        parseUnits('15000'), //100 Stocks at price of 150$
        parseUnits('100'), 
        true,
        true
      );

      //check initial fee
      const baseFee = await pair.SWAP_BASE_FEE();     
      expect(
        await pair.getSwapFee()
      ).to.be.eq(baseFee);      

      //check dex price > oracle price
      await priceFeed.setTokenPrice(STOCK, parseUnits('140'));
      expect(
        await pair.getSwapFee()
      ).to.be.eq(baseFee);

      //check dex price < oracle price
      await priceFeed.setTokenPrice(STOCK, parseUnits('160'));
      expect(
        await pair.getSwapFee()
      ).to.not.be.eq(baseFee);
    });
  });

  describe('positions', () => {
    describe('long', () => {
      it('open without trove, should fail', async () => {
        const amount = parseUnits('1000');

        //open trove (bob)
        await open(bob, parseUnits('1', 9), parseUnits('150'));

        //create pair & add liquidity (bob)
        await add(
          bob,
          STABLE,
          STOCK,
          amount,
          amount,
          true,
          true
        );

        //open STOCK long (alice)
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

      it('open with unknown debt token', async () => {
        const amount = parseUnits('1000');

        //open troves
        await open(alice, parseUnits('1', 9), parseUnits('150'));
        await open(bob, parseUnits('1'), parseUnits('150'));

        //create pair & add liquidity
        await add(
          alice,
          STABLE,
          BTC,
          amount,
          amount,
          true,
          true
        );

        //open BTC long (check balance before and after)
        expect(await BTC.balanceOf(alice)).to.eq(parseUnits('0'));
        await swapOperations.connect(alice).openLongPosition(
          parseUnits('1'),
          0,
          BTC,
          alice,
          await swapOperations.MAX_BORROWING_FEE(),
          await deadline()
        );
        expect(await BTC.balanceOf(alice)).to.greaterThan(parseUnits('0'));

        //open ETH long
        expect(          
          swapOperations.connect(alice).openLongPosition(
            parseUnits('1'),
            0,
            ETH,
            alice,
            await swapOperations.MAX_BORROWING_FEE(),
            await deadline()
          )
        ).to.be.revertedWithCustomError(swapOperations, 'PairDoesNotExist');
      });

      it('open with no enough collateral, should fail', async () => {
        const amount = parseUnits('1000');

        //open troves
        await open(alice, parseUnits('1', 9), parseUnits('150'));
        await open(bob, parseUnits('1'), parseUnits('150'));

        //create pair & add liquidity
        await add(
          alice,
          STABLE,
          STOCK,
          amount,
          amount,
          true,
          true
        );

        //open STOCK long
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
        await add(
          alice,
          STABLE,
          STOCK,
          amount,
          amount,
          true,
          true
        );

        //open STOCK long (check balance before and after)
        expect(await STOCK.balanceOf(alice)).to.eq(parseUnits('0'));
        await swapOperations.connect(alice).openLongPosition(
          parseUnits('1'),
          0,
          STOCK,
          alice,
          await swapOperations.MAX_BORROWING_FEE(),
          await deadline()
        );
        expect(await STOCK.balanceOf(alice)).to.greaterThan(parseUnits('0'));
      });
    });

    describe('short', () => {
      it('open without trove, should fail', async () => {
        const amount = parseUnits('1000');

        //open trove (bob)
        await open(bob, parseUnits('1', 9), parseUnits('150'));

        //create pair & add liquidity (bob)
        await add(
          bob,
          STABLE,
          STOCK,
          amount,
          amount,
          true,
          true
        );

        //open STOCK short (alice)
        await expect(
            swapOperations.connect(alice).openShortPosition(
            parseUnits('100'),
            0,
            STOCK,
            alice,
            await swapOperations.MAX_BORROWING_FEE(),
            await deadline()
          )
        ).to.be.revertedWithCustomError(borrowerOperations, 'TroveClosedOrNotExist');
      });

      it('open with unknown debt token (should fail)', async () => {
        const amount = parseUnits('1000');

        //open troves
        await open(alice, parseUnits('1', 9), parseUnits('150'));
        await open(bob, parseUnits('1'), parseUnits('150'));

        //create pair & add liquidity
        await add(
          alice,
          STABLE,
          BTC,
          amount,
          amount,
          true,
          true
        );

        //open BTC short
        expect(          
          swapOperations.connect(alice).openShortPosition(
            parseUnits('1'),
            0,
            BTC,
            alice,
            await swapOperations.MAX_BORROWING_FEE(),
            await deadline()
          )
        ).to.be.revertedWithCustomError(debtTokenManager, 'InvalidDebtToken');
      });

      it('open with no enough collateral, should fail', async () => {
        const amount = parseUnits('1000');

        //open troves
        await open(alice, parseUnits('1', 9), parseUnits('150'));
        await open(bob, parseUnits('1'), parseUnits('150'));

        //create pair & add liquidity
        await add(
          alice,
          STABLE,
          STOCK,
          amount,
          amount,
          true,
          true
        );

        //open STOCK short
        await expect(
            swapOperations.connect(alice).openShortPosition(
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
        await add(
          alice,
          STABLE,
          STOCK,
          amount,
          amount,
          true,
          true
        );

        //open short (check balance before and after)
        expect(await STABLE.balanceOf(alice)).to.eq(parseUnits('150')); //initial debts
        await swapOperations.connect(alice).openShortPosition(
          parseUnits('1'),
          0,
          STOCK,
          alice,
          await swapOperations.MAX_BORROWING_FEE(),
          await deadline()
        );
        expect(await STABLE.balanceOf(alice)).to.greaterThan(parseUnits('150')); //initial debts
      });
    });
  });
});
