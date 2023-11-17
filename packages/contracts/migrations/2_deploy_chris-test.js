const StoragePool = artifacts.require('StoragePool');
const TroveManager = artifacts.require('TroveManager');
const BorrowerOperations = artifacts.require('BorrowerOperations');
const PriceFeed = artifacts.require('PriceFeed');
const StabilityPoolManager = artifacts.require('StabilityPoolManager');
const DebtToken = artifacts.require('DebtToken');

module.exports = async function (deployer) {
  await deployer.deploy(StoragePool);
  await deployer.deploy(TroveManager);
  await deployer.deploy(BorrowerOperations);
  await deployer.deploy(PriceFeed);
  await deployer.deploy(StabilityPoolManager);

  const borrowerOperations = await BorrowerOperations.deployed();
  const priceFeed = await PriceFeed.deployed();
  const troveManager = await TroveManager.deployed();
  const stabilityPoolManager = await StabilityPoolManager.deployed();

  await deployer.deploy(
    DebtToken,
    troveManager.address,
    borrowerOperations.address,
    stabilityPoolManager.address,
    priceFeed.address,
    'JUSD',
    'Jelly',
    '1',
    true
  );
};
