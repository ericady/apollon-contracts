'use client';

import { useQuery } from '@apollo/client';
import { Box, Skeleton } from '@mui/material';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useCallback, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useEthers } from '../../../context/EthersProvider';
import { useSelectedToken } from '../../../context/SelectedTokenProvider';
import { GetTroveManagerQuery, GetTroveManagerQueryVariables } from '../../../generated/gql-types';
import { GET_TROVEMANAGER } from '../../../queries';
import { WIDGET_HEIGHTS } from '../../../utils/contants';
import { displayPercentage, floatToBigInt, roundCurrency } from '../../../utils/math';
import InfoButton from '../../Buttons/InfoButton';
import FeatureBox from '../../FeatureBox/FeatureBox';
import NumberInput from '../../FormControls/NumberInput';
import ForwardIcon from '../../Icons/ForwardIcon';
import Label from '../../Label/Label';
import CollateralRatioVisualization from '../../Visualizations/CollateralRatioVisualization';

type FieldValues = {
  farmShortValue: string;
  maxSlippage: string;
};

const Farm = () => {
  const [tabValue, setTabValue] = useState<'Long' | 'Short'>('Long');
  const [showSlippage, setShowSlippage] = useState(false);
  const [oldRatio, setOldRatio] = useState<number | null>(null);
  const [newRatio, setNewRatio] = useState<number | null>(null);

  const {
    address,
    contracts: { swapOperationsContract },
  } = useEthers();
  const { selectedToken, tokenRatio, JUSDToken } = useSelectedToken();

  const { data } = useQuery<GetTroveManagerQuery, GetTroveManagerQueryVariables>(GET_TROVEMANAGER);

  const methods = useForm<FieldValues>({
    defaultValues: {
      farmShortValue: '',
      maxSlippage: '2',
    },
    reValidateMode: 'onChange',
  });
  const { handleSubmit, reset, watch } = methods;

  const ratioChangeCallback = useCallback(
    (newRatio: number, oldRatio: number) => {
      setNewRatio(newRatio);
      setOldRatio(oldRatio);
    },
    [setNewRatio, setOldRatio],
  );

  const handleTabChange = (_: React.SyntheticEvent, newValue: 'Long' | 'Short') => {
    setTabValue(newValue);
    reset();
  };

  const onSubmit = async (data: FieldValues) => {
    const farmShortValue = parseFloat(data.farmShortValue);
    const maxSlippage = parseFloat(data.maxSlippage) / 100;
    const deadline = new Date().getTime() + 1000 * 60 * 2; // 2 minutes

    if (tabValue === 'Long') {
      await swapOperationsContract.openLongPosition(
        floatToBigInt(farmShortValue),
        floatToBigInt(getExpectedPositionSize() * (1 - maxSlippage)),
        selectedToken!.address,
        address,
        // TODO: What is this
        BigInt(0),
        deadline,
      );
    } else {
      await swapOperationsContract.openShortPosition(
        floatToBigInt(farmShortValue),
        floatToBigInt(getExpectedPositionSize() * (1 - maxSlippage)),
        selectedToken!.address,
        address,
        // TODO: What is this
        BigInt(0),
        deadline,
      );
    }
  };

  const watchFarmShortValue = parseInt(watch('farmShortValue'));

  const addedDebtUSD = !isNaN(watchFarmShortValue) && selectedToken ? watchFarmShortValue * selectedToken!.priceUSD : 0;
  const borrowingFee = data?.getTroveManager.borrowingRate;

  const getExpectedPositionSize = () => {
    // Position size, rename in “Expected position size”, rechnung: vom input die borrowing fee abziehen (steht unten), dann über den pool dex Preis die andere Seite ermitteln und davon dann noch einmal die aktuelle swap fee abziehen
    const expectedPositionSize =
      tabValue === 'Long'
        ? ((watchFarmShortValue * (1 - borrowingFee!)) / tokenRatio) * (1 - selectedToken!.swapFee)
        : watchFarmShortValue * (1 - borrowingFee!) * tokenRatio * (1 - selectedToken!.swapFee);

    return expectedPositionSize;
  };

  // TODO: Not adjusted for swap fee
  const getPriceImpact = () => {
    const currentPrice = selectedToken!.liqudityPair[0] / selectedToken!.liqudityPair[1];

    let newPriceAfterSwap;
    if (tabValue === 'Long') {
      // Calculate new amount of the other token after swap
      const newY =
        (selectedToken!.liqudityPair[1] * selectedToken!.liqudityPair[0]) /
        (selectedToken!.liqudityPair[0] + watchFarmShortValue);
      newPriceAfterSwap = watchFarmShortValue / (selectedToken!.liqudityPair[1] - newY);
    } else {
      // Calculate new amount of jUSD after swap
      const newX =
        (selectedToken!.liqudityPair[0] * selectedToken!.liqudityPair[1]) /
        (selectedToken!.liqudityPair[1] + watchFarmShortValue);
      newPriceAfterSwap = (selectedToken!.liqudityPair[0] - newX) / watchFarmShortValue;
    }

    // Calculate price impact
    const priceImpact = ((newPriceAfterSwap - currentPrice) / currentPrice) * 100; // in percentage
    return Math.abs(priceImpact) > 1 ? 1 : Math.abs(priceImpact);
  };

  return (
    <FeatureBox
      title="Farm"
      border="bottom"
      isDraggable={{
        y: '2',
        gsHeight: WIDGET_HEIGHTS['apollon-farm-widget'].toString(),
        gsWidth: '1',
        id: 'apollon-farm-widget',
      }}
    >
      <div style={{ height: '439px', overflowY: 'scroll' }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth" sx={{ mx: '-15px' }}>
          <Tab label="LONG" value="Long" />
          <Tab label="SHORT" value="Short" />
        </Tabs>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ marginTop: '20px' }}>
              <div>
                <NumberInput
                  data-testid="apollon-farm-amount"
                  name="farmShortValue"
                  rules={{
                    required: { value: true, message: 'You need to specify an amount.' },
                    min: { value: 0, message: 'Amount needs to be positive.' },
                  }}
                  disabled={!selectedToken}
                  fullWidth
                  InputProps={{
                    endAdornment: selectedToken && (
                      <InputAdornment position="end">
                        <Label variant="none">{tabValue === 'Long' ? JUSDToken?.symbol : selectedToken.symbol}</Label>
                      </InputAdornment>
                    ),
                  }}
                />

                {showSlippage && (
                  <NumberInput
                    data-testid="apollon-farm-slippage-amount"
                    name="maxSlippage"
                    rules={{
                      min: { value: 0, message: 'Amount needs to be positive.' },
                    }}
                    label="Max. Slippage"
                    fullWidth
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    sx={{ marginTop: '15px' }}
                  />
                )}

                <Button variant="contained" onClick={() => setShowSlippage(!showSlippage)} sx={{ marginTop: '10px' }}>
                  {showSlippage ? 'Less' : 'More'}
                </Button>
              </div>

              <div style={{ padding: '10px 0' }}>
                <Typography
                  variant="titleAlternate"
                  color="primary.contrastText"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '12px',
                    marginBottom: '12px',
                  }}
                >
                  Expected position size:
                  {selectedToken ? (
                    tabValue === 'Long' ? (
                      <span data-testid="apollon-farm-position-size">
                        {!isNaN(watchFarmShortValue) && selectedToken && data
                          ? `${roundCurrency(getExpectedPositionSize())} ${selectedToken.symbol}}`
                          : '-'}
                      </span>
                    ) : (
                      <span data-testid="apollon-farm-position-size">
                        {!isNaN(watchFarmShortValue) && selectedToken && data
                          ? `${roundCurrency(getExpectedPositionSize())} jUSD`
                          : '-'}
                      </span>
                    )
                  ) : (
                    <Skeleton width="120px" />
                  )}
                </Typography>
                <Typography
                  variant="caption"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '12px',
                    marginBottom: '12px',
                  }}
                >
                  Price per unit:
                  {selectedToken && data ? (
                    <span>{roundCurrency(tokenRatio * (1 + selectedToken.swapFee + borrowingFee!), 4)} jUSD</span>
                  ) : (
                    <Skeleton width="120px" />
                  )}
                </Typography>
                <Typography
                  variant="caption"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '12px',
                    marginBottom: '12px',
                  }}
                >
                  Protocol swap fee:
                  {selectedToken ? (
                    <span data-testid="apollon-farm-protocol-fee"> {displayPercentage(selectedToken.swapFee)}</span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: 120 }}>
                      <Skeleton width="55px" />
                      |
                      <Skeleton width="55px" />
                    </div>
                  )}
                </Typography>
                <Typography
                  variant="caption"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '12px',
                    marginBottom: '12px',
                  }}
                >
                  Borrowing fee:
                  {data ? (
                    <span data-testid="apollon-farm-borrowing-fee">{displayPercentage(borrowingFee!)}</span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: 120 }}>
                      <Skeleton width="55px" />
                      |
                      <Skeleton width="55px" />
                    </div>
                  )}
                </Typography>
                <Typography
                  variant="caption"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '12px',
                    marginBottom: '12px',
                  }}
                >
                  Slippage:
                  {watchFarmShortValue && selectedToken ? (
                    <span>{displayPercentage(getPriceImpact())}</span>
                  ) : (
                    <Skeleton width="120px" />
                  )}
                </Typography>
              </div>

              <InfoButton
                title="EXECUTE"
                description="The final values will be calculated after the swap."
                disabled={!address || !JUSDToken || !selectedToken}
              />
            </div>
          </form>
        </FormProvider>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '20px',
          }}
        >
          <Typography variant="titleAlternate">Collateral Ratio</Typography>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Typography
              sx={{
                fontFamily: 'Space Grotesk Variable',
                color: 'info.main',
                fontWeight: '700',
                fontSize: '20px',
              }}
            >
              {oldRatio !== null ? displayPercentage(oldRatio, 'default', 0) : <Skeleton variant="text" width={50} />}
            </Typography>

            <ForwardIcon />

            <Typography
              sx={{
                fontFamily: 'Space Grotesk Variable',
                color: 'info.main',
                fontWeight: '700',
                fontSize: '20px',
              }}
            >
              {newRatio !== null ? displayPercentage(newRatio, 'default', 0) : <Skeleton variant="text" width={50} />}
            </Typography>
          </div>
        </Box>

        <CollateralRatioVisualization addedDebtUSD={addedDebtUSD} callback={ratioChangeCallback} />
      </div>
    </FeatureBox>
  );
};

export default Farm;
