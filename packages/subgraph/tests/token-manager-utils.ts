import { newMockEvent } from "matchstick-as"
import { ethereum, Address } from "@graphprotocol/graph-ts"
import {
  CollTokenAdded,
  DebtTokenAdded,
  OwnershipTransferred,
  TokenManagerInitialized
} from "../generated/TokenManager/TokenManager"

export function createCollTokenAddedEvent(
  _tokenAddress: Address,
  _isGovToken: boolean
): CollTokenAdded {
  let collTokenAddedEvent = changetype<CollTokenAdded>(newMockEvent())

  collTokenAddedEvent.parameters = new Array()

  collTokenAddedEvent.parameters.push(
    new ethereum.EventParam(
      "_tokenAddress",
      ethereum.Value.fromAddress(_tokenAddress)
    )
  )
  collTokenAddedEvent.parameters.push(
    new ethereum.EventParam(
      "_isGovToken",
      ethereum.Value.fromBoolean(_isGovToken)
    )
  )

  return collTokenAddedEvent
}

export function createDebtTokenAddedEvent(
  _debtTokenAddress: Address
): DebtTokenAdded {
  let debtTokenAddedEvent = changetype<DebtTokenAdded>(newMockEvent())

  debtTokenAddedEvent.parameters = new Array()

  debtTokenAddedEvent.parameters.push(
    new ethereum.EventParam(
      "_debtTokenAddress",
      ethereum.Value.fromAddress(_debtTokenAddress)
    )
  )

  return debtTokenAddedEvent
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

export function createTokenManagerInitializedEvent(
  _stabilityPoolManagerAddress: Address,
  _priceFeedAddress: Address
): TokenManagerInitialized {
  let tokenManagerInitializedEvent = changetype<TokenManagerInitialized>(
    newMockEvent()
  )

  tokenManagerInitializedEvent.parameters = new Array()

  tokenManagerInitializedEvent.parameters.push(
    new ethereum.EventParam(
      "_stabilityPoolManagerAddress",
      ethereum.Value.fromAddress(_stabilityPoolManagerAddress)
    )
  )
  tokenManagerInitializedEvent.parameters.push(
    new ethereum.EventParam(
      "_priceFeedAddress",
      ethereum.Value.fromAddress(_priceFeedAddress)
    )
  )

  return tokenManagerInitializedEvent
}
