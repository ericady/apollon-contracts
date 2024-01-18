import { Address, ethereum } from '@graphprotocol/graph-ts';
import { SystemInfo } from '../../generated/schema';

const PriceFeedDemo = Address.fromString("0x8A791620dd6260079BF849Dc5567aDC3F2FdC318")
const StoragePoolDemo = Address.fromString("0x5FC8d32690cc91D4c39d9d3abcBD16989F875707")
const StableDemo = Address.fromString("0x7a2088a1bFc9d81c55368AE168C2C02570cB814F")
const ReservePoolDemo = Address.fromString("0x0165878A594ca255338adfa4d48449f69242Eb8F")

export const handleUpdateSystemInfo_stableCoin = (event: ethereum.Event, stableCoin: Address): void => {
  let systemInfo = SystemInfo.load(`SystemInfo`);

  if (systemInfo === null) {
    systemInfo = new SystemInfo(`SystemInfo`);
    systemInfo.storagePool = StoragePoolDemo
    systemInfo.priceFeed = PriceFeedDemo
    systemInfo.reservePool = ReservePoolDemo
  }

  systemInfo.timestamp = event.block.timestamp;
  systemInfo.stableCoin = stableCoin;

  systemInfo.save();
};

export const handleUpdateSystemInfo_storagePool = (event: ethereum.Event, storagePool: Address): void => {
  let systemInfo = SystemInfo.load(`SystemInfo`);

  if (systemInfo === null) {
    systemInfo = new SystemInfo(`SystemInfo`);
    systemInfo.stableCoin = StableDemo
    systemInfo.priceFeed = PriceFeedDemo
    systemInfo.reservePool = ReservePoolDemo
  }

  systemInfo.timestamp = event.block.timestamp;
  systemInfo.storagePool = storagePool;

  systemInfo.save();
};

export const handleUpdateSystemInfo_priceFeed = (event: ethereum.Event, priceFeed: Address): void => {
  let systemInfo = SystemInfo.load(`SystemInfo`);

  if (systemInfo === null) {
    systemInfo = new SystemInfo(`SystemInfo`);
    systemInfo.stableCoin = StableDemo
    systemInfo.storagePool = StoragePoolDemo
    systemInfo.reservePool = ReservePoolDemo
  }

  systemInfo.timestamp = event.block.timestamp;
  systemInfo.priceFeed = priceFeed;

  systemInfo.save();
}

export const handleUpdateSystemInfo_reservePool = (event: ethereum.Event, reservePool: Address): void => {
  let systemInfo = SystemInfo.load(`SystemInfo`);

  if (systemInfo === null) {
    systemInfo = new SystemInfo(`SystemInfo`);
    systemInfo.stableCoin = StableDemo
    systemInfo.storagePool = StoragePoolDemo
    systemInfo.priceFeed = PriceFeedDemo
  }

  systemInfo.timestamp = event.block.timestamp;
  systemInfo.reservePool = reservePool;

  systemInfo.save();
};
