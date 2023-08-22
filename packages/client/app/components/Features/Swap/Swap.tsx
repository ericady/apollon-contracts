'use client';

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import FeatureBox from '../../FeatureBox/FeatureBox';

const Swap = () => {
  const [showMore, setShowMore] = useState(false);

  const toggleMore = () => {
    setShowMore(!showMore);
  };

  return (
    <FeatureBox title="Swap">
      <div className="currency-swap">
        <TextField
          placeholder="3333"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Typography variant="h6">jUSD</Typography>
              </InputAdornment>
            ),
          }}
        />
        <SwapHorizIcon />
        <TextField
          placeholder="9999"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Typography variant="h6">AAPL</Typography>
              </InputAdornment>
            ),
          }}
        />
      </div>

      <div className="swap-more-btn">
        {showMore && (
          <TextField
            placeholder="Max. Slippage"
            className="more-feild"
            fullWidth
            InputProps={{
              endAdornment: <InputAdornment position="end">5 %</InputAdornment>,
            }}
            sx={{ marginTop: '15px' }}
          />
        )}
        <Button variant="contained" onClick={toggleMore} sx={{ marginTop: '15px' }}>
          {showMore ? 'Less' : 'More'}
        </Button>
      </div>

      <div className="swap-info">
        <Typography className="swap-price" variant="body1">
          Price per unit: <span>2.2 jUSD</span>
        </Typography>
        <Typography variant="body2">
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
        <Typography variant="body2">
          Resulting pool slippage: <span>2 %</span>
        </Typography>
      </div>

      <div className="swap-btn">
        <Button variant="outlined">SWAP</Button>
        <Typography className="swap-btn-line" variant="subtitle1" sx={{ fontSize: '12px' }}>
          <InfoOutlinedIcon sx={{ fontSize: '15px' }} />
          The final values will be calculated after the swap.
        </Typography>
      </div>
    </FeatureBox>
  );
};

export default Swap;
