'use client';

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
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
          <div className="swap-more-btn">
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

          <div className="swap-info">
            <Typography className="swap-price" variant="body1">
              Position size: <span>45753.3522 jUSD</span>
            </Typography>
            <Typography variant="body2">
              Price per unit: <span>4.0953 jUSD</span>
            </Typography>
            <Typography variant="body2">
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
            <Typography variant="body2">
              Slippage: <span>0.53 %</span>
            </Typography>
          </div>

          <div className="swap-btn">
            <Button variant="outlined">EXECUTE</Button>
            <Typography className="swap-btn-line" variant="subtitle1" sx={{ fontSize: '12px' }}>
              <InfoOutlinedIcon sx={{ fontSize: '15px' }} />
              The final values will be calculated after the swap.
            </Typography>
          </div>
        </div>
      </div>
    </FeatureBox>
  );
};

export default Farm;
