import {
  Approval as ApprovalEvent,
  BorrowerOperationsAddressChanged as BorrowerOperationsAddressChangedEvent,
  PriceFeedAddressChanged as PriceFeedAddressChangedEvent,
  StabilityPoolManagerAddressChanged as StabilityPoolManagerAddressChangedEvent,
  Transfer as TransferEvent,
  TroveManagerAddressChanged as TroveManagerAddressChangedEvent,
} from '../generated/DebtToken/DebtToken';

export function handleBorrowerOperationsAddressChanged(event: BorrowerOperationsAddressChangedEvent): void {}

export function handleTroveManagerAddressChanged(event: TroveManagerAddressChangedEvent): void {}

export function handleStabilityPoolManagerAddressChanged(event: StabilityPoolManagerAddressChangedEvent): void {}

export function handlePriceFeedAddressChanged(event: PriceFeedAddressChangedEvent): void {}

export function handleTransfer(event: TransferEvent): void {}

export function handleApproval(event: ApprovalEvent): void {}
