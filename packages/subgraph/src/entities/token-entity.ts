import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { DebtToken } from '../../generated/DebtToken_STABLE/DebtToken';
import { SystemInfo, Token } from '../../generated/schema';
import { ERC20 } from '../../generated/CollTokenManager/ERC20';
import { PriceFeed } from '../../generated/PriceFeed/PriceFeed';
// import { log } from '@graphprotocol/graph-ts';

export function handleCreateToken(event: ethereum.Event, tokenAddress: Address, isDebtToken: boolean): void {
  let newToken = new Token(tokenAddress);

  if (isDebtToken) {
    const contract = DebtToken.bind(tokenAddress);

    newToken.address = tokenAddress;
    newToken.symbol = contract.symbol();
    newToken.createdAt = event.block.timestamp;
  } else {
    const contract = ERC20.bind(tokenAddress);

    newToken.address = tokenAddress;
    newToken.symbol = contract.symbol();
    newToken.createdAt = event.block.timestamp;
  }

  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const priceFeedContract = PriceFeed.bind(Address.fromBytes(systemInfo.priceFeed));
  newToken.priceUSD = priceFeedContract.getPrice(tokenAddress);

  // FIXME: Is this correct?
  newToken.isPoolToken = isDebtToken;

  newToken.save();
}

export function handleUpdateToken_priceUSD(event: ethereum.Event, tokenAddress: Address, priceUSD: BigInt): void {
  const tokenEntity = Token.load(tokenAddress)!;

  tokenEntity.priceUSD = priceUSD;

  tokenEntity.save();
}
