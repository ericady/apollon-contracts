'use client';

import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import Button from '@mui/material/Button';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { SyntheticEvent, useState } from 'react';
import FeatureBox from '../../FeatureBox/FeatureBox';
import Label from '../../Label/Label';
import PageLayout from '../../Layout/PageLayout';
import LiquidityPoolsTable from './LiquidityPoolsTable';

const LiquidityPool = () => {
  const [tabValue, setTabValue] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
  const [selectedPool, setSelectedPool] = useState<string | null>(null);

  const handleChange = (_: SyntheticEvent, newValue: 'DEPOSIT' | 'WITHDRAW') => {
    setTabValue(newValue);
  };

  return (
    <PageLayout>
      <div style={{ display: 'flex' }}>
        <div className="poolwidget-block" style={{ width: '30%' }}>
          <div className="liquidity-block" style={{ border: '1px solid #25222E', borderRadius: '5px 0 0 5px' }}>
            <FeatureBox title="Your Liquidity" noPadding>
              <Tabs value={tabValue} onChange={handleChange} aria-label="Shared Data Tabs" className="tabs-style">
                <Tab label="DEPOSIT" value="DEPOSIT" disableRipple />
                <Tab label="WITHDRAW" value="WITHDRAW" disableRipple />
              </Tabs>

              <div className="pool-input">
                <div>
                  <Label variant="success">ETH</Label>
                  <Typography sx={{ fontWeight: '400', marginTop: '10px' }}>3.14821</Typography>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <TextField placeholder="Value" />
                  <Button variant="undercover">18.1781</Button>
                </div>
              </div>
              <div className="pool-input">
                <div>
                  <Label variant="success">ETH</Label>
                  <Typography sx={{ fontWeight: '400', marginTop: '10px' }}>3.14821</Typography>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <TextField placeholder="Value" />
                  <Button variant="undercover">18.1781</Button>
                </div>
              </div>

              <div className="pool-range-slide">
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
              <div style={{ padding: '20px' }}>
                <Button variant="outlined" sx={{ borderColor: '#fff' }}>
                  UPDATE
                </Button>
              </div>
            </FeatureBox>
          </div>
        </div>

        <div className="table-styles" style={{ width: '70%' }}>
          <LiquidityPoolsTable selectedPool={selectedPool} setSelectedPool={setSelectedPool} />
        </div>
      </div>
    </PageLayout>
  );
};

export default LiquidityPool;
