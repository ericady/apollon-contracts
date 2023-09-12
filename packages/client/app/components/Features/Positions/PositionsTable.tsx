import { useQuery } from '@apollo/client';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer, { TableContainerProps } from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useEthers } from '../../../context/EthersProvider';
import { useSelectedToken } from '../../../context/SelectedTokenProvider';
import {
  GetBorrowerPositionsQuery,
  GetBorrowerPositionsQueryVariables,
  LongShortDirection,
} from '../../../generated/gql-types';
import { GET_BORROWER_POSITIONS } from '../../../queries';
import { formatUnixTimestamp } from '../../../utils/date';
import { displayPercentage, percentageChange, roundCurrency, stdFormatter } from '../../../utils/math';
import DirectionIcon from '../../Icons/DirectionIcon';
import Label from '../../Label/Label';
import HeaderCell from '../../Table/HeaderCell';

function PositionsTable() {
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

  const handleScroll: TableContainerProps['onScroll'] = (event) => {
    const scrollableDiv = event.target as HTMLDivElement;
    if (scrollableDiv.scrollTop + scrollableDiv.clientHeight >= scrollableDiv.scrollHeight) {
      if (data?.getPositions.pageInfo.hasNextPage) {
        fetchMorePositions();
      }
    }
  };

  const fetchMorePositions = () => {
    fetchMore({
      variables: {
        cursor: data?.getPositions.pageInfo.endCursor,
      },
    });
  };

  if (!data) return null;

  return (
    <TableContainer onScroll={handleScroll} style={{ maxHeight: '100%', overflow: 'auto' }}>
      <Table stickyHeader>
        {/* Can not at header border here with sticky header */}
        <TableHead>
          <TableRow>
            <HeaderCell title="Opening" />
            <HeaderCell title="Type" />
            <HeaderCell title="Size" cellProps={{ align: 'right' }} />
            <HeaderCell title="" />
            <HeaderCell title="Price" cellProps={{ align: 'right' }} />
            <HeaderCell title="Price per unit" cellProps={{ align: 'right' }} />
            <HeaderCell title="Fee" cellProps={{ align: 'right' }} />
            <HeaderCell title="" />
            <HeaderCell title="PNL" />
            <HeaderCell title="" />
          </TableRow>
        </TableHead>
        <TableBody>
          {data?.getPositions.positions.map(
            ({ id, direction, feesInStable, openedAt, size, token, totalPriceInStable }) => {
              const ratioStableCoinNow = token.priceUSD / JUSDToken!.priceUSD;
              const totalPriceInStableNow = ratioStableCoinNow * size;
              const pnl = totalPriceInStableNow - totalPriceInStable;

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
                    <Typography>{stdFormatter.format(size)}</Typography>
                  </TableCell>
                  <TableCell sx={{ pl: 0 }}>
                    <Label variant="none">{token.symbol}</Label>
                  </TableCell>

                  <TableCell align="right">{roundCurrency(totalPriceInStable)} jUSD</TableCell>

                  <TableCell align="right">{roundCurrency(totalPriceInStable / size)} jUSD</TableCell>

                  <TableCell align="right">{roundCurrency(feesInStable, 5)} jUSD</TableCell>
                  <TableCell align="right" sx={{ pr: 0 }}>
                    <Typography sx={{ color: pnl > 0 ? 'success.main' : 'error.main', fontWeight: '400' }}>
                      {roundCurrency(pnl)} jUSD
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ width: 120 }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <Typography sx={{ color: pnl > 0 ? 'success.main' : 'error.main', fontWeight: '400', mr: '5px' }}>
                        {displayPercentage(percentageChange(totalPriceInStableNow, totalPriceInStable))}
                      </Typography>
                      <DirectionIcon showIncrease={pnl > 0} />
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
