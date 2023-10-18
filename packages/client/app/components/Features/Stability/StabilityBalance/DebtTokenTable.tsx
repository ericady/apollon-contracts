import { useQuery } from '@apollo/client';
import { Typography, useTheme } from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { useEthers } from '../../../../context/EthersProvider';
import { GetBorrowerDebtTokensQuery, GetBorrowerDebtTokensQueryVariables } from '../../../../generated/gql-types';
import { GET_BORROWER_DEBT_TOKENS } from '../../../../queries';
import { displayPercentage, percentageChange, roundCurrency, stdFormatter } from '../../../../utils/math';
import FeatureBox from '../../../FeatureBox/FeatureBox';
import DirectionIcon from '../../../Icons/DirectionIcon';
import Label from '../../../Label/Label';
import HeaderCell from '../../../Table/HeaderCell';
import DebtTokenTableLoader from './DebtTokenTableLoader';

function DebtTokenTable() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const { address } = useEthers();

  const { data } = useQuery<GetBorrowerDebtTokensQuery, GetBorrowerDebtTokensQueryVariables>(GET_BORROWER_DEBT_TOKENS, {
    variables: {
      borrower: address,
    },
  });

  if (!data) return <DebtTokenTableLoader />;

  return (
    <FeatureBox title="Debt Token" noPadding border="full" borderRadius>
      <TableContainer>
        <Table data-testid="apollon-debt-token-table">
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
              <HeaderCell title="Supply" cellProps={{ align: 'right', colSpan: 2 }} />
              <HeaderCell title="Stability" cellProps={{ align: 'right' }} />
              <HeaderCell
                title="Rewards"
                cellProps={{ align: 'right' }}
                tooltipProps={{ title: 'APY based on the last 30 days liquidations.', arrow: true, placement: 'right' }}
              />
            </TableRow>
          </TableHead>
          <TableBody>
            {data.getDebtTokens.map(
              (
                {
                  stabilityDepositAPY,
                  totalDepositedStability,
                  token,
                  troveMintedAmount,
                  stabilityCompoundAmount,
                  totalSupplyUSD,
                  totalSupplyUSD24hAgo,
                },
                index,
              ) => (
                <TableRow hover key={token.address}>
                  <TableCell align="right" sx={{ borderBottom: index === data.getDebtTokens.length - 1 ? 'none' : '' }}>
                    {roundCurrency(troveMintedAmount!, 5)}
                  </TableCell>
                  <TableCell align="right" sx={{ borderBottom: index === data.getDebtTokens.length - 1 ? 'none' : '' }}>
                    {roundCurrency(stabilityCompoundAmount!, 5)}
                  </TableCell>
                  <TableCell
                    sx={{
                      borderBottom: index === data.getDebtTokens.length - 1 ? 'none' : '',
                      borderRight: '1px solid',
                      borderColor: 'table.border',
                    }}
                  >
                    <Label variant="none">{token.symbol}</Label>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ borderBottom: index === data.getDebtTokens.length - 1 ? 'none' : '', pr: 0 }}
                  >
                    {stdFormatter.format(totalSupplyUSD)}
                  </TableCell>
                  <TableCell width={125} sx={{ borderBottom: index === data.getDebtTokens.length - 1 ? 'none' : '' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Typography
                        fontWeight={400}
                        color={
                          percentageChange(totalSupplyUSD, totalSupplyUSD24hAgo) > 0 ? 'success.main' : 'error.main'
                        }
                      >
                        {displayPercentage(percentageChange(totalSupplyUSD, totalSupplyUSD24hAgo), 'positive')}
                      </Typography>

                      <DirectionIcon showIncrease={percentageChange(totalSupplyUSD, totalSupplyUSD24hAgo) > 0} />
                    </div>
                  </TableCell>
                  <TableCell align="right" sx={{ borderBottom: index === data.getDebtTokens.length - 1 ? 'none' : '' }}>
                    {roundCurrency(totalDepositedStability)}
                  </TableCell>
                  <TableCell align="right" sx={{ borderBottom: index === data.getDebtTokens.length - 1 ? 'none' : '' }}>
                    {displayPercentage(stabilityDepositAPY)}
                  </TableCell>
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
