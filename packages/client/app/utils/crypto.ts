import { ethers } from 'ethers';
import { HintHelpers, SortedTroves, TroveManager } from '../../generated/types';
import { IBase } from '../../generated/types/TroveManager';

export const getCheckSum = (address: string) => {
  return ethers.getAddress(address);
};

export async function getHints(
  troveManager: TroveManager,
  sortedTroves: SortedTroves,
  hintHelpers: HintHelpers,
  {
    borrower,
    addedColl,
    addedDebt,
    removedColl,
    removedDebt,
  }: {
    borrower: string;
    addedColl: IBase.TokenAmountStruct[];
    removedColl: IBase.TokenAmountStruct[];
    addedDebt: IBase.TokenAmountStruct[];
    removedDebt: IBase.TokenAmountStruct[];
  },
) {
  const collateralRatio = await troveManager.getICRIncludingPatch(
    borrower,
    addedColl,
    removedColl,
    addedDebt,
    removedDebt,
  );

  let hint: string;
  const amountStableTroves = await sortedTroves.getSize();

  if (amountStableTroves === 0n) {
    hint = ethers.ZeroAddress;
  } else {
    const [_hint] = await hintHelpers.getApproxHint(
      collateralRatio,
      Math.round(Math.min(4000, 15 * Math.sqrt(Number(amountStableTroves)))),
      Math.round(Math.random() * 100000000000),
    );
    hint = _hint;
  }

  return sortedTroves.findInsertPosition(collateralRatio, hint, hint);
}
