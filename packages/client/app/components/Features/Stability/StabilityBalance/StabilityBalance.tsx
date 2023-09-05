'use client';

import { useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { useEthers } from '../../../../context/EthersProvider';
import { GetBorrowerRewardsQuery, GetBorrowerRewardsQueryVariables } from '../../../../generated/gql-types';
import { GET_BORROWER_REWARDS } from '../../../../queries';
import { roundCurrency } from '../../../../utils/math';
import FeatureBox from '../../../FeatureBox/FeatureBox';
import Label from '../../../Label/Label';
import DiagramPlaceholder from '../../../Loader/DiagramPlaceholder';
import HeaderCell from '../../../Table/HeaderCell';
import StabilityHistoryDialog from '../StabilityHistoryDialog';
import StabilityUpdateDialog from '../StabilityUpdateDialog';
import StabilityBalanceLoader from './StabilityBalanceLoader';
import TotalValueMintedChart from './TotalValueMintedChart';

function StabilityBalance() {
  const { address } = useEthers();

  const { data } = useQuery<GetBorrowerRewardsQuery, GetBorrowerRewardsQueryVariables>(GET_BORROWER_REWARDS, {
    variables: {
      borrower: address,
    },
  });

  if (!data) {
    return <StabilityBalanceLoader />;
  }

  const rewards = data.getPools.flatMap(({ rewards }) => rewards);
  const rewardsValue = rewards.reduce((acc, { amount, token }) => acc + amount * token.priceUSD, 0);

  return (
    <FeatureBox title="Debt" headBorder="bottom" icon="green">
      <div style={{ display: 'flex', width: '100%' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', flexDirection: 'column' }}>
          <div style={{ padding: '20px 10px 0 0' }}>
            <FeatureBox title="Total value minted" border="full" noPadding>
              <TotalValueMintedChart />
            </FeatureBox>
          </div>

          <div style={{ padding: '20px 10px 0 0' }}>
            <FeatureBox title="System collateral ratio" border="full" noPadding>
              <DiagramPlaceholder />
            </FeatureBox>
          </div>
        </div>

        <div style={{ display: 'flex', width: '100%', flexWrap: 'wrap', flexDirection: 'column' }}>
          <div style={{ padding: '20px 0 0 10px' }}>
            <FeatureBox title="Stability Pool" noPadding border="full">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <TableContainer>
                  <Table sx={{ borderRight: '1px solid #25222E' }}>
                    <TableHead>
                      <TableRow>
                        <HeaderCell title="Lost Stability" cellProps={{ align: 'right' }} />
                        <HeaderCell title="Gained collateral" cellProps={{ align: 'right' }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rewards.map(({ amount, token }, index) => (
                        <TableRow key={index}>
                          <TableCell
                            sx={index === rewards.length - 1 ? { borderBottom: 'none' } : {}}
                            align="right"
                          ></TableCell>
                          <TableCell sx={index === rewards.length - 1 ? { borderBottom: 'none' } : {}} align="right">
                            {amount} <Label variant="success">{token.symbol}</Label>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell sx={{ borderBottom: 'none' }} align="right"></TableCell>
                        <TableCell sx={{ borderBottom: 'none' }} align="right">
                          (≈ {roundCurrency(rewardsValue)}$)
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
          </div>

          <div style={{ padding: '20px 0 0 10px' }}>
            <FeatureBox title="Debt Token" noPadding border="full">
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <HeaderCell title="Minted" cellProps={{ align: 'right' }} />
                      <HeaderCell title="Deposited Stability" cellProps={{ align: 'right' }} />
                      <HeaderCell title="Token" cellProps={{ align: 'right' }} />
                      <HeaderCell title="Total Supply" cellProps={{ align: 'right' }} />
                      <HeaderCell title="Total Stability" cellProps={{ align: 'right' }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </FeatureBox>
          </div>
        </div>
      </div>
    </FeatureBox>
  );
}

export default StabilityBalance;
