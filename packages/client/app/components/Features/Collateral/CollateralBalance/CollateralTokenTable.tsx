'use client';

import { useQuery } from '@apollo/client';
import { Typography } from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { useEthers } from '../../../../context/EthersProvider';
import { GetCollateralTokensQuery, GetCollateralTokensQueryVariables } from '../../../../generated/gql-types';
import { GET_ALL_COLLATERAL_TOKENS } from '../../../../queries';
import { displayPercentage, percentageChange, roundCurrency } from '../../../../utils/math';
import FeatureBox from '../../../FeatureBox/FeatureBox';
import Label from '../../../Label/Label';
import HeaderCell from '../../../Table/HeaderCell';
import CollateralUpdateDialog from '../CollateralUpdateDialog';
import CollateralTokenTableLoader from './CollateralTokenTableLoader';

const CollateralTokenTable = () => {
  const { address } = useEthers();

  const { data } = useQuery<GetCollateralTokensQuery, GetCollateralTokensQueryVariables>(GET_ALL_COLLATERAL_TOKENS, {
    variables: {
      borrower: address,
    },
  });

  if (!data) {
    return <CollateralTokenTableLoader />;
  }

  return (
    <FeatureBox title="Collateral Token" noPadding border="full">
      <div>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <HeaderCell title="Wallet" cellProps={{ align: 'right' }} />
                <HeaderCell title="Your Trove" cellProps={{ align: 'right' }} />
                <HeaderCell title="Token" cellProps={{ align: 'right' }} />
                <HeaderCell title="" />
                <HeaderCell title="TVL" cellProps={{ align: 'left' }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {data.getCollateralTokens.map(
                ({ token, totalValueLockedUSD, totalValueLockedUSD24hAgo, troveLockedAmount, walletAmount }) => (
                  <TableRow key={token.address}>
                    <TableCell align="right">{roundCurrency(walletAmount ?? 0, 5)}</TableCell>
                    <TableCell align="right">{roundCurrency(troveLockedAmount ?? 0, 5)}</TableCell>
                    <TableCell align="right">
                      <Label variant="none">{token.symbol}</Label>
                    </TableCell>
                    <TableCell align="right">{totalValueLockedUSD}</TableCell>
                    <TableCell align="left" sx={{ width: 70 }}>
                      <Typography
                        fontWeight={400}
                        color={
                          percentageChange(totalValueLockedUSD, totalValueLockedUSD24hAgo) > 0
                            ? 'success.main'
                            : 'error.main'
                        }
                      >
                        {displayPercentage(percentageChange(totalValueLockedUSD, totalValueLockedUSD24hAgo))}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ),
              )}

              <TableRow>
                <TableCell align="right" style={{ padding: '2px' }}></TableCell>
                <TableCell align="right" style={{ padding: '2px' }}>
                  <CollateralUpdateDialog collateralData={data} buttonVariant="text" buttonSx={{ p: '6px 8px' }} />
                </TableCell>
                <TableCell align="right" style={{ padding: '2px' }}></TableCell>
                <TableCell align="right" style={{ padding: '2px' }}></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </FeatureBox>
  );
};

export default CollateralTokenTable;
