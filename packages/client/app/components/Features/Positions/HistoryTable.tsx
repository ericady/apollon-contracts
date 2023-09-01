import { useQuery } from '@apollo/client';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useEffect, useRef } from 'react';
import { useEthers } from '../../../context/EthersProvider';
import {
  GetBorrowerPositionsQuery,
  GetBorrowerPositionsQueryVariables,
  LongShortDirection,
} from '../../../generated/gql-types';
import { GET_BORROWER_POSITIONS } from '../../../queries';
import { formatUnixTimestamp } from '../../../utils/date';
import { percentageChange, roundCurrency } from '../../../utils/math';
import Label from '../../Label/Label';
import HeaderCell from '../../Table/HeaderCell';

function HistoryTable() {
  const tableBodyRef = useRef<HTMLTableSectionElement | null>(null);

  const { address } = useEthers();

  const { data, fetchMore } = useQuery<GetBorrowerPositionsQuery, GetBorrowerPositionsQueryVariables>(
    GET_BORROWER_POSITIONS,
    {
      variables: {
        borrower: address,
        isOpen: false,
        cursor: null,
      },
    },
  );

  const handleScroll = (event: Event) => {
    const scrollableDiv = event.target as HTMLDivElement;
    if (scrollableDiv.scrollTop + scrollableDiv.clientHeight >= scrollableDiv.scrollHeight) {
      if (data?.getPositions.pageInfo.hasNextPage) {
        fetchMorePositions();
      }
    }
  };

  useEffect(() => {
    const tableRef = tableBodyRef.current;
    if (tableRef) {
      tableRef.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (tableRef) {
        tableRef.removeEventListener('scroll', handleScroll);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableBodyRef, data]);

  const fetchMorePositions = () => {
    fetchMore({
      variables: {
        cursor: data?.getPositions.pageInfo.endCursor,
      },
    });
  };

  return (
    <TableContainer ref={tableBodyRef} style={{ maxHeight: '270px', overflow: 'auto' }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <HeaderCell title="Opening" />
            <HeaderCell title="Type" />
            <HeaderCell title="Size" cellProps={{ align: 'right' }} />
            <HeaderCell title="Total position" cellProps={{ align: 'right' }} />
            <HeaderCell title="Price per unit" cellProps={{ align: 'right' }} />
            <HeaderCell title="Fee" cellProps={{ align: 'right' }} />
            <HeaderCell title="Profit" cellProps={{ align: 'right' }} />
          </TableRow>
        </TableHead>

        <TableBody>
          {data?.getPositions.positions.map(
            ({ id, direction, feesInStable, openedAt, size, token, profitInStable, totalPriceInStable }) => {
              return (
                <TableRow key={id}>
                  <TableCell>{formatUnixTimestamp(openedAt)}</TableCell>
                  <TableCell>
                    {direction === LongShortDirection.Long ? (
                      <Label variant="success">Long</Label>
                    ) : (
                      <Label variant="error">Short</Label>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <div className="flex">
                      <Typography sx={{ color: 'primary.contrastText' }}>{size}</Typography>
                      <Label variant="none">{token.symbol}</Label>
                    </div>
                  </TableCell>

                  <TableCell align="right">
                    <Typography sx={{ color: 'primary.contrastText' }}>
                      {roundCurrency(totalPriceInStable)} jUSD
                    </Typography>
                  </TableCell>

                  <TableCell align="right">
                    <Typography sx={{ color: 'primary.contrastText' }}>
                      {roundCurrency(totalPriceInStable / size)} jUSD
                    </Typography>
                  </TableCell>

                  <TableCell align="right">{roundCurrency(feesInStable, 5)} jUSD</TableCell>
                  <TableCell align="right">
                    <div className="flex">
                      <Typography
                        sx={{ color: profitInStable! > 0 ? 'success.main' : 'error.main', fontWeight: '400' }}
                      >
                        {roundCurrency(profitInStable!)} jUSD
                      </Typography>
                      <Typography
                        sx={{ color: profitInStable! > 0 ? 'success.main' : 'error.main', fontWeight: '400' }}
                      >
                        {percentageChange(totalPriceInStable + profitInStable!, totalPriceInStable)} %
                      </Typography>
                    </div>
                  </TableCell>
                </TableRow>
              );
            },
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default HistoryTable;
