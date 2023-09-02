import Box from '@mui/material/Box';
import Assets from '../components/Features/Assets/Assets';
import Farm from '../components/Features/Farm/Farm';
import Positions from '../components/Features/Positions/Positions';
import Swap from '../components/Features/Swap/Swap';

function Spot() {
  return (
    <div
      style={{
        height: 'calc(100vh - 52px)',
        display: 'grid',
        gridTemplateColumns: '1fr 4fr',
        gridTemplateRows: '1fr 1fr 1fr',
        gridTemplateAreas: `
    "widget trading"
    "widget trading"
    "widget trading"
`,
      }}
    >
      <Box
        sx={{
          gridArea: 'widget',
          borderRight: '1px solid',
          borderRightColor: 'background.paper',
          overflowY: 'scroll',
        }}
      >
        <Assets />
        <Swap />
        <Farm />
      </Box>

      <Box
        sx={{
          gridArea: 'trading',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}
      >
        <Box
          sx={{
            borderTop: '1px solid',
            borderTopColor: 'background.paper',
          }}
        >
          <Positions />
        </Box>
      </Box>
    </div>
  );
}

export default Spot;
