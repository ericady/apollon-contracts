import { BigInt, ethereum } from '@graphprotocol/graph-ts';
import { createMockedFunction } from 'matchstick-as';
import { MockDebtTokenAddress, MockTroveManagerAddress, MockUserAddress } from './utils';

export const mockTroveManagerGetTroveDebt = (): void => {
  createMockedFunction(MockTroveManagerAddress, 'getTroveDebt', 'getTroveDebt(address):((address,uint256)[])')
    .withArgs([ethereum.Value.fromAddress(MockUserAddress)])
    .returns([
      ethereum.Value.fromTupleArray([
        changetype<ethereum.Tuple>([
          ethereum.Value.fromAddress(MockDebtTokenAddress),
          ethereum.Value.fromSignedBigInt(BigInt.fromI32(1234)),
        ]),
      ]),
    ]);
};

// export const mockTroveManagerGetAllTroveCollUSD = (collTokenAddress: Address): void => {
//   createMockedFunction(MockTroveManagerAddress, 'getAllTroveCollUSD', 'getAllTroveCollUSD(address):(uint256)')
//     .withArgs([ethereum.Value.fromAddress(collTokenAddress)])
//     .returns([ethereum.Value.fromSignedBigInt(BigInt.fromI32(1234))]);
// };
