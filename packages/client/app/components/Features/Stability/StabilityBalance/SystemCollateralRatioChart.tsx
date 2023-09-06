import { useQuery } from '@apollo/client';
import { Box, Typography, useTheme } from '@mui/material';
import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, Tooltip } from 'recharts';
import {
  GetCollateralRatioHistoryQuery,
  GetCollateralRatioHistoryQueryVariables,
} from '../../../../generated/gql-types';
import { GET_COLLATERAL_RATIO_HISTORY } from '../../../../queries';
import { BUTTON_BACKGROUND, BUTTON_BORDER } from '../../../../theme';
import DiagramPlaceholder from '../../../Loader/DiagramPlaceholder';

function SystemCollateralRatioChart() {
  const theme = useTheme();

  const { data } = useQuery<GetCollateralRatioHistoryQuery, GetCollateralRatioHistoryQueryVariables>(
    GET_COLLATERAL_RATIO_HISTORY,
  );

  const chartData = useMemo(() => {
    return (
      data?.getCollateralRatioHistory.map(([timeStamp, value]) => ({
        timeStamp,
        value,
      })) ?? []
    );
  }, [data]);

  if (chartData.length === 0) return <DiagramPlaceholder />;

  return (
    <div style={{ background: BUTTON_BACKGROUND }}>
      <LineChart width={320} height={190} data={chartData}>
        <Tooltip />

        <CartesianGrid stroke={BUTTON_BORDER} />

        <Line type="linear" dataKey="value" stroke={theme.palette.info.main} dot={false} isAnimationActive={false} />
      </LineChart>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, pt: 0.5, pb: 1, px: 2 }}>
        <Typography variant="titleAlternate" color="info.main">
          123
        </Typography>

        <Typography variant="titleAlternate">%</Typography>
      </Box>
    </div>
  );
}

export default SystemCollateralRatioChart;