import {
  LastGoodPriceUpdated as LastGoodPriceUpdatedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  PriceFeedStatusChanged as PriceFeedStatusChangedEvent,
  TokenPriceChanged as TokenPriceChangedEvent,
} from '../generated/PriceFeed/PriceFeed';
import { handleUpdateTokenCandle_low_high } from './entities/token-candle-entity';

export function handleLastGoodPriceUpdated(event: LastGoodPriceUpdatedEvent): void {}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handlePriceFeedStatusChanged(event: PriceFeedStatusChangedEvent): void {}

export function handleTokenPriceChanged(event: TokenPriceChangedEvent): void {
  handleUpdateTokenCandle_low_high(event, event.params._token);
}
