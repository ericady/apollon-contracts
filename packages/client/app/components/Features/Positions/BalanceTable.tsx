import { useQuery } from '@apollo/client';
import { Table, TableContainer, Typography } from '@mui/material';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { useEthers } from '../../../context/EthersProvider';
import { GetBorrowerDebtTokensQuery, GetBorrowerDebtTokensQueryVariables } from '../../../generated/gql-types';
import { GET_BORROWER_DEBT_TOKENS } from '../../../queries';
import { displayPercentage, roundCurrency, stdFormatter } from '../../../utils/math';
import Label from '../../Label/Label';
import HeaderCell from '../../Table/HeaderCell';
import BalanceTableLoader from './BalanceTableLoader';

function BalanceTable() {
  const { address } = useEthers();

  const { data } = useQuery<GetBorrowerDebtTokensQuery, GetBorrowerDebtTokensQueryVariables>(GET_BORROWER_DEBT_TOKENS, {
    variables: { borrower: address },
  });

  if (!data) return <BalanceTableLoader />;

  const poolToken = data.getDebtTokens.filter(({ token }) => token.isPoolToken);
  const nonPoolToken = data.getDebtTokens.filter(({ token }) => !token.isPoolToken);

  const totalValue: number = data.getDebtTokens.reduce(
    (acc, { walletAmount, token }) => acc + walletAmount! * token.priceUSD,
    0,
  );

  return (
    <div style={{ display: 'flex' }}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <HeaderCell title="%" cellProps={{ align: 'right' }} />
              <HeaderCell title="Amount" cellProps={{ align: 'right' }} />
              <HeaderCell title="Symbol" />
              <HeaderCell title="Value" cellProps={{ align: 'right' }} />
              <HeaderCell title="Price" cellProps={{ align: 'right' }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {poolToken.map(({ token, walletAmount }) => {
              return (
                <TableRow hover key={token.address}>
                  <TableCell align="right" width={100}>
                    {totalValue !== 0
                      ? displayPercentage((walletAmount! * token.priceUSD) / totalValue)
                      : displayPercentage(0)}
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight={400} color="primary.contrastText">
                      {stdFormatter.format(walletAmount!)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Label variant="none">{token.symbol}</Label>
                  </TableCell>
                  <TableCell align="right">{roundCurrency(walletAmount! * token.priceUSD)} $</TableCell>
                  <TableCell align="right">{stdFormatter.format(token.priceUSD)} $</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <TableContainer sx={{ borderLeft: '1px solid', borderColor: 'table.border' }}>
        <Table>
          <TableHead>
            <TableRow>
              <HeaderCell title="%" cellProps={{ align: 'right' }} />
              <HeaderCell title="Amount" cellProps={{ align: 'right' }} />
              <HeaderCell title="Symbol" />
              <HeaderCell title="Value" cellProps={{ align: 'right' }} />
              <HeaderCell title="Price" cellProps={{ align: 'right' }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {nonPoolToken.map(({ token, walletAmount }) => (
              <TableRow hover key={token.address}>
                <TableCell align="right" width={100}>
                  {totalValue !== 0
                    ? displayPercentage((walletAmount! * token.priceUSD) / totalValue)
                    : displayPercentage(0)}
                </TableCell>
                <TableCell align="right">
                  <Typography fontWeight={400} color="primary.contrastText">
                    {stdFormatter.format(walletAmount!)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Label variant="none">{token.symbol}</Label>
                </TableCell>
                <TableCell align="right">{roundCurrency(walletAmount! * token.priceUSD)} $</TableCell>
                <TableCell align="right">{stdFormatter.format(token.priceUSD)} $</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

export default BalanceTable;
