import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Box, Typography } from '@mui/material';
import { displayPercentage } from '../../utils/math';

type Props = {
  /**
   * white indicator marking the ratio after the action on the chart
   */
  newRatio: number;
  /**
   * blue indicator marking the ratio before the action on the chart. Area is marked with a gradient.
   */
  oldRatio: number;
  /**
   * red indicator marking the critical ratio on the chart. PUT THIS BETWEEN THE MIN AND MAX VALUES.
   */
  criticalRatio: number;
  /**
   * left scale for all chart values. Defaults to 1.
   */
  scaleMin?: number;
  /**
   * right scale for all chart values. Defaults to 2.
   */
  scaleMax?: number;

  /**
   * Shows the loading indicator without any data accessed.
   */
  loading?: boolean;
};

function CollateralRatioVisualization({
  criticalRatio,
  newRatio,
  oldRatio,
  scaleMax = 2,
  scaleMin = 1,
  loading = false,
}: Props) {
  if (loading) {
    return (
      <div
        style={{
          height: '31px',
          width: '100%',
          marginTop: 10,
          padding: '3px 10px',
          border: '2px solid #3C3945',
          borderRadius: 5,
          backgroundColor: '#282531',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <InfoOutlinedIcon sx={{ mr: '3px' }} color="primary" fontSize="small" />
        <Typography variant="titleAlternate">No Data to Show</Typography>
      </div>
    );
  }

  const scaleDelta = scaleMax - scaleMin;

  const criticalPosition = (criticalRatio - scaleMin) / scaleDelta;
  const oldPosition = (oldRatio - scaleMin) / scaleDelta;
  const newPosition = (newRatio - scaleMin) / scaleDelta;

  const colorAlpha = 0.6 * oldPosition;

  return (
    <>
      <Box
        sx={{
          width: '100%',
          height: 20,
          borderRadius: 0.5,
          overflow: 'clip',
          marginTop: '30px',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            position: 'absolute',

            width: `${oldPosition * 100}%`,
            height: '100%',
            background: `linear-gradient(to right, rgba(51, 182, 255, 0), rgba(51, 182, 255, ${colorAlpha}))`,
            borderRight: '2px solid',
            borderColor: 'info.main',
          }}
        ></Box>
        <Box
          sx={{
            position: 'absolute',
            width: `${criticalPosition * 100}%`,
            height: '100%',
            borderRight: '2px solid',
            borderColor: 'error.main',
          }}
        ></Box>
        <Box
          sx={{
            position: 'absolute',
            width: `${newPosition * 100}%`,
            height: '100%',
            borderRight: '2px solid',
            borderColor: 'primary.contrastText',
          }}
        ></Box>
        <div
          style={{
            marginTop: -20,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Box
            sx={{
              width: `${oldPosition * 100}%`,
              height: 2,
              backgroundColor: 'info.main',
              zIndex: 1,
            }}
          ></Box>
          <Box
            sx={{
              width: `${(1 - oldPosition) * 100}%`,
              height: 2,
              backgroundColor: 'background.paper',
            }}
          ></Box>
        </div>
      </Box>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <Typography variant="titleAlternate">{displayPercentage(scaleMin, 'default', 0)}</Typography>
        <Typography variant="titleAlternate">{displayPercentage(scaleMax, 'default', 0)}</Typography>
      </div>
    </>
  );
}

export default CollateralRatioVisualization;
