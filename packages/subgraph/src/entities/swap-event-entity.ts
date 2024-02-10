import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { SwapEvent } from '../../generated/schema';

export function handleCreateSwapEvent(
  event: ethereum.Event,
  tokenAddress: Address,
  borrower: Address,
  // "LONG" | "SHORT"
  direction: string,
  nonStableSize: BigInt,
  totalPriceInStable: BigInt,
  // fee is returned in 1e6 (SWAP_FEE_PRECISION)
  currentSwapFee: BigInt,
): void {
  const swapEvent = new SwapEvent(event.transaction.hash.concatI32(event.logIndex.toI32()));

  swapEvent.borrower = borrower;
  swapEvent.token = tokenAddress;
  swapEvent.direction = direction;
  swapEvent.timestamp = event.block.timestamp;
  swapEvent.size = nonStableSize;
  swapEvent.totalPriceInStable = totalPriceInStable;

  swapEvent.swapFee = currentSwapFee;

  swapEvent.save();
}
