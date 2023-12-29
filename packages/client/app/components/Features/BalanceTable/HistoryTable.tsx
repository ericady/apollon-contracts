import { useQuery } from '@apollo/client';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer, { TableContainerProps } from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useEthers } from '../../../context/EthersProvider';
import {
  GetBorrowerSwapEventsQuery,
  GetBorrowerSwapEventsQueryVariables,
  LongShortDirection,
} from '../../../generated/gql-types';
import { GET_BORROWER_SWAPS } from '../../../queries';
import { formatUnixTimestamp } from '../../../utils/date';
import { convertSwapFee, roundCurrency } from '../../../utils/math';
import Label from '../../Label/Label';
import HeaderCell from '../../Table/HeaderCell';
import HistoryTableLoader from './HistoryTableLoader';

function HistoryTable() {
  const { address } = useEthers();

  const { data, fetchMore } = useQuery<GetBorrowerSwapEventsQuery, GetBorrowerSwapEventsQueryVariables>(
    GET_BORROWER_SWAPS,
    {
      variables: {
        borrower: address,
        cursor: null,
      },
    },
  );

  const handleScroll: TableContainerProps['onScroll'] = (event) => {
    const scrollableDiv = event.target as HTMLDivElement;
    if (scrollableDiv.scrollTop + scrollableDiv.clientHeight >= scrollableDiv.scrollHeight) {
      if (data?.getSwaps.pageInfo.hasNextPage) {
        fetchMorePositions();
      }
    }
  };

  const fetchMorePositions = () => {
    fetchMore({
      variables: {
        cursor: data?.getSwaps.pageInfo.endCursor,
      },
    });
  };

  if (!data) return <HistoryTableLoader />;

  return (
    <TableContainer onScroll={handleScroll} style={{ maxHeight: '100%', overflow: 'auto' }}>
      <Table stickyHeader data-testid="apollon-history-table">
        <TableHead>
          <TableRow>
            <HeaderCell title="Date" />
            <HeaderCell title="Type" />
            <HeaderCell title="Size" cellProps={{ align: 'right', colSpan: 2 }} />
            <HeaderCell title="Price" cellProps={{ align: 'right' }} />
            <HeaderCell title="Price per unit" cellProps={{ align: 'right' }} />
            <HeaderCell title="Fee" cellProps={{ align: 'right' }} />
          </TableRow>
        </TableHead>

        <TableBody>
          {data.getSwaps.swaps.map(({ id, direction, swapFee, timestamp, size, token, totalPriceInStable }) => {
            return (
              <TableRow hover key={id}>
                <TableCell>{formatUnixTimestamp(timestamp)}</TableCell>
                <TableCell>
                  {direction === LongShortDirection.Long ? (
                    <Label variant="success" fixedWidth={false}>
                      Long
                    </Label>
                  ) : (
                    <Label variant="error" fixedWidth={false}>
                      Short
                    </Label>
                  )}
                </TableCell>

                <TableCell align="right">
                  <Typography color="primary.contrastText" fontWeight={400}>
                    {size}
                  </Typography>
                </TableCell>
                <TableCell sx={{ pl: 0 }} width={50}>
                  <Label variant="none">{token.symbol}</Label>
                </TableCell>

                <TableCell align="right">{roundCurrency(totalPriceInStable)} jUSD</TableCell>

                <TableCell align="right">{roundCurrency(totalPriceInStable / size)} jUSD</TableCell>

                <TableCell align="right">
                  {direction === LongShortDirection.Long
                    ? `${roundCurrency(convertSwapFee(swapFee) * totalPriceInStable, 5)} jUSD`
                    : `${roundCurrency(convertSwapFee(swapFee) * size, 5)} ${token.symbol}`}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default HistoryTable;
