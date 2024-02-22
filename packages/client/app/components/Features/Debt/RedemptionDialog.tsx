import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
import { useState } from 'react';
import { FieldValues, FormProvider, useForm } from 'react-hook-form';
import { useEthers } from '../../../context/EthersProvider';
import { useSelectedToken } from '../../../context/SelectedTokenProvider';
import { useTransactionDialog } from '../../../context/TransactionDialogProvider';
import { Contracts } from '../../../context/contracts.config';
import { dangerouslyConvertBigIntToNumber, roundCurrency } from '../../../utils/math';
import NumberInput from '../../FormControls/NumberInput';
import CrossIcon from '../../Icons/CrossIcon';
import DiamondIcon from '../../Icons/DiamondIcon';
import Label from '../../Label/Label';

type FieldValues = {
  [Contracts.DebtToken.STABLE]: string;
  redemptionFee: string;
};

function RedemptionDialog() {
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
  const { JUSDToken } = useSelectedToken();
  const { setSteps } = useTransactionDialog();

  const methods = useForm<FieldValues>({
    reValidateMode: 'onChange',
    defaultValues: {
      [Contracts.DebtToken.STABLE]: '',
      redemptionFee: '2',
    },
  });
  const { handleSubmit, setValue, reset, formState } = methods;

  const onSubmit = async (formData: FieldValues) => {};

  const fillMaxInputValue = () => {
    setValue(Contracts.DebtToken.STABLE, dangerouslyConvertBigIntToNumber(JUSDToken!.walletAmount, 9, 9).toString(), {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outlined"
        sx={{
          width: 'auto',
          padding: '0 50px',
        }}
        disabled={!address || (JUSDToken && JUSDToken.walletAmount <= 0)}
      >
        Redeem
      </Button>

      <Dialog
        open={isOpen}
        onClose={() => {
          reset();
          setIsOpen(false);
        }}
        fullWidth
        // @ts-ignore
        componentsProps={{ backdrop: { 'data-testid': 'apollon-redeem-dialog-backdrop' } }}
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
              Redeem Stable Coin
            </Typography>
          </div>
          <IconButton onClick={() => setIsOpen(false)} aria-label="close redeem debt dialog">
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
                {JUSDToken && (
                  <>
                    <Box
                      data-testid="apollon-repay-debt-dialog"
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '20px',
                        height: '114px',
                        borderColor: 'background.paper',
                      }}
                    >
                      <div style={{ marginTop: 6 }}>
                        <Label variant="success">{JUSDToken.symbol}</Label>
                      </div>

                      <div>
                        <NumberInput
                          name={JUSDToken.address}
                          data-testid="apollon-redeem-debt-dialog-input"
                          placeholder="Value"
                          required
                          fullWidth
                          rules={{
                            min: { value: 0, message: 'Amount needs to be positive.' },
                            max: {
                              value: dangerouslyConvertBigIntToNumber(JUSDToken.walletAmount, 9, 9),
                              message: 'Your wallet does not contain the specified amount.',
                            },
                          }}
                        />

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div>
                            <Typography
                              variant="caption"
                              data-testid="apollon-redeem-debt-dialog-deposit-funds-label"
                              color="info.main"
                            >
                              {roundCurrency(dangerouslyConvertBigIntToNumber(JUSDToken.walletAmount, 12, 6), 5, 5)}
                            </Typography>
                            <Typography variant="label" paragraph>
                              Wallet
                            </Typography>
                          </div>

                          <Button
                            variant="undercover"
                            sx={{ textDecoration: 'underline', p: 0, mt: 0.25, height: 25 }}
                            onClick={() => fillMaxInputValue()}
                          >
                            max
                          </Button>
                        </div>
                      </div>
                    </Box>

                    <Box
                      data-testid="apollon-repay-debt-dialog"
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '20px',
                        height: '114px',
                        borderColor: 'background.paper',
                      }}
                    >
                      <Typography sx={{ fontWeight: '400', marginTop: '10px' }}>max. Redemption Fee</Typography>

                      <div>
                        <NumberInput
                          name="redemptionFee"
                          data-testid="apollon-redeem-debt-dialog-redemptionFee-input"
                          placeholder="max. Redemption Fee"
                          fullWidth
                          rules={{
                            min: { value: 0, message: 'Amount needs to be positive.' },
                            max: {
                              value: 100,
                              message: 'No bigger value possible.',
                            },
                          }}
                        />
                      </div>
                    </Box>
                  </>
                )}
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
                  Redeem Stable Coin
                </Button>
              </div>
            </DialogActions>
          </form>
        </FormProvider>
      </Dialog>
    </>
  );
}

export default RedemptionDialog;
