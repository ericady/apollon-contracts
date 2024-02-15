import { useQuery } from '@apollo/client';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Box, Typography, useTheme } from '@mui/material';
import { useCallback, useEffect } from 'react';
import {
  GetBorrowerCollateralTokensQuery,
  GetBorrowerCollateralTokensQueryVariables,
  GetBorrowerDebtTokensQuery,
  GetBorrowerDebtTokensQueryVariables,
} from '../../generated/gql-types';
import { GET_BORROWER_COLLATERAL_TOKENS, GET_BORROWER_DEBT_TOKENS } from '../../queries';
import { bigIntStringToFloat, dangerouslyConvertBigIntToNumber, displayPercentage } from '../../utils/math';
import { useEthers } from '../../context/EthersProvider';

export const CRIT_RATIO = 1.1;

type Props = {
  /**
   * is used to calculate the white indicator marking the ratio after the action on the chart
   * value in USD that is added to the existing debt
   * In case this value is not specified the indicator for the new ratio will be dismissed.
   */
  addedDebtUSD?: number;

  /**
   * red indicator marking the critical ratio on the chart. PUT THIS BETWEEN THE MIN AND MAX VALUES.
   */
  criticalRatio?: number;

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

  /**
   * Used to update the ratio values outside of the component.
   *
   * @param newRatio is always updated on addedDebtUSD prop change. If all the debt can be extinguished it will be 0.
   * @param oldRatio will never change as long as the debt stays the same.
   */
  callback?: (newRatio: number, oldRatio: number, currentDebt: number, collateralValue: number) => void;
};

// TODO: Maybe move text into this component to have more efficient state updates and uniform loading state

function CollateralRatioVisualization({
  addedDebtUSD = 0,
  callback,
  criticalRatio = CRIT_RATIO,
  scaleMax = 2,
  scaleMin = 1,
  loading = false,
}: Props) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const { address } = useEthers();

  const { data: debtData } = useQuery<GetBorrowerDebtTokensQuery, GetBorrowerDebtTokensQueryVariables>(
    GET_BORROWER_DEBT_TOKENS,
    {
      variables: { borrower: address },
      skip: !address,
    },
  );

  const { data: collateralData } = useQuery<
    GetBorrowerCollateralTokensQuery,
    GetBorrowerCollateralTokensQueryVariables
  >(GET_BORROWER_COLLATERAL_TOKENS, {
    variables: { borrower: address },
    skip: !address,
  });

  const debtValue =
    debtData?.debtTokenMetas
      .filter(({ troveMintedAmount }) => troveMintedAmount > 0)
      .reduce(
        (acc, { troveMintedAmount, token }) =>
          acc + dangerouslyConvertBigIntToNumber(troveMintedAmount!, 9, 9) * bigIntStringToFloat(token.priceUSD),
        0,
      ) ?? 0;

  const collateralValue =
    collateralData?.collateralTokenMetas
      .filter(({ troveLockedAmount }) => troveLockedAmount > 0)
      .reduce(
        (acc, { troveLockedAmount, token }) =>
          acc + dangerouslyConvertBigIntToNumber(troveLockedAmount!, 9, 9) * bigIntStringToFloat(token.priceUSD),
        0,
      ) ?? 0;

  const getRatios = useCallback(() => {
    const oldRatio = collateralValue / debtValue;
    const newRatio =
      addedDebtUSD > 0 ? collateralValue / (debtValue + addedDebtUSD) : (collateralValue - addedDebtUSD) / debtValue;

    return [oldRatio, newRatio];
  }, [addedDebtUSD, collateralValue, debtValue]);

  const isProcessing = loading || !debtData || !collateralData;

  useEffect(() => {
    if (!isProcessing && callback) {
      const [oldRatio, newRatio] = getRatios();

      callback(newRatio, oldRatio, debtValue, collateralValue);
    }
  }, [isProcessing, getRatios, callback, debtValue, collateralValue]);

  if (isProcessing) {
    return (
      <div
        data-testid="apollon-collateral-ratio-visualization-loader"
        style={{
          height: '31px',
          width: '100%',
          marginTop: 10,
          padding: '3px 10px',
          border: `2px solid ${isDarkMode ? '#3C3945' : '#CBCBCB'}`,
          backgroundColor: isDarkMode ? '#282531' : '#ECECEC',
          borderRadius: 5,
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

  const [oldRatio, newRatio] = getRatios();

  const scaleDelta = scaleMax - scaleMin;

  const criticalPosition = (criticalRatio - scaleMin) / scaleDelta;
  const oldPosition = (oldRatio - scaleMin) / scaleDelta;
  const newPosition = (newRatio - scaleMin) / scaleDelta;

  const colorAlpha = 0.6 * oldPosition;

  return (
    <>
      <Box
        data-testid="apollon-collateral-ratio-visualization"
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
        {/* Just show indicator if a change is showns and not all debt can be extinguished */}
        {addedDebtUSD !== 0 && newRatio !== 0 && (
          <Box
            data-testid="apollon-collateral-ratio-visualization-new-position"
            sx={{
              position: 'absolute',
              width: `${newPosition * 100}%`,
              height: '100%',
              borderRight: '2px solid',
              borderColor: 'primary.contrastText',
            }}
          ></Box>
        )}
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
        <Typography variant="shady">{displayPercentage(scaleMin, 'default', 0)}</Typography>
        <Typography variant="shady">{displayPercentage(scaleMax, 'default', 0)}</Typography>
      </div>
    </>
  );
}

export default CollateralRatioVisualization;
