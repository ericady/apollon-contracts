import { Address, ethereum } from '@graphprotocol/graph-ts';
import { SystemInfo } from '../../generated/schema';

export const handleUpdateSystemInfo = (event: ethereum.Event, stableCoin: Address): void => {
  let systemInfo = SystemInfo.load(`SystemInfo`);

  if (systemInfo === null) {
    systemInfo = new SystemInfo(`SystemInfo`);
  }

  systemInfo.timestamp = event.block.timestamp;
  systemInfo.stableCoin = stableCoin;

  systemInfo.save();
};
