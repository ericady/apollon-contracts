import { Box, Typography } from '@mui/material';
import { useSelectedToken } from '../../context/SelectedTokenProvider';
import { displayPercentage, roundCurrency } from '../../utils/math';

function TradingViewHeader() {
  const { selectedToken } = useSelectedToken();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        height: 74,
        marginLeft: 20,
        gap: 5,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <Typography variant="h6">{selectedToken ? selectedToken.symbol : '-'}</Typography>

        <img
          src="assets/svgs/Star24_green.svg"
          alt="Green colored diamond shape"
          height="11"
          typeof="image/svg+xml"
          style={{ marginLeft: 10, marginRight: 10 }}
        />

        <Typography variant="subtitle1" fontFamily="Space Grotesk Variable">
          Pool <Box sx={{ color: 'text.primary', display: 'inline' }}> -</Box>
        </Typography>
        <Typography variant="subtitle1" fontFamily="Space Grotesk Variable">
          Oracle <Box sx={{ color: 'text.primary', display: 'inline' }}> -</Box>
        </Typography>
        <Typography variant="subtitle1" fontFamily="Space Grotesk Variable">
          Premium <Box sx={{ color: 'text.primary', display: 'inline' }}> -</Box>
        </Typography>
        <Typography variant="subtitle1" fontFamily="Space Grotesk Variable">
          Opening Fee
          <Box sx={{ color: 'text.primary', display: 'inline' }}>
            {' '}
            {selectedToken ? displayPercentage(selectedToken.swapFee, 'positive') : ' -'}
          </Box>
        </Typography>
      </div>

      <Typography variant="subtitle1" fontWeight={400} fontFamily="Inter Variable">
        24h Volume
        <Box sx={{ color: 'text.primary', display: 'inline', ml: '8px' }}>
          {selectedToken ? roundCurrency(selectedToken.volume24hUSD) : '-'}
        </Box>{' '}
        $
      </Typography>
    </div>
  );
}

export default TradingViewHeader;
