import { Address, ethereum } from '@graphprotocol/graph-ts';
import { SystemInfo } from '../../generated/schema';

// FIXME: Exchange for sensible defaults
const PriceFeedDemo = Address.fromString('0xC4407fbaA0FF4fF5ed89A91860FB9e9d33ea56CC');
const StoragePoolDemo = Address.fromString('0x7F1667b13768D15fedD4ab3B006B4C2174410593');
const StableDemo = Address.fromString('0xbEc2096Ef1FDfA8A5c876d900DDD9570d1471572');
const ReservePoolDemo = Address.fromString('0x8a791620dd6260079bf849dc5567adc3f2fdc318');
const GovTokenDemo = Address.fromString('0x61A4Ecb233477d93C45C54f83948B1FF89182B65');
const StabilityPoolManagerDemo = Address.fromString('0xc581768f944F60c8D711a086Fb45339703090cb3');

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
