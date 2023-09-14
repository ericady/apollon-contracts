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
        <Table>
          <TableHead>
            <TableRow>
              <HeaderCell title="" />
              <HeaderCell title="Deposited Token" />
              <HeaderCell title="" />
              <HeaderCell title="Last 24h Difference" />
            </TableRow>
          </TableHead>
          <TableBody>
            {debtTokensInReserve.map(({ token, totalReserve, totalReserve24hAgo }) => (
              <TableRow hover key={token.address}>
                <TableCell align="right" sx={{ pr: 0 }}>
                  {stdFormatter.format(totalReserve)}
                </TableCell>
                <TableCell>
                  <Label variant="none">{token.symbol}</Label>
                </TableCell>
                <TableCell align="right" sx={{ pr: 0 }}>
                  {roundCurrency(totalReserve - totalReserve24hAgo, 5)}
                </TableCell>
                <TableCell width={120}>
                  <div className="flex">
                    <Typography
                      fontWeight={400}
                      color={percentageChange(totalReserve, totalReserve24hAgo) > 0 ? 'success.main' : 'error.main'}
                    >
                      {displayPercentage(percentageChange(totalReserve, totalReserve24hAgo))}
                    </Typography>

                    <DirectionIcon showIncrease={percentageChange(totalReserve, totalReserve24hAgo) > 0} />
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
