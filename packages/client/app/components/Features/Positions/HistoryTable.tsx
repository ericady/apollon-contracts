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
  GetBorrowerPositionsQuery,
  GetBorrowerPositionsQueryVariables,
  LongShortDirection,
} from '../../../generated/gql-types';
import { GET_BORROWER_POSITIONS } from '../../../queries';
import { formatUnixTimestamp } from '../../../utils/date';
import { displayPercentage, percentageChange, roundCurrency } from '../../../utils/math';
import DirectionIcon from '../../Icons/DirectionIcon';
import Label from '../../Label/Label';
import HeaderCell from '../../Table/HeaderCell';

function HistoryTable() {
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

  return (
    <TableContainer onScroll={handleScroll} style={{ maxHeight: '100%', overflow: 'auto' }}>
      <Table stickyHeader>
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
                    <Typography>{size}</Typography>
                  </TableCell>
                  <TableCell sx={{ pl: 0 }}>
                    <Label variant="none">{token.symbol}</Label>
                  </TableCell>

                  <TableCell align="right">{roundCurrency(totalPriceInStable)} jUSD</TableCell>

                  <TableCell align="right">{roundCurrency(totalPriceInStable / size)} jUSD</TableCell>

                  <TableCell align="right">{roundCurrency(feesInStable, 5)} jUSD</TableCell>

                  <TableCell align="right" sx={{ pr: 0 }}>
                    <Typography sx={{ color: profitInStable! > 0 ? 'success.main' : 'error.main', fontWeight: '400' }}>
                      {roundCurrency(profitInStable!)} jUSD
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ width: 120 }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <Typography
                        sx={{ color: profitInStable! > 0 ? 'success.main' : 'error.main', fontWeight: '400' }}
                      >
                        {displayPercentage(percentageChange(totalPriceInStable + profitInStable!, totalPriceInStable))}
                      </Typography>
                      <DirectionIcon showIncrease={profitInStable! > 0} />
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
