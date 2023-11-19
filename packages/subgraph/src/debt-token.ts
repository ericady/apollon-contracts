import {
  Approval as ApprovalEvent,
  BorrowerOperationsAddressChanged as BorrowerOperationsAddressChangedEvent,
  PriceFeedAddressChanged as PriceFeedAddressChangedEvent,
  StabilityPoolManagerAddressChanged as StabilityPoolManagerAddressChangedEvent,
  Transfer as TransferEvent,
  TroveManagerAddressChanged as TroveManagerAddressChangedEvent,
} from '../generated/DebtToken/DebtToken';
import { handleNewToken } from './entities/debt-token-entity';
import { handleNewDebtTokenMeta } from './entities/debt-token-meta-entity';

export function handleBorrowerOperationsAddressChanged(event: BorrowerOperationsAddressChangedEvent): void {}

export function handleTroveManagerAddressChanged(event: TroveManagerAddressChangedEvent): void {}

export function handleStabilityPoolManagerAddressChanged(event: StabilityPoolManagerAddressChangedEvent): void {}

export function handlePriceFeedAddressChanged(event: PriceFeedAddressChangedEvent): void {
  handleNewToken(event, event.address);
}

export function handleTransfer(event: TransferEvent): void {
  // Because totalSupplyUSD has changed
  handleNewDebtTokenMeta(event, event.address);
}

export function handleApproval(event: ApprovalEvent): void {}
