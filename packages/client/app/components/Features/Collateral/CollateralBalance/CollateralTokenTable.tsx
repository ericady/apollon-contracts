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
import {
  GetBorrowerCollateralTokensQuery,
  GetBorrowerCollateralTokensQueryVariables,
} from '../../../../generated/gql-types';
import { GET_BORROWER_COLLATERAL_TOKENS } from '../../../../queries';
import {
  bigIntStringToFloat,
  dangerouslyConvertBigIntToNumber,
  displayPercentage,
  percentageChange,
  roundCurrency,
  stdFormatter,
} from '../../../../utils/math';
import FeatureBox from '../../../FeatureBox/FeatureBox';
import DirectionIcon from '../../../Icons/DirectionIcon';
import Label from '../../../Label/Label';
import HeaderCell from '../../../Table/HeaderCell';
import CloseTroveDialog from '../CloseTroveDialog';
import CollateralUpdateDialog from '../CollateralUpdateDialog';
import CollateralTokenTableLoader from './CollateralTokenTableLoader';
import CollSurplus from '../CollSurplus';

const CollateralTokenTable = () => {
  const { address } = useEthers();

  const { data } = useQuery<GetBorrowerCollateralTokensQuery, GetBorrowerCollateralTokensQueryVariables>(
    GET_BORROWER_COLLATERAL_TOKENS,
    {
      variables: {
        borrower: address,
      },
    },
  );

  if (!data) {
    return <CollateralTokenTableLoader />;
  }

  return (<>
      <CollSurplus />
    <FeatureBox title="Collateral Token" noPadding border="full" borderRadius>
      <div>


        <TableContainer>
          <Table size="small" data-testid="apollon-collateral-token-table">
            <TableHead>
              <TableRow>
                <HeaderCell title="Wallet" cellProps={{ align: 'right', sx: { borderRight: '1px solid' } }} />
                <HeaderCell title="Your Trove" cellProps={{ align: 'right', sx: { borderRight: '1px solid' } }} />
                <HeaderCell title="Token" />
                <HeaderCell title="TVL" cellProps={{ align: 'right', colSpan: 2 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {data.collateralTokenMetas
                .map((collToken) => ({
                  ...collToken,
                  totalValueLockedUSD: bigIntStringToFloat(collToken.totalValueLockedUSD),
                  totalValueLockedUSD30dAverage: bigIntStringToFloat(collToken.totalValueLockedUSD30dAverage.value),
                }))
                .map(
                  ({ token, totalValueLockedUSD, totalValueLockedUSD30dAverage, troveLockedAmount, walletAmount }) => (
                    <TableRow hover key={token.address}>
                      <TableCell align="right" sx={{ borderRight: '1px solid', borderColor: 'table.border' }}>
                        {roundCurrency(dangerouslyConvertBigIntToNumber(walletAmount, 12, 6), 5, 5)}
                      </TableCell>
                      <TableCell align="right" sx={{ borderRight: '1px solid', borderColor: 'table.border' }}>
                        {roundCurrency(dangerouslyConvertBigIntToNumber(troveLockedAmount, 12, 6), 5, 5)}
                      </TableCell>
                      <TableCell>
                        <Label variant="none">{token.symbol}</Label>
                      </TableCell>
                      <TableCell align="right" sx={{ pr: 0 }}>
                        {stdFormatter.format(totalValueLockedUSD)}
                      </TableCell>
                      <TableCell width={125}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography
                            fontWeight={400}
                            color={
                              percentageChange(totalValueLockedUSD, totalValueLockedUSD30dAverage) > 0
                                ? 'success.main'
                                : 'error.main'
                            }
                          >
                            {displayPercentage(
                              percentageChange(totalValueLockedUSD, totalValueLockedUSD30dAverage),
                              'positive',
                            )}
                          </Typography>
                          <DirectionIcon
                            showIncrease={percentageChange(totalValueLockedUSD, totalValueLockedUSD30dAverage) > 0}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ),
                )}

              <TableRow>
                <TableCell
                  sx={{ borderBottom: 'none', borderRight: '1px solid', borderColor: 'table.border', padding: '2px' }}
                ></TableCell>
                <TableCell
                  sx={{ borderBottom: 'none', borderRight: '1px solid', borderColor: 'table.border', padding: '2px' }}
                >
                  <CollateralUpdateDialog buttonVariant="text" buttonSx={{ p: '6px 8px', width: '100%' }} />
                </TableCell>
                <TableCell style={{ borderBottom: 'none', padding: '2px' }} colSpan={3} align="center">
                  <CloseTroveDialog buttonVariant="text" buttonSx={{ p: '6px 8px', width: '250px' }} />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </FeatureBox>

  </>

  );
};

export default CollateralTokenTable;
