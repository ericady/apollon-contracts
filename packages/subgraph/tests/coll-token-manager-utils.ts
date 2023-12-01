import { newMockEvent } from "matchstick-as"
import { ethereum, Address } from "@graphprotocol/graph-ts"
import {
  CollTokenAdded,
  CollTokenManagerInitialized,
  OwnershipTransferred
} from "../generated/CollTokenManager/CollTokenManager"

export function createCollTokenAddedEvent(
  _collTokenAddress: Address
): CollTokenAdded {
  let collTokenAddedEvent = changetype<CollTokenAdded>(newMockEvent())

  collTokenAddedEvent.parameters = new Array()

  collTokenAddedEvent.parameters.push(
    new ethereum.EventParam(
      "_collTokenAddress",
      ethereum.Value.fromAddress(_collTokenAddress)
    )
  )

  return collTokenAddedEvent
}

export function createCollTokenManagerInitializedEvent(
  _priceFeedAddress: Address
): CollTokenManagerInitialized {
  let collTokenManagerInitializedEvent = changetype<
    CollTokenManagerInitialized
  >(newMockEvent())

  collTokenManagerInitializedEvent.parameters = new Array()

  collTokenManagerInitializedEvent.parameters.push(
    new ethereum.EventParam(
      "_priceFeedAddress",
      ethereum.Value.fromAddress(_priceFeedAddress)
    )
  )

  return collTokenManagerInitializedEvent
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
