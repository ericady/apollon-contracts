import { useQuery } from '@apollo/client';
import { Table, TableContainer, Typography } from '@mui/material';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { useEthers } from '../../../context/EthersProvider';
import {
  GetBorrowerDebtTokensQuery,
  GetBorrowerDebtTokensQueryVariables,
  GetCollateralTokensQuery,
  GetCollateralTokensQueryVariables,
} from '../../../generated/gql-types';
import { GET_BORROWER_COLLATERAL_TOKENS, GET_BORROWER_DEBT_TOKENS } from '../../../queries';
import { displayPercentage, roundCurrency, stdFormatter } from '../../../utils/math';
import Label from '../../Label/Label';
import HeaderCell from '../../Table/HeaderCell';
import BalanceTableLoader from './BalanceTableLoader';

function BalanceTable() {
  const { address } = useEthers();

  const { data: debtTokenData } = useQuery<GetBorrowerDebtTokensQuery, GetBorrowerDebtTokensQueryVariables>(
    GET_BORROWER_DEBT_TOKENS,
    {
      variables: { borrower: address },
    },
  );

  const { data: collateralTokenData } = useQuery<GetCollateralTokensQuery, GetCollateralTokensQueryVariables>(
    GET_BORROWER_COLLATERAL_TOKENS,
    {
      variables: { borrower: address },
    },
  );

  if (!debtTokenData || !collateralTokenData) return <BalanceTableLoader />;

  const totalValueDebt: number = debtTokenData.getDebtTokens.reduce(
    (acc, { walletAmount, token }) => acc + walletAmount! * token.priceUSD,
    0,
  );
  const totalValueCollateral: number = collateralTokenData.getCollateralTokens.reduce(
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
            {debtTokenData.getDebtTokens.map(({ token, walletAmount }) => {
              return (
                <TableRow hover key={token.address}>
                  <TableCell align="right" width={100}>
                    {totalValueDebt !== 0
                      ? displayPercentage((walletAmount! * token.priceUSD) / totalValueDebt)
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
            {collateralTokenData.getCollateralTokens.map(({ token, walletAmount }) => (
              <TableRow hover key={token.address}>
                <TableCell align="right" width={100}>
                  {totalValueCollateral !== 0
                    ? displayPercentage((walletAmount! * token.priceUSD) / totalValueCollateral)
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
