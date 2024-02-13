import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { newMockEvent } from 'matchstick-as';
import {
  LTermsUpdated,
  LastFeeOpTimeUpdated,
  OwnershipTransferred,
  SystemSnapshotsUpdated,
  TotalStakesUpdated,
  TroveAppliedRewards,
  TroveClosed,
  TroveIndexUpdated,
  TroveManagerInitialized,
  TroveSnapshotsUpdated,
} from '../generated/TroveManager/TroveManager';

// export function createBaseRateUpdatedEvent(_baseRate: BigInt): BaseRateUpdated {
//   let baseRateUpdatedEvent = changetype<BaseRateUpdated>(newMockEvent());

//   baseRateUpdatedEvent.parameters = new Array();

//   baseRateUpdatedEvent.parameters.push(
//     new ethereum.EventParam('_baseRate', ethereum.Value.fromSignedBigInt(_baseRate)),
//   );

//   return baseRateUpdatedEvent;
// }

export function createLTermsUpdatedEvent(_liquidatedTokens: Array<ethereum.Tuple>): LTermsUpdated {
  let lTermsUpdatedEvent = changetype<LTermsUpdated>(newMockEvent());

  lTermsUpdatedEvent.parameters = new Array();

  lTermsUpdatedEvent.parameters.push(
    new ethereum.EventParam('_liquidatedTokens', ethereum.Value.fromTupleArray(_liquidatedTokens)),
  );

  return lTermsUpdatedEvent;
}

export function createLastFeeOpTimeUpdatedEvent(_lastFeeOpTime: BigInt): LastFeeOpTimeUpdated {
  let lastFeeOpTimeUpdatedEvent = changetype<LastFeeOpTimeUpdated>(newMockEvent());

  lastFeeOpTimeUpdatedEvent.parameters = new Array();

  lastFeeOpTimeUpdatedEvent.parameters.push(
    new ethereum.EventParam('_lastFeeOpTime', ethereum.Value.fromSignedBigInt(_lastFeeOpTime)),
  );

  return lastFeeOpTimeUpdatedEvent;
}

// export function createLiquidationSummaryEvent(
//   liquidatedDebt: Array<ethereum.Tuple>,
//   liquidatedColl: Array<ethereum.Tuple>,
//   totalStableCoinGasCompensation: BigInt,
//   totalCollGasCompensation: Array<ethereum.Tuple>,
// ): LiquidationSummary {
//   let liquidationSummaryEvent = changetype<LiquidationSummary>(newMockEvent());

//   liquidationSummaryEvent.parameters = new Array();

//   liquidationSummaryEvent.parameters.push(
//     new ethereum.EventParam('liquidatedDebt', ethereum.Value.fromTupleArray(liquidatedDebt)),
//   );
//   liquidationSummaryEvent.parameters.push(
//     new ethereum.EventParam('liquidatedColl', ethereum.Value.fromTupleArray(liquidatedColl)),
//   );
//   liquidationSummaryEvent.parameters.push(
//     new ethereum.EventParam(
//       'totalStableCoinGasCompensation',
//       ethereum.Value.fromSignedBigInt(totalStableCoinGasCompensation),
//     ),
//   );
//   liquidationSummaryEvent.parameters.push(
//     new ethereum.EventParam('totalCollGasCompensation', ethereum.Value.fromTupleArray(totalCollGasCompensation)),
//   );

//   return liquidationSummaryEvent;
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

export function createSystemSnapshotsUpdatedEvent(
  _totalStakesSnapshot: Array<ethereum.Tuple>,
  _totalCollateralSnapshot: Array<ethereum.Tuple>,
): SystemSnapshotsUpdated {
  let systemSnapshotsUpdatedEvent = changetype<SystemSnapshotsUpdated>(newMockEvent());

  systemSnapshotsUpdatedEvent.parameters = new Array();

  systemSnapshotsUpdatedEvent.parameters.push(
    new ethereum.EventParam('_totalStakesSnapshot', ethereum.Value.fromTupleArray(_totalStakesSnapshot)),
  );
  systemSnapshotsUpdatedEvent.parameters.push(
    new ethereum.EventParam('_totalCollateralSnapshot', ethereum.Value.fromTupleArray(_totalCollateralSnapshot)),
  );

  return systemSnapshotsUpdatedEvent;
}

export function createTotalStakesUpdatedEvent(_totalStakes: Array<ethereum.Tuple>): TotalStakesUpdated {
  let totalStakesUpdatedEvent = changetype<TotalStakesUpdated>(newMockEvent());

  totalStakesUpdatedEvent.parameters = new Array();

  totalStakesUpdatedEvent.parameters.push(
    new ethereum.EventParam('_totalStakes', ethereum.Value.fromTupleArray(_totalStakes)),
  );

  return totalStakesUpdatedEvent;
}

export function createTroveAppliedRewardsEvent(
  _borrower: Address,
  _appliedRewards: Array<ethereum.Tuple>,
): TroveAppliedRewards {
  let troveAppliedRewardsEvent = changetype<TroveAppliedRewards>(newMockEvent());

  troveAppliedRewardsEvent.parameters = new Array();

  troveAppliedRewardsEvent.parameters.push(new ethereum.EventParam('_borrower', ethereum.Value.fromAddress(_borrower)));
  troveAppliedRewardsEvent.parameters.push(
    new ethereum.EventParam('_appliedRewards', ethereum.Value.fromTupleArray(_appliedRewards)),
  );

  return troveAppliedRewardsEvent;
}

export function createTroveClosedEvent(_borrower: Address, _closingState: i32): TroveClosed {
  let troveClosedEvent = changetype<TroveClosed>(newMockEvent());

  troveClosedEvent.parameters = new Array();

  troveClosedEvent.parameters.push(new ethereum.EventParam('_borrower', ethereum.Value.fromAddress(_borrower)));
  troveClosedEvent.parameters.push(
    new ethereum.EventParam('_closingState', ethereum.Value.fromSignedBigInt(BigInt.fromI32(_closingState))),
  );

  return troveClosedEvent;
}

export function createTroveIndexUpdatedEvent(_borrower: Address, _newIndex: BigInt): TroveIndexUpdated {
  let troveIndexUpdatedEvent = changetype<TroveIndexUpdated>(newMockEvent());

  troveIndexUpdatedEvent.parameters = new Array();

  troveIndexUpdatedEvent.parameters.push(new ethereum.EventParam('_borrower', ethereum.Value.fromAddress(_borrower)));
  troveIndexUpdatedEvent.parameters.push(
    new ethereum.EventParam('_newIndex', ethereum.Value.fromSignedBigInt(_newIndex)),
  );

  return troveIndexUpdatedEvent;
}

export function createTroveManagerInitializedEvent(
  _borrowerOperationsAddress: Address,
  _redemptionOperationsAddress: Address,
  _storagePoolAddress: Address,
  _stabilityPoolAddress: Address,
  _priceFeedAddress: Address,
  _debtTokenManagerAddress: Address,
  _collTokenManagerAddress: Address,
): TroveManagerInitialized {
  let troveManagerInitializedEvent = changetype<TroveManagerInitialized>(newMockEvent());

  troveManagerInitializedEvent.parameters = new Array();

  troveManagerInitializedEvent.parameters.push(
    new ethereum.EventParam('_borrowerOperationsAddress', ethereum.Value.fromAddress(_borrowerOperationsAddress)),
  );
  troveManagerInitializedEvent.parameters.push(
    new ethereum.EventParam('_redemptionOperationsAddress', ethereum.Value.fromAddress(_redemptionOperationsAddress)),
  );
  troveManagerInitializedEvent.parameters.push(
    new ethereum.EventParam('_storagePoolAddress', ethereum.Value.fromAddress(_storagePoolAddress)),
  );
  troveManagerInitializedEvent.parameters.push(
    new ethereum.EventParam('_stabilityPoolAddress', ethereum.Value.fromAddress(_stabilityPoolAddress)),
  );
  troveManagerInitializedEvent.parameters.push(
    new ethereum.EventParam('_priceFeedAddress', ethereum.Value.fromAddress(_priceFeedAddress)),
  );
  troveManagerInitializedEvent.parameters.push(
    new ethereum.EventParam('_debtTokenManagerAddress', ethereum.Value.fromAddress(_debtTokenManagerAddress)),
  );
  troveManagerInitializedEvent.parameters.push(
    new ethereum.EventParam('_collTokenManagerAddress', ethereum.Value.fromAddress(_collTokenManagerAddress)),
  );

  return troveManagerInitializedEvent;
}

export function createTroveSnapshotsUpdatedEvent(_liquidatedTokens: Array<ethereum.Tuple>): TroveSnapshotsUpdated {
  let troveSnapshotsUpdatedEvent = changetype<TroveSnapshotsUpdated>(newMockEvent());

  troveSnapshotsUpdatedEvent.parameters = new Array();

  troveSnapshotsUpdatedEvent.parameters.push(
    new ethereum.EventParam('_liquidatedTokens', ethereum.Value.fromTupleArray(_liquidatedTokens)),
  );

  return troveSnapshotsUpdatedEvent;
}

// export function createCollateralUpdatedEvent(_borrower: Address, _collTokens: Address[]): CollateralUpdated {
//   let collateralUpdatedEvent = changetype<CollateralUpdated>(newMockEvent());
//   collateralUpdatedEvent.address = MockTroveManagerAddress;

//   collateralUpdatedEvent.parameters = new Array();

//   collateralUpdatedEvent.parameters.push(new ethereum.EventParam('_borrower', ethereum.Value.fromAddress(_borrower)));
//   collateralUpdatedEvent.parameters.push(
//     new ethereum.EventParam('_collTokens', ethereum.Value.fromAddressArray(_collTokens)),
//   );

//   return collateralUpdatedEvent;
// }
