'use client';

import { useQuery } from '@apollo/client';
import { Box, Typography, useTheme } from '@mui/material';
import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, Tooltip } from 'recharts';
import { GetReserveUsdHistoryQuery, GetReserveUsdHistoryQueryVariables } from '../../../generated/gql-types';
import { GET_RESERVE_USD_HISTORY } from '../../../queries';
import { DARK_BACKGROUND_EMPHASIS, LIGHT_BACKGROUND_EMPHASIS } from '../../../theme';
import { stdFormatter } from '../../../utils/math';
import DiagramPlaceholder from '../../Loader/DiagramPlaceholder';

function ReservePoolValueChart() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const { data } = useQuery<GetReserveUsdHistoryQuery, GetReserveUsdHistoryQueryVariables>(GET_RESERVE_USD_HISTORY);

  const chartData = useMemo(() => {
    return (
      data?.getReserveUSDHistory.map(([timeStamp, value]) => ({
        timeStamp,
        value,
      })) ?? []
    );
  }, [data]);

  if (chartData.length === 0) return <DiagramPlaceholder />;

  const reservePoolValue = chartData[chartData.length - 1].value;

  return (
    <Box sx={{ backgroundColor: 'table.border' }}>
      <LineChart width={320} height={190} data={chartData}>
        <Tooltip />

        <CartesianGrid stroke={isDarkMode ? DARK_BACKGROUND_EMPHASIS : LIGHT_BACKGROUND_EMPHASIS} />

        <Line type="linear" dataKey="value" stroke={theme.palette.info.main} dot={false} isAnimationActive={false} />
      </LineChart>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, pt: 0.5, pb: 1, px: 2 }}>
        <Typography variant="titleAlternate" color="info.main">
          ≈ {stdFormatter.format(reservePoolValue)}
        </Typography>

        <Typography variant="titleAlternate">$</Typography>
      </Box>
    </Box>
  );
}

export default ReservePoolValueChart;
