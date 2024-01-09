import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { Address as EventAddress } from '@graphprotocol/graph-ts/common/numbers';
import { BorrowerOperations } from '../../generated/BorrowerOperations/BorrowerOperations';
import { DebtToken } from '../../generated/DebtToken/DebtToken';
import { ReservePool } from '../../generated/ReservePool/ReservePool';
import { StabilityOffsetAddedGainsStruct, StabilityPool } from '../../generated/StabilityPool/StabilityPool';
import { StabilityPoolManager } from '../../generated/StabilityPoolManager/StabilityPoolManager';
import { DebtTokenMeta, Token } from '../../generated/schema';

export const stableDebtToken = EventAddress.fromString('0x6c3f90f043a72fa612cbac8115ee7e52bde6e490');
export const govToken = EventAddress.fromString('0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2');

export function handleCreateDebtTokenMeta(
  event: ethereum.Event,
  tokenAddress: Address,
  govReserveCap: BigInt | undefined = undefined,
): void {
  const debtTokenMeta = new DebtTokenMeta(event.transaction.hash.concatI32(event.logIndex.toI32()));

  const tokenContract = DebtToken.bind(tokenAddress);
  const debtTokenStabilityPoolManagerContract = StabilityPoolManager.bind(tokenContract.stabilityPoolManagerAddress());
  const debtTokenStabilityPoolContract = StabilityPool.bind(
    debtTokenStabilityPoolManagerContract.getStabilityPool(tokenAddress),
  );

  debtTokenMeta.token = tokenAddress;
  debtTokenMeta.timestamp = event.block.timestamp;

  const totalSupply = tokenContract.totalSupply();
  const tokenPrice = Token.load(tokenAddress)!.priceUSD;
  debtTokenMeta.totalSupplyUSD = totalSupply.times(tokenPrice);

  if (tokenAddress === stableDebtToken || tokenAddress === govToken) {
    const borrowerOperationsAddress = tokenContract.borrowerOperationsAddress();
    const borrowerOperationsContract = BorrowerOperations.bind(borrowerOperationsAddress);

    const reservePoolAddress = borrowerOperationsContract.reservePool();
    const reservePoolContract = ReservePool.bind(reservePoolAddress);

    if (tokenAddress === stableDebtToken) {
      debtTokenMeta.totalReserve = tokenContract.balanceOf(event.address);
    } else if (tokenAddress === govToken) {
      debtTokenMeta.totalReserve = govReserveCap ? govReserveCap : reservePoolContract.govReserveCap();
    }
  }

  // TODO: Implement
  debtTokenMeta.stabilityDepositAPY = 1;
  debtTokenMeta.totalDepositedStability = debtTokenStabilityPoolContract.getTotalDeposit();

  debtTokenMeta.save();
}

export function handleUpdateStabilityDepositAPY(
  event: ethereum.Event,
  tokenAddress: Address,
  lostDeposit: BigInt,
  collGain: StabilityOffsetAddedGainsStruct[],
): void {
  // # "StabilityDepositAPY" + token
}
