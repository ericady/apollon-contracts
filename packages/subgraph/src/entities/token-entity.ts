import { Address, ethereum } from '@graphprotocol/graph-ts';
import { DebtToken } from '../../generated/DebtToken/DebtToken';
import { Token } from '../../generated/schema';

export function handleCreateToken(event: ethereum.Event, tokenAddress: Address): void {
  let newToken = new Token(tokenAddress);

  const contract = DebtToken.bind(tokenAddress);

  newToken.address = tokenAddress;
  newToken.symbol = contract.symbol();
  newToken.createdAt = event.block.timestamp;
  newToken.priceUSD = contract.getPrice();

  // FIXME: When is this false?
  newToken.isPoolToken = true;

  newToken.save();
}

export function handleUpdateToken_priceUSD(tokenAddress: Address): void {
  const contract = DebtToken.bind(tokenAddress);

  const token = Token.load(tokenAddress)!;
  token.priceUSD = contract.getPrice();
  token.save();
}
