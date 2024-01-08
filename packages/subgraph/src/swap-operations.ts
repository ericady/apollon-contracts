import {
  OwnershipTransferred as OwnershipTransferredEvent,
  PairCreated as PairCreatedEvent,
  SwapOperationsInitialized as SwapOperationsInitializedEvent,
} from '../generated/SwapOperations/SwapOperations';
import { SystemInfo } from '../generated/schema';
import { handleCreatePool } from './entities/pool-entity';
import { handleCreateTokenCandleSingleton } from './entities/token-candle-entity';

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handlePairCreated(event: PairCreatedEvent): void {
  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const stableCoin = systemInfo.stableCoin;

  const poolContainsStableCoin = event.params.token0 === stableCoin || event.params.token1 === stableCoin;

  // We only draw charts for Pool containing the stable coin
  if (poolContainsStableCoin) {
    handleCreateTokenCandleSingleton(
      event,
      event.params.token0 === stableCoin ? event.params.token1 : event.params.token0,
    );
  }

  handleCreatePool(event, event.params.token0, event.params.token1);
}

export function handleSwapOperationsInitialized(event: SwapOperationsInitializedEvent): void {}
