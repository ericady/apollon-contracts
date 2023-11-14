import { BigDecimal, BigInt } from '@graphprotocol/graph-ts';

export function convertToDecimal(bigIntValue: BigInt, decimals: i32 = 18): BigDecimal {
  let scaleFactor = BigInt.fromI32(10).pow(<u8>decimals); // 10^decimals
  return bigIntValue.toBigDecimal().div(scaleFactor.toBigDecimal());
}
