import { Address, ethereum } from '@graphprotocol/graph-ts';
import { IERC20 } from '../types/IERC20';

/**
 * This is called if no UserCollateralTokenMeta entity exists for the given token and user.
 */
export function handleCreateUserCollateralTokenMeta(
  event: ethereum.Event,
  tokenAddress: Address,
  user: Address,
): void {}

export function handleUpdateUserCollateralTokenMeta_walletAmount(
  event: ethereum.Event,
  tokenAddress: Address,
  user: Address,
): void {
  const collToken = IERC20.bind(tokenAddress);
  collToken.balanceOf(user);

  //   TODO: Implement create UserCollateralToken if it doesnt already exist
}

export function handleUpdateUserCollateralTokenMeta_troveLockedAmount(
  event: ethereum.Event,
  tokenAddress: Address,
  user: Address,
): void {
  const collToken = IERC20.bind(tokenAddress);
  collToken.balanceOf(user);

  //   TODO: Implement create UserCollateralToken if it doesnt already exist
}
