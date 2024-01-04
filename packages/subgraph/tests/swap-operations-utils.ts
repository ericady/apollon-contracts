import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  OwnershipTransferred,
  PairCreated,
  SwapOperationsInitialized
} from "../generated/Contract/Contract"

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(
    newMockEvent()
  )

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createPairCreatedEvent(
  token0: Address,
  token1: Address,
  pair: Address,
  param3: BigInt
): PairCreated {
  let pairCreatedEvent = changetype<PairCreated>(newMockEvent())

  pairCreatedEvent.parameters = new Array()

  pairCreatedEvent.parameters.push(
    new ethereum.EventParam("token0", ethereum.Value.fromAddress(token0))
  )
  pairCreatedEvent.parameters.push(
    new ethereum.EventParam("token1", ethereum.Value.fromAddress(token1))
  )
  pairCreatedEvent.parameters.push(
    new ethereum.EventParam("pair", ethereum.Value.fromAddress(pair))
  )
  pairCreatedEvent.parameters.push(
    new ethereum.EventParam("param3", ethereum.Value.fromUnsignedBigInt(param3))
  )

  return pairCreatedEvent
}

export function createSwapOperationsInitializedEvent(
  borrowerOperations: Address,
  troveManager: Address,
  priceFeed: Address,
  debtTokenManager: Address
): SwapOperationsInitialized {
  let swapOperationsInitializedEvent = changetype<SwapOperationsInitialized>(
    newMockEvent()
  )

  swapOperationsInitializedEvent.parameters = new Array()

  swapOperationsInitializedEvent.parameters.push(
    new ethereum.EventParam(
      "borrowerOperations",
      ethereum.Value.fromAddress(borrowerOperations)
    )
  )
  swapOperationsInitializedEvent.parameters.push(
    new ethereum.EventParam(
      "troveManager",
      ethereum.Value.fromAddress(troveManager)
    )
  )
  swapOperationsInitializedEvent.parameters.push(
    new ethereum.EventParam("priceFeed", ethereum.Value.fromAddress(priceFeed))
  )
  swapOperationsInitializedEvent.parameters.push(
    new ethereum.EventParam(
      "debtTokenManager",
      ethereum.Value.fromAddress(debtTokenManager)
    )
  )

  return swapOperationsInitializedEvent
}
