import { Address, ethereum } from '@graphprotocol/graph-ts';
import { SystemInfo } from '../../generated/schema';

// FIXME: Exchange for sensible defaults
const PriceFeedDemo = Address.fromString('0xa513e6e4b8f2a923d98304ec87f64353c4d5c853');
const StoragePoolDemo = Address.fromString('0xb7f8bc63bbcad18155201308c8f3540b07f84f5e');
const StableDemo = Address.fromString('0x95401dc811bb5740090279ba06cfa8fcf6113778');
const ReservePoolDemo = Address.fromString('0x8a791620dd6260079bf849dc5567adc3f2fdc318');
const GovTokenDemo = Address.fromString('0x0b306bf915c4d645ff596e518faf3f9669b97016');
const StabilityPoolManagerDemo = Address.fromString('0xdc64a140aa3e981100a9beca4e685f962f0cf6c9');

export const handleUpdateSystemInfo_stableCoin = (event: ethereum.Event, stableCoin: Address): void => {
  let systemInfo = SystemInfo.load(`SystemInfo`);

  if (systemInfo === null) {
    systemInfo = new SystemInfo(`SystemInfo`);
    systemInfo.storagePool = StoragePoolDemo;
    systemInfo.priceFeed = PriceFeedDemo;
    systemInfo.reservePool = ReservePoolDemo;
    systemInfo.totalValueLockedUSDHistoryIndex = 0;
    systemInfo.totalValueMintedUSDHistoryIndex = 0;
    systemInfo.reservePoolUSDHistoryIndex = 0;
    systemInfo.govToken = GovTokenDemo;
    systemInfo.stabilityPoolManager = StabilityPoolManagerDemo;
  }

  systemInfo.timestamp = event.block.timestamp;
  systemInfo.stableCoin = stableCoin;

  systemInfo.save();
};

export const handleUpdateSystemInfo_storagePool = (event: ethereum.Event, storagePool: Address): void => {
  let systemInfo = SystemInfo.load(`SystemInfo`);

  if (systemInfo === null) {
    systemInfo = new SystemInfo(`SystemInfo`);
    systemInfo.stableCoin = StableDemo;
    systemInfo.priceFeed = PriceFeedDemo;
    systemInfo.reservePool = ReservePoolDemo;
    systemInfo.totalValueLockedUSDHistoryIndex = 0;
    systemInfo.totalValueMintedUSDHistoryIndex = 0;
    systemInfo.reservePoolUSDHistoryIndex = 0;
    systemInfo.govToken = GovTokenDemo;
    systemInfo.stabilityPoolManager = StabilityPoolManagerDemo;
  }

  systemInfo.timestamp = event.block.timestamp;
  systemInfo.storagePool = storagePool;

  systemInfo.save();
};

export const handleUpdateSystemInfo_priceFeed = (event: ethereum.Event, priceFeed: Address): void => {
  let systemInfo = SystemInfo.load(`SystemInfo`);

  if (systemInfo === null) {
    systemInfo = new SystemInfo(`SystemInfo`);
    systemInfo.stableCoin = StableDemo;
    systemInfo.storagePool = StoragePoolDemo;
    systemInfo.reservePool = ReservePoolDemo;
    systemInfo.totalValueLockedUSDHistoryIndex = 0;
    systemInfo.totalValueMintedUSDHistoryIndex = 0;
    systemInfo.reservePoolUSDHistoryIndex = 0;
    systemInfo.govToken = GovTokenDemo;
    systemInfo.stabilityPoolManager = StabilityPoolManagerDemo;
  }

  systemInfo.timestamp = event.block.timestamp;
  systemInfo.priceFeed = priceFeed;

  systemInfo.save();
};

export const handleUpdateSystemInfo_reservePool = (event: ethereum.Event, reservePool: Address): void => {
  let systemInfo = SystemInfo.load(`SystemInfo`);

  if (systemInfo === null) {
    systemInfo = new SystemInfo(`SystemInfo`);
    systemInfo.stableCoin = StableDemo;
    systemInfo.storagePool = StoragePoolDemo;
    systemInfo.priceFeed = PriceFeedDemo;
    systemInfo.totalValueLockedUSDHistoryIndex = 0;
    systemInfo.totalValueMintedUSDHistoryIndex = 0;
    systemInfo.reservePoolUSDHistoryIndex = 0;
    systemInfo.govToken = GovTokenDemo;
    systemInfo.stabilityPoolManager = StabilityPoolManagerDemo;
  }

  systemInfo.timestamp = event.block.timestamp;
  systemInfo.reservePool = reservePool;

  systemInfo.save();
};

export const handleUpdateSystemInfo_stabilityPoolManager = (
  event: ethereum.Event,
  stabilityPoolManager: Address,
): void => {
  let systemInfo = SystemInfo.load(`SystemInfo`);

  if (systemInfo === null) {
    systemInfo = new SystemInfo(`SystemInfo`);
    systemInfo.stableCoin = StableDemo;
    systemInfo.storagePool = StoragePoolDemo;
    systemInfo.priceFeed = PriceFeedDemo;
    systemInfo.reservePool = ReservePoolDemo;
    systemInfo.totalValueLockedUSDHistoryIndex = 0;
    systemInfo.totalValueMintedUSDHistoryIndex = 0;
    systemInfo.reservePoolUSDHistoryIndex = 0;
    systemInfo.govToken = GovTokenDemo;
  }

  systemInfo.timestamp = event.block.timestamp;
  systemInfo.reservePool = stabilityPoolManager;

  systemInfo.save();
};
