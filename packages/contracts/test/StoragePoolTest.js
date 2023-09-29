const testHelpers = require("../utils/testHelpers.js")
const deploymentHelper = require("../utils/deploymentHelpers.js")
const StoragePool = artifacts.require("./StoragePool.sol")
const NonPayable = artifacts.require('NonPayable.sol')

const th = testHelpers.TestHelper
const openTrove = async params => th.openTrove(contracts, params);

contract('StoragePool', async accounts => {
    let storagePool
    let BTC
    let STOCK
    let STABLE
    let priceFeed
    let troveManager
    let stabilityPoolManager
    let borrowerOperations

    let [reciever, alice, bob] = accounts

    beforeEach('Deploy contracts', async () => {
        contracts = await deploymentHelper.deployCore();
        await deploymentHelper.connectCoreContracts(contracts);
        await deploymentHelper.deployAndLinkToken(contracts);
        // priceFeed = contracts.priceFeedTestnet;
        // troveManager = contracts.troveManager;
        borrowerOperations = contracts.borrowerOperations;
        storagePool = contracts.storagePool;
        stabilityPoolManager = contracts.stabilityPoolManager;
        BTC = contracts.collToken.BTC.address;
        STABLE = contracts.debtToken.STABLE.address;
        STOCK = contracts.debtToken.STOCK.address;
    })

    it('addValue() revert if caller is neither BorrowerOperations nor TroveManager nor StabilityPool)', async () => {
        const amount = th.dec(1, 'ether')
        expectedErrorMsg = 'neither BorrowerOperations nor TroveManager nor StabilityPool'

        await th.assertRevert(storagePool.addValue(BTC, false, 0, amount), expectedErrorMsg)
        await th.assertRevert(storagePool.addValue(BTC, false, 1, amount), expectedErrorMsg)
        await th.assertRevert(storagePool.addValue(BTC, false, 2, amount), expectedErrorMsg)
        // collateral
        await th.assertRevert(storagePool.addValue(BTC, true, 0, amount), expectedErrorMsg)
        await th.assertRevert(storagePool.addValue(BTC, true, 1, amount), expectedErrorMsg)
        await th.assertRevert(storagePool.addValue(BTC, true, 2, amount), expectedErrorMsg)
    })

    it('subtractValue() revert if caller is neither BorrowerOperations nor TroveManager nor StabilityPool)', async () => {
        const amount = th.dec(1, 'ether')
        expectedErrorMsg = 'neither BorrowerOperations nor TroveManager nor StabilityPool'

        await th.assertRevert(storagePool.subtractValue(BTC, false, 0, amount), expectedErrorMsg)
        await th.assertRevert(storagePool.subtractValue(BTC, false, 1, amount), expectedErrorMsg)
        await th.assertRevert(storagePool.subtractValue(BTC, false, 2, amount), expectedErrorMsg)
        // collateral
        await th.assertRevert(storagePool.subtractValue(BTC, true, 0, amount), expectedErrorMsg)
        await th.assertRevert(storagePool.subtractValue(BTC, true, 1, amount), expectedErrorMsg)
        await th.assertRevert(storagePool.subtractValue(BTC, true, 2, amount), expectedErrorMsg)
    })

    it('withdrawalValue() revert if caller is neither BorrowerOperations nor TroveManager nor StabilityPool)', async () => {
        const amount = th.dec(1, 'ether')
        expectedErrorMsg = 'neither BorrowerOperations nor TroveManager nor StabilityPool'

        await th.assertRevert(storagePool.withdrawalValue(reciever, BTC, false, 0, amount), expectedErrorMsg)
        await th.assertRevert(storagePool.withdrawalValue(reciever, BTC, false, 1, amount), expectedErrorMsg)
        await th.assertRevert(storagePool.withdrawalValue(reciever, BTC, false, 2, amount), expectedErrorMsg)
        // collateral
        await th.assertRevert(storagePool.withdrawalValue(reciever, BTC, true, 0, amount), expectedErrorMsg)
        await th.assertRevert(storagePool.withdrawalValue(reciever, BTC, true, 1, amount), expectedErrorMsg)
        await th.assertRevert(storagePool.withdrawalValue(reciever, BTC, true, 2, amount), expectedErrorMsg)
    })

    it('transferBetweenTypes() revert if caller is neither BorrowerOperations nor TroveManager nor StabilityPool)', async () => {
        const amount = th.dec(1, 'ether')
        expectedErrorMsg = 'neither BorrowerOperations nor TroveManager nor StabilityPool'

        await th.assertRevert(storagePool.transferBetweenTypes(BTC, false, 0, 1, amount), expectedErrorMsg)
        await th.assertRevert(storagePool.transferBetweenTypes(BTC, false, 1, 2, amount), expectedErrorMsg)
        await th.assertRevert(storagePool.transferBetweenTypes(BTC, false, 2, 0, amount), expectedErrorMsg)
        // collateral
        await th.assertRevert(storagePool.transferBetweenTypes(BTC, true, 0, 2, amount), expectedErrorMsg)
        await th.assertRevert(storagePool.transferBetweenTypes(BTC, true, 1, 0, amount), expectedErrorMsg)
        await th.assertRevert(storagePool.transferBetweenTypes(BTC, true, 2, 1, amount), expectedErrorMsg)
    })

    it('transferBetweenTypes() revert if caller is neither BorrowerOperations nor TroveManager nor StabilityPool)', async () => {
        const amount = th.dec(1, 'ether')
        expectedErrorMsg = 'neither BorrowerOperations nor TroveManager nor StabilityPool'

        await th.assertRevert(storagePool.transferBetweenTypes(BTC, false, 0, 1, amount), expectedErrorMsg)
        await th.assertRevert(storagePool.transferBetweenTypes(BTC, false, 1, 2, amount), expectedErrorMsg)
        await th.assertRevert(storagePool.transferBetweenTypes(BTC, false, 2, 0, amount), expectedErrorMsg)
        // collateral
        await th.assertRevert(storagePool.transferBetweenTypes(BTC, true, 0, 2, amount), expectedErrorMsg)
        await th.assertRevert(storagePool.transferBetweenTypes(BTC, true, 1, 0, amount), expectedErrorMsg)
        await th.assertRevert(storagePool.transferBetweenTypes(BTC, true, 2, 1, amount), expectedErrorMsg)
    })

    it('OpenTorve Test ActivePool', async () => {
        const collAmountAlice = th.dec(1, 18)
        const debtAmountAlice = th.dec(68, 18)

        await openTrove({
            collToken: contracts.collToken.BTC,
            collAmount: collAmountAlice,
            debts: [{ tokenAddress: STOCK, amount: debtAmountAlice }],
            extraParams: { from: alice },
        });

        let value = await storagePool.getValue(BTC, true, 0)
        assert.equal(value.toString(), th.toBN(collAmountAlice).toString())

        const collAmountBob = th.dec(3, 18)
        const debtAmountBob = th.dec(68, 18)

        await openTrove({
            collToken: contracts.collToken.BTC,
            collAmount: collAmountBob,
            debts: [{ tokenAddress: STOCK, amount: debtAmountBob }],
            extraParams: { from: bob },
        });

        value = await storagePool.getValue(BTC, true, 0)
        const addedColl = th.toBN(collAmountAlice).add(th.toBN(collAmountBob))

        assert.equal(value.toString(), addedColl.toString()) // 4 BTC
    })

})

contract('Reset chain state', async accounts => { })
