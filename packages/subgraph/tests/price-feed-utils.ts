import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  LastGoodPriceUpdated,
  OwnershipTransferred,
  PriceFeedStatusChanged,
  TokenPriceChanged
} from "../generated/PriceFeed/PriceFeed"

export function createLastGoodPriceUpdatedEvent(
  _token: Address,
  _lastGoodPrice: BigInt
): LastGoodPriceUpdated {
  let lastGoodPriceUpdatedEvent = changetype<LastGoodPriceUpdated>(
    newMockEvent()
  )

  lastGoodPriceUpdatedEvent.parameters = new Array()

  lastGoodPriceUpdatedEvent.parameters.push(
    new ethereum.EventParam("_token", ethereum.Value.fromAddress(_token))
  )
  lastGoodPriceUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "_lastGoodPrice",
      ethereum.Value.fromUnsignedBigInt(_lastGoodPrice)
    )
  )

  return lastGoodPriceUpdatedEvent
}

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

export function createPriceFeedStatusChangedEvent(
  _token: Address,
  newStatus: i32
): PriceFeedStatusChanged {
  let priceFeedStatusChangedEvent = changetype<PriceFeedStatusChanged>(
    newMockEvent()
  )

  priceFeedStatusChangedEvent.parameters = new Array()

  priceFeedStatusChangedEvent.parameters.push(
    new ethereum.EventParam("_token", ethereum.Value.fromAddress(_token))
  )
  priceFeedStatusChangedEvent.parameters.push(
    new ethereum.EventParam(
      "newStatus",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(newStatus))
    )
  )

  return priceFeedStatusChangedEvent
}

export function createTokenPriceChangedEvent(
  _token: Address
): TokenPriceChanged {
  let tokenPriceChangedEvent = changetype<TokenPriceChanged>(newMockEvent())

  tokenPriceChangedEvent.parameters = new Array()

  tokenPriceChangedEvent.parameters.push(
    new ethereum.EventParam("_token", ethereum.Value.fromAddress(_token))
  )

  return tokenPriceChangedEvent
}
