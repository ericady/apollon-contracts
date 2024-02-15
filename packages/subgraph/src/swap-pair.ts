import { Address, BigInt } from '@graphprotocol/graph-ts';
import { SystemInfo } from '../generated/schema';
import {
  Approval as ApprovalEvent,
  Burn as BurnEvent,
  Mint as MintEvent,
  Swap as SwapEvent,
  SwapPair,
  Sync as SyncEvent,
  Transfer as TransferEvent,
} from '../generated/templates/SwapPairTemplate/SwapPair';
import { handleCreateSwapEvent } from './entities/swap-event-entity';
import { handleUpdateLiquidity_totalAmount, handleUpdatePool_totalSupply } from './entities/pool-entity';
import { handleUpdateToken_priceUSD } from './entities/token-entity';
import { handleUpdateTokenCandle_low_high, handleUpdateTokenCandle_volume } from './entities/token-candle-entity';
import { log } from '@graphprotocol/graph-ts';

export function handleApproval(event: ApprovalEvent): void {}

export function handleBurn(event: BurnEvent): void {
  const swapPairContract = SwapPair.bind(event.address);
  const token0 = swapPairContract.token0();
  const token1 = swapPairContract.token1();
  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const stableCoin = Address.fromBytes(systemInfo.stableCoin); // This is of type Bytes, so I convert it to Address

    const tokenPrice = handleUpdateTokenCandle_low_high(
      event,
      event.address,
      token0 == stableCoin ? 1 : 0,
      token0 == stableCoin ? token1 : token0,
    );
    handleUpdateToken_priceUSD(event, token0 == stableCoin ? token1 : token0, tokenPrice);
    // TODO: Maybe always update volume?
    const volume = token0 == stableCoin ? event.params.amount0 : event.params.amount1;
    handleUpdateTokenCandle_volume(
      event,
      event.address,
      token0 == stableCoin ? 1 : 0,
      token0 == stableCoin ? token1 : token0,
      volume,
    );
}

export function handleMint(event: MintEvent): void {
  const swapPairContract = SwapPair.bind(event.address);
  const token0 = swapPairContract.token0();
  const token1 = swapPairContract.token1();
  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const stableCoin = Address.fromBytes(systemInfo.stableCoin); // This is of type Bytes, so I convert it to Address

    const tokenPrice = handleUpdateTokenCandle_low_high(
      event,
      event.address,
      token0 == stableCoin ? 1 : 0,
      token0 == stableCoin ? token1 : token0,
    );
    handleUpdateToken_priceUSD(event, token0 == stableCoin ? token1 : token0, tokenPrice);
    // TODO: Maybe always update volume?
    const volume = token0 == stableCoin ? event.params.amount0 : event.params.amount1;
    handleUpdateTokenCandle_volume(
      event,
      event.address,
      token0 == stableCoin ? 1 : 0,
      token0 == stableCoin ? token1 : token0,
      volume,
    );
}

export function handleSwap(event: SwapEvent): void {
  const swapPairContract = SwapPair.bind(event.address);
  const token0 = swapPairContract.token0();
  const token1 = swapPairContract.token1();

  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const stableCoin = Address.fromBytes(systemInfo.stableCoin); // This is of type Bytes, so I convert it to Address
  const tradeToken = token0 == stableCoin ? token1 : token0;

  const tokenPrice = handleUpdateTokenCandle_low_high(event, event.address, token0 == stableCoin ? 1 : 0, tradeToken);
  handleUpdateToken_priceUSD(event, tradeToken, tokenPrice);

  // TODO: Maybe always update volume?
  const volume = token0 == stableCoin ? event.params.amount0In : event.params.amount1In;
  handleUpdateTokenCandle_volume(event, event.address, token0 == stableCoin ? 1 : 0, tradeToken, volume);

  const direction =
    token0 == stableCoin
      ? event.params.amount0In.equals(BigInt.fromI32(0))
        ? 'SHORT'
        : 'LONG'
      : event.params.amount1In.equals(BigInt.fromI32(0))
      ? 'SHORT'
      : 'LONG';

  const stableSize =
    direction === 'LONG'
      ? token0 == stableCoin
        ? event.params.amount0In
        : event.params.amount1In
      : token0 == stableCoin
      ? event.params.amount0Out
      : event.params.amount1Out;
  const debtTokenSize =
    direction === 'SHORT'
      ? token0 == stableCoin
        ? event.params.amount1In
        : event.params.amount0In
      : token0 == stableCoin
      ? event.params.amount1Out
      : event.params.amount0Out;

  handleCreateSwapEvent(
    event,
    tradeToken,
    event.params.to,
    direction,
    debtTokenSize,
    stableSize,
    event.params.currentSwapFee,
  );
}

export function handleSync(event: SyncEvent): void {
  const swapPairContract = SwapPair.bind(event.address);
  const token0 = swapPairContract.token0();
  const token1 = swapPairContract.token1();
  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const stableCoin = Address.fromBytes(systemInfo.stableCoin); // This is of type Bytes, so I convert it to Address

  handleUpdateLiquidity_totalAmount(event, token0, token1, event.params.reserve0, event.params.reserve1);
    const tokenPrice = handleUpdateTokenCandle_low_high(
      event,
      event.address,
      token0 == stableCoin ? 1 : 0,
      token0 == stableCoin ? token1 : token0,
    );
    handleUpdateToken_priceUSD(event, token0 == stableCoin ? token1 : token0, tokenPrice);
    // TODO: Maybe always update volume?
    // FIXME: This looks wrong. Fix it later
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
      token0 == stableCoin ? 1 : 0,
      token0 == stableCoin ? token1 : token0,
      volume,
    );
}

export function handleTransfer(event: TransferEvent): void {
  const swapPairContract = SwapPair.bind(event.address);
  const token0 = swapPairContract.token0();
  const token1 = swapPairContract.token1();
  // // FIXME: Can be optimized because added/substracted value is already included in event. Do it later.
  handleUpdatePool_totalSupply(event, token0, token1);
}
