'use client';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { SyntheticEvent, useState } from 'react';
import Label from '../../Label/Label';
import CollateralTable from '../Collateral/CollateralTable';
import BalanceTable from './BalanceTable';
import HistoryTable from './HistoryTable';
import PositionsTable from './PositionsTable';

const Positions = () => {
  const [tabValue, setTabValue] = useState<'BALANCE' | 'COLLATERAL' | 'POSITIONS' | 'HISTORY'>('BALANCE');

  const handleChange = (_: SyntheticEvent, newValue: 'BALANCE' | 'COLLATERAL' | 'POSITIONS' | 'HISTORY') => {
    setTabValue(newValue);
  };

  const renderTableContent = () => {
    switch (tabValue) {
      case 'BALANCE':
        return <BalanceTable />;
      case 'COLLATERAL':
        return <CollateralTable />;
      case 'POSITIONS':
        return <PositionsTable />;
      case 'HISTORY':
        return <HistoryTable />;

      default:
        const _: never = tabValue;
    }
  };

  return (
    <>
      <div className="tabs-sheet">
        <Tabs value={tabValue} onChange={handleChange} className="tabs-style">
          <Tab label="BALANCE" value="BALANCE" disableRipple />
          <Tab label="COLLATERAL" value="COLLATERAL" disableRipple />
          <Tab
            value="POSITIONS"
            label={
              <span>
                POSITIONS <Label variant="none">2</Label>
              </span>
            }
            disableRipple
          />
          <Tab
            value="HISTORY"
            label={
              <span>
                HISTORY <Label variant="none">48</Label>
              </span>
            }
            disableRipple
          />
        </Tabs>

        <div style={{ height: '270px', overflowY: 'scroll' }}>{renderTableContent()}</div>
      </div>
    </>
  );
};

export default Positions;
