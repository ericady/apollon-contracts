'use client';

import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import InfoButton from '../../Buttons/InfoButton';
import FeatureBox from '../../FeatureBox/FeatureBox';

const Farm = () => {
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <FeatureBox title="Farm">
      <div className="farm-tabs">
        <Tabs value={value} onChange={handleChange} aria-label="Shared Data Tabs" className="farm-tabs-heading">
          <Tab label="LONG" />
          <Tab label="SHORT" />
        </Tabs>

        <div className="tab-content">
          <div>
            <TextField
              placeholder="3,360"
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Typography variant="h6">AAPL</Typography>
                  </InputAdornment>
                ),
              }}
            />
            <Button variant="contained" sx={{ marginTop: '15px' }}>
              More
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
      </div>
    </FeatureBox>
  );
};

export default Farm;
