import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { newMockEvent } from 'matchstick-as';
import {
  BorrowerOperationsInitialized,
  OwnershipTransferred,
  TroveCreated,
} from '../generated/BorrowerOperations/BorrowerOperations';

export function createBorrowerOperationsInitializedEvent(
  _troveManagerAddress: Address,
  _storagePoolAddress: Address,
  _stabilityPoolAddress: Address,
  _priceFeedAddress: Address,
  _debtTokenManagerAddress: Address,
  _collTokenManagerAddress: Address,
): BorrowerOperationsInitialized {
  let borrowerOperationsInitializedEvent = changetype<BorrowerOperationsInitialized>(newMockEvent());

  borrowerOperationsInitializedEvent.parameters = new Array();

  borrowerOperationsInitializedEvent.parameters.push(
    new ethereum.EventParam('_troveManagerAddress', ethereum.Value.fromAddress(_troveManagerAddress)),
  );
  borrowerOperationsInitializedEvent.parameters.push(
    new ethereum.EventParam('_storagePoolAddress', ethereum.Value.fromAddress(_storagePoolAddress)),
  );
  borrowerOperationsInitializedEvent.parameters.push(
    new ethereum.EventParam('_stabilityPoolAddress', ethereum.Value.fromAddress(_stabilityPoolAddress)),
  );
  borrowerOperationsInitializedEvent.parameters.push(
    new ethereum.EventParam('_priceFeedAddress', ethereum.Value.fromAddress(_priceFeedAddress)),
  );
  borrowerOperationsInitializedEvent.parameters.push(
    new ethereum.EventParam('_debtTokenManagerAddress', ethereum.Value.fromAddress(_debtTokenManagerAddress)),
  );
  borrowerOperationsInitializedEvent.parameters.push(
    new ethereum.EventParam('_collTokenManagerAddress', ethereum.Value.fromAddress(_collTokenManagerAddress)),
  );

  return borrowerOperationsInitializedEvent;
}

// export function createCollateralTokenUpdatedEvent(
//   _collateralTokenAddress: Address,
//   _owner: Address,
//   _receiver: Address,
// ): CollateralTokenUpdated {
//   let collateralTokenUpdatedEvent = changetype<CollateralTokenUpdated>(newMockEvent());

//   collateralTokenUpdatedEvent.parameters = new Array();

//   collateralTokenUpdatedEvent.parameters.push(
//     new ethereum.EventParam('_collateralTokenAddress', ethereum.Value.fromAddress(_collateralTokenAddress)),
//   );
//   collateralTokenUpdatedEvent.parameters.push(new ethereum.EventParam('_owner', ethereum.Value.fromAddress(_owner)));
//   collateralTokenUpdatedEvent.parameters.push(
//     new ethereum.EventParam('_receiver', ethereum.Value.fromAddress(_receiver)),
//   );

//   return collateralTokenUpdatedEvent;
// }

export function createOwnershipTransferredEvent(previousOwner: Address, newOwner: Address): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(newMockEvent());

  ownershipTransferredEvent.parameters = new Array();

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam('previousOwner', ethereum.Value.fromAddress(previousOwner)),
  );
  ownershipTransferredEvent.parameters.push(new ethereum.EventParam('newOwner', ethereum.Value.fromAddress(newOwner)));

  return ownershipTransferredEvent;
}

export function createTroveCreatedEvent(_borrower: Address, arrayIndex: BigInt): TroveCreated {
  let troveCreatedEvent = changetype<TroveCreated>(newMockEvent());

  troveCreatedEvent.parameters = new Array();

  troveCreatedEvent.parameters.push(new ethereum.EventParam('_borrower', ethereum.Value.fromAddress(_borrower)));
  troveCreatedEvent.parameters.push(new ethereum.EventParam('arrayIndex', ethereum.Value.fromSignedBigInt(arrayIndex)));

  return troveCreatedEvent;
}
