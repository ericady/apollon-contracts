'use client';

import { useQuery } from '@apollo/client';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { SyntheticEvent, useState } from 'react';
import { useEthers } from '../../../context/EthersProvider';
import { GetBorrowerPositionsQuery, GetBorrowerPositionsQueryVariables } from '../../../generated/gql-types';
import { GET_BORROWER_POSITIONS } from '../../../queries';
import Label from '../../Label/Label';
import CollateralTable from '../Collateral/CollateralTable';
import BalanceTable from './BalanceTable';
import HistoryTable from './HistoryTable';
import PositionsTable from './PositionsTable';

const Positions = () => {
  const [tabValue, setTabValue] = useState<'BALANCE' | 'COLLATERAL' | 'POSITIONS' | 'HISTORY'>('BALANCE');

  const { address } = useEthers();

  const { data: openPositions } = useQuery<GetBorrowerPositionsQuery, GetBorrowerPositionsQueryVariables>(
    GET_BORROWER_POSITIONS,
    {
      variables: {
        borrower: address,
        isOpen: true,
        cursor: null,
      },
    },
  );
  const { data: closedPositions } = useQuery<GetBorrowerPositionsQuery, GetBorrowerPositionsQueryVariables>(
    GET_BORROWER_POSITIONS,
    {
      variables: {
        borrower: address,
        isOpen: false,
        cursor: null,
      },
    },
  );

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
      <div className="table-styles">
        <Tabs value={tabValue} onChange={handleChange}>
          <Tab label="BALANCE" value="BALANCE" disableRipple />
          <Tab label="COLLATERAL" value="COLLATERAL" disableRipple />
          <Tab
            value="POSITIONS"
            label={
              <span>
                POSITIONS{' '}
                {openPositions && <Label variant="none">{openPositions.getPositions.pageInfo.totalCount}</Label>}
              </span>
            }
            disableRipple
          />
          <Tab
            value="HISTORY"
            label={
              <span>
                HISTORY{' '}
                {closedPositions && <Label variant="none">{closedPositions.getPositions.pageInfo.totalCount}</Label>}
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
