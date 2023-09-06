import { useQuery } from '@apollo/client';
import { Box, Typography, useTheme } from '@mui/material';
import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, Tooltip } from 'recharts';
import { GetCollateralUsdHistoryQuery, GetCollateralUsdHistoryQueryVariables } from '../../../../generated/gql-types';
import { GET_COLLATERAL_USD_HISTORY } from '../../../../queries';
import { BUTTON_BACKGROUND, BUTTON_BORDER } from '../../../../theme';
import DiagramPlaceholder from '../../../Loader/DiagramPlaceholder';

function CollateralBalanceChart() {
  const theme = useTheme();

  const { data } = useQuery<GetCollateralUsdHistoryQuery, GetCollateralUsdHistoryQueryVariables>(
    GET_COLLATERAL_USD_HISTORY,
  );

  const chartData = useMemo(() => {
    return (
      data?.getCollateralUSDHistory.map(([timeStamp, value]) => ({
        timeStamp,
        value,
      })) ?? []
    );
  }, [data]);

  if (chartData.length === 0) return <DiagramPlaceholder />;

  const totalValueLocked = chartData[chartData.length - 1].value;

  return (
    <div style={{ background: BUTTON_BACKGROUND }}>
      <LineChart width={320} height={190} data={chartData}>
        <Tooltip />

        <CartesianGrid stroke={BUTTON_BORDER} />

        <Line type="linear" dataKey="value" stroke={theme.palette.info.main} dot={false} isAnimationActive={false} />
      </LineChart>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, pt: 0.5, pb: 1, px: 2 }}>
        <Typography variant="titleAlternate" color="info.main">
          ≈ {totalValueLocked}
        </Typography>

        <Typography variant="titleAlternate">$</Typography>
      </Box>
    </div>
  );
}

export default CollateralBalanceChart;
