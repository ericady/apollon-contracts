import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import {
  LiquidationOperations,
  MockDebtToken,
  MockERC20,
  PriceFeed,
  ReservePool,
  StabilityPoolManager,
} from '../typechain';
import { expect } from 'chai';
import { openTrove, setPrice } from '../utils/testHelper';
import { parseUnits } from 'ethers';
import apollonTesting from '../ignition/modules/apollonTesting';

describe('Reserve Pool', () => {
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carol: SignerWithAddress;

  let STABLE: MockDebtToken;
  let BTC: MockERC20;

  let contracts: any;
  let priceFeed: PriceFeed;
  let liquidationOperations: LiquidationOperations;
  let reservePool: ReservePool;
  let stabilityPoolManager: StabilityPoolManager;

  before(async () => {
    [, , , , , alice, bob, carol] = await ethers.getSigners();
  });

  beforeEach(async () => {
    // @ts-ignore
    contracts = await ignition.deploy(apollonTesting);

    priceFeed = contracts.priceFeed;
    liquidationOperations = contracts.liquidationOperations;
    reservePool = contracts.reservePool;
    stabilityPoolManager = contracts.stabilityPoolManager;
    STABLE = contracts.STABLE;
    BTC = contracts.BTC;
  });

  describe('reserveCap()', () => {
    it('only owner can set reserve caps', async () => {
      const cap = parseUnits('100');
      await expect(reservePool.connect(alice).setReserveCap(cap, cap)).to.be.revertedWithCustomError(
        reservePool,
        'OwnableUnauthorizedAccount'
      );

      await reservePool.setReserveCap(cap, cap);
      expect(await reservePool.stableReserveCap()).to.be.equal(cap);
      expect(await reservePool.govReserveCap()).to.be.equal(cap);
    });
    it('should receive reserve fee when borrowing', async () => {
      const aliceDebt = parseUnits('100');
      await openTrove({
        from: alice,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('10', 9),
        debts: [{ tokenAddress: STABLE, amount: aliceDebt }],
      });

      let reserveBal = await STABLE.balanceOf(reservePool);
      expect(reserveBal).to.be.equal(aliceDebt / 20n / 200n);

      const bobDebt = parseUnits('13000');
      await openTrove({
        from: bob,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('1', 9),
        debts: [{ tokenAddress: STABLE, amount: bobDebt }],
      });
      let reserveBalAfter = await STABLE.balanceOf(reservePool);
      expect(reserveBalAfter).to.be.equal(bobDebt / 20n / 200n + reserveBal);
    });

    it('should not receive reserve fee when reached cap', async () => {
      const cap = parseUnits('100');
      await reservePool.setReserveCap(cap, cap);

      const aliceDebt = parseUnits('1000');
      await openTrove({
        from: alice,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('10', 9),
        debts: [{ tokenAddress: STABLE, amount: aliceDebt }],
      });

      await STABLE.connect(alice).transfer(reservePool, aliceDebt);

      let reserveBalBefore = await STABLE.balanceOf(reservePool);

      const bobDebt = parseUnits('13000');
      await openTrove({
        from: bob,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('1', 9),
        debts: [{ tokenAddress: STABLE, amount: bobDebt }],
      });
      let reserveBalAfter = await STABLE.balanceOf(reservePool);

      expect(reserveBalAfter).to.be.equal(reserveBalBefore);
    });
  });
  describe('Withdraw (Repay)', () => {
    it('should repay loss when liquidating troves', async () => {
      const aliceDebt = parseUnits('1000');
      await openTrove({
        from: alice,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('10', 9),
        debts: [{ tokenAddress: STABLE, amount: aliceDebt }],
      });
      await STABLE.connect(alice).transfer(reservePool, aliceDebt);

      const bobDebt = parseUnits('13000');
      await openTrove({
        from: bob,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('1', 9),
        debts: [{ tokenAddress: STABLE, amount: bobDebt }],
      });

      await openTrove({
        from: carol,
        contracts,
        collToken: BTC,
        collAmount: parseUnits('1', 9),
        debts: [{ tokenAddress: STABLE, amount: parseUnits('3000') }],
      });
      await stabilityPoolManager
        .connect(carol)
        .provideStability([{ tokenAddress: STABLE, amount: parseUnits('3000') }]);

      let reserveBalBefore = await STABLE.balanceOf(reservePool);
      await setPrice('BTC', '10000', contracts);
      await liquidationOperations.liquidate(bob);
      let reserveBalAfter = await STABLE.balanceOf(reservePool);

      expect(reserveBalAfter).to.be.lt(reserveBalBefore);
    });
  });
});
