import {
  BorrowerOperationsAddressChanged as BorrowerOperationsAddressChangedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  PoolValueUpdated as PoolValueUpdatedEvent,
  PriceFeedAddressChanged as PriceFeedAddressChangedEvent,
  StabilityPoolManagerAddressChanged as StabilityPoolManagerAddressChangedEvent,
  TroveManagerAddressChanged as TroveManagerAddressChangedEvent
} from "../generated/StoragePool/StoragePool"
import {
  BorrowerOperationsAddressChanged,
  OwnershipTransferred,
  PoolValueUpdated,
  PriceFeedAddressChanged,
  StabilityPoolManagerAddressChanged,
  TroveManagerAddressChanged
} from "../generated/schema"

export function handleBorrowerOperationsAddressChanged(
  event: BorrowerOperationsAddressChangedEvent
): void {
  let entity = new BorrowerOperationsAddressChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._newBorrowerOperationsAddress =
    event.params._newBorrowerOperationsAddress

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePoolValueUpdated(event: PoolValueUpdatedEvent): void {
  let entity = new PoolValueUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._tokenAddress = event.params._tokenAddress
  entity._isColl = event.params._isColl
  entity._poolType = event.params._poolType
  entity._updatedAmount = event.params._updatedAmount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePriceFeedAddressChanged(
  event: PriceFeedAddressChangedEvent
): void {
  let entity = new PriceFeedAddressChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._priceFeedAddress = event.params._priceFeedAddress

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleStabilityPoolManagerAddressChanged(
  event: StabilityPoolManagerAddressChangedEvent
): void {
  let entity = new StabilityPoolManagerAddressChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._newStabilityPoolAddress = event.params._newStabilityPoolAddress

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleTroveManagerAddressChanged(
  event: TroveManagerAddressChangedEvent
): void {
  let entity = new TroveManagerAddressChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._newTroveManagerAddress = event.params._newTroveManagerAddress

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
