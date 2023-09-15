import { useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { useEthers } from '../../../../context/EthersProvider';
import {
  GetBorrowerDebtTokensQuery,
  GetBorrowerDebtTokensQueryVariables,
  GetCollateralTokensQuery,
  GetCollateralTokensQueryVariables,
} from '../../../../generated/gql-types';
import { GET_BORROWER_COLLATERAL_TOKENS, GET_BORROWER_DEBT_TOKENS } from '../../../../queries';
import { displayPercentage, percentageChange, roundCurrency } from '../../../../utils/math';
import FeatureBox from '../../../FeatureBox/FeatureBox';
import Label from '../../../Label/Label';
import HeaderCell from '../../../Table/HeaderCell';
import StabilityHistoryDialog from '../StabilityHistoryDialog';
import StabilityUpdateDialog from '../StabilityUpdateDialog';
import StabilityPoolTableLoader from './StabilityPoolTableLoader';

function StabilityPoolTable() {
  const { address } = useEthers();

  const { data: collateralData } = useQuery<GetCollateralTokensQuery, GetCollateralTokensQueryVariables>(
    GET_BORROWER_COLLATERAL_TOKENS,
    {
      variables: { borrower: address },
    },
  );
  const { data: debtData } = useQuery<GetBorrowerDebtTokensQuery, GetBorrowerDebtTokensQueryVariables>(
    GET_BORROWER_DEBT_TOKENS,
    {
      variables: {
        borrower: address,
      },
    },
  );

  if (!collateralData || !debtData) {
    return <StabilityPoolTableLoader />;
  }

  // Sort both arrays for common tokens and in same alphabetical order.
  const rewards = collateralData.getCollateralTokens.filter(({ stabilityGainedAmount }) => stabilityGainedAmount! > 0);
  const stabilityLostSorted = debtData.getDebtTokens
    .filter(({ stabilityLostAmount }) => stabilityLostAmount! > 0)
    .sort((a, b) => a.token.symbol.localeCompare(b.token.symbol))
    .sort((a, b) => (rewards.find(({ token }) => token.address === a.token.address) ? -1 : 1));

  const rewardsSorted = rewards
    .slice()
    .sort((a, b) => a.token.symbol.localeCompare(b.token.symbol))
    .sort((a, b) => (stabilityLostSorted.find(({ token }) => token.address === a.token.address) ? -1 : 1));

  const rewardsTotalInUSD = rewardsSorted.reduce(
    (acc, { stabilityGainedAmount, token }) => acc + stabilityGainedAmount! * token.priceUSD,
    0,
  );
  const lossTotalInUSD = stabilityLostSorted.reduce(
    (acc, { stabilityLostAmount, token }) => acc + stabilityLostAmount! * token.priceUSD,
    0,
  );

  const listLength = Math.max(rewardsSorted.length, stabilityLostSorted.length);

  return (
    <FeatureBox title="Stability Pool" noPadding border="full" borderRadius>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <TableContainer>
          <Table sx={{ borderRight: '1px solid', borderColor: 'background.emphasis' }}>
            <TableHead>
              <TableRow>
                <HeaderCell title="" />
                <HeaderCell title="Lost Stability" />
                <HeaderCell title="" />
                <HeaderCell title="Gained collateral" />
              </TableRow>
            </TableHead>
            <TableBody>
              {Array(listLength)
                .fill(null)
                .map((_, index) => {
                  const { stabilityLostAmount, token: lostToken } = stabilityLostSorted[index] ?? {};
                  const { stabilityGainedAmount, token: rewardToken } = rewardsSorted[index] ?? {};
                  const noBorder = index === listLength - 1;

                  return (
                    <TableRow hover key={index}>
                      <TableCell sx={noBorder ? { borderBottom: 'none', pr: 0 } : { pr: 0 }} align="right">
                        {!isNaN(stabilityLostAmount!) ? roundCurrency(stabilityLostAmount!, 5) : null}
                      </TableCell>
                      <TableCell sx={noBorder ? { borderBottom: 'none' } : {}}>
                        {lostToken && <Label variant="error">{lostToken.symbol}</Label>}
                      </TableCell>
                      <TableCell sx={noBorder ? { borderBottom: 'none', pr: 0 } : { pr: 0 }} align="right">
                        {!isNaN(stabilityGainedAmount!) ? roundCurrency(stabilityGainedAmount!, 5) : null}
                      </TableCell>
                      <TableCell sx={noBorder ? { borderBottom: 'none' } : {}}>
                        {rewardToken && <Label variant="success">{rewardToken.symbol}</Label>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              <TableRow>
                <TableCell sx={{ borderBottom: 'none' }}></TableCell>
                <TableCell sx={{ borderBottom: 'none' }}></TableCell>
                <TableCell sx={{ borderBottom: 'none' }}></TableCell>
                <TableCell sx={{ borderBottom: 'none' }}>
                  + {displayPercentage(percentageChange(rewardsTotalInUSD, lossTotalInUSD))}{' '}
                  <span style={{ whiteSpace: 'nowrap' }}>
                    (≈ {roundCurrency(rewardsTotalInUSD - lossTotalInUSD)} $)
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        <div style={{ minWidth: 190, margin: '0 30px' }}>
          <StabilityHistoryDialog />

          <div style={{ marginTop: '10px' }}>
            <StabilityUpdateDialog />
          </div>

          <Button variant="outlined" sx={{ marginY: '10px' }}>
            CLAIM
          </Button>
        </div>
      </div>
    </FeatureBox>
  );
}

export default StabilityPoolTable;
