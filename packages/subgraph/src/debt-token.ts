import { Approval as ApprovalEvent, Transfer as TransferEvent } from '../generated/DebtToken/DebtToken';
import { handleCreateDebtTokenMeta } from './entities/debt-token-meta-entity';

export function handleApproval(event: ApprovalEvent): void {}

export function handleTransfer(event: TransferEvent): void {
  // Because totalSupplyUSD has changed on mint and burn
  handleCreateDebtTokenMeta(event, event.address);
}
