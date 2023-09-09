import { useQuery } from '@apollo/client';
import { Box } from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useMemo } from 'react';
import { useEthers } from '../../../context/EthersProvider';
import { GetCollateralTokensQuery, GetCollateralTokensQueryVariables } from '../../../generated/gql-types';
import { GET_BORROWER_COLLATERAL_TOKENS } from '../../../queries';
import { displayPercentage, roundCurrency } from '../../../utils/math';
import Label from '../../Label/Label';
import HeaderCell from '../../Table/HeaderCell';
import CollateralPieVisualization from '../../Visualizations/CollateralPieVisualization';
import CollateralRatioVisualization from '../../Visualizations/CollateralRatioVisualization';
import CollateralUpdateDialog from './CollateralUpdateDialog';

const generateColorPalette = (paletteLength: number) => {
  // Initialize an array with the first 3 fixed colors
  const colors = ['#3DD755', '#E04A4A', '#33B6FF'];

  // Add 5 well-matching colors
  const matchingColors = ['#FFA07A', '#8A2BE2', '#5F9EA0', '#D2691E', '#FFD700'];
  colors.push(...matchingColors);

  // Generate random colors for the remaining spots
  while (colors.length < paletteLength) {
    const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
    colors.push(randomColor);
  }

  // Slice the array to the desired length
  return colors.slice(0, paletteLength);
};

function CollateralTable() {
  const { address } = useEthers();

  const { data } = useQuery<GetCollateralTokensQuery, GetCollateralTokensQueryVariables>(
    GET_BORROWER_COLLATERAL_TOKENS,
    {
      variables: { borrower: address },
    },
  );

  const borrowerCollateralTokens = useMemo(() => {
    const colorPalette: string[] = data ? generateColorPalette(data.getCollateralTokens.length) : [];

    return (
      data?.getCollateralTokens
        .filter(({ troveLockedAmount, walletAmount }) => walletAmount! > 0 || troveLockedAmount! > 0)
        .map((token) => ({
          ...token,
          chartColor: colorPalette.shift(),
          troveValueUSD: parseFloat(roundCurrency(token.troveLockedAmount ?? 0 * token.token.priceUSD)),
        })) ?? []
    );
  }, [data]);

  console.log('borrowerCollateralTokens: ', borrowerCollateralTokens);

  if (!data) return null;

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ width: '40%', display: 'flex', justifyContent: 'center' }}>
        <CollateralPieVisualization borrowerCollateralTokens={borrowerCollateralTokens} />
      </div>
      <div style={{ width: '100%' }}>
        <div style={{ padding: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <Typography
                sx={{ fontFamily: 'Space Grotesk Variable', color: 'info.main', fontWeight: '700', fontSize: '20px' }}
              >
                {displayPercentage(1.74, false, 0)}
              </Typography>

              <img
                src="assets/svgs/Star24_white.svg"
                alt="White colored diamond shape"
                height="11"
                typeof="image/svg+xml"
              />

              <Typography variant="h4">Collateral Ratio</Typography>
            </Box>
            <CollateralUpdateDialog collateralData={data} buttonVariant="outlined" />
          </div>
          <CollateralRatioVisualization criticalRatio={1.1} newRatio={1.5} oldRatio={1.74} />
        </div>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <HeaderCell title="Trove" cellProps={{ align: 'right' }} />
                <HeaderCell title="Wallet" cellProps={{ align: 'right' }} />
                <HeaderCell title="Symbol" cellProps={{ align: 'right' }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {borrowerCollateralTokens.map(({ token, walletAmount, troveLockedAmount, chartColor }) => (
                <TableRow key={token.address}>
                  <TableCell align="right">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" fill="none">
                        <path
                          fill={chartColor}
                          d="M4 0a6.449 6.449 0 0 0 4 4 6.449 6.449 0 0 0-4 4 6.449 6.449 0 0 0-4-4 6.449 6.449 0 0 0 4-4Z"
                        />
                      </svg>
                      <Typography color="primary.contrastText" fontSize={14.3}>
                        {roundCurrency(troveLockedAmount!, 5)}
                      </Typography>
                    </div>
                  </TableCell>
                  <TableCell align="right">{roundCurrency(walletAmount!, 5)}</TableCell>
                  <TableCell align="right">
                    <Label variant="none">{token.symbol}</Label>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  );
}

export default CollateralTable;
