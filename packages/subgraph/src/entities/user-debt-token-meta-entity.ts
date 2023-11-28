// import { Address, BigInt } from '@graphprotocol/graph-ts';
// import { DebtToken } from '../../generated/DebtToken/DebtToken';
// import { StabilityPool } from '../../generated/StabilityPool/StabilityPool';
// import { StabilityPoolManager } from '../../generated/StabilityPoolManager/StabilityPoolManager';
// import { TroveManager } from '../../generated/TroveManager/TroveManager';
// import { UserDebtTokenMeta } from '../../generated/schema';

// // TODO: use this internally to create the new entity conditionally if it couldnt be loaded
// export function handleCreateUserDebtTokenMeta(tokenAddress: Address, borrower: Address): void {
//   // TODO: Remove this as we are only calling the function when creating a new entity is necessary.
//   let userDebtTokenMeta = UserDebtTokenMeta.load(
//     `UserDebtTokenMeta-${tokenAddress.toHexString()}-${borrower.toHexString()}`,
//   );

//   if (!userDebtTokenMeta) {
//     userDebtTokenMeta = new UserDebtTokenMeta(
//       `UserDebtTokenMeta-${tokenAddress.toHexString()}-${borrower.toHexString()}`,
//     );
//   }

//   const tokenContract = DebtToken.bind(tokenAddress);
//   const troveManagerContract = TroveManager.bind(tokenContract.troveManagerAddress());

//   userDebtTokenMeta.token = tokenAddress;

//   userDebtTokenMeta.borrower = borrower;
//   userDebtTokenMeta.walletAmount = tokenContract.balanceOf(borrower);

//   const trove = troveManagerContract.getTroveDebt(borrower);

//   // Clossure not supported yet
//   let troveIndex = -1;
//   const targetAddress = tokenAddress;
//   for (let i = 0; i < trove.length; i++) {
//     if (trove[i].tokenAddress.toHexString() == targetAddress.toHexString()) {
//       troveIndex = i;
//       break;
//     }
//   }
//   const troveMintedAmount = trove[troveIndex].amount;

//   userDebtTokenMeta.troveMintedAmount = troveMintedAmount;

//   // TODO: Implement
//   userDebtTokenMeta.providedStablitySinceLastCollClaim = BigInt.fromI32(0);
//   // const StabilityPoolContract = StabilityPool.bind(event.address);
//   // const tokenAddress = StabilityPoolContract.getDepositToken();
//   // const depositAfterClaim = StabilityPoolContract.deposits(event.params.user);

//   const stabilityPoolManagerContract = StabilityPoolManager.bind(tokenContract.stabilityPoolManagerAddress());
//   const stabilityPoolContract = StabilityPool.bind(stabilityPoolManagerContract.getStabilityPool(tokenAddress));
//   userDebtTokenMeta.stabilityCompoundAmount = stabilityPoolContract.getCompoundedDebtDeposit(borrower);

//   userDebtTokenMeta.save();
// }

// export function handleUpdateUserDebtTokenMeta_walletAmount_stabilityCompoundAmount(
//   tokenAddress: Address,
//   borrower: Address,
// ): void {
//   const userDebtTokenMeta = UserDebtTokenMeta.load(
//     `UserDebtTokenMeta-${tokenAddress.toHexString()}-${borrower.toHexString()}`,
//   )!;

//   const tokenContract = DebtToken.bind(tokenAddress);

//   userDebtTokenMeta.walletAmount = tokenContract.balanceOf(borrower);

//   // TODO: implement stabilityCompoundAmount update

//   userDebtTokenMeta.save();
// }

// export function handleUpdateUserDebtTokenMeta_troveMintedAmount_stabilityCompoundAmount(
//   tokenAddress: Address,
//   borrower: Address,
// ): void {
//   const userDebtTokenMeta = UserDebtTokenMeta.load(
//     `UserDebtTokenMeta-${tokenAddress.toHexString()}-${borrower.toHexString()}`,
//   )!;

//   const tokenContract = DebtToken.bind(tokenAddress);
//   const troveManagerContract = TroveManager.bind(tokenContract.troveManagerAddress());

//   const trove = troveManagerContract.getTroveDebt(borrower);

//   // Clossure not supported yet
//   let troveIndex = -1;
//   const targetAddress = tokenAddress;
//   for (let i = 0; i < trove.length; i++) {
//     if (trove[i].tokenAddress.toHexString() == targetAddress.toHexString()) {
//       troveIndex = i;
//       break;
//     }
//   }

//   const troveMintedAmount = trove[troveIndex].amount;
//   userDebtTokenMeta.troveMintedAmount = troveMintedAmount;

//   // TODO: implement stabilityCompoundAmount update

//   userDebtTokenMeta.save();
// }

// /**
//  * Tracks the "real" deposit value of the borrower by registering all deposits/withdrawals since the last reward claim
//  * This allows to calculate any claimed deposits since the last reward claim
//  */
// export function handleUpdateUserDebtTokenMeta_providedStablitySinceLastCollClaim_stabilityCompoundAmount(
//   tokenAddress: Address,
//   borrower: Address,
// ): void {}

// /**
//  * On claiming rewards the count of provided stability is reset to the current borrowers deposit.
//  */
// export function handleResetUserDebtTokenMeta_providedStablitySinceLastCollClaim(
//   tokenAddress: Address,
//   borrower: Address,
// ): void {}
