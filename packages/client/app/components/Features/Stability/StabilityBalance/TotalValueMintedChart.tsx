import { useQuery } from '@apollo/client';
import { Box, Typography, useTheme } from '@mui/material';
import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, Tooltip } from 'recharts';
import { GetDebtUsdHistoryQuery, GetDebtUsdHistoryQueryVariables } from '../../../../generated/gql-types';
import { GET_DEBT_USD_HISTORY } from '../../../../queries';
import { BACKGROUND_EMPHASIS, BUTTON_BACKGROUND } from '../../../../theme';
import { stdFormatter } from '../../../../utils/math';
import DiagramPlaceholder from '../../../Loader/DiagramPlaceholder';

function TotalValueMintedChart() {
  const theme = useTheme();

  const { data } = useQuery<GetDebtUsdHistoryQuery, GetDebtUsdHistoryQueryVariables>(GET_DEBT_USD_HISTORY);

  const chartData = useMemo(() => {
    return (
      data?.getDebtUSDHistory.map(([timeStamp, value]) => ({
        timeStamp,
        value,
      })) ?? []
    );
  }, [data]);

  if (chartData.length === 0) return <DiagramPlaceholder />;

  const totalValueMintedChart = chartData[chartData.length - 1].value;

  return (
    <div style={{ background: BUTTON_BACKGROUND }}>
      <LineChart width={320} height={190} data={chartData}>
        <Tooltip />

        <CartesianGrid stroke={BACKGROUND_EMPHASIS} />

        <Line type="linear" dataKey="value" stroke={theme.palette.info.main} dot={false} isAnimationActive={false} />
      </LineChart>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, pt: 0.5, pb: 1, px: 2 }}>
        <Typography variant="titleAlternate" color="info.main">
          ≈ {stdFormatter.format(totalValueMintedChart)}
        </Typography>

        <Typography variant="titleAlternate">$</Typography>
      </Box>
    </div>
  );
}

export default TotalValueMintedChart;
