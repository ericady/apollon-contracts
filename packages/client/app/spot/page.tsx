import 'gridstack/dist/gridstack.css';

import Box from '@mui/material/Box';
import Assets from '../components/Features/Assets/Assets';
import Farm from '../components/Features/Farm/Farm';
import Positions from '../components/Features/Positions/Positions';
import Swap from '../components/Features/Swap/Swap';
import ResizeableDiv from '../components/GridStack/ResizeableDiv';
import SpotWidgetGridStack from '../components/GridStack/SpotWidgetGridStack';
import TradingView from '../components/TradingView/TradingView';

function Spot() {
  return (
    <div
      style={{
        height: 'calc(100vh - 52px)',
        display: 'flex',
      }}
    >
      <Box
        sx={{
          borderRight: '1px solid',
          borderRightColor: 'background.paper',
          overflowY: 'scroll',
          minWidth: '335px',
          // After that it looks broken and is way too small anyway
          maxWidth: '760px',
          width: '20vw',
        }}
      >
        <SpotWidgetGridStack>
          <Assets />
          <Swap />
          <Farm />
        </SpotWidgetGridStack>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          width: '80vw',
        }}
      >
        <TradingView />
        <Box>
          <ResizeableDiv>
            <Positions />
          </ResizeableDiv>
        </Box>
      </Box>
    </div>
  );
}

export default Spot;
