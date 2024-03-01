'use client';

import { useQuery } from '@apollo/client';
import { Box, Dialog, DialogActions, DialogContent, DialogTitle, FormHelperText, IconButton } from '@mui/material';
import Button, { ButtonProps } from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Contracts, isDebtTokenAddress } from '../../../../config';
import { IBase } from '../../../../generated/types/TroveManager';
import { useEthers } from '../../../context/EthersProvider';
import { useTransactionDialog } from '../../../context/TransactionDialogProvider';
import { GetBorrowerDebtTokensQuery, GetBorrowerDebtTokensQueryVariables } from '../../../generated/gql-types';
import { GET_BORROWER_COLLATERAL_TOKENS, GET_BORROWER_DEBT_TOKENS } from '../../../queries';
import { getHints } from '../../../utils/crypto';
import { dangerouslyConvertBigIntToNumber, floatToBigInt, roundCurrency } from '../../../utils/math';
import NumberInput from '../../FormControls/NumberInput';
import CrossIcon from '../../Icons/CrossIcon';
import DiamondIcon from '../../Icons/DiamondIcon';
import Label from '../../Label/Label';

type FieldValues = Record<string, string>;

type Props = {
  buttonVariant?: ButtonProps['variant'];
  buttonSx?: ButtonProps['sx'];
};

const RepayDebtDialog = ({ buttonSx = {}, buttonVariant = 'outlined' }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  const {
    address,
    contracts: {
      borrowerOperationsContract,
      debtTokenContracts,
      troveManagerContract,
      sortedTrovesContract,
      hintHelpersContract,
    },
  } = useEthers();
  const { setSteps } = useTransactionDialog();

  const { data } = useQuery<GetBorrowerDebtTokensQuery, GetBorrowerDebtTokensQueryVariables>(GET_BORROWER_DEBT_TOKENS, {
    variables: {
      borrower: address,
    },
  });

  const methods = useForm<FieldValues>({ reValidateMode: 'onChange' });
  const { handleSubmit, setValue, reset, formState } = methods;

  useEffect(() => {
    if (data && !formState.isDirty) {
      const emptyValues = data!.debtTokenMetas.reduce((acc, { token }) => ({ ...acc, [token.address]: '' }), {});
      reset(emptyValues);
    }
  }, [data, formState.isDirty, reset]);

  const fillMaxInputValue = (tokenAddress: string, walletAmount: number, troveRepableDebtAmount: number) => {
    setValue(
      tokenAddress,
      walletAmount > troveRepableDebtAmount ? troveRepableDebtAmount.toString() : walletAmount.toString(),
      { shouldValidate: true, shouldDirty: true },
    );
  };

  const onSubmit = async (formData: FieldValues) => {
    const tokenAmounts = Object.entries(formData)
      .filter(([_, amount]) => amount !== '')
      .map<IBase.TokenAmountStruct>(([address, amount]) => ({
        tokenAddress: address,
        amount: floatToBigInt(parseFloat(amount)),
      }));

    if (tokenAmounts.length === 0) {
      return;
    }

    setSteps([
      ...tokenAmounts.map(({ tokenAddress, amount }) => ({
        title: `Approve ${
          data?.debtTokenMetas.find(({ token: { address } }) => address === tokenAddress)?.token.symbol
        } spending.`,
        transaction: {
          methodCall: async () => {
            // @ts-ignore
            if (isDebtTokenAddress(tokenAddress)) {
              const debtTokenContract = debtTokenContracts[tokenAddress];
              return debtTokenContract.approve(Contracts.StoragePool, amount);
            }

            return null as any;
          },
          waitForResponseOf: [],
        },
      })),
      {
        title: 'Repay all debt.',
        transaction: {
          methodCall: async () => {
            const [upperHint, lowerHint] = await getHints(
              troveManagerContract,
              sortedTrovesContract,
              hintHelpersContract,
              {
                borrower: address,
                addedColl: [],
                addedDebt: [],
                removedColl: [],
                removedDebt: tokenAmounts,
              },
            );

            return borrowerOperationsContract.repayDebt(tokenAmounts, upperHint, lowerHint).catch((err) => {
              throw new Error(err, { cause: borrowerOperationsContract });
            });
          },
          // wait for all approvals
          waitForResponseOf: Array.of(tokenAmounts.length).map((_, index) => index),
          reloadQueriesAferMined: [GET_BORROWER_DEBT_TOKENS, GET_BORROWER_COLLATERAL_TOKENS],
        },
      },
    ]);

    reset(undefined, { keepIsSubmitted: false });
    setIsOpen(false);
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant={buttonVariant}
        sx={{
          width: 'auto',
          padding: '0 50px',
          ...buttonSx,
        }}
        disabled={!address || !data?.debtTokenMetas.some(({ troveRepableDebtAmount }) => troveRepableDebtAmount > 0)}
      >
        Repay
      </Button>

      <Dialog
        open={isOpen}
        onClose={() => {
          reset();
          setIsOpen(false);
        }}
        fullWidth
        // @ts-ignore
        componentsProps={{ backdrop: { 'data-testid': 'apollon-repay-debt-dialog-backdrop' } }}
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
              Repay Debt
            </Typography>
          </div>
          <IconButton onClick={() => setIsOpen(false)} aria-label="close repay debt dialog">
            <CrossIcon />
          </IconButton>
        </DialogTitle>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogContent
              sx={{
                p: 0,
                backgroundColor: 'background.default',
                border: '1px solid',
                borderColor: 'background.paper',
                borderBottom: 'none',
              }}
            >
              <div style={{ overflowY: 'scroll', maxHeight: '60vh' }}>
                {data?.debtTokenMetas
                  .filter(({ troveRepableDebtAmount }) => troveRepableDebtAmount > 0)
                  .map(({ token, walletAmount, troveRepableDebtAmount }, index) => (
                    <Box
                      key={token.address}
                      data-testid="apollon-repay-debt-dialog"
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '20px',
                        height: '114px',
                        borderBottom: index === data?.debtTokenMetas.length - 1 ? 'none' : '1px solid',
                        borderColor: 'background.paper',
                      }}
                    >
                      <div style={{ marginTop: 6 }}>
                        <Label variant="success">{token.symbol}</Label>
                        <Typography sx={{ fontWeight: '400', marginTop: '10px' }}>
                          {roundCurrency(dangerouslyConvertBigIntToNumber(troveRepableDebtAmount, 12, 6), 5, 5)}
                        </Typography>
                        <Typography variant="label" paragraph>
                          repayable debt
                        </Typography>
                      </div>

                      <div>
                        <NumberInput
                          name={token.address}
                          data-testid="apollon-repay-debt-dialog-input"
                          placeholder="Value"
                          fullWidth
                          rules={{
                            min: { value: 0, message: 'Amount needs to be positive.' },
                            max: {
                              value:
                                walletAmount > troveRepableDebtAmount
                                  ? dangerouslyConvertBigIntToNumber(troveRepableDebtAmount, 12, 6)
                                  : dangerouslyConvertBigIntToNumber(walletAmount, 12, 6),
                              message:
                                walletAmount > troveRepableDebtAmount
                                  ? 'The specified amount is bigger than your debt.'
                                  : 'Your wallet does not contain the specified amount.',
                            },
                          }}
                        />

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div>
                            <Typography
                              variant="caption"
                              data-testid="apollon-repay-debt-dialog-deposit-funds-label"
                              color="info.main"
                            >
                              {roundCurrency(dangerouslyConvertBigIntToNumber(walletAmount, 12, 6), 5, 5)}
                            </Typography>
                            <Typography variant="label" paragraph>
                              Wallet
                            </Typography>
                          </div>

                          <Button
                            variant="undercover"
                            sx={{ textDecoration: 'underline', p: 0, mt: 0.25, height: 25 }}
                            onClick={() =>
                              fillMaxInputValue(
                                token.address,
                                dangerouslyConvertBigIntToNumber(walletAmount, 12, 6),
                                dangerouslyConvertBigIntToNumber(troveRepableDebtAmount, 12, 6),
                              )
                            }
                          >
                            max
                          </Button>
                        </div>
                      </div>
                    </Box>
                  ))}
              </div>
            </DialogContent>
            <DialogActions
              sx={{
                border: '1px solid',
                borderColor: 'background.paper',
                backgroundColor: 'background.default',
                p: '30px 20px',
              }}
            >
              <div style={{ width: '100%' }}>
                <Button type="submit" variant="outlined" sx={{ borderColor: 'primary.contrastText' }}>
                  Repay Debt
                </Button>
                {formState.isSubmitted && !formState.isDirty && (
                  <FormHelperText error sx={{ mt: '10px' }} data-testid="apollon-repay-debt-dialog-error">
                    You must specify at least one token to update.
                  </FormHelperText>
                )}
              </div>
            </DialogActions>
          </form>
        </FormProvider>
      </Dialog>
    </>
  );
};

export default RepayDebtDialog;
