import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { newMockEvent } from 'matchstick-as';
import {
  BaseRateUpdated,
  BorrowerOperationsAddressChanged,
  CollTokenManagerAddressChanged,
  CollateralUpdated,
  DebtTokenManagerAddressChanged,
  LTermsUpdated,
  LastFeeOpTimeUpdated,
  Liquidation,
  OwnershipTransferred,
  PriceFeedAddressChanged,
  Redemption,
  StabilityPoolManagerAddressChanged,
  StoragePoolAddressChanged,
  SystemSnapshotsUpdated,
  TotalStakesUpdated,
  TroveIndexUpdated,
  TroveLiquidated,
  TroveSnapshotsUpdated,
  TroveUpdated,
} from '../generated/TroveManager/TroveManager';
import { MockTroveManagerAddress } from './debt-token-utils';

export function createBaseRateUpdatedEvent(_baseRate: BigInt): BaseRateUpdated {
  let baseRateUpdatedEvent = changetype<BaseRateUpdated>(newMockEvent());

  baseRateUpdatedEvent.parameters = new Array();

  baseRateUpdatedEvent.parameters.push(
    new ethereum.EventParam('_baseRate', ethereum.Value.fromUnsignedBigInt(_baseRate)),
  );

  return baseRateUpdatedEvent;
}

export function createBorrowerOperationsAddressChangedEvent(
  _newBorrowerOperationsAddress: Address,
): BorrowerOperationsAddressChanged {
  let borrowerOperationsAddressChangedEvent = changetype<BorrowerOperationsAddressChanged>(newMockEvent());

  borrowerOperationsAddressChangedEvent.parameters = new Array();

  borrowerOperationsAddressChangedEvent.parameters.push(
    new ethereum.EventParam('_newBorrowerOperationsAddress', ethereum.Value.fromAddress(_newBorrowerOperationsAddress)),
  );

  return borrowerOperationsAddressChangedEvent;
}

export function createCollTokenManagerAddressChangedEvent(
  _newCollTokenManagerAddress: Address,
): CollTokenManagerAddressChanged {
  let collTokenManagerAddressChangedEvent = changetype<CollTokenManagerAddressChanged>(newMockEvent());

  collTokenManagerAddressChangedEvent.parameters = new Array();

  collTokenManagerAddressChangedEvent.parameters.push(
    new ethereum.EventParam('_newCollTokenManagerAddress', ethereum.Value.fromAddress(_newCollTokenManagerAddress)),
  );

  return collTokenManagerAddressChangedEvent;
}

export function createDebtTokenManagerAddressChangedEvent(
  _newDebtTokenManagerAddress: Address,
): DebtTokenManagerAddressChanged {
  let debtTokenManagerAddressChangedEvent = changetype<DebtTokenManagerAddressChanged>(newMockEvent());

  debtTokenManagerAddressChangedEvent.parameters = new Array();

  debtTokenManagerAddressChangedEvent.parameters.push(
    new ethereum.EventParam('_newDebtTokenManagerAddress', ethereum.Value.fromAddress(_newDebtTokenManagerAddress)),
  );

  return debtTokenManagerAddressChangedEvent;
}

export function createLTermsUpdatedEvent(_L_ETH: BigInt, _L_LUSDDebt: BigInt): LTermsUpdated {
  let lTermsUpdatedEvent = changetype<LTermsUpdated>(newMockEvent());

  lTermsUpdatedEvent.parameters = new Array();

  lTermsUpdatedEvent.parameters.push(new ethereum.EventParam('_L_ETH', ethereum.Value.fromUnsignedBigInt(_L_ETH)));
  lTermsUpdatedEvent.parameters.push(
    new ethereum.EventParam('_L_LUSDDebt', ethereum.Value.fromUnsignedBigInt(_L_LUSDDebt)),
  );

  return lTermsUpdatedEvent;
}

export function createLastFeeOpTimeUpdatedEvent(_lastFeeOpTime: BigInt): LastFeeOpTimeUpdated {
  let lastFeeOpTimeUpdatedEvent = changetype<LastFeeOpTimeUpdated>(newMockEvent());

  lastFeeOpTimeUpdatedEvent.parameters = new Array();

  lastFeeOpTimeUpdatedEvent.parameters.push(
    new ethereum.EventParam('_lastFeeOpTime', ethereum.Value.fromUnsignedBigInt(_lastFeeOpTime)),
  );

  return lastFeeOpTimeUpdatedEvent;
}

export function createLiquidationEvent(
  liquidatedDebt: Array<ethereum.Tuple>,
  liquidatedColl: Array<ethereum.Tuple>,
  totalStableCoinGasCompensation: BigInt,
  totalCollGasCompensation: Array<ethereum.Tuple>,
): Liquidation {
  let liquidationEvent = changetype<Liquidation>(newMockEvent());

  liquidationEvent.parameters = new Array();

  liquidationEvent.parameters.push(
    new ethereum.EventParam('liquidatedDebt', ethereum.Value.fromTupleArray(liquidatedDebt)),
  );
  liquidationEvent.parameters.push(
    new ethereum.EventParam('liquidatedColl', ethereum.Value.fromTupleArray(liquidatedColl)),
  );
  liquidationEvent.parameters.push(
    new ethereum.EventParam(
      'totalStableCoinGasCompensation',
      ethereum.Value.fromUnsignedBigInt(totalStableCoinGasCompensation),
    ),
  );
  liquidationEvent.parameters.push(
    new ethereum.EventParam('totalCollGasCompensation', ethereum.Value.fromTupleArray(totalCollGasCompensation)),
  );

  return liquidationEvent;
}

export function createOwnershipTransferredEvent(previousOwner: Address, newOwner: Address): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(newMockEvent());

  ownershipTransferredEvent.parameters = new Array();

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam('previousOwner', ethereum.Value.fromAddress(previousOwner)),
  );
  ownershipTransferredEvent.parameters.push(new ethereum.EventParam('newOwner', ethereum.Value.fromAddress(newOwner)));

  return ownershipTransferredEvent;
}

export function createPriceFeedAddressChangedEvent(_newPriceFeedAddress: Address): PriceFeedAddressChanged {
  let priceFeedAddressChangedEvent = changetype<PriceFeedAddressChanged>(newMockEvent());

  priceFeedAddressChangedEvent.parameters = new Array();

  priceFeedAddressChangedEvent.parameters.push(
    new ethereum.EventParam('_newPriceFeedAddress', ethereum.Value.fromAddress(_newPriceFeedAddress)),
  );

  return priceFeedAddressChangedEvent;
}

export function createRedemptionEvent(
  _attemptedLUSDAmount: BigInt,
  _actualLUSDAmount: BigInt,
  _ETHSent: BigInt,
  _ETHFee: BigInt,
): Redemption {
  let redemptionEvent = changetype<Redemption>(newMockEvent());

  redemptionEvent.parameters = new Array();

  redemptionEvent.parameters.push(
    new ethereum.EventParam('_attemptedLUSDAmount', ethereum.Value.fromUnsignedBigInt(_attemptedLUSDAmount)),
  );
  redemptionEvent.parameters.push(
    new ethereum.EventParam('_actualLUSDAmount', ethereum.Value.fromUnsignedBigInt(_actualLUSDAmount)),
  );
  redemptionEvent.parameters.push(new ethereum.EventParam('_ETHSent', ethereum.Value.fromUnsignedBigInt(_ETHSent)));
  redemptionEvent.parameters.push(new ethereum.EventParam('_ETHFee', ethereum.Value.fromUnsignedBigInt(_ETHFee)));

  return redemptionEvent;
}

export function createStabilityPoolManagerAddressChangedEvent(
  _stabilityPoolManagerAddress: Address,
): StabilityPoolManagerAddressChanged {
  let stabilityPoolManagerAddressChangedEvent = changetype<StabilityPoolManagerAddressChanged>(newMockEvent());

  stabilityPoolManagerAddressChangedEvent.parameters = new Array();

  stabilityPoolManagerAddressChangedEvent.parameters.push(
    new ethereum.EventParam('_stabilityPoolManagerAddress', ethereum.Value.fromAddress(_stabilityPoolManagerAddress)),
  );

  return stabilityPoolManagerAddressChangedEvent;
}

export function createStoragePoolAddressChangedEvent(_storagePoolAddress: Address): StoragePoolAddressChanged {
  let storagePoolAddressChangedEvent = changetype<StoragePoolAddressChanged>(newMockEvent());

  storagePoolAddressChangedEvent.parameters = new Array();

  storagePoolAddressChangedEvent.parameters.push(
    new ethereum.EventParam('_storagePoolAddress', ethereum.Value.fromAddress(_storagePoolAddress)),
  );

  return storagePoolAddressChangedEvent;
}

export function createSystemSnapshotsUpdatedEvent(
  _totalStakesSnapshot: BigInt,
  _totalCollateralSnapshot: BigInt,
): SystemSnapshotsUpdated {
  let systemSnapshotsUpdatedEvent = changetype<SystemSnapshotsUpdated>(newMockEvent());

  systemSnapshotsUpdatedEvent.parameters = new Array();

  systemSnapshotsUpdatedEvent.parameters.push(
    new ethereum.EventParam('_totalStakesSnapshot', ethereum.Value.fromUnsignedBigInt(_totalStakesSnapshot)),
  );
  systemSnapshotsUpdatedEvent.parameters.push(
    new ethereum.EventParam('_totalCollateralSnapshot', ethereum.Value.fromUnsignedBigInt(_totalCollateralSnapshot)),
  );

  return systemSnapshotsUpdatedEvent;
}

export function createTotalStakesUpdatedEvent(_newTotalStakes: BigInt): TotalStakesUpdated {
  let totalStakesUpdatedEvent = changetype<TotalStakesUpdated>(newMockEvent());

  totalStakesUpdatedEvent.parameters = new Array();

  totalStakesUpdatedEvent.parameters.push(
    new ethereum.EventParam('_newTotalStakes', ethereum.Value.fromUnsignedBigInt(_newTotalStakes)),
  );

  return totalStakesUpdatedEvent;
}

export function createTroveIndexUpdatedEvent(_borrower: Address, _newIndex: BigInt): TroveIndexUpdated {
  let troveIndexUpdatedEvent = changetype<TroveIndexUpdated>(newMockEvent());

  troveIndexUpdatedEvent.parameters = new Array();

  troveIndexUpdatedEvent.parameters.push(new ethereum.EventParam('_borrower', ethereum.Value.fromAddress(_borrower)));
  troveIndexUpdatedEvent.parameters.push(
    new ethereum.EventParam('_newIndex', ethereum.Value.fromUnsignedBigInt(_newIndex)),
  );

  return troveIndexUpdatedEvent;
}

export function createTroveLiquidatedEvent(
  _borrower: Address,
  _debt: BigInt,
  _coll: BigInt,
  _operation: i32,
): TroveLiquidated {
  let troveLiquidatedEvent = changetype<TroveLiquidated>(newMockEvent());

  troveLiquidatedEvent.parameters = new Array();

  troveLiquidatedEvent.parameters.push(new ethereum.EventParam('_borrower', ethereum.Value.fromAddress(_borrower)));
  troveLiquidatedEvent.parameters.push(new ethereum.EventParam('_debt', ethereum.Value.fromUnsignedBigInt(_debt)));
  troveLiquidatedEvent.parameters.push(new ethereum.EventParam('_coll', ethereum.Value.fromUnsignedBigInt(_coll)));
  troveLiquidatedEvent.parameters.push(
    new ethereum.EventParam('_operation', ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(_operation))),
  );

  return troveLiquidatedEvent;
}

export function createTroveSnapshotsUpdatedEvent(_L_ETH: BigInt, _L_LUSDDebt: BigInt): TroveSnapshotsUpdated {
  let troveSnapshotsUpdatedEvent = changetype<TroveSnapshotsUpdated>(newMockEvent());

  troveSnapshotsUpdatedEvent.parameters = new Array();

  troveSnapshotsUpdatedEvent.parameters.push(
    new ethereum.EventParam('_L_ETH', ethereum.Value.fromUnsignedBigInt(_L_ETH)),
  );
  troveSnapshotsUpdatedEvent.parameters.push(
    new ethereum.EventParam('_L_LUSDDebt', ethereum.Value.fromUnsignedBigInt(_L_LUSDDebt)),
  );

  return troveSnapshotsUpdatedEvent;
}

export function createTroveUpdatedEvent(
  _borrower: Address,
  _debt: BigInt,
  _coll: BigInt,
  _stake: BigInt,
  _operation: i32,
): TroveUpdated {
  let troveUpdatedEvent = changetype<TroveUpdated>(newMockEvent());

  troveUpdatedEvent.parameters = new Array();

  troveUpdatedEvent.parameters.push(new ethereum.EventParam('_borrower', ethereum.Value.fromAddress(_borrower)));
  troveUpdatedEvent.parameters.push(new ethereum.EventParam('_debt', ethereum.Value.fromUnsignedBigInt(_debt)));
  troveUpdatedEvent.parameters.push(new ethereum.EventParam('_coll', ethereum.Value.fromUnsignedBigInt(_coll)));
  troveUpdatedEvent.parameters.push(new ethereum.EventParam('_stake', ethereum.Value.fromUnsignedBigInt(_stake)));
  troveUpdatedEvent.parameters.push(
    new ethereum.EventParam('_operation', ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(_operation))),
  );

  return troveUpdatedEvent;
}

export function createCollateralUpdatedEvent(_borrower: Address, _collTokens: Address[]): CollateralUpdated {
  let collateralUpdatedEvent = changetype<CollateralUpdated>(newMockEvent());
  collateralUpdatedEvent.address = MockTroveManagerAddress;

  collateralUpdatedEvent.parameters = new Array();

  collateralUpdatedEvent.parameters.push(new ethereum.EventParam('_borrower', ethereum.Value.fromAddress(_borrower)));
  collateralUpdatedEvent.parameters.push(
    new ethereum.EventParam('_collTokens', ethereum.Value.fromAddressArray(_collTokens)),
  );

  return collateralUpdatedEvent;
}
