import { useQuery } from '@apollo/client';
import { Table, TableContainer, Typography } from '@mui/material';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { useEthers } from '../../../context/EthersProvider';
import { GetBorrowerDebtTokensQuery, GetBorrowerDebtTokensQueryVariables } from '../../../generated/gql-types';
import { GET_BORROWER_DEBT_TOKENS } from '../../../queries';
import { displayPercentage, roundCurrency } from '../../../utils/math';
import Label from '../../Label/Label';
import HeaderCell from '../../Table/HeaderCell';

function BalanceTable() {
  const { address } = useEthers();

  const { data } = useQuery<GetBorrowerDebtTokensQuery, GetBorrowerDebtTokensQueryVariables>(GET_BORROWER_DEBT_TOKENS, {
    variables: { borrower: address },
  });

  if (!data) return null;

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
          <TableHead sx={{ borderTop: '1px solid', borderTopColor: 'background.paper' }}>
            <TableRow>
              <HeaderCell title="%" />
              <HeaderCell title="Amount" cellProps={{ align: 'right' }} />
              <HeaderCell title="Symbol" />
              <HeaderCell title="Value" cellProps={{ align: 'right' }} />
              <HeaderCell title="Price" cellProps={{ align: 'right' }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {poolToken.map(({ token, walletAmount }) => (
              <TableRow key={token.address}>
                <TableCell>{displayPercentage((walletAmount! * token.priceUSD) / totalValue)}</TableCell>
                <TableCell align="right">
                  <Typography sx={{ color: 'primary.contrastText' }}>{walletAmount}</Typography>
                </TableCell>
                <TableCell>
                  <Label variant="none">{token.symbol}</Label>
                </TableCell>
                <TableCell align="right">{roundCurrency(walletAmount! * token.priceUSD)}$</TableCell>
                <TableCell align="right">{token.priceUSD}$</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TableContainer sx={{ borderLeft: '2px solid #1E1B27' }}>
        <Table>
          <TableHead sx={{ borderTop: '1px solid', borderTopColor: 'background.paper' }}>
            <TableRow>
              <HeaderCell title="%" />
              <HeaderCell title="Amount" cellProps={{ align: 'right' }} />
              <HeaderCell title="Symbol" />
              <HeaderCell title="Value" cellProps={{ align: 'right' }} />
              <HeaderCell title="Price" cellProps={{ align: 'right' }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {nonPoolToken.map(({ token, walletAmount }) => (
              <TableRow key={token.address}>
                <TableCell>{displayPercentage((walletAmount! * token.priceUSD) / totalValue)}</TableCell>
                <TableCell align="right">
                  <Typography sx={{ color: 'primary.contrastText' }}>{walletAmount}</Typography>
                </TableCell>
                <TableCell>
                  <Label variant="none">{token.symbol}</Label>
                </TableCell>
                <TableCell align="right">{roundCurrency(walletAmount! * token.priceUSD)}$</TableCell>
                <TableCell align="right">{token.priceUSD}$</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

export default BalanceTable;
