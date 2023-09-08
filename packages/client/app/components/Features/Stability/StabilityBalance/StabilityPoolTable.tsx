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
import { BUTTON_BORDER } from '../../../../theme';
import { roundCurrency } from '../../../../utils/math';
import FeatureBox from '../../../FeatureBox/FeatureBox';
import Label from '../../../Label/Label';
import HeaderCell from '../../../Table/HeaderCell';
import StabilityHistoryDialog from '../StabilityHistoryDialog';
import StabilityUpdateDialog from '../StabilityUpdateDialog';
import StabilityPoolTableLoader from './StabilityPoolTableLoader';

function StabilityPoolTable() {
  const { address } = useEthers();

  const { data } = useQuery<GetBorrowerRewardsQuery, GetBorrowerRewardsQueryVariables>(GET_BORROWER_REWARDS, {
    variables: {
      borrower: address,
    },
  });

  if (!data) {
    return <StabilityPoolTableLoader />;
  }

  const rewards = data.getPools.flatMap(({ rewards }) => rewards);
  const rewardsValue = rewards.reduce((acc, { amount, token }) => acc + amount * token.priceUSD, 0);

  return (
    <FeatureBox title="Stability Pool" noPadding border="full" borderRadius>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <TableContainer>
          <Table sx={{ borderRight: '1px solid', borderColor: BUTTON_BORDER }}>
            <TableHead>
              <TableRow>
                <HeaderCell title="Lost Stability" />
                <HeaderCell title="" />
                <HeaderCell title="Gained collateral" />
              </TableRow>
            </TableHead>
            <TableBody>
              {rewards.map(({ amount, token }, index) => (
                <TableRow key={index}>
                  <TableCell sx={index === rewards.length - 1 ? { borderBottom: 'none' } : {}}></TableCell>
                  <TableCell sx={index === rewards.length - 1 ? { borderBottom: 'none' } : {}} align="right">
                    {roundCurrency(amount, 5)}
                  </TableCell>
                  <TableCell sx={index === rewards.length - 1 ? { borderBottom: 'none' } : {}}>
                    <Label variant="success">{token.symbol}</Label>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell sx={{ borderBottom: 'none' }}></TableCell>
                <TableCell sx={{ borderBottom: 'none' }}></TableCell>
                <TableCell sx={{ borderBottom: 'none' }}>(≈ {roundCurrency(rewardsValue)}$)</TableCell>
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
