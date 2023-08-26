'use client';

import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import Typography from '@mui/material/Typography';
import { ChangeEvent, useRef, useState } from 'react';
import { useSelectedToken } from '../../../context/SelectedTokenProvider';
import { roundCurrency } from '../../../utils/math';
import InfoButton from '../../Buttons/InfoButton';
import FeatureBox from '../../FeatureBox/FeatureBox';
import NumberInput from '../../FormControls/NumberInput';
import Label from '../../Label/Label';

const Swap = () => {
  const [showSlippage, setShowSlippage] = useState(false);
  const [tradingDirection, setTradingDirection] = useState<'jUSDSpent' | 'jUSDAquired'>('jUSDSpent');
  const jUSDInputRef = useRef<HTMLInputElement>();
  const tokenInputRef = useRef<HTMLInputElement>();
  const maxSlippageInputRef = useRef<HTMLInputElement>();

  const { selectedToken, tokenRatio } = useSelectedToken();

  const handleSwapValueChange = (variant: 'JUSD' | 'Token', value: string) => {
    const numericValue = parseFloat(value);

    if (variant === 'JUSD') {
      if (!isNaN(numericValue)) {
        tokenInputRef.current!.value = roundCurrency(numericValue / tokenRatio).toString();
        setTradingDirection('jUSDSpent');
      } else {
        tokenInputRef.current!.value = '';
      }
    } else {
      if (!isNaN(numericValue)) {
        jUSDInputRef.current!.value = roundCurrency(numericValue / tokenRatio).toString();
        setTradingDirection('jUSDAquired');
      } else {
        jUSDInputRef.current!.value = '';
      }
    }
  };

  return (
    <FeatureBox title="Swap">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* TODO: Add Validation that not more than the wallet amount can be entered. */}
        <NumberInput
          ref={jUSDInputRef}
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
          ref={tokenInputRef}
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
          ref={maxSlippageInputRef}
          label="Max. Slippage"
          placeholder="5"
          fullWidth
          InputProps={{
            endAdornment: <InputAdornment position="end">%</InputAdornment>,
          }}
          sx={{ marginTop: '15px' }}
        />
      )}

      <Button variant="contained" onClick={() => setShowSlippage(!showSlippage)} sx={{ marginTop: '15px' }}>
        {showSlippage ? 'Less' : 'More'}
      </Button>

      <div style={{ padding: '15px 0' }}>
        <Typography variant="body1" className="swap-info-paragraph" marginY={1.25}>
          Price per unit: <span>2.2 jUSD</span>
        </Typography>
        <Typography variant="body2" className="swap-info-paragraph" marginY={1.25}>
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
        <Typography variant="body2" className="swap-info-paragraph" marginY={1.25}>
          Resulting pool slippage: <span>2 %</span>
        </Typography>
      </div>

      <InfoButton title="SWAP" description="The final values will be calculated after the swap." />
    </FeatureBox>
  );
};

export default Swap;
