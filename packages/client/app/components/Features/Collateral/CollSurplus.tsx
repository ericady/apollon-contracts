'use client';

import { useQuery } from '@apollo/client';
import { Button, Tooltip } from '@mui/material';
import { useEthers } from '../../../context/EthersProvider';
import { useTransactionDialog } from '../../../context/TransactionDialogProvider';
import {
  GetBorrowerCollateralTokensQuery,
  GetBorrowerCollateralTokensQueryVariables,
} from '../../../generated/gql-types';
import { GET_BORROWER_COLLATERAL_TOKENS } from '../../../queries';

function CollSurplus() {
  const {
    address,
    contracts: { borrowerOperationsContract },
  } = useEthers();
  const { setSteps } = useTransactionDialog();

  const { data } = useQuery<GetBorrowerCollateralTokensQuery, GetBorrowerCollateralTokensQueryVariables>(
    GET_BORROWER_COLLATERAL_TOKENS,
    {
      variables: {
        borrower: address,
      },
      skip: !address,
    },
  );

  const hasClaimableColl = data?.collateralTokenMetas.some(({ collSurplusAmount }) => collSurplusAmount > 0);

  const handleClaimCollSurplus = () => {
    setSteps([
      {
        title: 'Claim your Collateral Surplus.',
        transaction: {
          methodCall: () => {
            return borrowerOperationsContract.claimCollateral();
          },
          waitForResponseOf: [],
          reloadQueriesAferMined: [GET_BORROWER_COLLATERAL_TOKENS],
        },
      },
    ]);
  };

  return !hasClaimableColl ? (
    <Tooltip title="Your trove got liquidated! Claim your collateral surplus." placement="bottom-start" arrow>
      <Button
        variant="outlined"
        onClick={handleClaimCollSurplus}
        title="Your trove got liquidated! Claim your collateral surplus."
        sx={{ position: 'fixed', right: '25px', top: '56px', width: '250px' }}
      >
        Claim collateral surplus
      </Button>
    </Tooltip>
  ) : null;
}

export default CollSurplus;
