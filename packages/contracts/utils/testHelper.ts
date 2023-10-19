import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { MockDebtToken, MockERC20, StabilityPoolManager, contracts } from '../typechain';
import { Contracts } from './deploymentHelpers';
import { ethers } from 'hardhat';
import { expect } from 'chai';
import { ContractTransactionReceipt, ContractTransactionResponse } from 'ethers';
import { parseUnits } from 'ethers';

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
  debts?: any[];
}) => {
  await collToken.unprotectedMint(from, collAmount);
  await collToken.connect(from).approve(contracts.borrowerOperations, collAmount);
  const openingTx = await contracts.borrowerOperations
    .connect(from)
    .openTrove([{ tokenAddress: collToken, amount: collAmount }]);

  if (debts) await increaseDebt(from, contracts, debts);

  const collateral = await contracts.troveManager.getTroveColl(from);
  const debtInStable = await getTroveEntireDebt(contracts, from);

  return {
    collateral,
    debtInStable,
  };
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

export const assertRevert = async (txPromise: Promise<ContractTransactionResponse>, message?: String) => {
  try {
    const tx = await txPromise;
    const receipt = await tx.wait();
    expect(receipt?.status).to.be.equal(0);
  } catch (err: any) {
    expect(err.message).include('revert');
    if (message) expect(err.message).include(message);
  }
};

export const gasUsed = async (tx: ContractTransactionResponse) => {
  const receipt = await tx.wait();
  return BigInt(receipt?.cumulativeGasUsed ?? 0) * BigInt(receipt?.gasPrice ?? 0);
};

export const whaleShrimpTroveInit = async (contracts: Contracts, signers: SignerWithAddress[]) => {
  const STABLE: MockDebtToken = contracts.debtToken.STABLE;
  const BTC: MockERC20 = contracts.collToken.BTC;
  const stabilityPoolManager: StabilityPoolManager = contracts.stabilityPoolManager;

  let defaulter_1: SignerWithAddress;
  let defaulter_2: SignerWithAddress;
  let whale: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carol: SignerWithAddress;
  let dennis: SignerWithAddress;
  [, defaulter_1, defaulter_2, , whale, alice, bob, carol, dennis] = signers;

  await openTrove({
    from: whale,
    contracts,
    collToken: contracts.collToken.BTC,
    collAmount: parseUnits('1', 9),
    debts: [{ tokenAddress: STABLE, amount: parseUnits('1850') }],
  });

  // A, B, C open troves and make Stability Pool deposits
  await openTrove({
    from: alice,
    contracts,
    collToken: BTC,
    collAmount: parseUnits('1', 9),
    debts: [{ tokenAddress: STABLE, amount: parseUnits('1000') }],
  });
  await stabilityPoolManager.connect(alice).provideStability([{ tokenAddress: STABLE, amount: parseUnits('1000') }]);
  await openTrove({
    from: bob,
    contracts,
    collToken: BTC,
    collAmount: parseUnits('1', 9),
    debts: [{ tokenAddress: STABLE, amount: parseUnits('2000') }],
  });
  await stabilityPoolManager.connect(bob).provideStability([{ tokenAddress: STABLE, amount: parseUnits('2000') }]);
  await openTrove({
    from: carol,
    contracts,
    collToken: BTC,
    collAmount: parseUnits('1', 9),
    debts: [{ tokenAddress: STABLE, amount: parseUnits('3000') }],
  });
  await stabilityPoolManager.connect(carol).provideStability([{ tokenAddress: STABLE, amount: parseUnits('3000') }]);

  // D opens a trove
  await openTrove({
    from: dennis,
    contracts,
    collToken: BTC,
    collAmount: parseUnits('1', 9),
    debts: [{ tokenAddress: STABLE, amount: parseUnits('300') }],
  });

  // Would-be defaulters open troves
  await openTrove({
    from: defaulter_1,
    contracts,
    collToken: BTC,
    collAmount: parseUnits('0.02', 9), // 0.02 BTC
    debts: [{ tokenAddress: STABLE, amount: parseUnits('1') }],
  });
  await openTrove({
    from: defaulter_2,
    contracts,
    collToken: BTC,
    collAmount: parseUnits('0.02', 9), // 0.02 BTC
    debts: [{ tokenAddress: STABLE, amount: parseUnits('1') }],
  });
};

export const getTroveEntireColl = async (contracts: Contracts, trove: SignerWithAddress) => {
  return (await contracts.troveManager.getEntireDebtAndColl(trove)).troveCollInStable;
};

export const getTroveEntireDebt = async (contracts: Contracts, trove: SignerWithAddress) => {
  return (await contracts.troveManager.getEntireDebtAndColl(trove)).troveDebtInStable;
};

export const checkRecoveryMode = async (contracts: Contracts) => {
  return (await contracts.storagePool.checkRecoveryMode()).isInRecoveryMode;
};

export const getTCR = async (contracts: Contracts) => {
  return (await contracts.storagePool.checkRecoveryMode()).TCR;
};

export const fastForwardTime = async (seconds: number) => {
  await time.increase(seconds);
};

export const getEmittedLiquidationValues = (liquidationTx: ContractTransactionReceipt | null, contracts: Contracts) => {
  for (let i = 0; i < (liquidationTx?.logs.length || 0); i++) {
    const logData = contracts.troveManager.interface.parseLog(liquidationTx?.logs[i] as any);
    if (logData?.name === 'TroveIndexUpdated') {
      const liquidatedDebt = logData.args[0];
      const liquidatedColl = logData.args[1];
      const collGasComp = logData.args[2];
      const lusdGasComp = logData.args[3];

      return [liquidatedDebt, liquidatedColl, collGasComp, lusdGasComp];
    }
  }
};

export const TimeValues = {
  SECONDS_IN_ONE_MINUTE: 60,
  SECONDS_IN_ONE_HOUR: 60 * 60,
  SECONDS_IN_ONE_DAY: 60 * 60 * 24,
  SECONDS_IN_ONE_WEEK: 60 * 60 * 24 * 7,
  SECONDS_IN_SIX_WEEKS: 60 * 60 * 24 * 7 * 6,
  SECONDS_IN_ONE_MONTH: 60 * 60 * 24 * 30,
  SECONDS_IN_ONE_YEAR: 60 * 60 * 24 * 365,
  MINUTES_IN_ONE_WEEK: 60 * 24 * 7,
  MINUTES_IN_ONE_MONTH: 60 * 24 * 30,
  MINUTES_IN_ONE_YEAR: 60 * 24 * 365,
};
