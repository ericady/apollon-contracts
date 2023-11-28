import { Address, ethereum } from '@graphprotocol/graph-ts';
import { DebtToken } from '../../generated/DebtToken/DebtToken';
import { Token } from '../../generated/schema';

// TODO: Missing the creation of Collateral Token still
export function handleCreateToken(event: ethereum.Event, tokenAddress: Address): void {
  let newToken = new Token(tokenAddress);

  const contract = DebtToken.bind(tokenAddress);

  newToken.address = tokenAddress;
  newToken.symbol = contract.symbol();
  newToken.createdAt = event.block.timestamp;

  // FIXME: When is this false?
  newToken.isPoolToken = true;

  newToken.save();
}
