import { Box, Typography } from '@mui/material';
import { useSelectedToken } from '../../context/SelectedTokenProvider';
import { roundCurrency } from '../../utils/math';

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

        <Typography variant="titleAlternate">
          O <Box sx={{ color: 'text.primary', display: 'inline' }}>-</Box>
        </Typography>
        <Typography variant="titleAlternate">
          H <Box sx={{ color: 'text.primary', display: 'inline' }}>-</Box>
        </Typography>
        <Typography variant="titleAlternate">
          L <Box sx={{ color: 'text.primary', display: 'inline' }}>-</Box>
        </Typography>
        <Typography variant="titleAlternate">
          C <Box sx={{ color: 'text.primary', display: 'inline' }}>-</Box>
        </Typography>
      </div>

      <Typography variant="titleAlternate" fontWeight={400} noWrap>
        24h Volume{' '}
        <Box sx={{ color: 'text.primary', display: 'inline' }}>{roundCurrency(selectedToken?.volume24hUSD ?? 0)}</Box> $
      </Typography>
    </div>
  );
}

export default TradingViewHeader;
