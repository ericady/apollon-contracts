import { Address, BigInt } from '@graphprotocol/graph-ts';
import { DebtToken } from '../../generated/DebtToken/DebtToken';
import { StabilityPool } from '../../generated/StabilityPool/StabilityPool';
import { StabilityPoolManager } from '../../generated/StabilityPoolManager/StabilityPoolManager';
import { TroveManager } from '../../generated/TroveManager/TroveManager';
import { UserDebtTokenMeta } from '../../generated/schema';

export function updateUserDebtTokenMeta(
  tokenAddress: Address,
  borrower: Address,
  newProvidedStablitySinceLastCollClaim?: BigInt,
): void {
  let userDebtTokenMeta = UserDebtTokenMeta.load(
    `UserDebtTokenMeta-${tokenAddress.toHexString()}-${borrower.toHexString()}`,
  );
  if (!userDebtTokenMeta) {
    userDebtTokenMeta = new UserDebtTokenMeta(
      `UserDebtTokenMeta-${tokenAddress.toHexString()}-${borrower.toHexString()}`,
    );
  }

  const tokenContract = DebtToken.bind(tokenAddress);
  const troveManagerContract = TroveManager.bind(tokenContract.troveManagerAddress());

  userDebtTokenMeta.token = tokenAddress;

  userDebtTokenMeta.borrower = borrower;
  userDebtTokenMeta.walletAmount = tokenContract.balanceOf(borrower);

  const trove = troveManagerContract.getTroveDebt(borrower);

  // Clossure not supported yet
  let troveIndex = -1;
  const targetAddress = tokenAddress;
  for (let i = 0; i < trove.length; i++) {
    if (trove[i].tokenAddress.toHexString() == targetAddress.toHexString()) {
      troveIndex = i;
      break;
    }
  }
  const troveMintedAmount = trove[troveIndex].amount;

  userDebtTokenMeta.troveMintedAmount = troveMintedAmount;

  if (newProvidedStablitySinceLastCollClaim) {
    userDebtTokenMeta.providedStablitySinceLastCollClaim = newProvidedStablitySinceLastCollClaim;
  } else {
    userDebtTokenMeta.providedStablitySinceLastCollClaim = userDebtTokenMeta.providedStablitySinceLastCollClaim;
  }

  const stabilityPoolManagerContract = StabilityPoolManager.bind(tokenContract.stabilityPoolManagerAddress());
  const stabilityPoolContract = StabilityPool.bind(stabilityPoolManagerContract.getStabilityPool(tokenAddress));
  userDebtTokenMeta.stabilityCompoundAmount = stabilityPoolContract.getCompoundedDebtDeposit(borrower);

  userDebtTokenMeta.save();
}
