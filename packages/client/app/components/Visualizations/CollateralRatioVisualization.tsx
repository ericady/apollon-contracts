import { useQuery } from '@apollo/client';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Box, Typography } from '@mui/material';
import { useCallback, useEffect } from 'react';
import { useEthers } from '../../context/EthersProvider';
import {
  GetBorrowerDebtTokensQuery,
  GetBorrowerDebtTokensQueryVariables,
  GetCollateralTokensQuery,
  GetCollateralTokensQueryVariables,
} from '../../generated/gql-types';
import { GET_BORROWER_COLLATERAL_TOKENS, GET_BORROWER_DEBT_TOKENS } from '../../queries';
import { displayPercentage } from '../../utils/math';

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
  callback?: (newRatio: number, oldRatio: number) => void;
};

// TODO: Maybe move text into this component to have more efficient state updates and uniform loading state

function CollateralRatioVisualization({
  addedDebtUSD = 0,
  callback,
  criticalRatio = 1.1,
  scaleMax = 2,
  scaleMin = 1,
  loading = false,
}: Props) {
  const { address } = useEthers();

  const { data: debtData } = useQuery<GetBorrowerDebtTokensQuery, GetBorrowerDebtTokensQueryVariables>(
    GET_BORROWER_DEBT_TOKENS,
    {
      variables: { borrower: address },
      skip: !address,
    },
  );

  const { data: collateralData } = useQuery<GetCollateralTokensQuery, GetCollateralTokensQueryVariables>(
    GET_BORROWER_COLLATERAL_TOKENS,
    {
      variables: { borrower: address },
      skip: !address,
    },
  );

  const getRatios = useCallback(() => {
    const debtValue =
      debtData?.getDebtTokens.reduce(
        (acc, { troveMintedAmount, token }) => acc + troveMintedAmount! * token.priceUSD,
        0,
      ) ?? 0;
    const collateralValue =
      collateralData?.getCollateralTokens.reduce(
        (acc, { troveLockedAmount, token }) => acc + troveLockedAmount! * token.priceUSD,
        0,
      ) ?? 0;

    const oldRatio = collateralValue / debtValue;

    const depositFillsDebt = addedDebtUSD <= -debtValue;
    const newRatio = depositFillsDebt ? 0 : collateralValue / (debtValue + addedDebtUSD);

    return [oldRatio, newRatio];
  }, [addedDebtUSD, collateralData, debtData]);

  const isProcessing = loading || !debtData || !collateralData;

  useEffect(() => {
    if (!isProcessing && callback) {
      const [oldRatio, newRatio] = getRatios();

      callback(newRatio, oldRatio);
    }
  }, [isProcessing, getRatios, callback]);

  if (isProcessing) {
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

  const [oldRatio, newRatio] = getRatios();

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
        {/* Just show indicator if a change is showns and not all debt can be extinguished */}
        {addedDebtUSD !== 0 && newRatio !== 0 && (
          <Box
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
        <Typography variant="titleAlternate">{displayPercentage(scaleMin, 'default', 0)}</Typography>
        <Typography variant="titleAlternate">{displayPercentage(scaleMax, 'default', 0)}</Typography>
      </div>
    </>
  );
}

export default CollateralRatioVisualization;
