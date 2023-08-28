'use client';

import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useSelectedToken } from '../../../context/SelectedTokenProvider';
import InfoButton from '../../Buttons/InfoButton';
import FeatureBox from '../../FeatureBox/FeatureBox';
import NumberInput from '../../FormControls/NumberInput';
import Label from '../../Label/Label';

const Farm = () => {
  const [tabValue, setTabValue] = useState<'Long' | 'Short'>('Long');
  const [showSlippage, setShowSlippage] = useState(false);

  const methods = useForm({
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
    <FeatureBox title="Farm">
      <Tabs value={tabValue} onChange={handleTabChange} aria-label="Shared Data Tabs" className="tabs-style">
        <Tab label="LONG" value="Long" />
        <Tab label="SHORT" value="Short" />
      </Tabs>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="farm-tabs-tab-content">
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

              <Button variant="contained" onClick={() => setShowSlippage(!showSlippage)} sx={{ marginTop: '15px' }}>
                {showSlippage ? 'Less' : 'More'}
              </Button>
            </div>

            <div style={{ padding: '15px 0' }}>
              <Typography variant="body1" className="swap-info-paragraph" marginY={1.25}>
                Position size: <span>45753.3522 jUSD</span>
              </Typography>
              <Typography variant="body2" className="swap-info-paragraph" marginY={1.25}>
                Price per unit: <span>4.0953 jUSD</span>
              </Typography>
              <Typography variant="body2" className="swap-info-paragraph" marginY={1.25}>
                Protocol fee:{' '}
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
              <Typography variant="body2" className="swap-info-paragraph" marginY={1.25}>
                Slippage: <span>0.53 %</span>
              </Typography>
            </div>

            <InfoButton title="EXECUTE" description="The final values will be calculated after the swap." />
          </div>
        </form>
      </FormProvider>
    </FeatureBox>
  );
};

export default Farm;
