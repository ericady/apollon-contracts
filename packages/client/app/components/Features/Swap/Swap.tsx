'use client';

import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import Typography from '@mui/material/Typography';
import { ChangeEvent, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useSelectedToken } from '../../../context/SelectedTokenProvider';
import { roundCurrency } from '../../../utils/math';
import InfoButton from '../../Buttons/InfoButton';
import FeatureBox from '../../FeatureBox/FeatureBox';
import NumberInput from '../../FormControls/NumberInput';
import Label from '../../Label/Label';

type FieldValues = {
  jUSDAmount: string;
  tokenAmount: string;
  maxSlippage: string;
};

const Swap = () => {
  const [showSlippage, setShowSlippage] = useState(false);
  const [tradingDirection, setTradingDirection] = useState<'jUSDSpent' | 'jUSDAquired'>('jUSDSpent');

  const methods = useForm<FieldValues>({
    defaultValues: {
      jUSDAmount: '',
      tokenAmount: '',
      maxSlippage: '',
    },
    shouldUnregister: true,
  });
  const { handleSubmit, setValue } = methods;

  const { selectedToken, tokenRatio } = useSelectedToken();

  const handleSwapValueChange = (variant: 'JUSD' | 'Token', value: string) => {
    const numericValue = parseFloat(value);

    if (variant === 'JUSD') {
      if (!isNaN(numericValue)) {
        setValue('tokenAmount', roundCurrency(numericValue / tokenRatio).toString());
        setTradingDirection('jUSDSpent');
      } else {
        setValue('tokenAmount', '');
      }

      setValue('jUSDAmount', value);
    } else {
      if (!isNaN(numericValue)) {
        setValue('jUSDAmount', roundCurrency(numericValue / tokenRatio).toString());
        setTradingDirection('jUSDAquired');
      } else {
        setValue('jUSDAmount', '');
      }

      setValue('tokenAmount', value);
    }
  };

  const onSubmit = () => {
    console.log('onSubmit called');
    // TODO: Implement contract call
  };

  return (
    <FeatureBox title="Swap" border="bottom">
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* TODO: Add Validation that not more than the wallet amount can be entered. */}
            <NumberInput
              name="jUSDAmount"
              rules={{
                required: { value: true, message: 'You need to specify an amount.' },
                min: { value: 0, message: 'Amount needs to be positive' },
              }}
              disabled={!selectedToken}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                handleSwapValueChange('JUSD', e.target.value);
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Label variant="none">jUSD</Label>
                  </InputAdornment>
                ),
              }}
            />

            <img
              src="assets/svgs/Exchange.svg"
              alt="Arrow indicating trading direction"
              height="16"
              typeof="image/svg+xml"
              style={{
                transform: tradingDirection === 'jUSDAquired' ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />

            <NumberInput
              name="tokenAmount"
              rules={{
                required: { value: true, message: 'You need to specify an amount.' },
                min: { value: 0, message: 'Amount needs to be positive' },
              }}
              disabled={!selectedToken}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                handleSwapValueChange('Token', e.target.value);
              }}
              InputProps={{
                endAdornment: selectedToken && (
                  <InputAdornment position="end">
                    <Label variant="none">{selectedToken.symbol}</Label>
                  </InputAdornment>
                ),
              }}
            />
          </div>

          {showSlippage && (
            <NumberInput
              name="maxSlippage"
              rules={{
                min: { value: 0, message: 'Amount needs to be positive' },
              }}
              label="Max. Slippage"
              placeholder="5"
              fullWidth
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              sx={{ marginTop: '15px' }}
            />
          )}

          <Button variant="contained" onClick={() => setShowSlippage(!showSlippage)} sx={{ marginTop: '10px' }}>
            {showSlippage ? 'Less' : 'More'}
          </Button>

          <div style={{ padding: '10px 0' }}>
            <Typography variant="titleAlternate" color="primary.contrastText" className="swap-info-paragraph">
              Price per unit: <span>2.2 jUSD</span>
            </Typography>
            <Typography variant="caption" className="swap-info-paragraph">
              Protocol swap fee:
              <span>
                0.09% {/* TODO: issue with next */}
                {/* <Divider
              orientation="vertical"
              sx={{
                margin: '0 5px',
                border: '1px solid #282531',
                height: '15px',
              }}
            /> */}
                | 0.0022 jUSD
              </span>
            </Typography>
            <Typography variant="caption" className="swap-info-paragraph">
              Resulting pool slippage: <span>2 %</span>
            </Typography>
          </div>

          <InfoButton title="SWAP" description="The final values will be calculated after the swap." />
        </form>
      </FormProvider>
    </FeatureBox>
  );
};

export default Swap;
