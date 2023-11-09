import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  BorrowerOperationsAddressChanged,
  OwnershipTransferred,
  PoolValueUpdated,
  PriceFeedAddressChanged,
  StabilityPoolManagerAddressChanged,
  TroveManagerAddressChanged
} from "../generated/StoragePool/StoragePool"

export function createBorrowerOperationsAddressChangedEvent(
  _newBorrowerOperationsAddress: Address
): BorrowerOperationsAddressChanged {
  let borrowerOperationsAddressChangedEvent = changetype<
    BorrowerOperationsAddressChanged
  >(newMockEvent())

  borrowerOperationsAddressChangedEvent.parameters = new Array()

  borrowerOperationsAddressChangedEvent.parameters.push(
    new ethereum.EventParam(
      "_newBorrowerOperationsAddress",
      ethereum.Value.fromAddress(_newBorrowerOperationsAddress)
    )
  )

  return borrowerOperationsAddressChangedEvent
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

export function createPoolValueUpdatedEvent(
  _tokenAddress: Address,
  _isColl: boolean,
  _poolType: i32,
  _updatedAmount: BigInt
): PoolValueUpdated {
  let poolValueUpdatedEvent = changetype<PoolValueUpdated>(newMockEvent())

  poolValueUpdatedEvent.parameters = new Array()

  poolValueUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "_tokenAddress",
      ethereum.Value.fromAddress(_tokenAddress)
    )
  )
  poolValueUpdatedEvent.parameters.push(
    new ethereum.EventParam("_isColl", ethereum.Value.fromBoolean(_isColl))
  )
  poolValueUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "_poolType",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(_poolType))
    )
  )
  poolValueUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "_updatedAmount",
      ethereum.Value.fromUnsignedBigInt(_updatedAmount)
    )
  )

  return poolValueUpdatedEvent
}

export function createPriceFeedAddressChangedEvent(
  _priceFeedAddress: Address
): PriceFeedAddressChanged {
  let priceFeedAddressChangedEvent = changetype<PriceFeedAddressChanged>(
    newMockEvent()
  )

  priceFeedAddressChangedEvent.parameters = new Array()

  priceFeedAddressChangedEvent.parameters.push(
    new ethereum.EventParam(
      "_priceFeedAddress",
      ethereum.Value.fromAddress(_priceFeedAddress)
    )
  )

  return priceFeedAddressChangedEvent
}

export function createStabilityPoolManagerAddressChangedEvent(
  _newStabilityPoolAddress: Address
): StabilityPoolManagerAddressChanged {
  let stabilityPoolManagerAddressChangedEvent = changetype<
    StabilityPoolManagerAddressChanged
  >(newMockEvent())

  stabilityPoolManagerAddressChangedEvent.parameters = new Array()

  stabilityPoolManagerAddressChangedEvent.parameters.push(
    new ethereum.EventParam(
      "_newStabilityPoolAddress",
      ethereum.Value.fromAddress(_newStabilityPoolAddress)
    )
  )

  return stabilityPoolManagerAddressChangedEvent
}

export function createTroveManagerAddressChangedEvent(
  _newTroveManagerAddress: Address
): TroveManagerAddressChanged {
  let troveManagerAddressChangedEvent = changetype<TroveManagerAddressChanged>(
    newMockEvent()
  )

  troveManagerAddressChangedEvent.parameters = new Array()

  troveManagerAddressChangedEvent.parameters.push(
    new ethereum.EventParam(
      "_newTroveManagerAddress",
      ethereum.Value.fromAddress(_newTroveManagerAddress)
    )
  )

  return troveManagerAddressChangedEvent
}
