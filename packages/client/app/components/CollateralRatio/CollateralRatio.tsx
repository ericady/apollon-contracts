import { Box, Typography } from '@mui/material';
import { displayPercentage } from '../../utils/math';

type Props = {
  newRatio: number;
  oldRatio: number;
  criticalRatio: number;
  scaleMin?: number;
  scaleMax?: number;
};

function CollateralRatio({ criticalRatio, newRatio, oldRatio, scaleMax = 2, scaleMin = 1 }: Props) {
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
            zIndex: -1,
          }}
        ></Box>
        <Box
          sx={{
            position: 'absolute',

            width: `${newPosition * 100}%`,
            height: '100%',
            borderRight: '2px solid',
            borderColor: 'primary.contrastText',
            zIndex: -1,
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
        <Typography variant="titleAlternate">{displayPercentage(scaleMin, false, 0)}</Typography>
        <Typography variant="titleAlternate">{displayPercentage(scaleMax, false, 0)}</Typography>
      </div>
    </>
  );
}

export default CollateralRatio;
