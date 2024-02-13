'use client';

import { useQuery } from '@apollo/client';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from '@mui/material';
import Button, { ButtonProps } from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useEthers } from '../../../context/EthersProvider';
import { useTransactionDialog } from '../../../context/TransactionDialogProvider';
import {
  GetBorrowerCollateralTokensQuery,
  GetBorrowerCollateralTokensQueryVariables,
} from '../../../generated/gql-types';
import { GET_BORROWER_COLLATERAL_TOKENS, GET_BORROWER_DEBT_TOKENS } from '../../../queries';
import CrossIcon from '../../Icons/CrossIcon';
import DiamondIcon from '../../Icons/DiamondIcon';

type Props = {
  buttonVariant: ButtonProps['variant'];
  buttonSx?: ButtonProps['sx'];
};

const CloseTroveDialog = ({ buttonVariant, buttonSx = {} }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

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

  const collateralToDeposit: GetBorrowerCollateralTokensQuery['collateralTokenMetas'] =
    data?.collateralTokenMetas ?? [];

  if (collateralToDeposit.length === 0)
    return (
      <Button
        variant={buttonVariant}
        sx={{
          width: 'auto',
          padding: '0 50px',
          ...buttonSx,
        }}
        disabled
      >
        Close Trove
      </Button>
    );

  const hasNoOpenTrove = !collateralToDeposit.some(({ troveLockedAmount }) => troveLockedAmount > 0);

  const handleCloseTrove = async () => {
    setSteps([
      {
        title: 'Repay all debt and close trove.',
        transaction: {
          methodCall: () => {
            return borrowerOperationsContract.closeTrove();
          },
          waitForResponseOf: [],
          reloadQueriesAferMined: [GET_BORROWER_COLLATERAL_TOKENS, GET_BORROWER_DEBT_TOKENS],
        },
      },
    ]);

    setIsOpen(false);
  };

  return (
    <>
      <Button
        variant={buttonVariant}
        sx={{
          width: 'auto',
          padding: '0 50px',
          ...buttonSx,
        }}
        onClick={() => setIsOpen(true)}
        disabled={!address || hasNoOpenTrove}
      >
        Close Trove
      </Button>
      <Dialog
        open={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
        fullWidth
        // @ts-ignore
        componentsProps={{ backdrop: { 'data-testid': 'apollon-close-trove-dialog-backdrop' } }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'background.default',
            border: '1px solid',
            borderColor: 'background.paper',
            borderBottom: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <DiamondIcon isDialog />
            <Typography variant="h6" display="inline-block">
              CLOSE TROVE
            </Typography>
          </div>
          <IconButton onClick={() => setIsOpen(false)} aria-label="close collateral update dialog">
            <CrossIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{
            p: 0,
            backgroundColor: 'background.default',
            border: '1px solid',
            borderColor: 'background.paper',
            borderBottom: 'none',
          }}
        >
          <Alert severity="warning">
            All your outstanding debts will be repaid, followed by a closure of your Trove. The entire collateral
            deposited will then be credited to your wallet.
          </Alert>
        </DialogContent>
        <DialogActions
          sx={{
            border: '1px solid',
            borderColor: 'background.paper',
            backgroundColor: 'background.default',
            p: '30px 20px',
          }}
        >
          <Button onClick={handleCloseTrove} variant="outlined" sx={{ borderColor: 'primary.contrastText' }}>
            Close Trove
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CloseTroveDialog;
