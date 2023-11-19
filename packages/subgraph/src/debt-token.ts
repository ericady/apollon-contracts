import {
  Approval as ApprovalEvent,
  BorrowerOperationsAddressChanged as BorrowerOperationsAddressChangedEvent,
  PriceFeedAddressChanged as PriceFeedAddressChangedEvent,
  StabilityPoolManagerAddressChanged as StabilityPoolManagerAddressChangedEvent,
  Transfer as TransferEvent,
  TroveManagerAddressChanged as TroveManagerAddressChangedEvent,
} from '../generated/DebtToken/DebtToken';
import { handleCreateDebtTokenMeta } from './entities/debt-token-meta-entity';
import { handleCreateToken } from './entities/token-entity';

export function handleBorrowerOperationsAddressChanged(event: BorrowerOperationsAddressChangedEvent): void {}

export function handleTroveManagerAddressChanged(event: TroveManagerAddressChangedEvent): void {}

export function handleStabilityPoolManagerAddressChanged(event: StabilityPoolManagerAddressChangedEvent): void {}

export function handlePriceFeedAddressChanged(event: PriceFeedAddressChangedEvent): void {
  handleCreateToken(event, event.address);
}

export function handleTransfer(event: TransferEvent): void {
  // Because totalSupplyUSD has changed
  handleCreateDebtTokenMeta(event, event.address);
}

export function handleApproval(event: ApprovalEvent): void {}
