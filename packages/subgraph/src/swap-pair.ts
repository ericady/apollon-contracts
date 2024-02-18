import { Address, BigInt } from '@graphprotocol/graph-ts';
import { PriceFeed } from '../generated/PriceFeed/PriceFeed';
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
import {
  handleUpdateLiquidity_totalAmount,
  handleUpdatePool_liquidityDepositAPY,
  handleUpdatePool_totalSupply,
  handleUpdatePool_volume30dUSD,
} from './entities/pool-entity';
import { handleCreateSwapEvent } from './entities/swap-event-entity';
import { handleUpdateTokenCandle_low_high, handleUpdateTokenCandle_volume } from './entities/token-candle-entity';

export function handleApproval(event: ApprovalEvent): void {}

export function handleBurn(event: BurnEvent): void {
  const swapPairContract = SwapPair.bind(event.address);
  const token0 = swapPairContract.token0();
  const token1 = swapPairContract.token1();
  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const stableCoin = Address.fromBytes(systemInfo.stableCoin); // This is of type Bytes, so I convert it to Address
  const nonStableCoin = token0 == stableCoin ? token1 : token0;

  const volume = token0 == stableCoin ? event.params.amount0 : event.params.amount1;
  handleUpdateTokenCandle_volume(event, event.address, token0 == stableCoin ? 1 : 0, nonStableCoin, volume);

  handleUpdatePool_totalSupply(event, stableCoin, nonStableCoin);
}

export function handleMint(event: MintEvent): void {
  const swapPairContract = SwapPair.bind(event.address);
  const token0 = swapPairContract.token0();
  const token1 = swapPairContract.token1();
  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const stableCoin = Address.fromBytes(systemInfo.stableCoin); // This is of type Bytes, so I convert it to Address
  const nonStableCoin = token0 == stableCoin ? token1 : token0;

  const volume = token0 == stableCoin ? event.params.amount0 : event.params.amount1;
  handleUpdateTokenCandle_volume(event, event.address, token0 == stableCoin ? 1 : 0, nonStableCoin, volume);

  handleUpdatePool_totalSupply(event, stableCoin, nonStableCoin);
}

export function handleSwap(event: SwapEvent): void {
  const swapPairContract = SwapPair.bind(event.address);
  const token0 = swapPairContract.token0();
  const token1 = swapPairContract.token1();

  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const stableCoin = Address.fromBytes(systemInfo.stableCoin); // This is of type Bytes, so I convert it to Address
  const nonStableCoin = token0 == stableCoin ? token1 : token0;

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
    nonStableCoin,
    event.params.to,
    direction,
    debtTokenSize,
    stableSize,
    event.params.currentSwapFee,
  );

  handleUpdateTokenCandle_volume(event, event.address, token0 == stableCoin ? 1 : 0, nonStableCoin, stableSize);

  let feeUSD = BigInt.fromI32(0);
  if (direction === 'LONG') {
    const stablePrice = PriceFeed.bind(Address.fromBytes(systemInfo.priceFeed)).getPrice(stableCoin).getPrice();
    feeUSD = stablePrice
      .times(stableSize)
      .times(event.params.currentSwapFee)
      .div(BigInt.fromI32(10).pow(18 + 6));
  } else {
    const priceFeedContract = PriceFeed.bind(Address.fromBytes(systemInfo.priceFeed));
    const tokenPrice = priceFeedContract.getPrice(nonStableCoin).getPrice();

    feeUSD = tokenPrice
      .times(debtTokenSize)
      .times(event.params.currentSwapFee)
      .div(BigInt.fromI32(10).pow(18 + 6));
  }

  handleUpdatePool_volume30dUSD(event, stableCoin, nonStableCoin, stableSize, feeUSD);
  handleUpdatePool_liquidityDepositAPY(event, stableCoin, nonStableCoin);
}

export function handleSync(event: SyncEvent): void {
  const swapPairContract = SwapPair.bind(event.address);
  const token0 = swapPairContract.token0();
  const token1 = swapPairContract.token1();
  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const stableCoin = Address.fromBytes(systemInfo.stableCoin); // This is of type Bytes, so I convert it to Address
  const nonStableCoin = token0 == stableCoin ? token1 : token0;

  // Because Reserves change
  handleUpdateLiquidity_totalAmount(event, token0, token1, event.params.reserve0, event.params.reserve1);
  handleUpdatePool_liquidityDepositAPY(event, stableCoin, nonStableCoin);

  handleUpdateTokenCandle_low_high(event, event.address, token0 == stableCoin ? 1 : 0, nonStableCoin);
}

export function handleTransfer(event: TransferEvent): void {
  const swapPairContract = SwapPair.bind(event.address);
  const systemInfo = SystemInfo.load(`SystemInfo`)!;
  const stableCoin = Address.fromBytes(systemInfo.stableCoin); // This is of type Bytes, so I convert it to Address

  const token0 = swapPairContract.token0();
  const token1 = swapPairContract.token1();
  const nonStableCoin = token0 == stableCoin ? token1 : token0;

  // // FIXME: Can be optimized because added/substracted value is already included in event. Do it later.
  handleUpdatePool_totalSupply(event, stableCoin, nonStableCoin);
}
