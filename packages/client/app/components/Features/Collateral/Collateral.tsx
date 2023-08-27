'use client';

import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CloseIcon from '@mui/icons-material/Close';
import Square from '@mui/icons-material/Square';
import { Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from '@mui/material';
import Button from '@mui/material/Button';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { SyntheticEvent, useState } from 'react';
import Label from '../../Label/Label';

const Collateral = () => {
  const [tabValue, setTabValue] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');

  const handleChange = (_: SyntheticEvent, newValue: 'DEPOSIT' | 'WITHDRAW') => {
    setTabValue(newValue);
  };

  return (
    <Dialog open fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'background.default',
          border: '1px solid',
          borderColor: 'background.paper',
          borderBottom: 'none',
        }}
      >
        <div>
          <Square
            sx={{
              color: '#504D59',
              fontSize: '12px',
              marginRight: '15px',
            }}
          />
          <Typography variant="h6" display="inline-block">
            COLLATERAL UPDATE
          </Typography>
        </div>
        <IconButton>
          <CloseIcon
            sx={{
              color: '#64616D',
            }}
          />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{
          p: 0,
          backgroundColor: 'background.default',
          border: '1px solid',
          borderColor: 'background.paper',
          borderBottom: 'none',
        }}
      >
        <Tabs value={tabValue} onChange={handleChange} className="tabs-style">
          <Tab label="DEPOSIT" value="DEPOSIT" />
          <Tab label="WITHDRAW" value="WITHDRAW" />
        </Tabs>

        <div className="pool-input">
          <div>
            <Label variant="success">ETH</Label>
            <Typography sx={{ fontWeight: '400', marginTop: '10px' }}>3.60251</Typography>
          </div>
          <div>
            <TextField placeholder="Value" fullWidth />
            <div className="flex" style={{ justifyContent: 'space-between' }}>
              <Button variant="undercover">18.6345</Button>
              <Button variant="undercover" sx={{ textDecoration: 'underline' }}>
                max
              </Button>
            </div>
          </div>
        </div>
        <div className="pool-input">
          <div>
            <Label variant="success">USDT</Label>
            <Typography sx={{ fontWeight: '400', marginTop: '10px' }}>3.30601</Typography>
          </div>
          <div>
            <TextField placeholder="Value" fullWidth />
            <div className="flex" style={{ justifyContent: 'space-between' }}>
              <Button variant="undercover">18.3050</Button>
              <Button variant="undercover" sx={{ textDecoration: 'underline' }}>
                max
              </Button>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px' }}>
          <Typography sx={{ color: '#827F8B', fontSize: '16px' }} className="range-hdng">
            Collateral Ratio
          </Typography>
          <div className="pool-ratio">
            <Typography sx={{ color: '#33B6FF', fontSize: '20px' }} className="range-hdng">
              156 %
            </Typography>
            <ArrowForwardIosIcon sx={{ color: '#46434F', fontSize: '18px' }} />
            <Typography sx={{ color: '#33B6FF', fontSize: '20px' }} className="range-hdng">
              143 %
            </Typography>
          </div>
        </div>
      </DialogContent>
      <DialogActions
        sx={{
          border: '1px solid',
          borderColor: 'background.paper',
          backgroundColor: 'background.default',
          p: '30px 20px',
        }}
      >
        <Button variant="outlined" sx={{ borderColor: '#fff' }}>
          Update
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default Collateral;
