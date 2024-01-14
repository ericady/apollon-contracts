import { Approval as ApprovalEvent, Transfer as TransferEvent } from '../generated/DebtToken/DebtToken';
import { handleCreateUpdateDebtTokenMeta } from './entities/debt-token-meta-entity';

export function handleApproval(event: ApprovalEvent): void {}

export function handleTransfer(event: TransferEvent): void {
  // Because totalSupplyUSD has changed on mint and burn
  handleCreateUpdateDebtTokenMeta(event, event.address);
}
