import {
  LastGoodPriceUpdated as LastGoodPriceUpdatedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  PriceFeedStatusChanged as PriceFeedStatusChangedEvent,
  TokenPriceChanged as TokenPriceChangedEvent,
} from '../generated/PriceFeed/PriceFeed';
import { handleUpdateSystemInfo_priceFeed } from './entities/system-info-entity';

export function handleLastGoodPriceUpdated(event: LastGoodPriceUpdatedEvent): void {}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handlePriceFeedStatusChanged(event: PriceFeedStatusChangedEvent): void {
  handleUpdateSystemInfo_priceFeed(event, event.address);
}

export function handleTokenPriceChanged(event: TokenPriceChangedEvent): void {}

// TODO: Link Address initialization for PriceFeed
