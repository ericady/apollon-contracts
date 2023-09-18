'use client';

import { useQuery } from '@apollo/client';
import CloseIcon from '@mui/icons-material/Close';
import { Box, Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from '@mui/material';
import Button from '@mui/material/Button';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { SyntheticEvent, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useEthers } from '../../../context/EthersProvider';
import { GetBorrowerDebtTokensQuery, GetBorrowerDebtTokensQueryVariables } from '../../../generated/gql-types';
import { GET_BORROWER_DEBT_TOKENS } from '../../../queries';
import { roundCurrency } from '../../../utils/math';
import NumberInput from '../../FormControls/NumberInput';
import Label from '../../Label/Label';

type FieldValues = Record<string, string>;

const StabilityUpdateDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [tabValue, setTabValue] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');

  const { address } = useEthers();

  const { data } = useQuery<GetBorrowerDebtTokensQuery, GetBorrowerDebtTokensQueryVariables>(GET_BORROWER_DEBT_TOKENS, {
    variables: {
      borrower: address,
    },
  });

  const methods = useForm<FieldValues>();
  const { handleSubmit, setValue, reset } = methods;

  const handleChange = (_: SyntheticEvent, newValue: 'DEPOSIT' | 'WITHDRAW') => {
    setTabValue(newValue);
    const emptyValues = data?.getDebtTokens.reduce((acc, { token }) => ({ ...acc, [token.address]: '' }), {});
    reset(emptyValues);
  };

  const fillMaxInputValue = (tokenAddress: string, walletAmount: number, stabilityCompoundAmount: number) => {
    if (tabValue === 'DEPOSIT') {
      setValue(tokenAddress, walletAmount.toString(), { shouldValidate: true });
    } else {
      setValue(tokenAddress, stabilityCompoundAmount.toString(), { shouldValidate: true });
    }
  };

  const onSubmit = () => {
    console.log('onSubmit called');
    // TODO: Implement contract call
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outlined">
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="assets/svgs/Star24_white.svg"
              alt="White colored diamond shape"
              height="11"
              typeof="image/svg+xml"
            />
            <Typography variant="h6" display="inline-block">
              STABILITY UPDATE
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
                <Tab label="WITHDRAW" value="WITHDRAW" disabled={!address} />
              </Tabs>

              <div style={{ overflowY: 'scroll', maxHeight: '60vh' }}>
                {data?.getDebtTokens.map(({ token, walletAmount = 0, stabilityCompoundAmount = 0 }, index) => (
                  <Box
                    key={token.address}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '20px',
                      height: '114px',
                      borderBottom: index === data.getDebtTokens.length - 1 ? 'none' : '1px solid',
                      borderColor: 'background.paper',
                    }}
                  >
                    {tabValue === 'DEPOSIT' && (
                      <div style={{ marginTop: 6 }}>
                        <Label variant="success">{token.symbol}</Label>
                        <Typography sx={{ fontWeight: '400', marginTop: '10px' }}>
                          {roundCurrency(stabilityCompoundAmount!, 5)}
                        </Typography>
                        <Typography
                          sx={{
                            color: '#3C3945',
                            fontFamily: 'Space Grotesk Variable',
                            fontSize: '9px',
                            fontWeight: '700',
                            lineHeight: '11px',
                            letterSpacing: '0em',
                          }}
                        >
                          Deposited
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
                        defaultValue=""
                        placeholder="Value"
                        fullWidth
                        rules={{
                          min: { value: 0, message: 'You can only invest positive amounts.' },
                          max:
                            tabValue === 'DEPOSIT'
                              ? { value: walletAmount!, message: 'Your wallet does not contain the specified amount' }
                              : {
                                  value: stabilityCompoundAmount!,
                                  message: 'Your deposited stability does not contain the specified amount',
                                },
                        }}
                      />

                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          {tabValue === 'DEPOSIT' && (
                            <>
                              <Typography variant="caption">{roundCurrency(walletAmount!, 5)}</Typography>
                              <Typography
                                sx={{
                                  color: '#3C3945',
                                  fontFamily: 'Space Grotesk Variable',
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
                              <Typography variant="caption">{roundCurrency(stabilityCompoundAmount!, 5)}</Typography>
                              <Typography
                                sx={{
                                  color: '#3C3945',
                                  fontFamily: 'Space Grotesk Variable',
                                  fontSize: '9px',
                                  fontWeight: '700',
                                  lineHeight: '11px',
                                  letterSpacing: '0em',
                                }}
                              >
                                Deposited
                              </Typography>
                            </>
                          )}
                        </div>

                        <Button
                          variant="undercover"
                          sx={{ textDecoration: 'underline', p: 0, mt: 0.25, height: 25 }}
                          onClick={() => fillMaxInputValue(token.address, walletAmount!, stabilityCompoundAmount!)}
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
              <Button type="submit" variant="outlined" sx={{ borderColor: 'primary.contrastText' }} disabled={!address}>
                Update
              </Button>
            </DialogActions>
          </form>
        </FormProvider>
      </Dialog>
    </>
  );
};

export default StabilityUpdateDialog;
