'use client';

import { Skeleton } from '@mui/material';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import Typography from '@mui/material/Typography';
import { ChangeEvent, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useEthers } from '../../../context/EthersProvider';
import { useSelectedToken } from '../../../context/SelectedTokenProvider';
import { displayPercentage, roundCurrency, roundNumber } from '../../../utils/math';
import InfoButton from '../../Buttons/InfoButton';
import FeatureBox from '../../FeatureBox/FeatureBox';
import NumberInput from '../../FormControls/NumberInput';
import Label from '../../Label/Label';

export const PROTOCOL_SWAP_FEE = 0.0009;
export const RESULTING_POOL_SLIPPAGE = 0.02;

type FieldValues = {
  jUSDAmount: string;
  tokenAmount: string;
  maxSlippage: string;
};

const Swap = () => {
  const [showSlippage, setShowSlippage] = useState(false);
  const [tradingDirection, setTradingDirection] = useState<'jUSDSpent' | 'jUSDAquired'>('jUSDSpent');

  const { address } = useEthers();

  const methods = useForm<FieldValues>({
    defaultValues: {
      jUSDAmount: '',
      tokenAmount: '',
      maxSlippage: '',
    },
    shouldUnregister: true,
  });
  const { handleSubmit, setValue, watch } = methods;

  const { selectedToken, tokenRatio } = useSelectedToken();

  const handleSwapValueChange = (variant: 'JUSD' | 'Token', value: string) => {
    const numericValue = parseFloat(value);

    if (variant === 'JUSD') {
      if (!isNaN(numericValue)) {
        setValue('tokenAmount', roundNumber(numericValue / tokenRatio).toString());
        setTradingDirection('jUSDSpent');
      } else {
        setValue('tokenAmount', '');
      }

      setValue('jUSDAmount', value);
    } else {
      if (!isNaN(numericValue)) {
        setValue('jUSDAmount', roundNumber(numericValue / tokenRatio).toString());
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

  const jUSDSwapAmount = parseInt(watch('jUSDAmount'));

  return (
    <FeatureBox
      title="Swap"
      border="bottom"
      isDraggable={{ y: '1', gsHeight: '32', gsWidth: '1', id: 'apollon-swap-widget' }}
    >
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
              height="21"
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
              Price per unit:
              {selectedToken ? <span>{roundCurrency(tokenRatio)} jUSD</span> : <Skeleton width="120px" />}
            </Typography>
            <Typography variant="caption" className="swap-info-paragraph">
              Protocol swap fee:
              {selectedToken ? (
                <span>
                  {displayPercentage(PROTOCOL_SWAP_FEE)} {/* TODO: issue with next */}
                  {/* <Divider
              orientation="vertical"
              sx={{
                margin: '0 5px',
                border: '1px solid #282531',
                height: '15px',
              }}
            /> */}
                  | {!isNaN(jUSDSwapAmount) ? `${roundCurrency(jUSDSwapAmount * PROTOCOL_SWAP_FEE)} jUSD` : '-'}
                </span>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: 120 }}>
                  <Skeleton width="55px" />
                  |
                  <Skeleton width="55px" />
                </div>
              )}
            </Typography>
            <Typography variant="caption" className="swap-info-paragraph">
              Resulting pool slippage:
              {selectedToken ? <span>{displayPercentage(RESULTING_POOL_SLIPPAGE)}</span> : <Skeleton width="120px" />}
            </Typography>
          </div>

          <InfoButton
            title="SWAP"
            description="The final values will be calculated after the swap."
            disabled={!address}
          />
        </form>
      </FormProvider>
    </FeatureBox>
  );
};

export default Swap;
