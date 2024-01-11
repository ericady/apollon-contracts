import { Address, ethereum } from '@graphprotocol/graph-ts';
import { SystemInfo } from '../../generated/schema';

export const handleUpdateSystemInfo_stableCoin = (event: ethereum.Event, stableCoin: Address): void => {
  let systemInfo = SystemInfo.load(`SystemInfo`);

  if (systemInfo === null) {
    systemInfo = new SystemInfo(`SystemInfo`);
  }

  systemInfo.timestamp = event.block.timestamp;
  systemInfo.stableCoin = stableCoin;

  systemInfo.save();
};

export const handleUpdateSystemInfo_storagePool = (event: ethereum.Event, storagePool: Address): void => {
  let systemInfo = SystemInfo.load(`SystemInfo`);

  if (systemInfo === null) {
    systemInfo = new SystemInfo(`SystemInfo`);
  }

  systemInfo.timestamp = event.block.timestamp;
  systemInfo.storagePool = storagePool;

  systemInfo.save();
};
