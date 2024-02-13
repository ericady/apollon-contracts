import { BigInt, Address as EventAddress } from '@graphprotocol/graph-ts/common/numbers';
import { newMockEvent } from 'matchstick-as';
import { SystemInfo, Token } from '../generated/schema';

export const MockDebtTokenAddress = EventAddress.fromString('0x0000000000000000000000000000000000000100');
export const MockDebtToken_STABLE_Address = EventAddress.fromString('0x0000000000000000000000000000000000000101');
export const MockStabilityPoolManagerAddress = EventAddress.fromString('0x0000000000000000000000000000000000000200');
export const MockStabilityPoolAddress = EventAddress.fromString('0x0000000000000000000000000000000000000300');
export const MockTroveManagerAddress = EventAddress.fromString('0x0000000000000000000000000000000000000400');
export const MockCollateralToken1Address = EventAddress.fromString('0x0000000000000000000000000000000000000500');
export const MockCollateralToken2Address = EventAddress.fromString('0x0000000000000000000000000000000000000501');
export const MockPriceFeedAddress = EventAddress.fromString('0x0000000000000000000000000000000000000600');
export const MockStoragePoolAddress = EventAddress.fromString('0x0000000000000000000000000000000000000700');
export const MockReservePoolAddress = EventAddress.fromString('0x0000000000000000000000000000000000000800');

export const MockUserAddress = EventAddress.fromString('0x1000000000000000000000000000000000000000');

export const oneEther = BigInt.fromI64(1000000000000000000);

export const initSystemInfo = (): void => {
  const systemInfo = new SystemInfo('SystemInfo');
  systemInfo.storagePool = MockStoragePoolAddress;
  systemInfo.priceFeed = MockPriceFeedAddress;
  systemInfo.reservePool = MockReservePoolAddress;

  const now = newMockEvent().block.timestamp;

  systemInfo.timestamp = now;
  systemInfo.stableCoin = MockDebtToken_STABLE_Address;

  systemInfo.save();
};

export const initToken = (): void => {
  const token = new Token(MockDebtTokenAddress);
  token.address = MockDebtTokenAddress;
  token.symbol = 'AAA';
  token.priceUSD = oneEther.times(BigInt.fromI32(2));
  token.isPoolToken = true;

  const now = newMockEvent().block.timestamp;

  token.createdAt = now;
  token.save();
};
