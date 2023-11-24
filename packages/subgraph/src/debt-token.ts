import {
  Approval as ApprovalEvent,
  DebtTokenCreated as DebtTokenCreatedEvent,
  Transfer as TransferEvent,
} from '../generated/DebtToken/DebtToken';
import { handleCreateDebtTokenMeta } from './entities/debt-token-meta-entity';
import { handleCreateToken } from './entities/token-entity';

export function handleApproval(event: ApprovalEvent): void {}

export function handleTransfer(event: TransferEvent): void {
  // Because totalSupplyUSD has changed
  handleCreateDebtTokenMeta(event, event.address);
}

export function handleDebtTokenCreated(event: DebtTokenCreatedEvent): void {
  handleCreateToken(event, event.address);
}
