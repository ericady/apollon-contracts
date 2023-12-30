import { useQuery } from '@apollo/client';
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
import { displayPercentage, percentageChange, roundCurrency, stdFormatter } from '../../../../utils/math';
import FeatureBox from '../../../FeatureBox/FeatureBox';
import DirectionIcon from '../../../Icons/DirectionIcon';
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
              <HeaderCell title="Token" cellProps={{ align: 'right' }} />
              <HeaderCell title="Wallet" cellProps={{ align: 'right' }} />
              <HeaderCell
                title="Debt"
                cellProps={{ align: 'right', sx: { borderRight: '1px solid', borderColor: 'background.paper' } }}
              />

              <HeaderCell title="Minted" cellProps={{ align: 'center', colSpan: 2 }} />
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
                  walletAmount,
                  troveRepableDebtAmount,
                  totalSupplyUSD,
                  totalSupplyUSD30dAverage,
                },
                index,
              ) => (
                <TableRow hover key={token.address}>
                  <TableCell
                    align="right"
                    sx={{
                      borderBottom: index === data.getDebtTokens.length - 1 ? 'none' : '',
                    }}
                  >
                    <Label variant="none">{token.symbol}</Label>
                  </TableCell>
                  <TableCell align="right" sx={{ borderBottom: index === data.getDebtTokens.length - 1 ? 'none' : '' }}>
                    {roundCurrency(walletAmount, 5)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      borderBottom: index === data.getDebtTokens.length - 1 ? 'none' : '',
                      borderRight: '1px solid',
                      borderColor: 'table.border',
                    }}
                  >
                    {roundCurrency(troveRepableDebtAmount, 5)}
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
                          percentageChange(totalSupplyUSD, totalSupplyUSD30dAverage) > 0 ? 'success.main' : 'error.main'
                        }
                      >
                        {displayPercentage(percentageChange(totalSupplyUSD, totalSupplyUSD30dAverage), 'positive')}
                      </Typography>

                      <DirectionIcon showIncrease={percentageChange(totalSupplyUSD, totalSupplyUSD30dAverage) > 0} />
                    </div>
                  </TableCell>
                  <TableCell align="right" sx={{ borderBottom: index === data.getDebtTokens.length - 1 ? 'none' : '' }}>
                    {roundCurrency(totalDepositedStability)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      borderBottom: index === data.getDebtTokens.length - 1 ? 'none' : '',
                    }}
                  >
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
