'use client';

import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { Box } from '@mui/material';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useSelectedToken } from '../../../context/SelectedTokenProvider';
import { displayPercentage } from '../../../utils/math';
import InfoButton from '../../Buttons/InfoButton';
import CollateralRatio from '../../CollateralRatio/CollateralRatio';
import FeatureBox from '../../FeatureBox/FeatureBox';
import NumberInput from '../../FormControls/NumberInput';
import Label from '../../Label/Label';

type FieldValues = {
  farmShortValue: string;
  maxSlippage: string;
};

const Farm = () => {
  const [tabValue, setTabValue] = useState<'Long' | 'Short'>('Long');
  const [showSlippage, setShowSlippage] = useState(false);

  const methods = useForm<FieldValues>({
    defaultValues: {
      farmShortValue: '',
      maxSlippage: '',
    },
    shouldUnregister: true,
  });
  const { handleSubmit, setValue } = methods;

  const { selectedToken } = useSelectedToken();

  const handleTabChange = (_: React.SyntheticEvent, newValue: 'Long' | 'Short') => {
    setTabValue(newValue);
    setValue('farmShortValue', '');
  };

  const onSubmit = () => {
    console.log('onSubmit called');
    // TODO: Implement contract call
  };

  return (
    <FeatureBox title="Farm" border="bottom">
      <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth" sx={{ mx: '-15px' }}>
        <Tab label="LONG" value="Long" />
        <Tab label="SHORT" value="Short" />
      </Tabs>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ marginTop: '20px' }}>
            <div>
              <NumberInput
                name="farmShortValue"
                rules={{
                  required: { value: true, message: 'You need to specify an amount.' },
                  min: { value: 0, message: 'Amount needs to be positive' },
                }}
                disabled={!selectedToken}
                fullWidth
                InputProps={{
                  endAdornment: selectedToken && (
                    <InputAdornment position="end">
                      <Label variant="none">{selectedToken.symbol}</Label>
                    </InputAdornment>
                  ),
                }}
              />

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
            </div>

            <div style={{ padding: '10px 0' }}>
              <Typography variant="titleAlternate" color="primary.contrastText" className="swap-info-paragraph">
                Position size: <span>45753.3522 jUSD</span>
              </Typography>
              <Typography variant="caption" className="swap-info-paragraph">
                Price per unit: <span>4.0953 jUSD</span>
              </Typography>
              <Typography variant="caption" className="swap-info-paragraph">
                Protocol fee:
                <span>
                  0.2% |
                  {/* <Divider
                    orientation="vertical"
                    sx={{
                      margin: '0 5px',
                      border: '1px solid #282531',
                      height: '15px',
                    }}
                  /> */}{' '}
                  423 jUSD
                </span>
              </Typography>
              <Typography variant="caption" className="swap-info-paragraph">
                Slippage: <span>0.53 %</span>
              </Typography>
            </div>

            <InfoButton title="EXECUTE" description="The final values will be calculated after the swap." />
          </div>
        </form>
      </FormProvider>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '20px',
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

      <CollateralRatio criticalRatio={1.1} newRatio={1.43} oldRatio={1.56} />
    </FeatureBox>
  );
};

export default Farm;
