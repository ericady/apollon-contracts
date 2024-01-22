import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { MockDebtToken, MockERC20, StabilityPoolManager, contracts } from '../typechain';
import { Contracts } from './deploymentHelpers';
import { ethers } from 'hardhat';
import { expect } from 'chai';
import { AddressLike, ContractTransactionResponse } from 'ethers';
import { parseUnits } from 'ethers';
import { AddressZero } from '@ethersproject/constants';

export const MAX_BORROWING_FEE = parseUnits('0.05');

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

  const addedColl = [{ tokenAddress: collToken, amount: collAmount }];
  const afterCreationCR = await contracts.troveManager.getICRIncludingPatch(from, addedColl, [], [], []);
  const [upperHint, lowerHint] = await contracts.sortedTroves.findInsertPosition(
    afterCreationCR,
    AddressZero,
    AddressZero
  );
  const openTx = await contracts.borrowerOperations.connect(from).openTrove(addedColl, upperHint, lowerHint);

  if (debts) await increaseDebt(from, contracts, debts);
  return {
    openTx,
    collateral: await contracts.troveManager.getTroveColl(from),
    debtInUSD: await getTroveEntireDebt(contracts, from),
  };
};

export const addColl = async (from: SignerWithAddress, contracts: Contracts, colls: any[], approve = false) => {
  if (approve)
    for (const { tokenAddress, amount } of colls) {
      await tokenAddress.unprotectedMint(from, amount);
      await tokenAddress.connect(from).approve(contracts.borrowerOperations, amount);
    }

  const afterPathCR = await contracts.troveManager.getICRIncludingPatch(from, colls, [], [], []);
  const [upperHint, lowerHint] = await contracts.sortedTroves.findInsertPosition(afterPathCR, AddressZero, AddressZero);
  return contracts.borrowerOperations.connect(from).addColl(colls, upperHint, lowerHint);
};

export const withdrawalColl = async (from: SignerWithAddress, contracts: Contracts, colls: any[]) => {
  const afterPathCR = await contracts.troveManager.getICRIncludingPatch(from, [], colls, [], []);
  const [upperHint, lowerHint] = await contracts.sortedTroves.findInsertPosition(afterPathCR, AddressZero, AddressZero);
  return contracts.borrowerOperations.connect(from).withdrawColl(colls, upperHint, lowerHint);
};

export const increaseDebt = async (
  from: SignerWithAddress,
  contracts: Contracts,
  debts: any[],
  maxFeePercentage = MAX_BORROWING_FEE
) => {
  const afterPathCR = await contracts.troveManager.getICRIncludingPatch(from, [], [], debts, []);
  const [upperHint, lowerHint] = await contracts.sortedTroves.findInsertPosition(afterPathCR, AddressZero, AddressZero);
  return {
    tx: await contracts.borrowerOperations
      .connect(from)
      .increaseDebts(debts, { upperHint, lowerHint, maxFeePercentage }),
  };
};

export const repayDebt = async (from: SignerWithAddress, contracts: Contracts, debts: any[]) => {
  const afterPathCR = await contracts.troveManager.getICRIncludingPatch(from, [], [], [], debts);
  const [upperHint, lowerHint] = await contracts.sortedTroves.findInsertPosition(afterPathCR, AddressZero, AddressZero);
  return {
    tx: await contracts.borrowerOperations.connect(from).repayDebt(debts, upperHint, lowerHint),
  };
};

export const redeem = async (
  from: SignerWithAddress,
  toRedeem: bigint,
  contracts: Contracts,
  maxFeePercentage = MAX_BORROWING_FEE
) => {
  const iterations = [];
  let lastIteration;
  let stableRemaining: bigint = toRedeem;
  while (stableRemaining > 0n) {
    const trove = lastIteration
      ? await contracts.sortedTroves.getPrev(lastIteration.trove)
      : await contracts.sortedTroves.getLast();

    const simulatedRedemption = await contracts.redemptionOperations.calculateTroveRedemption(
      trove,
      stableRemaining,
      true
    );
    stableRemaining -= simulatedRedemption.stableCoinLot;
    const [upperHint, lowerHint] = await contracts.sortedTroves.findInsertPosition(
      simulatedRedemption.resultingCR,
      AddressZero,
      AddressZero
    );

    lastIteration = { trove, upperHint, lowerHint, expectedCR: simulatedRedemption.resultingCR };
    iterations.push(lastIteration);
  }

  return contracts.redemptionOperations.connect(from).redeemCollateral(toRedeem, iterations, maxFeePercentage);
};

export const getStabilityPool = async (contracts: Contracts, debt: MockDebtToken) => {
  const poolAddress = await contracts.stabilityPoolManager.getStabilityPool(debt);
  return await ethers.getContractAt('StabilityPool', poolAddress);
};

/**
 * asserts that an transaction fails and is reverted. Part of the error message can be asserted.
 *
 * @param txPromise transaction that should be reverted
 * @param message part of the revert message that should be included. Usually the custom error of the contract.
 */
export const assertRevert = async (txPromise: Promise<ContractTransactionResponse>, message?: string) => {
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

export const whaleShrimpTroveInit = async (
  contracts: Contracts,
  signers: SignerWithAddress[],
  depositStability: Boolean = true
) => {
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
  if (depositStability)
    await stabilityPoolManager.connect(alice).provideStability([{ tokenAddress: STABLE, amount: parseUnits('1000') }]);
  await openTrove({
    from: bob,
    contracts,
    collToken: BTC,
    collAmount: parseUnits('1', 9),
    debts: [{ tokenAddress: STABLE, amount: parseUnits('2000') }],
  });
  if (depositStability)
    await stabilityPoolManager.connect(bob).provideStability([{ tokenAddress: STABLE, amount: parseUnits('2000') }]);
  await openTrove({
    from: carol,
    contracts,
    collToken: BTC,
    collAmount: parseUnits('1', 9),
    debts: [{ tokenAddress: STABLE, amount: parseUnits('3000') }],
  });
  if (depositStability)
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
    debts: [{ tokenAddress: STABLE, amount: parseUnits('100') }],
  });
  await openTrove({
    from: defaulter_2,
    contracts,
    collToken: BTC,
    collAmount: parseUnits('0.02', 9), // 0.02 BTC
    debts: [{ tokenAddress: STABLE, amount: parseUnits('100') }],
  });
};

export const getTroveEntireColl = async (contracts: Contracts, trove: SignerWithAddress) => {
  return (await contracts.troveManager.getEntireDebtAndColl(trove)).troveCollInUSD;
};

export const getTroveEntireDebt = async (contracts: Contracts, trove: SignerWithAddress) => {
  return (await contracts.troveManager.getEntireDebtAndColl(trove)).troveDebtInUSD;
};

export const getTroveStakeValue = async (contracts: Contracts, trove: SignerWithAddress) => {
  return await contracts.troveManager.getTroveStakeValue(trove);
};

export const getTroveStake = async (contracts: Contracts, trove: SignerWithAddress, token: AddressLike) => {
  return await contracts.troveManager.getTroveStakes(trove, token);
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

export const getLatestBlockTimestamp = async () => {
  return await time.latest();
};

export const getEmittedLiquidationValues = async (
  liquidationTx: ContractTransactionResponse | null,
  contracts: Contracts
) => {
  const receipt = await liquidationTx?.wait();
  for (const log of receipt?.logs ?? []) {
    const logData = contracts.liquidationOperations.interface.parseLog(log as any);
    if (logData?.name !== 'LiquidationSummary') continue;

    const liquidatedDebt = logData.args[0];
    const liquidatedColl = logData.args[1];
    const stableGasComp = logData.args[2];
    const collGasComp = logData.args[3];
    return [liquidatedDebt, liquidatedColl, stableGasComp, collGasComp];
  }
  return [];
};

export const getStableFeeFromStableBorrowingEvent = async (
  tx: ContractTransactionResponse | null,
  contracts: Contracts
) => {
  const receipt = await tx?.wait();
  for (const log of receipt?.logs ?? []) {
    const logData = contracts.borrowerOperations.interface.parseLog(log as any);
    // TODO: replace LUSDBorrowingFeePaid event
    if (logData?.name !== 'LUSDBorrowingFeePaid') continue;
    return logData.args[1];
  }
  return 0n;
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

//added trove status
export const TroveStatus = {
  NON_EXISTENT: 0,
  ACTIVE: 1,
  CLOSED_BY_OWNER: 2,
  CLOSED_BY_LIQUIDATION_IN_NORMAL_MODE: 3,
  CLOSED_BY_LIQUIDATION_IN_RECOVERY_MODE: 4,
};
