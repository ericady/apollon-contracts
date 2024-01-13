import { BigInt } from '@graphprotocol/graph-ts';
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
import { handleCreateSwapEvent } from './entities/swap-event-entity';
import { handleUpdateTokenCandle_low_high, handleUpdateTokenCandle_volume } from './entities/token-candle-entity';
import { handleUpdateToken_priceUSD } from './entities/token-entity';

export function handleApproval(event: ApprovalEvent): void {}

export function handleBurn(event: BurnEvent): void {
  const swapPairContract = SwapPair.bind(event.address);
  const token0 = swapPairContract.token0();
  const token1 = swapPairContract.token1();

  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const stableCoin = systemInfo.stableCoin;

  if (token0 === stableCoin || token1 === stableCoin) {
    const tokenPrice = handleUpdateTokenCandle_low_high(
      event,
      event.address,
      token0 === stableCoin ? 1 : 0,
      token0 === stableCoin ? token1 : token0,
    );
    handleUpdateToken_priceUSD(event, token0 === stableCoin ? token1 : token0, tokenPrice);

    // TODO: Maybe always update volume?
    const volume = token0 === stableCoin ? event.params.amount0 : event.params.amount1;
    handleUpdateTokenCandle_volume(
      event,
      event.address,
      token0 === stableCoin ? 1 : 0,
      token0 === stableCoin ? token1 : token0,
      volume,
    );
  }
}

export function handleMint(event: MintEvent): void {
  const swapPairContract = SwapPair.bind(event.address);
  const token0 = swapPairContract.token0();
  const token1 = swapPairContract.token1();

  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const stableCoin = systemInfo.stableCoin;

  if (token0 === stableCoin || token1 === stableCoin) {
    const tokenPrice = handleUpdateTokenCandle_low_high(
      event,
      event.address,
      token0 === stableCoin ? 1 : 0,
      token0 === stableCoin ? token1 : token0,
    );
    handleUpdateToken_priceUSD(event, token0 === stableCoin ? token1 : token0, tokenPrice);

    // TODO: Maybe always update volume?
    const volume = token0 === stableCoin ? event.params.amount0 : event.params.amount1;
    handleUpdateTokenCandle_volume(
      event,
      event.address,
      token0 === stableCoin ? 1 : 0,
      token0 === stableCoin ? token1 : token0,
      volume,
    );
  }
}

export function handleSwap(event: SwapEvent): void {
  const swapPairContract = SwapPair.bind(event.address);
  const token0 = swapPairContract.token0();
  const token1 = swapPairContract.token1();

  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const stableCoin = systemInfo.stableCoin;

  const debtToken = token0 === stableCoin ? token1 : token0;

  if (token0 === stableCoin || token1 === stableCoin) {
    const tokenPrice = handleUpdateTokenCandle_low_high(event, event.address, token0 === stableCoin ? 1 : 0, debtToken);
    handleUpdateToken_priceUSD(event, debtToken, tokenPrice);

    // TODO: Maybe always update volume?
    const volume = token0 === stableCoin ? event.params.amount1In : event.params.amount0In;
    handleUpdateTokenCandle_volume(event, event.address, token0 === stableCoin ? 1 : 0, debtToken, volume);

    const direction =
      token0 === stableCoin
        ? event.params.amount0In.equals(BigInt.fromI32(0))
          ? 'LONG'
          : 'SHORT'
        : event.params.amount1In.equals(BigInt.fromI32(0))
        ? 'LONG'
        : 'SHORT';
    // Check if this is correct
    const debtTokenSize = direction === 'LONG' ? event.params.amount1In : event.params.amount0In;
    const stableSize = direction === 'LONG' ? event.params.amount0In : event.params.amount1In;

    handleCreateSwapEvent(event, event.address, debtToken, event.params.to, direction, debtTokenSize, stableSize);
  }
}

export function handleSync(event: SyncEvent): void {
  const swapPairContract = SwapPair.bind(event.address);
  const token0 = swapPairContract.token0();
  const token1 = swapPairContract.token1();

  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const stableCoin = systemInfo.stableCoin;

  if (token0 === stableCoin || token1 === stableCoin) {
    const tokenPrice = handleUpdateTokenCandle_low_high(
      event,
      event.address,
      token0 === stableCoin ? 1 : 0,
      token0 === stableCoin ? token1 : token0,
    );
    handleUpdateToken_priceUSD(event, token0 === stableCoin ? token1 : token0, tokenPrice);

    // TODO: Maybe always update volume?
    const swapPairReserves = swapPairContract.getReserves();
    // add total difference in reserves after sync
    const volume = swapPairReserves
      .get_reserve0()
      .minus(event.params.reserve0)
      .abs()
      .plus(swapPairReserves.get_reserve1().minus(event.params.reserve1).abs());
    handleUpdateTokenCandle_volume(
      event,
      event.address,
      token0 === stableCoin ? 1 : 0,
      token0 === stableCoin ? token1 : token0,
      volume,
    );
  }
}

export function handleTransfer(event: TransferEvent): void {}
