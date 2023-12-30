'use client';

import { useQuery } from '@apollo/client';
import { Box, Typography } from '@mui/material';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { SyntheticEvent, useState } from 'react';
import { useEthers } from '../../../context/EthersProvider';
import { GetBorrowerSwapEventsQuery, GetBorrowerSwapEventsQueryVariables } from '../../../generated/gql-types';
import { GET_BORROWER_SWAPS } from '../../../queries';
import Label from '../../Label/Label';
import CollateralTable from '../Collateral/CollateralTable';
import DebtTable from '../Debt/DebtTable';
import HistoryTable from './HistoryTable';

const BalanceTable = () => {
  const [tabValue, setTabValue] = useState<'DEBT' | 'COLLATERAL' | 'HISTORY'>('DEBT');

  const { address } = useEthers();

  // const { data: openPositions } = useQuery<GetBorrowerSwapEventsQuery, GetBorrowerSwapEventsQueryVariables>(
  //   GET_BORROWER_POSITIONS,
  //   {
  //     variables: {
  //       borrower: address,
  //       isOpen: true,
  //       cursor: null,
  //     },
  //     // Guest mode. Avoid hitting the API with invalid parameters.
  //     skip: !address,
  //   },
  // );
  const { data: closedPositions } = useQuery<GetBorrowerSwapEventsQuery, GetBorrowerSwapEventsQueryVariables>(
    GET_BORROWER_SWAPS,
    {
      variables: {
        borrower: address,
        cursor: null,
      },
      // Guest mode. Avoid hitting the API with invalid parameters.
      skip: !address,
    },
  );

  const handleChange = (_: SyntheticEvent, newValue: 'DEBT' | 'COLLATERAL' | 'HISTORY') => {
    setTabValue(newValue);
  };

  const renderTableContent = () => {
    switch (tabValue) {
      case 'DEBT':
        return <DebtTable />;
      case 'COLLATERAL':
        return <CollateralTable />;
      // case 'POSITIONS':
      //   return <PositionsTable />;
      case 'HISTORY':
        return <HistoryTable />;

      default:
        const _: never = tabValue;
    }
  };

  return (
    <>
      <Box>
        <Tabs value={tabValue} onChange={handleChange}>
          <Tab label="DEBT" value="DEBT" disableRipple disabled={!address} />
          <Tab label="COLLATERAL" value="COLLATERAL" disableRipple disabled={!address} />
          {/* <Tab
            value="POSITIONS"
            label={
              <span>
                POSITIONS{'  '}
                {openPositions && (
                  <Label variant="none" fixedWidth={false}>
                    <span data-testid="apollon-positions-count">{openPositions.getSwaps.pageInfo.totalCount}</span>
                  </Label>
                )}
              </span>
            }
            disableRipple
            disabled={!address}
          /> */}
          <Tab
            value="HISTORY"
            label={
              <span>
                SWAPS{'  '}
                {closedPositions && (
                  <Label variant="none" fixedWidth={false}>
                    <span data-testid="apollon-history-count">{closedPositions.getSwaps.pageInfo.totalCount}</span>
                  </Label>
                )}
              </span>
            }
            disableRipple
            disabled={!address}
          />
        </Tabs>
      </Box>

      <div style={{ height: 'calc(100% - 52px)', overflowY: 'scroll' }}>
        {address ? (
          renderTableContent()
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
            <Typography variant="h6" color="textSecondary" align="center">
              Please log in to use this widget
            </Typography>
          </div>
        )}
      </div>
    </>
  );
};

export default BalanceTable;
