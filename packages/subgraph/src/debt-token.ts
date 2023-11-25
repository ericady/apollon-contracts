import {
  Approval as ApprovalEvent,
  DebtTokenCreated as DebtTokenCreatedEvent,
  Transfer as TransferEvent,
} from '../generated/DebtToken/DebtToken';
import { handleCreateDebtTokenMeta } from './entities/debt-token-meta-entity';
import { handleCreateToken } from './entities/token-entity';
import { handleUpdateUserDebtTokenMeta_walletAmount_stabilityCompoundAmount } from './entities/user-debt-token-meta-entity';

export function handleApproval(event: ApprovalEvent): void {}

export function handleTransfer(event: TransferEvent): void {
  // Because totalSupplyUSD has changed on mint and burn
  handleCreateDebtTokenMeta(event, event.address);

  // walletAmount changed for both parties
  handleUpdateUserDebtTokenMeta_walletAmount_stabilityCompoundAmount(event.address, event.params.to);
  handleUpdateUserDebtTokenMeta_walletAmount_stabilityCompoundAmount(event.address, event.params.from);
}

export function handleDebtTokenCreated(event: DebtTokenCreatedEvent): void {
  handleCreateToken(event, event.address);
}
