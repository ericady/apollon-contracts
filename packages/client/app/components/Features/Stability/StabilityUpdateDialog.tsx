'use client';

import { useQuery } from '@apollo/client';
import { Box, Dialog, DialogActions, DialogContent, DialogTitle, FormHelperText, IconButton } from '@mui/material';
import Button from '@mui/material/Button';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { SyntheticEvent, useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { DebtToken } from '../../../../generated/types';
import { IBase } from '../../../../generated/types/StabilityPoolManager';
import { Contracts, useEthers } from '../../../context/EthersProvider';
import { GetBorrowerDebtTokensQuery, GetBorrowerDebtTokensQueryVariables } from '../../../generated/gql-types';
import { GET_BORROWER_DEBT_TOKENS } from '../../../queries';
import { floatToBigInt, roundCurrency } from '../../../utils/math';
import NumberInput from '../../FormControls/NumberInput';
import CrossIcon from '../../Icons/CrossIcon';
import DiamondIcon from '../../Icons/DiamondIcon';
import Label from '../../Label/Label';

type FieldValues = Record<string, string>;

const StabilityUpdateDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [tabValue, setTabValue] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');

  const {
    address,
    contracts: { stabilityPoolManagerContract, debtTokenContracts },
  } = useEthers();

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

  const handleChange = (_: SyntheticEvent, newValue: 'DEPOSIT' | 'WITHDRAW') => {
    setTabValue(newValue);
    const emptyValues = data!.debtTokenMetas.reduce((acc, { token }) => ({ ...acc, [token.address]: '' }), {});
    reset(emptyValues);
  };

  const fillMaxInputValue = (tokenAddress: string, walletAmount: number, stabilityCompoundAmount: number) => {
    if (tabValue === 'DEPOSIT') {
      setValue(tokenAddress, walletAmount.toString(), { shouldValidate: true, shouldDirty: true });
    } else {
      setValue(tokenAddress, stabilityCompoundAmount.toString(), { shouldValidate: true, shouldDirty: true });
    }
  };

  const onSubmit = async (data: FieldValues) => {
    const tokenAmounts = Object.entries(data)
      .filter(([_, amount]) => amount !== '')
      .map<IBase.TokenAmountStruct>(([address, amount]) => ({
        tokenAddress: address,
        amount: floatToBigInt(parseFloat(amount)),
      }));

    if (tabValue === 'DEPOSIT') {
      tokenAmounts.forEach(async ({ tokenAddress, amount }) => {
        // @ts-ignore
        const debtTokenContract = debtTokenContracts[tokenAddress] as DebtToken;
        await debtTokenContract.approve(Contracts.StoragePool, amount);
      });

      await stabilityPoolManagerContract.provideStability(tokenAmounts);
    } else {
      await stabilityPoolManagerContract.withdrawStability(tokenAmounts);
    }

    reset();
    setIsOpen(false);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outlined" disabled={!address || !data}>
        Update
      </Button>

      <Dialog
        open={isOpen}
        onClose={() => {
          reset();
          setIsOpen(false);
        }}
        fullWidth
        // @ts-ignore
        componentsProps={{ backdrop: { 'data-testid': 'apollon-stability-update-dialog-backdrop' } }}
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
              STABILITY UPDATE
            </Typography>
          </div>
          <IconButton onClick={() => setIsOpen(false)} aria-label="close stability update dialog">
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
              <Tabs value={tabValue} onChange={handleChange} variant="fullWidth" sx={{ mt: 2 }}>
                <Tab label="DEPOSIT" value="DEPOSIT" />
                <Tab label="WITHDRAW" value="WITHDRAW" />
              </Tabs>

              <div style={{ overflowY: 'scroll', maxHeight: '60vh' }}>
                {data?.debtTokenMetas
                  .filter(
                    ({ walletAmount, compoundedDeposit }) =>
                      (tabValue === 'DEPOSIT' && walletAmount > 0) ||
                      (tabValue === 'WITHDRAW' && compoundedDeposit > 0),
                  )
                  .map(({ token, walletAmount, compoundedDeposit }, index) => (
                    <Box
                      key={token.address}
                      data-testid="apollon-stability-update-dialog"
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '20px',
                        height: '114px',
                        borderBottom: index === data?.debtTokenMetas.length - 1 ? 'none' : '1px solid',
                        borderColor: 'background.paper',
                      }}
                    >
                      {tabValue === 'DEPOSIT' && (
                        <div style={{ marginTop: 6 }}>
                          <Label variant="success">{token.symbol}</Label>
                          <Typography sx={{ fontWeight: '400', marginTop: '10px' }}>
                            {roundCurrency(compoundedDeposit, 5)}
                          </Typography>
                          <Typography variant="label" paragraph>
                            remaining deposit
                          </Typography>
                        </div>
                      )}
                      {tabValue === 'WITHDRAW' && (
                        <div style={{ marginTop: 6 }}>
                          <Label variant="success">{token.symbol}</Label>
                        </div>
                      )}

                      <div>
                        <NumberInput
                          name={token.address}
                          data-testid="apollon-stability-update-dialog-input"
                          placeholder="Value"
                          fullWidth
                          rules={{
                            min: { value: 0, message: 'Amount needs to be positive.' },
                            max:
                              tabValue === 'DEPOSIT'
                                ? {
                                    value: walletAmount,
                                    message: 'Your wallet does not contain the specified amount.',
                                  }
                                : {
                                    value: compoundedDeposit,
                                    message: 'Your deposited stability does not contain the specified amount.',
                                  },
                          }}
                        />

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div>
                            {tabValue === 'DEPOSIT' && (
                              <>
                                <Typography
                                  variant="caption"
                                  data-testid="apollon-stability-update-dialog-deposit-funds-label"
                                  color="info.main"
                                >
                                  {roundCurrency(walletAmount, 5)}
                                </Typography>
                                <Typography variant="label" paragraph>
                                  Wallet
                                </Typography>
                              </>
                            )}
                            {tabValue === 'WITHDRAW' && (
                              <>
                                <Typography
                                  variant="caption"
                                  data-testid="apollon-stability-update-dialog-withdraw-funds-label"
                                  color="info.main"
                                >
                                  {roundCurrency(compoundedDeposit, 5)}
                                </Typography>
                                <Typography variant="label" paragraph>
                                  remaining deposit
                                </Typography>
                              </>
                            )}
                          </div>

                          <Button
                            variant="undercover"
                            sx={{ textDecoration: 'underline', p: 0, mt: 0.25, height: 25 }}
                            onClick={() => fillMaxInputValue(token.address, walletAmount, compoundedDeposit)}
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
                  Update
                </Button>
                {formState.isSubmitted && !formState.isDirty && (
                  <FormHelperText error sx={{ mt: '10px' }} data-testid="apollon-stability-update-dialog-error">
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

export default StabilityUpdateDialog;
