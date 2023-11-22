import { Approval as ApprovalEvent, Transfer as TransferEvent } from '../generated/DebtToken/DebtToken';
import { handleCreateDebtTokenMeta } from './entities/debt-token-meta-entity';
import { handleCreateToken } from './entities/token-entity';

export function handleApproval(event: ApprovalEvent): void {
  // FIXME: This is wrong, we need an init event
  handleCreateToken(event, event.address);
}

export function handleTransfer(event: TransferEvent): void {
  // Because totalSupplyUSD has changed
  handleCreateDebtTokenMeta(event, event.address);
}

// export function handlePriceFeedAddressChanged(event: PriceFeedAddressChangedEvent): void {
// }
