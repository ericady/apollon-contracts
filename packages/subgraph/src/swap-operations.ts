import { DebtTokenManager } from '../generated/DebtTokenManager/DebtTokenManager';
import {
  OwnershipTransferred as OwnershipTransferredEvent,
  PairCreated as PairCreatedEvent,
  SwapOperations,
  SwapOperationsInitialized as SwapOperationsInitializedEvent,
} from '../generated/SwapOperations/SwapOperations';
import { handleCreateTokenCandleSingleton } from './entities/token-candle-entity';

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handlePairCreated(event: PairCreatedEvent): void {
  const swapOperationsContract = SwapOperations.bind(event.address);
  const debtTokenManager = swapOperationsContract.debtTokenManager();
  const debtTokenManagerContract = DebtTokenManager.bind(debtTokenManager);
  const stableCoin = debtTokenManagerContract.getStableCoin();

  const poolContainsStableCoin = event.params.token0 === stableCoin || event.params.token1 === stableCoin;

  // We only draw charts for Pool containing the stable coin
  if (poolContainsStableCoin) {
    handleCreateTokenCandleSingleton(event, event.params.token0 === stableCoin ? event.params.token1 : event.params.token0));
  }
}

export function handleSwapOperationsInitialized(event: SwapOperationsInitializedEvent): void {}
