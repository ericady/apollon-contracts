'use client';

import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { Box } from '@mui/material';
import Button from '@mui/material/Button';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { SyntheticEvent, useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { GetBorrowerLiquidityPoolsQuery } from '../../../generated/gql-types';
import { roundCurrency } from '../../../utils/math';
import FeatureBox from '../../FeatureBox/FeatureBox';
import NumberInput from '../../FormControls/NumberInput';
import Label from '../../Label/Label';

type Props = {
  selectedPool: GetBorrowerLiquidityPoolsQuery['getPools'][number];
};

type FieldValues = {
  tokenAAmount: string;
  tokenBAmount: string;
};

function LiquidityDepositWithdraw({ selectedPool }: Props) {
  const { liquidity } = selectedPool;
  const [tokenA, tokenB] = liquidity;

  const [tabValue, setTabValue] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');

  const handleChange = (_: SyntheticEvent, newValue: 'DEPOSIT' | 'WITHDRAW') => {
    setTabValue(newValue);
    reset();
  };

  const methods = useForm<FieldValues>({
    defaultValues: {
      tokenAAmount: '',
      tokenBAmount: '',
    },
  });
  const { handleSubmit, setValue, reset } = methods;

  const onSubmit = () => {
    console.log('onSubmit called');
    // TODO: Implement contract call
  };

  useEffect(() => {
    if (!tokenA.borrowerAmount && !tokenB.borrowerAmount) {
      setTabValue('DEPOSIT');
    }

    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPool]);

  return (
    <FeatureBox title="Your Liquidity" noPadding headBorder="bottom" border="full">
      <Tabs value={tabValue} onChange={handleChange} variant="fullWidth">
        <Tab label="DEPOSIT" value="DEPOSIT" disableRipple />
        <Tab
          label="WITHDRAW"
          value="WITHDRAW"
          disableRipple
          disabled={!tokenA.borrowerAmount && !tokenB.borrowerAmount}
        />
      </Tabs>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* DEPOSIT */}

          {tabValue === 'DEPOSIT' && (
            <>
              <div className="pool-input">
                <div>
                  <Label variant="success">{tokenA.token.symbol}</Label>
                  {tokenA.borrowerAmount && (
                    <>
                      <Typography sx={{ fontWeight: '400', marginTop: '10px' }}>
                        {roundCurrency(tokenA.borrowerAmount, 5)}
                      </Typography>
                      <Typography variant="label">Deposit</Typography>
                    </>
                  )}
                </div>
                <div>
                  <NumberInput
                    name="tokenAAmount"
                    placeholder="Value"
                    fullWidth
                    rules={{
                      min: { value: 0, message: 'You can only invest positive amounts.' },
                      //   TODO: Each stock token must be implemented with etherjs.
                      max: undefined,
                    }}
                  />

                  {/* TODO: Each stock token must be implemented with etherjs. Cant show a prefill button here */}
                </div>
              </div>

              <div className="pool-input">
                <div>
                  <Label variant="success">{tokenB.token.symbol}</Label>
                  {tokenB.borrowerAmount && (
                    <>
                      <Typography sx={{ fontWeight: '400', marginTop: '10px' }}>
                        {roundCurrency(tokenB.borrowerAmount, 5)}
                      </Typography>
                      <Typography variant="label">Deposit</Typography>
                    </>
                  )}
                </div>
                <div>
                  <NumberInput
                    name="tokenBAmount"
                    placeholder="Value"
                    fullWidth
                    rules={{
                      min: { value: 0, message: 'You can only invest positive amounts.' },
                      //   TODO: Each stock token must be implemented with etherjs.
                      max: undefined,
                    }}
                  />

                  {/* TODO: Each stock token must be implemented with etherjs. Cant show a prefill button here */}
                </div>
              </div>
            </>
          )}

          {/* WITHDRAW */}

          {tabValue === 'WITHDRAW' && tokenA.borrowerAmount && (
            <div className="pool-input">
              <Label variant="success">{tokenA.token.symbol}</Label>
              {/* TODO: Each stock token must be implemented with etherjs. Cant show a label here */}

              <div>
                <NumberInput
                  name="tokenAAmount"
                  placeholder="Value"
                  fullWidth
                  rules={{
                    min: { value: 0, message: 'You can only invest positive amounts.' },
                    max: {
                      value: tokenA.borrowerAmount!,
                      message: 'This amount is greater than your deposited amount',
                    },
                  }}
                />
                <div className="flex" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <Typography variant="caption">{roundCurrency(tokenA.borrowerAmount!, 5)}</Typography>
                    <Typography variant="label">Deposit</Typography>
                  </div>
                  <Button
                    variant="undercover"
                    sx={{ textDecoration: 'underline' }}
                    onClick={() =>
                      setValue('tokenAAmount', tokenA.borrowerAmount!.toString(), { shouldValidate: true })
                    }
                  >
                    max
                  </Button>
                </div>
              </div>
            </div>
          )}

          {tabValue === 'WITHDRAW' && tokenB.borrowerAmount && (
            <div className="pool-input">
              <Label variant="success">{tokenB.token.symbol}</Label>
              {/* TODO: Each stock token must be implemented with etherjs. Cant show a label here */}

              <div>
                <NumberInput
                  name="tokenBAmount"
                  placeholder="Value"
                  fullWidth
                  rules={{
                    min: { value: 0, message: 'You can only invest positive amounts.' },
                    max: {
                      value: tokenB.borrowerAmount!,
                      message: 'This amount is greater than your deposited amount',
                    },
                  }}
                />

                <div className="flex" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <Typography variant="caption">{roundCurrency(tokenB.borrowerAmount!, 5)}</Typography>
                    <Typography variant="label">Deposit</Typography>
                  </div>
                  <Button
                    variant="undercover"
                    sx={{ textDecoration: 'underline' }}
                    onClick={() =>
                      setValue('tokenBAmount', tokenB.borrowerAmount!.toString(), { shouldValidate: true })
                    }
                  >
                    max
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              borderBottom: '1px solid',
              borderBottomColor: 'background.paper',
            }}
          >
            <Typography variant="titleAlternate">Collateral Ratio</Typography>
            <div className="flex">
              <Typography
                sx={{ fontFamily: 'Space Grotesk Variable', color: 'info.main', fontWeight: '700', fontSize: '20px' }}
              >
                174 %
              </Typography>
              <ArrowForwardIosIcon sx={{ color: '#46434F', fontSize: '18px' }} />
              <Typography
                sx={{ fontFamily: 'Space Grotesk Variable', color: 'info.main', fontWeight: '700', fontSize: '20px' }}
              >
                143 %
              </Typography>
            </div>
          </Box>
          <div style={{ padding: '20px' }}>
            <Button type="submit" variant="outlined" sx={{ borderColor: '#fff' }}>
              UPDATE
            </Button>
          </div>
        </form>
      </FormProvider>
    </FeatureBox>
  );
}

export default LiquidityDepositWithdraw;