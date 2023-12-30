'use client';

import { useQuery } from '@apollo/client';
import { Typography } from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { GetDebtTokensQuery, GetDebtTokensQueryVariables } from '../../../generated/gql-types';
import { GET_ALL_DEBT_TOKENS } from '../../../queries';
import { displayPercentage, percentageChange, roundCurrency, stdFormatter } from '../../../utils/math';
import FeatureBox from '../../FeatureBox/FeatureBox';
import DirectionIcon from '../../Icons/DirectionIcon';
import Label from '../../Label/Label';
import HeaderCell from '../../Table/HeaderCell';
import TreasuryTableLoader from './TreasuryTableLoader';

function TreasuryTable() {
  const { data } = useQuery<GetDebtTokensQuery, GetDebtTokensQueryVariables>(GET_ALL_DEBT_TOKENS);

  if (!data) return <TreasuryTableLoader />;

  const debtTokensInReserve = data.getDebtTokens.filter(({ totalReserve }) => totalReserve > 0);

  return (
    <FeatureBox title="Treasury" noPadding border="full" borderRadius>
      <TableContainer>
        <Table data-testid="apollon-treasury-table">
          <TableHead>
            <TableRow>
              <HeaderCell title="Deposited Token" cellProps={{ colSpan: 2, align: 'right' }} />
              <HeaderCell title="Difference from 30d average" cellProps={{ colSpan: 2, align: 'right' }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {debtTokensInReserve.map(({ token, totalReserve, totalReserve30dAverage }, index) => (
              <TableRow hover key={token.address}>
                <TableCell
                  align="right"
                  sx={{ borderBottom: index === debtTokensInReserve.length - 1 ? 'none' : '', pr: 0 }}
                >
                  {stdFormatter.format(totalReserve)}
                </TableCell>
                <TableCell width={50} sx={{ borderBottom: index === debtTokensInReserve.length - 1 ? 'none' : '' }}>
                  <Label variant="none">{token.symbol}</Label>
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ borderBottom: index === debtTokensInReserve.length - 1 ? 'none' : '', pr: 0 }}
                >
                  {roundCurrency(totalReserve - totalReserve30dAverage, 5)}
                </TableCell>
                <TableCell width={125} sx={{ borderBottom: index === debtTokensInReserve.length - 1 ? 'none' : '' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography
                      fontWeight={400}
                      color={percentageChange(totalReserve, totalReserve30dAverage) > 0 ? 'success.main' : 'error.main'}
                    >
                      {displayPercentage(percentageChange(totalReserve, totalReserve30dAverage), 'positive')}
                    </Typography>

                    <DirectionIcon showIncrease={percentageChange(totalReserve, totalReserve30dAverage) > 0} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </FeatureBox>
  );
}

export default TreasuryTable;
