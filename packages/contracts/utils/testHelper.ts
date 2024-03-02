import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { EIP712, MockDebtToken, MockERC20, StabilityPoolManager } from '../typechain';
import { ethers } from 'hardhat';
import { expect } from 'chai';
import { AddressLike, ContractTransactionResponse } from 'ethers';
import { parseUnits } from 'ethers';
import { AddressZero } from '@ethersproject/constants';
import deployTestBase, { Contracts, TokenTellorIds } from './deployTestBase';

export const MAX_BORROWING_FEE = parseUnits('0.05');

export const PermitTypes = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};

export async function deployTesting() {
  return deployTestBase();
}

export const getDomain = async (token: EIP712) => {
  const domain = await token.eip712Domain();
  return {
    chainId: domain.chainId,
    name: domain.name,
    verifyingContract: domain.verifyingContract,
    version: domain.version,
  };
};

export const setPrice = async (tokenLabel: string, price: string, contracts: any) => {
  await contracts.tellor.setPrice(TokenTellorIds[tokenLabel], parseUnits(price, 6));
};

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

  const openTx = await contracts.borrowerOperations
    .connect(from)
    .openTrove([{ tokenAddress: collToken, amount: collAmount }]);

  if (debts) await increaseDebt(from, contracts, debts);
  return openTx;
};

export const addColl = async (from: SignerWithAddress, contracts: Contracts, colls: any[], approve = false) => {
  if (approve)
    for (const { tokenAddress, amount } of colls) {
      await tokenAddress.unprotectedMint(from, amount);
      await tokenAddress.connect(from).approve(contracts.borrowerOperations, amount);
    }

  const afterPathCR = await contracts.troveManager.getICRIncludingPatch(from, colls, [], [], []);
  const [upperHint, lowerHint] = await getHints(contracts, afterPathCR);
  return contracts.borrowerOperations.connect(from).addColl(colls, upperHint, lowerHint);
};

export const withdrawalColl = async (from: SignerWithAddress, contracts: Contracts, colls: any[]) => {
  const afterPathCR = await contracts.troveManager.getICRIncludingPatch(from, [], colls, [], []);
  const [upperHint, lowerHint] = await getHints(contracts, afterPathCR);
  return contracts.borrowerOperations.connect(from).withdrawColl(colls, upperHint, lowerHint);
};

export const increaseDebt = async (
  from: SignerWithAddress,
  contracts: Contracts,
  debts: any[],
  maxFeePercentage = MAX_BORROWING_FEE
) => {
  const afterPathCR = await contracts.troveManager.getICRIncludingPatch(from, [], [], debts, []);
  const [upperHint, lowerHint] = await getHints(contracts, afterPathCR);
  return {
    tx: await contracts.borrowerOperations
      .connect(from)
      .increaseDebts(debts, { upperHint, lowerHint, maxFeePercentage }),
  };
};

export const repayDebt = async (from: SignerWithAddress, contracts: Contracts, debts: any[]) => {
  const afterPathCR = await contracts.troveManager.getICRIncludingPatch(from, [], [], [], debts);
  const [upperHint, lowerHint] = await getHints(contracts, afterPathCR);
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
  const amountStableTroves = await contracts.sortedTroves.getSize();
  const iterations = await contracts.hintHelpers.getRedemptionIterationHints(
    toRedeem,
    Math.round(Math.min(4000, 15 * Math.sqrt(Number(amountStableTroves)))),
    Math.round(Math.random() * 100000000000)
  );
  return contracts.redemptionOperations.connect(from).redeemCollateral(
    toRedeem,
    iterations.map((i: any[]) => ({ trove: i[0], upperHint: i[1], lowerHint: i[2], expectedCR: i[3] })),
    maxFeePercentage
  );
};

export async function getHints(contracts: Contracts, cr: bigint) {
  let hint;
  const amountStableTroves = await contracts.sortedTroves.getSize();
  if (amountStableTroves === 0n) hint = AddressZero;
  else {
    const [_hint] = await contracts.hintHelpers.getApproxHint(
      cr,
      Math.round(Math.min(4000, 15 * Math.sqrt(Number(amountStableTroves)))),
      Math.round(Math.random() * 100000000000)
    );
    hint = _hint;
  }

  return contracts.sortedTroves.findInsertPosition(cr, hint, hint);
}

export const getStabilityPool = async (contracts: Contracts, debt: MockDebtToken) => {
  const poolAddress = await contracts.stabilityPoolManager.getStabilityPool(debt);
  return await ethers.getContractAt('StabilityPool', poolAddress);
};

/**
 * asserts that a transaction fails and is reverted. Part of the error message can be asserted.
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
  const STABLE: MockDebtToken = contracts.STABLE;
  const BTC: MockERC20 = contracts.BTC;
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
    collToken: contracts.BTC,
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

export const buildPriceCache = async (contracts: Contracts) => {
  const priceCache = await contracts.priceFeed.buildPriceCache();
  return {
    collPrices: priceCache[0].map(a => ({
      tokenAddress: a[0],
      tokenDecimals: a[1],
      price: a[2],
      isPriceTrusted: a[3],
    })),
    debtPrices: priceCache[1].map(a => ({
      tokenAddress: a[0],
      tokenDecimals: a[1],
      price: a[2],
      isPriceTrusted: a[3],
    })),
  };
};

export const getTroveEntireColl = async (contracts: Contracts, trove: SignerWithAddress) => {
  const priceCache = await buildPriceCache(contracts);
  return (await contracts.troveManager.getEntireDebtAndColl(priceCache, trove)).troveCollInUSD;
};

export const getTroveEntireDebt = async (contracts: Contracts, trove: SignerWithAddress) => {
  const priceCache = await buildPriceCache(contracts);
  return (await contracts.troveManager.getEntireDebtAndColl(priceCache, trove)).troveDebtInUSD;
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
    if (logData?.name === 'PaidBorrowingFee') return logData.args[1];
  }
  return 0n;
};

export const getRedemptionMeta = async (tx: ContractTransactionResponse | null, contracts: Contracts) => {
  const receipt = await tx?.wait();

  const meta: { redemptions: any[]; totals: any[] } = { redemptions: [], totals: [] };
  for (const log of receipt?.logs ?? []) {
    const logData = contracts.redemptionOperations.interface.parseLog(log as any);
    if (logData?.name === 'SuccessfulRedemption') meta.totals = logData.args;
    else if (logData?.name === 'RedeemedFromTrove') meta.redemptions.push(logData.args);
  }
  return meta;
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

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
