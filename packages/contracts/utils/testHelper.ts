import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { MockDebtToken, MockERC20 } from '../typechain';
import { Contracts } from './deploymentHelpers';
import { ethers } from 'hardhat';

export const _100pct = '1000000000000000000';

export const openTrove = async ({
  from,
  contracts,
  collToken,
  collAmount,
  debts,
}: {
  from: SignerWithAddress;
  contracts: Contracts;
  collToken: MockERC20;
  collAmount: bigint;
  debts: any[];
}) => {
  await collToken.unprotectedMint(from, collAmount);
  await collToken.connect(from).approve(contracts.borrowerOperations, collAmount);
  const openingTx = await contracts.borrowerOperations
    .connect(from)
    .openTrove([{ tokenAddress: collToken, amount: collAmount }]);

  if (debts) await increaseDebt(from, contracts, debts);

  return { tx: openingTx };
};

export const increaseDebt = async (
  from: SignerWithAddress,
  contracts: Contracts,
  debts: any[],
  maxFeePercentage = _100pct
) => {
  return { tx: await contracts.borrowerOperations.connect(from).increaseDebt(debts, maxFeePercentage) };
};

export const getStabilityPool = async (contracts: Contracts, debt: MockDebtToken) => {
  const poolAddress = await contracts.stabilityPoolManager.getStabilityPool(debt);
  return await ethers.getContractAt('StabilityPool', poolAddress);
};
