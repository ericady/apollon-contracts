import {
  Approval as ApprovalEvent,
  Burn as BurnEvent,
  Mint as MintEvent,
  Swap as SwapEvent,
  SwapPair,
  Sync as SyncEvent,
  Transfer as TransferEvent,
} from '../generated/SwapPair/SwapPair';
import { SystemInfo } from '../generated/schema';
import { handleUpdateTokenCandle_low_high, handleUpdateTokenCandle_volume } from './entities/token-candle-entity';

export function handleApproval(event: ApprovalEvent): void {}

export function handleBurn(event: BurnEvent): void {
  const swapPairContract = SwapPair.bind(event.address);
  const token0 = swapPairContract.token0();
  const token1 = swapPairContract.token1();

  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const stableCoin = systemInfo.stableCoin;

  if (token0 === stableCoin || token1 === stableCoin) {
    const nonStableCoin =
      token0 === stableCoin ? { pairPosition: 1, address: token1 } : { pairPosition: 0, address: token0 };
    handleUpdateTokenCandle_low_high(event, event.address, nonStableCoin);

    // TODO: Maybe always update volume?
    const volume = token0 === stableCoin ? event.params.amount0 : event.params.amount1;
    handleUpdateTokenCandle_volume(event, event.address, nonStableCoin, volume);
  }
}

export function handleMint(event: MintEvent): void {
  const swapPairContract = SwapPair.bind(event.address);
  const token0 = swapPairContract.token0();
  const token1 = swapPairContract.token1();

  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const stableCoin = systemInfo.stableCoin;

  if (token0 === stableCoin || token1 === stableCoin) {
    const nonStableCoin =
      token0 === stableCoin ? { pairPosition: 1, address: token1 } : { pairPosition: 0, address: token0 };
    handleUpdateTokenCandle_low_high(event, event.address, nonStableCoin);

    // TODO: Maybe always update volume?
    const volume = token0 === stableCoin ? event.params.amount0 : event.params.amount1;
    handleUpdateTokenCandle_volume(event, event.address, nonStableCoin, volume);
  }
}

export function handleSwap(event: SwapEvent): void {
  const swapPairContract = SwapPair.bind(event.address);
  const token0 = swapPairContract.token0();
  const token1 = swapPairContract.token1();

  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const stableCoin = systemInfo.stableCoin;

  if (token0 === stableCoin || token1 === stableCoin) {
    const nonStableCoin =
      token0 === stableCoin ? { pairPosition: 1, address: token1 } : { pairPosition: 0, address: token0 };
    handleUpdateTokenCandle_low_high(event, event.address, nonStableCoin);

    // TODO: Maybe always update volume?
    const volume = token0 === stableCoin ? event.params.amount1In : event.params.amount0In;
    handleUpdateTokenCandle_volume(event, event.address, nonStableCoin, volume);
  }
}

export function handleSync(event: SyncEvent): void {
  const swapPairContract = SwapPair.bind(event.address);
  const token0 = swapPairContract.token0();
  const token1 = swapPairContract.token1();

  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const stableCoin = systemInfo.stableCoin;

  if (token0 === stableCoin || token1 === stableCoin) {
    const nonStableCoin =
      token0 === stableCoin ? { pairPosition: 1, address: token1 } : { pairPosition: 0, address: token0 };
    handleUpdateTokenCandle_low_high(event, event.address, nonStableCoin);

    // TODO: Maybe always update volume?
    const swapPairReserves = swapPairContract.getReserves();
    // add total difference in reserves after sync
    const volume = swapPairReserves
      .get_reserve0()
      .minus(event.params.reserve0)
      .abs()
      .plus(swapPairReserves.get_reserve1().minus(event.params.reserve1).abs());
    handleUpdateTokenCandle_volume(event, event.address, nonStableCoin, volume);
  }
}

export function handleTransfer(event: TransferEvent): void {}
