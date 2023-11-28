import { Address, ethereum } from '@graphprotocol/graph-ts';
import { DebtToken } from '../../generated/DebtToken/DebtToken';
import { Token } from '../../generated/schema';
import { IERC20 } from '../types/IERC20';

export function handleCreateToken(event: ethereum.Event, tokenAddress: Address, isDebtToken: boolean): void {
  let newToken = new Token(tokenAddress);

  if (isDebtToken) {
    const contract = DebtToken.bind(tokenAddress);

    newToken.address = tokenAddress;
    newToken.symbol = contract.symbol();
    newToken.createdAt = event.block.timestamp;
  } else {
    const contract = IERC20.bind(tokenAddress);

    newToken.address = tokenAddress;
    newToken.symbol = contract._name;
    newToken.createdAt = event.block.timestamp;
  }

  // FIXME: Is this correct?
  newToken.isPoolToken = isDebtToken;

  newToken.save();
}