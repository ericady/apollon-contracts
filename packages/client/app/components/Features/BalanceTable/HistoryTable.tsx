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
import { bigIntStringToFloat, dangerouslyConvertBigIntToNumber, divBigIntsToFloat, roundCurrency } from '../../../utils/math';
import Label from '../../Label/Label';
import HeaderCell from '../../Table/HeaderCell';
import HistoryTableLoader from './HistoryTableLoader';

function HistoryTable() {
  const { address } = useEthers();

  const { data, fetchMore } = useQuery<GetBorrowerSwapEventsQuery, GetBorrowerSwapEventsQueryVariables>(
    GET_BORROWER_SWAPS,
    {
      variables: {
        where: {
          borrower: address,
        },
        skip: 0,
        first: 30,
      },
    },
  );

  console.log('data: ', data);

  const handleScroll: TableContainerProps['onScroll'] = (event) => {
    const scrollableDiv = event.target as HTMLDivElement;
    if (scrollableDiv.scrollTop + scrollableDiv.clientHeight >= scrollableDiv.scrollHeight) {
      if ((data?.swapEvents.length ?? 0) % 30 === 0) {
        fetchMorePositions();
      }
    }
  };

  const fetchMorePositions = () => {
    fetchMore({
      variables: {
        where: {
          borrower: address,
        },
        skip: data?.swapEvents.length ?? 0,
        first: 30,
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
          {data.swapEvents.map(({ id, direction, swapFee, timestamp, size, token, totalPriceInStable }) => {
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
                    {roundCurrency(bigIntStringToFloat(size), 5, 5)}
                  </Typography>
                </TableCell>
                <TableCell sx={{ pl: 0 }} width={50}>
                  <Label variant="none">{token.symbol}</Label>
                </TableCell>

                <TableCell align="right">{roundCurrency(bigIntStringToFloat(totalPriceInStable), 5, 5)} jUSD</TableCell>

                <TableCell align="right">
                  {roundCurrency(divBigIntsToFloat(BigInt(totalPriceInStable), BigInt(size), 6), 5, 5)} jUSD
                </TableCell>

                <TableCell align="right">
                  {direction === LongShortDirection.Long
                    ? `${roundCurrency(
                     dangerouslyConvertBigIntToNumber(BigInt(swapFee)  * BigInt(totalPriceInStable), 18, 6),
                        5,
                        5,
                      )} jUSD`
                    : `${roundCurrency(
                     dangerouslyConvertBigIntToNumber(BigInt(swapFee)  * BigInt(size), 18, 6), 5, 5)} ${
                        token.symbol
                      }`}
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
