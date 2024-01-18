import { Approval as ApprovalEvent, Transfer as TransferEvent } from '../generated/DebtToken_STABLE/DebtToken';
import {
  handleCreateUpdateDebtTokenMeta,
  handleUpdateDebtTokenMeta_totalSupply30dAverage,
} from './entities/debt-token-meta-entity';

export function handleApproval(event: ApprovalEvent): void {}

export function handleTransfer(event: TransferEvent): void {
  // Because totalSupplyUSD has changed on mint and burn
  handleCreateUpdateDebtTokenMeta(event, event.address);
  handleUpdateDebtTokenMeta_totalSupply30dAverage(event, event.address);
}
