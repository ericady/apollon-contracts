import { useQuery } from '@apollo/client';
import ExpandMoreSharpIcon from '@mui/icons-material/ExpandMoreSharp';
import { Typography } from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { useEthers } from '../../../../context/EthersProvider';
import { GetBorrowerDebtTokensQuery, GetBorrowerDebtTokensQueryVariables } from '../../../../generated/gql-types';
import { GET_BORROWER_DEBT_TOKENS } from '../../../../queries';
import { BUTTON_BACKGROUND } from '../../../../theme';
import { displayPercentage, percentageChange, roundCurrency } from '../../../../utils/math';
import FeatureBox from '../../../FeatureBox/FeatureBox';
import Label from '../../../Label/Label';
import HeaderCell from '../../../Table/HeaderCell';
import DebtTokenTableLoader from './DebtTokenTableLoader';

function DebtTokenTable() {
  const { address } = useEthers();

  const { data } = useQuery<GetBorrowerDebtTokensQuery, GetBorrowerDebtTokensQueryVariables>(GET_BORROWER_DEBT_TOKENS, {
    variables: {
      borrower: address,
    },
  });
  console.log('data: ', data);

  if (!data) return <DebtTokenTableLoader />;

  return (
    <FeatureBox title="Debt Token" noPadding border="full">
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <HeaderCell title="Personal" cellProps={{ align: 'right' }} />
              <HeaderCell title="" />
              <HeaderCell title="" cellProps={{ sx: { borderRight: '1px solid', borderColor: 'background.paper' } }} />
              <HeaderCell title="" />
              <HeaderCell title="" />
              <HeaderCell title="" />
              <HeaderCell title="Protocol Level" cellProps={{ align: 'right' }} />
            </TableRow>
          </TableHead>
          <TableHead>
            <TableRow>
              <HeaderCell title="Minted" cellProps={{ align: 'right' }} />
              <HeaderCell title="Stability" cellProps={{ align: 'right' }} />
              <HeaderCell
                title="Token"
                cellProps={{ sx: { borderRight: '1px solid', borderColor: 'background.paper' } }}
              />
              <HeaderCell title="" cellProps={{ align: 'right' }} />
              <HeaderCell title="Supply" cellProps={{ align: 'left' }} />
              <HeaderCell title="Stability" cellProps={{ align: 'right' }} />
              <HeaderCell title="Rewards" cellProps={{ align: 'right' }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {data.getDebtTokens.map(
              ({
                stabilityDepositAPY,
                totalDepositedStability,
                token,
                troveMintedAmount,
                totalReserve,
                totalReserve24hAgo,
              }) => (
                <TableRow key={token.address}>
                  <TableCell align="right">{troveMintedAmount}</TableCell>
                  <TableCell align="right"></TableCell>
                  <TableCell sx={{ borderRight: '1px solid', borderColor: BUTTON_BACKGROUND }}>
                    <Label variant="none">{token.symbol}</Label>
                  </TableCell>
                  <TableCell align="right">{totalReserve}</TableCell>
                  <TableCell>
                    <div className="flex">
                      <Typography
                        fontWeight={400}
                        color={percentageChange(totalReserve, totalReserve24hAgo) > 0 ? 'success.main' : 'error.main'}
                      >
                        {displayPercentage(percentageChange(totalReserve, totalReserve24hAgo))}
                      </Typography>
                      <ExpandMoreSharpIcon
                        sx={{
                          color: percentageChange(totalReserve, totalReserve24hAgo) > 0 ? 'success.main' : 'error.main',
                          ml: '-5px',
                        }}
                      />
                    </div>
                  </TableCell>
                  <TableCell align="right">{roundCurrency(totalDepositedStability)}</TableCell>
                  <TableCell align="right">{displayPercentage(stabilityDepositAPY)}</TableCell>
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </FeatureBox>
  );
}

export default DebtTokenTable;
