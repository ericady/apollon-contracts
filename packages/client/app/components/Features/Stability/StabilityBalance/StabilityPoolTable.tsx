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
import DiagramPlaceholder from '../../../Loader/DiagramPlaceholder';
import HeaderCell from '../../../Table/HeaderCell';
import StabilityHistoryDialog from '../StabilityHistoryDialog';
import StabilityUpdateDialog from '../StabilityUpdateDialog';
import StabilityPoolTableLoader from './StabilityPoolTableLoader';

function StabilityPoolTable() {
  const {
    address,
    contracts: { stabilityPoolManagerContract },
  } = useEthers();

  const { data: collateralData, loading: collateralDataLoading } = useQuery<
    GetCollateralTokensQuery,
    GetCollateralTokensQueryVariables
  >(GET_BORROWER_COLLATERAL_TOKENS, {
    variables: { borrower: address },
    skip: !address,
  });
  const { data: debtData, loading: debtDataLoading } = useQuery<
    GetBorrowerDebtTokensQuery,
    GetBorrowerDebtTokensQueryVariables
  >(GET_BORROWER_DEBT_TOKENS, {
    variables: {
      borrower: address,
    },
    skip: !address,
  });

  if ((!collateralData && collateralDataLoading) || (!debtData && debtDataLoading)) {
    return <StabilityPoolTableLoader />;
  }

  const rewards =
    collateralData?.getCollateralTokens.filter(({ stabilityGainedAmount }) => stabilityGainedAmount > 0) ?? [];
  const stabilityLost =
    debtData?.getDebtTokens.filter(
      ({ compoundedDeposit, providedStability }) => compoundedDeposit > 0 || providedStability > 0,
    ) ?? [];

  const rewardsTotalInUSD = rewards.reduce(
    (acc, { stabilityGainedAmount, token }) => acc + stabilityGainedAmount * token.priceUSD,
    0,
  );
  const lossTotalInUSD = stabilityLost.reduce(
    (acc, { compoundedDeposit, token, providedStability }) =>
      acc + (providedStability - compoundedDeposit) * token.priceUSD,
    0,
  );

  const listLength = Math.max(rewards.length, stabilityLost.length);

  const withdrawRewards = async () => {
    await stabilityPoolManagerContract.withdrawGains();
  };

  return (
    <FeatureBox title="Stability Pool" noPadding border="full" borderRadius>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <TableContainer>
          <Table
            sx={{ borderRight: '1px solid', borderColor: 'background.emphasis' }}
            data-testid="apollon-stability-pool-table"
          >
            <TableHead>
              <TableRow>
                <HeaderCell title="Provided Stability" cellProps={{ colSpan: 2 }} />
                <HeaderCell title="Remaining" cellProps={{ sx: { pl: 0 } }} />
                <HeaderCell title="Gained collateral" cellProps={{ align: 'right', colSpan: 2 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {address ? (
                <>
                  {Array(listLength)
                    .fill(null)
                    .map((_, index) => {
                      const { compoundedDeposit, token: lostToken, providedStability } = stabilityLost[index] ?? {};
                      const { stabilityGainedAmount, token: rewardToken } = rewards[index] ?? {};
                      const noBorder = index === listLength - 1;

                      return (
                        <TableRow hover key={index}>
                          <TableCell sx={noBorder ? { borderBottom: 'none', pr: 0 } : { pr: 0 }} align="right">
                            {!isNaN(providedStability) ? roundCurrency(providedStability, 5) : null}
                          </TableCell>

                          <TableCell
                            width={40}
                            align="right"
                            sx={noBorder ? { borderBottom: 'none' } : {}}
                            data-testid="apollon-stability-pool-table-lost-token"
                          >
                            {lostToken && <Label variant="error">{lostToken.symbol}</Label>}
                          </TableCell>
                          <TableCell sx={noBorder ? { borderBottom: 'none', pl: 0 } : { pl: 0 }}>
                            {!isNaN(compoundedDeposit) ? roundCurrency(compoundedDeposit, 5) : null}
                          </TableCell>
                          <TableCell sx={noBorder ? { borderBottom: 'none', pr: 0 } : { pr: 0 }} align="right">
                            {!isNaN(stabilityGainedAmount) ? roundCurrency(stabilityGainedAmount, 5) : null}
                          </TableCell>
                          <TableCell
                            width={50}
                            align="right"
                            sx={noBorder ? { borderBottom: 'none' } : {}}
                            data-testid="apollon-stability-pool-table-reward-token"
                          >
                            {rewardToken && <Label variant="success">{rewardToken.symbol}</Label>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  <TableRow>
                    <TableCell sx={{ borderBottom: 'none' }} colSpan={2}></TableCell>
                    <TableCell sx={{ borderBottom: 'none' }}></TableCell>

                    <TableCell sx={{ borderBottom: 'none' }} colSpan={2} align="right">
                      {address
                        ? `+ ${displayPercentage(
                            percentageChange(rewardsTotalInUSD, lossTotalInUSD),
                          )} (≈ ${roundCurrency(rewardsTotalInUSD - lossTotalInUSD)} $)`
                        : null}
                    </TableCell>
                  </TableRow>
                </>
              ) : (
                <TableRow>
                  <TableCell sx={{ borderBottom: 'none' }} colSpan={4}>
                    <DiagramPlaceholder fullWidth />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <div style={{ minWidth: 190, margin: '0 30px' }}>
          <StabilityHistoryDialog />

          <div style={{ marginTop: '10px' }}>
            <StabilityUpdateDialog />
          </div>

          <Button
            variant="outlined"
            sx={{ marginY: '10px' }}
            disabled={!address || rewards.length === 0}
            onClick={async () => await withdrawRewards()}
          >
            CLAIM
          </Button>
        </div>
      </div>
    </FeatureBox>
  );
}

export default StabilityPoolTable;
