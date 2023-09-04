import { useQuery } from '@apollo/client';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useEffect, useRef } from 'react';
import { useEthers } from '../../../context/EthersProvider';
import { useSelectedToken } from '../../../context/SelectedTokenProvider';
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

function PositionsTable() {
  const tableBodyRef = useRef<HTMLTableSectionElement | null>(null);

  const { address } = useEthers();
  const { JUSDToken } = useSelectedToken();

  const { data, fetchMore } = useQuery<GetBorrowerPositionsQuery, GetBorrowerPositionsQueryVariables>(
    GET_BORROWER_POSITIONS,
    {
      variables: {
        borrower: address,
        isOpen: true,
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
        {/* Can not at header border here with sticky header */}
        <TableHead>
          <TableRow>
            <HeaderCell title="Opening" />
            <HeaderCell title="Type" />
            <HeaderCell title="Size" cellProps={{ align: 'right' }} />
            <HeaderCell title="Price" cellProps={{ align: 'right' }} />
            <HeaderCell title="Price per unit" cellProps={{ align: 'right' }} />
            <HeaderCell title="Fee" cellProps={{ align: 'right' }} />
            <HeaderCell title="PNL" cellProps={{ align: 'right' }} />
            <HeaderCell title="" />
          </TableRow>
        </TableHead>
        <TableBody>
          {data?.getPositions.positions.map(
            ({ id, direction, feesInStable, openedAt, size, token, totalPriceInStable }) => {
              const ratioStableCoinNow = JUSDToken ? token.priceUSD / JUSDToken?.priceUSD : 0;
              const totalPriceNow = ratioStableCoinNow * size;
              const pnl = totalPriceNow - totalPriceInStable;

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
                      <Typography>{size}</Typography>
                      <Label variant="none">{token.symbol}</Label>
                    </div>
                  </TableCell>

                  <TableCell align="right">{roundCurrency(totalPriceInStable)} jUSD</TableCell>

                  <TableCell align="right">{roundCurrency(totalPriceInStable / size)} jUSD</TableCell>

                  <TableCell align="right">{roundCurrency(feesInStable, 5)} jUSD</TableCell>
                  <TableCell align="right">
                    <div className="flex">
                      <Typography sx={{ color: pnl > 0 ? 'success.main' : 'error.main', fontWeight: '400' }}>
                        {roundCurrency(pnl)} jUSD{' '}
                      </Typography>
                      <Typography sx={{ color: pnl > 0 ? 'success.main' : 'error.main', fontWeight: '400' }}>
                        {percentageChange(totalPriceNow, totalPriceInStable)} %
                      </Typography>
                    </div>
                  </TableCell>
                  <TableCell align="right">
                    <Button variant="rounded">Close</Button>
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

export default PositionsTable;
