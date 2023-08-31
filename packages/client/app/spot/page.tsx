import Box from '@mui/material/Box';
import Assets from '../components/Features/Assets/Assets';
import Farm from '../components/Features/Farm/Farm';
import Positions from '../components/Features/Positions/Positions';
import Swap from '../components/Features/Swap/Swap';
import SelectedTokenProvider from '../context/SelectedTokenProvider';

function Spot() {
  return (
    <SelectedTokenProvider>
      <div
        style={{
          height: 'calc(100vh - 64px)',
          display: 'grid',
          gridTemplateColumns: '1fr 4fr',
          gridTemplateRows: '1fr 1fr 1fr',
          gridTemplateAreas: `
    "asset trading"
    "swap trading"
    "farm trading"
`,
        }}
      >
        <Box
          sx={{
            gridArea: 'asset',
            borderRight: '1px solid',
            borderRightColor: 'background.paper',
          }}
        >
          <Assets />
        </Box>
        <Box
          sx={{
            gridArea: 'swap',
            borderRight: '1px solid',
            borderRightColor: 'background.paper',
          }}
        >
          <Swap />
        </Box>
        <Box
          sx={{
            gridArea: 'farm',
            borderRight: '1px solid',
            borderRightColor: 'background.paper',
          }}
        >
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
    </SelectedTokenProvider>
  );
}

export default Spot;
