import Box from '@mui/material/Box';
import Assets from '../components/Features/Assets/Assets';
import Farm from '../components/Features/Farm/Farm';
import Positions from '../components/Features/Positions/Positions';
import Swap from '../components/Features/Swap/Swap';

function Balance() {
  return (
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
          borderBottom: '1px solid',
          borderBottomColor: 'background.paper',
        }}
      >
        <Assets />
      </Box>
      <Box
        style={{
          gridArea: 'swap',
        }}
      >
        <Swap />
      </Box>
      <Box
        style={{
          gridArea: 'farm',
        }}
      >
        <Farm />
      </Box>

      <Box
        style={{
          gridArea: 'trading',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}
      >
        <Positions />
      </Box>
    </div>
  );
}

export default Balance;
