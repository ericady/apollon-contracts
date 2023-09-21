'use client';

import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { Box } from '@mui/material';
import Button from '@mui/material/Button';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { SyntheticEvent, useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useEthers } from '../../../context/EthersProvider';
import { GetBorrowerLiquidityPoolsQuery } from '../../../generated/gql-types';
import { displayPercentage, roundCurrency } from '../../../utils/math';
import FeatureBox from '../../FeatureBox/FeatureBox';
import NumberInput from '../../FormControls/NumberInput';
import Label from '../../Label/Label';
import CollateralRatioVisualization from '../../Visualizations/CollateralRatioVisualization';

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

  const { address } = useEthers();

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
      <Tabs value={tabValue} onChange={handleChange} variant="fullWidth" sx={{ mt: 2 }}>
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
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '20px',
                  gap: '50px',
                  borderBottom: '1px solid',
                  borderColor: 'background.paper',
                }}
              >
                <div style={{ marginTop: 6 }}>
                  <Label variant="success">{tokenA.token.symbol}</Label>

                  <Typography
                    sx={{ fontWeight: '400', marginTop: '10px' }}
                    data-testid="apollon-liquidity-pool-deposit-token-a-funds-label"
                  >
                    {roundCurrency(tokenA.borrowerAmount ?? 0, 5)}
                  </Typography>
                  <Typography variant="label">Deposited</Typography>
                </div>

                <NumberInput
                  name="tokenAAmount"
                  data-testid="apollon-liquidity-pool-deposit-token-a-amount"
                  placeholder="Value"
                  fullWidth
                  rules={{
                    min: { value: 0, message: 'You can only invest positive amounts.' },
                    //   TODO: Each stock token must be implemented with etherjs.
                    max: undefined,
                  }}
                />

                {/* TODO: Each stock token must be implemented with etherjs. Cant show a prefill button here */}
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '20px',
                  gap: '50px',
                  borderBottom: '1px solid',
                  borderColor: 'background.paper',
                }}
              >
                <div style={{ marginTop: 6 }}>
                  <Label variant="success">{tokenB.token.symbol}</Label>

                  <Typography
                    sx={{ fontWeight: '400', marginTop: '10px' }}
                    data-testid="apollon-liquidity-pool-deposit-token-b-funds-label"
                  >
                    {roundCurrency(tokenB.borrowerAmount ?? 0, 5)}
                  </Typography>
                  <Typography variant="label">Deposited</Typography>
                </div>

                <NumberInput
                  name="tokenBAmount"
                  data-testid="apollon-liquidity-pool-deposit-token-b-amount"
                  placeholder="Value"
                  fullWidth
                  rules={{
                    min: { value: 0, message: 'You can only invest positive amounts.' },
                    //   TODO: Each stock token must be implemented with etherjs.
                    max: undefined,
                  }}
                />

                {/* TODO: Each stock token must be implemented with etherjs. Cant show a prefill button here */}
              </Box>
            </>
          )}

          {/* WITHDRAW */}

          {tabValue === 'WITHDRAW' && tokenA.borrowerAmount && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 20 }}>
              <div style={{ marginTop: 6 }}>
                <Label variant="success">{tokenA.token.symbol}</Label>
              </div>
              {/* TODO: Each stock token must be implemented with etherjs. Cant show a label here */}

              <div>
                <NumberInput
                  name="tokenAAmount"
                  data-testid="apollon-liquidity-pool-withdraw-token-a-amount"
                  placeholder="Value"
                  fullWidth
                  rules={{
                    min: { value: 0, message: 'You can only invest positive amounts.' },
                    max: {
                      value: tokenA.borrowerAmount!,
                      message: 'This amount is greater than your deposited amount.',
                    },
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <Typography variant="caption" data-testid="apollon-liquidity-pool-withdraw-token-a-funds-label">
                      {roundCurrency(tokenA.borrowerAmount!, 5)}
                    </Typography>
                    <br />
                    <Typography variant="label">Deposited</Typography>
                  </div>
                  <Button
                    variant="undercover"
                    sx={{ textDecoration: 'underline', p: 0, mt: 0.25, height: 25 }}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 20 }}>
              <div style={{ marginTop: 6 }}>
                <Label variant="success">{tokenB.token.symbol}</Label>
              </div>
              {/* TODO: Each stock token must be implemented with etherjs. Cant show a label here */}

              <div>
                <NumberInput
                  name="tokenBAmount"
                  data-testid="apollon-liquidity-pool-withdraw-token-b-amount"
                  placeholder="Value"
                  fullWidth
                  rules={{
                    min: { value: 0, message: 'You can only invest positive amounts.' },
                    max: {
                      value: tokenB.borrowerAmount!,
                      message: 'This amount is greater than your deposited amount.',
                    },
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <Typography variant="caption" data-testid="apollon-liquidity-pool-withdraw-token-b-funds-label">
                      {roundCurrency(tokenB.borrowerAmount!, 5)}
                    </Typography>
                    <br />
                    <Typography variant="label">Deposited</Typography>
                  </div>
                  <Button
                    variant="undercover"
                    sx={{ textDecoration: 'underline', p: 0, mt: 0.25, height: 25 }}
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
              padding: '20px',
              borderBottom: '1px solid',
              borderBottomColor: 'background.paper',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Typography
                  sx={{ fontFamily: 'Space Grotesk Variable', color: 'info.main', fontWeight: '700', fontSize: '20px' }}
                >
                  {displayPercentage(1.74, 'default', 0)}
                </Typography>
                <ArrowForwardIosIcon sx={{ color: '#46434F', fontSize: '18px' }} />
                <Typography
                  sx={{ fontFamily: 'Space Grotesk Variable', color: 'info.main', fontWeight: '700', fontSize: '20px' }}
                >
                  {displayPercentage(1.43, 'default', 0)}
                </Typography>
              </div>
            </Box>
            <CollateralRatioVisualization criticalRatio={1.1} newRatio={1.43} oldRatio={1.74} loading={!address} />
          </Box>

          <div style={{ padding: '20px' }}>
            <Button type="submit" variant="outlined" sx={{ borderColor: 'primary.contrastText' }} disabled={!address}>
              Update
            </Button>
          </div>
        </form>
      </FormProvider>
    </FeatureBox>
  );
}

export default LiquidityDepositWithdraw;
