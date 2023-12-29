'use client';

import { useQuery } from '@apollo/client';
import { Box, Typography } from '@mui/material';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { SyntheticEvent, useState } from 'react';
import { useEthers } from '../../../context/EthersProvider';
import { GetBorrowerPositionsQuery, GetBorrowerPositionsQueryVariables } from '../../../generated/gql-types';
import { GET_BORROWER_POSITIONS } from '../../../queries';
import Label from '../../Label/Label';
import CollateralTable from '../Collateral/CollateralTable';
import HistoryTable from './HistoryTable';

const Positions = () => {
  const [tabValue, setTabValue] = useState<'COLLATERAL' | 'HISTORY'>('COLLATERAL');

  const { address } = useEthers();

  // const { data: openPositions } = useQuery<GetBorrowerPositionsQuery, GetBorrowerPositionsQueryVariables>(
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
  const { data: closedPositions } = useQuery<GetBorrowerPositionsQuery, GetBorrowerPositionsQueryVariables>(
    GET_BORROWER_POSITIONS,
    {
      variables: {
        borrower: address,
        isOpen: false,
        cursor: null,
      },
      // Guest mode. Avoid hitting the API with invalid parameters.
      skip: !address,
    },
  );

  const handleChange = (_: SyntheticEvent, newValue: 'COLLATERAL' | 'HISTORY') => {
    setTabValue(newValue);
  };

  const renderTableContent = () => {
    switch (tabValue) {
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
          <Tab label="COLLATERAL" value="COLLATERAL" disableRipple disabled={!address} />
          {/* <Tab
            value="POSITIONS"
            label={
              <span>
                POSITIONS{'  '}
                {openPositions && (
                  <Label variant="none" fixedWidth={false}>
                    <span data-testid="apollon-positions-count">{openPositions.getPositions.pageInfo.totalCount}</span>
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
                HISTORY{'  '}
                {closedPositions && (
                  <Label variant="none" fixedWidth={false}>
                    <span data-testid="apollon-history-count">{closedPositions.getPositions.pageInfo.totalCount}</span>
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

export default Positions;
