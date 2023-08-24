'use client';

import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ChangeEvent, useState } from 'react';
import { useSelectedToken } from '../../../context/SelectedTokenProvider';
import { roundCurrency } from '../../../utils/math';
import InfoButton from '../../Buttons/InfoButton';
import FeatureBox from '../../FeatureBox/FeatureBox';
import Label from '../../Label/Label';

const Swap = () => {
  const [showSlippage, setShowSlippage] = useState(false);
  const [jUSDSwapValue, setJUSDSwapValue] = useState<number>();
  const [tokenSwapValue, setTokenSwapValue] = useState<number>();
  const [tradingDirection, setTradingDirection] = useState<'jUSDSpent' | 'jUSDAquired'>('jUSDSpent');

  const { selectedToken, tokenRatio } = useSelectedToken();

  const toggleMore = () => {
    setShowSlippage(!showSlippage);
  };

  const handleSwapValueChange = (variant: 'JUSD' | 'Token', value: string) => {
    const numericValue = parseInt(value);

    if (!isNaN(numericValue)) {
      if (variant === 'JUSD') {
        setJUSDSwapValue(numericValue);
        setTokenSwapValue(roundCurrency(numericValue * tokenRatio));
        setTradingDirection('jUSDSpent');
      } else {
        setTokenSwapValue(numericValue);
        setJUSDSwapValue(roundCurrency(numericValue / tokenRatio));
        setTradingDirection('jUSDAquired');
      }
    }
  };

  return (
    <FeatureBox title="Swap">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <TextField
          value={jUSDSwapValue}
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

        <TextField
          value={tokenSwapValue}
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

      <div>
        {showSlippage && (
          // TODO: Exchange it with https://mui.com/base-ui/react-number-input/ some wonderful day.
          <TextField
            label="Max. Slippage"
            placeholder="5"
            fullWidth
            InputProps={{
              endAdornment: <InputAdornment position="end">%</InputAdornment>,
            }}
            sx={{ marginTop: '15px' }}
          />
        )}
        <Button variant="contained" onClick={toggleMore} sx={{ marginTop: '15px' }}>
          {showSlippage ? 'Less' : 'More'}
        </Button>
      </div>

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
