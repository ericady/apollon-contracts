import { useQuery } from '@apollo/client';
import { Box, Typography } from '@mui/material';
import { useSelectedToken } from '../../context/SelectedTokenProvider';
import { GetSelectedTokenQuery, GetSelectedTokenQueryVariables } from '../../generated/gql-types';
import { GET_SELECTED_TOKEN } from '../../queries';
import { dangerouslyConvertBigIntToNumber, displayPercentage, percentageChange, roundCurrency } from '../../utils/math';

function TradingViewHeader() {
  const { selectedToken } = useSelectedToken();

  const { data } = useQuery<GetSelectedTokenQuery, GetSelectedTokenQueryVariables>(GET_SELECTED_TOKEN, {
    variables: {
      address: selectedToken?.address as string,
    },
    skip: !selectedToken,
  });

  console.log('data.token.priceUSDOracle: ', data?.token.priceUSDOracle, typeof data?.token.priceUSDOracle);

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
          24h Volume
          <Box sx={{ color: 'text.primary', display: 'inline', ml: '8px' }}>
            {selectedToken ? roundCurrency(dangerouslyConvertBigIntToNumber(selectedToken.volume30dUSD)) : '-'}
          </Box>{' '}
          $
        </Typography>
        <Typography variant="subtitle1" fontFamily="Space Grotesk Variable">
          Pool
          <Box sx={{ color: 'text.primary', display: 'inline', ml: '8px' }}>
            {selectedToken ? roundCurrency(dangerouslyConvertBigIntToNumber(selectedToken.priceUSD)) : ' -'}
          </Box>{' '}
          $
        </Typography>
        <Typography variant="subtitle1" fontFamily="Space Grotesk Variable">
          Oracle
          <Box sx={{ color: 'text.primary', display: 'inline', ml: '8px' }}>
            {data ? roundCurrency(dangerouslyConvertBigIntToNumber(data.token.priceUSDOracle)) : ' -'}
          </Box>{' '}
          $
        </Typography>
        <Typography variant="subtitle1" fontFamily="Space Grotesk Variable">
          Premium
          <Box sx={{ color: 'text.primary', display: 'inline', ml: '8px' }}>
            {data && selectedToken
              ? displayPercentage(
                  percentageChange(
                    dangerouslyConvertBigIntToNumber(selectedToken.priceUSD),
                    dangerouslyConvertBigIntToNumber(data.token.priceUSDOracle),
                  ),
                  'positive',
                )
              : ' -'}
          </Box>
        </Typography>
        <Typography variant="subtitle1" fontFamily="Space Grotesk Variable">
          Swap Fee
          <Box sx={{ color: 'text.primary', display: 'inline', ml: '8px' }}>
            {selectedToken ? displayPercentage(dangerouslyConvertBigIntToNumber(selectedToken.swapFee, 6)) : ' -'}
          </Box>
        </Typography>
      </div>
    </div>
  );
}

export default TradingViewHeader;
