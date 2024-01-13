import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { SwapEvent } from "../../generated/schema";
import { SwapPair } from "../../generated/SwapPair/SwapPair";

export function handleCreateSwapEvent(
    event: ethereum.Event,
    swapPair: Address,
    tokenAddress: Address,
    borrower: Address,
    direction: "LONG" | "SHORT",
    nonStableSize: BigInt,
    totalPriceInStable: BigInt,
  ): void {
    const swapEvent = new SwapEvent(event.transaction.hash.concatI32(event.logIndex.toI32()))

    swapEvent.borrower = borrower;
    swapEvent.token = tokenAddress;
    swapEvent.direction = direction;
    swapEvent.timestamp = event.block.timestamp;
    swapEvent.size = nonStableSize;
    swapEvent.totalPriceInStable = totalPriceInStable;
    
    const swapPairContract = SwapPair.bind(swapPair)
    // fee is returned in 1e6 (SWAP_FEE_PRECISION)
    const swapFee = swapPairContract.getSwapFee();
    
    // Long => jUSD / Short => DebtToken
    if (direction === "LONG") {
        swapEvent.swapFee = swapFee.times(totalPriceInStable).div(BigInt.fromI32(1e6));
    } else {
        swapEvent.swapFee = swapFee.times(nonStableSize).div(BigInt.fromI32(1e6));
    }

    swapEvent.save();
  }