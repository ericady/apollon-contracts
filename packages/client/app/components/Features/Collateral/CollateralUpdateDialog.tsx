'use client';

import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CloseIcon from '@mui/icons-material/Close';
import { Box, Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from '@mui/material';
import Button, { ButtonProps } from '@mui/material/Button';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { SyntheticEvent, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useWallet } from '../../../context/WalletProvider';
import { GetCollateralTokensQuery } from '../../../generated/gql-types';
import { displayPercentage, roundCurrency } from '../../../utils/math';
import NumberInput from '../../FormControls/NumberInput';
import Label from '../../Label/Label';
import CollateralRatioVisualization from '../../Visualizations/CollateralRatioVisualization';

type Props = {
  collateralData: GetCollateralTokensQuery;
  buttonVariant: ButtonProps['variant'];
  buttonSx?: ButtonProps['sx'];
};

type FieldValues = {
  etherTokenAmount: number;
};

const CollateralUpdateDialog = ({ collateralData, buttonVariant, buttonSx = {} }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tabValue, setTabValue] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');

  const { etherAmount } = useWallet();

  const methods = useForm<FieldValues>({
    defaultValues: {
      etherTokenAmount: 0,
    },
  });
  const { handleSubmit, setValue, reset } = methods;

  const handleChange = (_: SyntheticEvent, newValue: 'DEPOSIT' | 'WITHDRAW') => {
    setTabValue(newValue);
    reset();
  };

  // TODO: Add ETH address
  // TODO: Add ETH, BTC, YLT, jUSD
  const depositedCollateralToDeposit = collateralData.getCollateralTokens.filter(
    ({ token }, index) => token.address && index === 0,
  );

  const fillMaxInputValue = (fieldName: keyof FieldValues) => {
    if (tabValue === 'DEPOSIT') {
      setValue(fieldName, etherAmount, { shouldValidate: true });
    } else {
      setValue(fieldName, depositedCollateralToDeposit[0].walletAmount!, { shouldValidate: true });
    }
  };

  const onSubmit = () => {
    console.log('onSubmit called');
    // TODO: Implement contract call
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
      >
        Update
      </Button>

      <Dialog open={isOpen} onClose={() => setIsOpen(false)} fullWidth>
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
          <div className="flex">
            <img
              src="assets/svgs/Star24_white.svg"
              alt="White colored diamond shape"
              height="11"
              typeof="image/svg+xml"
            />
            <Typography variant="h6" display="inline-block">
              COLLATERAL UPDATE
            </Typography>
          </div>
          <IconButton onClick={() => setIsOpen(false)}>
            <CloseIcon
              sx={{
                color: '#64616D',
              }}
            />
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

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 20 }}>
                {tabValue === 'DEPOSIT' && (
                  <div style={{ marginTop: 6 }}>
                    <Label variant="success">ETH</Label>
                    <Typography sx={{ fontWeight: '400', marginTop: '10px' }}>
                      {roundCurrency(depositedCollateralToDeposit[0].walletAmount!, 5)}
                    </Typography>
                    <Typography
                      sx={{
                        color: '#3C3945',
                        fontFamily: 'Space Grotesk',
                        fontSize: '9px',
                        fontWeight: '700',
                        lineHeight: '11px',
                        letterSpacing: '0em',
                      }}
                    >
                      Trove
                    </Typography>
                  </div>
                )}
                {tabValue === 'WITHDRAW' && (
                  <div style={{ marginTop: 6 }}>
                    <Label variant="success">ETH</Label>
                  </div>
                )}

                <div>
                  <NumberInput
                    name="etherTokenAmount"
                    placeholder="Value"
                    fullWidth
                    rules={{
                      min: { value: 0, message: 'You can only invest positive amounts.' },
                      max:
                        tabValue === 'DEPOSIT'
                          ? { value: etherAmount, message: 'Your wallet does not contain the specified amount' }
                          : {
                              value: depositedCollateralToDeposit[0].walletAmount!,
                              message: 'Your trove does not contain the specified amount',
                            },
                    }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      {tabValue === 'DEPOSIT' && (
                        <>
                          <Typography variant="caption">{roundCurrency(etherAmount, 5)}</Typography>
                          <Typography
                            sx={{
                              color: '#3C3945',
                              fontFamily: 'Space Grotesk',
                              fontSize: '9px',
                              fontWeight: '700',
                              lineHeight: '11px',
                              letterSpacing: '0em',
                            }}
                          >
                            Wallet
                          </Typography>
                        </>
                      )}
                      {tabValue === 'WITHDRAW' && (
                        <>
                          <Typography variant="caption">
                            {roundCurrency(depositedCollateralToDeposit[0].walletAmount!, 5)}
                          </Typography>
                          <Typography
                            sx={{
                              color: '#3C3945',
                              fontFamily: 'Space Grotesk',
                              fontSize: '9px',
                              fontWeight: '700',
                              lineHeight: '11px',
                              letterSpacing: '0em',
                            }}
                          >
                            Trove
                          </Typography>
                        </>
                      )}
                    </div>

                    <Button
                      variant="undercover"
                      sx={{ textDecoration: 'underline', p: 0, mt: 0.25, height: 25 }}
                      onClick={() => fillMaxInputValue('etherTokenAmount')}
                    >
                      max
                    </Button>
                  </div>
                </div>
              </div>

              <Box
                sx={{
                  padding: '20px',
                  borderTop: '1px solid',
                  borderColor: 'background.paper',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="titleAlternate">Collateral Ratio</Typography>
                  <div className="flex">
                    <Typography
                      sx={{
                        fontFamily: 'Space Grotesk Variable',
                        color: 'info.main',
                        fontWeight: '700',
                        fontSize: '20px',
                      }}
                    >
                      {displayPercentage(1.56, false, 0)}
                    </Typography>
                    <ArrowForwardIosIcon sx={{ color: '#46434F', fontSize: '18px' }} />
                    <Typography
                      sx={{
                        fontFamily: 'Space Grotesk Variable',
                        color: 'info.main',
                        fontWeight: '700',
                        fontSize: '20px',
                      }}
                    >
                      {displayPercentage(1.43, false, 0)}
                    </Typography>
                  </div>
                </Box>

                <CollateralRatioVisualization criticalRatio={1.1} newRatio={1.43} oldRatio={1.56} />
              </Box>
            </DialogContent>
            <DialogActions
              sx={{
                border: '1px solid',
                borderColor: 'background.paper',
                backgroundColor: 'background.default',
                p: '30px 20px',
              }}
            >
              <Button type="submit" variant="outlined" sx={{ borderColor: '#fff' }}>
                Update
              </Button>
            </DialogActions>
          </form>
        </FormProvider>
      </Dialog>
    </>
  );
};

export default CollateralUpdateDialog;
