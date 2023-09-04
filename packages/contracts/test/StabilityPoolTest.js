const deploymentHelper = require('../utils/deploymentHelpers.js');
const { TestHelper: th, MoneyValues: mv, TimeValues: timeValues } = require('../utils/testHelpers.js');
const dec = th.dec;
const toBN = th.toBN;

// const TroveManagerTester = artifacts.require('TroveManagerTester');
const NonPayable = artifacts.require('NonPayable.sol');

const ZERO = toBN('0');
const ZERO_ADDRESS = th.ZERO_ADDRESS;
const maxBytes32 = th.maxBytes32;
const GAS_PRICE = 10000000;

contract('StabilityPool', async accounts => {
  const [owner, defaulter_1, defaulter_2, defaulter_3, whale, alice, bob, carol, dennis, erin, flyn, A, B, C, D, E, F] =
    accounts;
  const [bountyAddress, lpRewardsAddress, multisig] = accounts.slice(997, 1000);

  let STABLE;
  let STOCK;
  let BTC;
  let USDT;

  let contracts;
  let priceFeed;
  let troveManager;
  let borrowerOperations;
  let storagePool;
  let stabilityPoolManager;

  let gasPriceInWei;

  const getOpenTroveLUSDAmount = async totalDebt => th.getOpenTroveLUSDAmount(contracts, totalDebt);
  const openTrove = async params => th.openTrove(contracts, params);
  const assertRevert = th.assertRevert;

  describe('Stability Pool Mechanisms', async () => {
    before(async () => {
      gasPriceInWei = await web3.eth.getGasPrice();
    });

    beforeEach(async () => {
      contracts = await deploymentHelper.deployCore();
      await deploymentHelper.connectCoreContracts(contracts);
      await deploymentHelper.deployAndLinkToken(contracts);

      priceFeed = contracts.priceFeedTestnet;
      troveManager = contracts.troveManager;
      borrowerOperations = contracts.borrowerOperations;
      storagePool = contracts.storagePool;
      stabilityPoolManager = contracts.stabilityPoolManager;

      STABLE = contracts.debtToken.STABLE.address;
      STOCK = contracts.debtToken.STOCK.address;
      BTC = contracts.collToken.BTC.address;
      USDT = contracts.collToken.USDT.address;
    });

    // --- provideToSP() ---

    // increases recorded stable at Stability Pool
    it('provideToSP(): increases the Stability Pool stable balance', async () => {
      // --- SETUP --- Give Alice a least 200
      await contracts.debtToken.STOCK.unprotectedMint(alice, 200);

      // --- TEST ---
      await stabilityPoolManager.provideStability([{ tokenAddress: STOCK, amount: 200 }], { from: alice });

      // check pools total
      const stockDeposit = (await contracts.stabilityPoolManager.getTotalDeposits()).find(
        d => d.tokenAddress === STOCK
      );
      assert.equal(stockDeposit.amount, 200);
    });

    it("provideToSP(): updates the user's deposit record in StabilityPool", async () => {
      // --- SETUP --- Give Alice a least 200
      await contracts.debtToken.STOCK.unprotectedMint(alice, 200);

      // --- TEST ---
      // check user's deposit record before
      const depositBefore = (await contracts.stabilityPoolManager.getCompoundedDeposits({ from: alice })).find(
        d => d.tokenAddress === STOCK
      ).amount;
      assert.equal(depositBefore, 0);

      await stabilityPoolManager.provideStability([{ tokenAddress: STOCK, amount: 200 }], { from: alice });

      // check user's deposit record after
      const depositAfter = (await contracts.stabilityPoolManager.getCompoundedDeposits({ from: alice })).find(
        d => d.tokenAddress === STOCK
      ).amount;
      assert.equal(depositAfter, 200);
    });

    it("provideToSP(): reduces the user's stock balance by the correct amount", async () => {
      // --- SETUP --- Give Alice a least 200
      await contracts.debtToken.STOCK.unprotectedMint(alice, 200);

      // --- TEST ---
      // get user's deposit record before
      const stockBefore = await contracts.debtToken.STOCK.balanceOf(alice);

      // provideToSP()
      await stabilityPoolManager.provideStability([{ tokenAddress: STOCK, amount: 200 }], { from: alice });

      // check user's balance change
      const stockAfter = await contracts.debtToken.STOCK.balanceOf(alice);
      assert.equal(stockBefore.sub(stockAfter), '200');
    });
  });
});
