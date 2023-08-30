'use client';

import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CloseIcon from '@mui/icons-material/Close';
import Square from '@mui/icons-material/Square';
import { Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from '@mui/material';
import Button from '@mui/material/Button';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { SyntheticEvent, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useWallet } from '../../../context/WalletProvider';
import { GetBorrowerCollateralTokensQuery } from '../../../generated/gql-types';
import { roundCurrency } from '../../../utils/math';
import NumberInput from '../../FormControls/NumberInput';
import Label from '../../Label/Label';

type Props = {
  collateralData: GetBorrowerCollateralTokensQuery;
};

type FieldValues = {
  etherTokenAmount: number;
};

const CollateralUpdateDialog = ({ collateralData }: Props) => {
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
        variant="outlined"
        sx={{
          width: 'auto',
          padding: '0 50px',
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
          <div>
            <Square
              sx={{
                color: '#504D59',
                fontSize: '12px',
                marginRight: '15px',
              }}
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
              <Tabs value={tabValue} onChange={handleChange} className="tabs-style">
                <Tab label="DEPOSIT" value="DEPOSIT" />
                <Tab label="WITHDRAW" value="WITHDRAW" />
              </Tabs>

              <div className="pool-input">
                {tabValue === 'DEPOSIT' && (
                  <div>
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
                {tabValue === 'WITHDRAW' && <Label variant="success">ETH</Label>}

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

                  <div className="flex" style={{ justifyContent: 'space-between', alignContent: 'flex-start' }}>
                    <div>
                      {tabValue === 'DEPOSIT' && (
                        <>
                          <Typography variant="caption">{etherAmount}</Typography>
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
                      sx={{ textDecoration: 'underline' }}
                      onClick={() => fillMaxInputValue('etherTokenAmount')}
                    >
                      max
                    </Button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px' }}>
                <Typography sx={{ color: '#827F8B', fontSize: '16px' }} className="range-hdng">
                  Collateral Ratio
                </Typography>
                <div className="pool-ratio">
                  <Typography sx={{ color: '#33B6FF', fontSize: '20px' }} className="range-hdng">
                    156 %
                  </Typography>
                  <ArrowForwardIosIcon sx={{ color: '#46434F', fontSize: '18px' }} />
                  <Typography sx={{ color: '#33B6FF', fontSize: '20px' }} className="range-hdng">
                    143 %
                  </Typography>
                </div>
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
