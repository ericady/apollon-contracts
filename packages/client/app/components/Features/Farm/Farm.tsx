'use client';

import { Box, Skeleton } from '@mui/material';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { ethers } from 'ethers';
import { useCallback, useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useEthers } from '../../../context/EthersProvider';
import { useSelectedToken } from '../../../context/SelectedTokenProvider';
import { useTransactionDialog } from '../../../context/TransactionDialogProvider';
import { isCollateralTokenAddress } from '../../../context/contracts.config';
import { GET_BORROWER_COLLATERAL_TOKENS, GET_BORROWER_DEBT_TOKENS } from '../../../queries';
import { WIDGET_HEIGHTS } from '../../../utils/contants';
import { getHints } from '../../../utils/crypto';
import {
  convertToEtherPrecission,
  dangerouslyConvertBigIntToNumber,
  displayPercentage,
  floatToBigInt,
  roundCurrency,
} from '../../../utils/math';
import InfoButton from '../../Buttons/InfoButton';
import FeatureBox from '../../FeatureBox/FeatureBox';
import NumberInput from '../../FormControls/NumberInput';
import ForwardIcon from '../../Icons/ForwardIcon';
import Label from '../../Label/Label';
import CollateralRatioVisualization, { CRIT_RATIO } from '../../Visualizations/CollateralRatioVisualization';

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
    contracts: { swapOperationsContract, troveManagerContract, sortedTrovesContract, hintHelpersContract },
  } = useEthers();
  const { setSteps } = useTransactionDialog();
  const { selectedToken, tokenRatio, JUSDToken } = useSelectedToken();

  const methods = useForm<FieldValues>({
    defaultValues: {
      farmShortValue: '',
      maxSlippage: '2',
    },
    reValidateMode: 'onSubmit',
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
    const _maxMintFeePercentage = floatToBigInt(0.02);

    const [upperHint, lowerHint] = await getHints(troveManagerContract, sortedTrovesContract, hintHelpersContract, {
      borrower: address,
      addedColl: [],
      addedDebt: [
        {
          tokenAddress: selectedToken!.address,
          amount: floatToBigInt(farmShortValue),
        },
      ],
      removedColl: [],
      removedDebt: [],
    });

    if (tabValue === 'Long') {
      setSteps([
        {
          title: 'Open Long Position',
          transaction: {
            methodCall: async () => {
              return swapOperationsContract
                .openLongPosition(
                  floatToBigInt(farmShortValue),
                  (getExpectedPositionSize() * ethers.parseEther((1 - maxSlippage).toString())) /
                    ethers.parseUnits('1', 18),
                  selectedToken!.address,
                  address,
                  {
                    upperHint,
                    lowerHint,
                    maxFeePercentage: _maxMintFeePercentage,
                  },
                  deadline,
                )
                .catch((err) => {
                  throw new Error(err, { cause: swapOperationsContract });
                });
            },
            waitForResponseOf: [],
            // Only refetch coll tokens if they were part of the swap
            reloadQueriesAferMined: isCollateralTokenAddress(selectedToken!.address)
              ? [GET_BORROWER_COLLATERAL_TOKENS, GET_BORROWER_DEBT_TOKENS]
              : [GET_BORROWER_DEBT_TOKENS],
          },
        },
      ]);
    } else {
      setSteps([
        {
          title: 'Open Short Position',
          transaction: {
            methodCall: async () => {
              return swapOperationsContract
                .openShortPosition(
                  (getExpectedPositionSize() * ethers.parseEther((1 - maxSlippage).toString())) /
                    ethers.parseUnits('1', 18),
                  floatToBigInt(farmShortValue),
                  selectedToken!.address,
                  address,
                  {
                    upperHint,
                    lowerHint,
                    maxFeePercentage: _maxMintFeePercentage,
                  },
                  deadline,
                )
                .catch((err) => {
                  throw new Error(err, { cause: swapOperationsContract });
                });
            },
            waitForResponseOf: [],
            // Only refetch coll tokens if they were part of the swap
            reloadQueriesAferMined: isCollateralTokenAddress(selectedToken!.address)
              ? [GET_BORROWER_COLLATERAL_TOKENS, GET_BORROWER_DEBT_TOKENS]
              : [GET_BORROWER_DEBT_TOKENS],
          },
        },
      ]);
    }
  };

  const watchFarmShortValue = parseInt(watch('farmShortValue'));

  const addedDebtUSD =
    !isNaN(watchFarmShortValue) && JUSDToken
      ? tabValue === 'Long'
        ? watchFarmShortValue * dangerouslyConvertBigIntToNumber(JUSDToken.priceUSDOracle, 9, 9)
        : watchFarmShortValue * dangerouslyConvertBigIntToNumber(tokenRatio * JUSDToken.priceUSDOracle, 18 + 9, 9)
      : 0;
  const borrowingFee = tabValue === 'Long' ? JUSDToken?.borrowingRate : selectedToken!.borrowingRate;

  /**
   * Must be exact due to contract call
   */
  const getExpectedPositionSize = () => {
    const valueAsBigint = ethers.parseEther(watchFarmShortValue.toString());

    // Position size, rename in “Expected position size”, rechnung: vom input die borrowing fee abziehen (steht unten), dann über den pool dex Preis die andere Seite ermitteln und davon dann noch einmal die aktuelle swap fee abziehen
    const expectedPositionSize =
      tabValue === 'Long'
        ? (valueAsBigint * (floatToBigInt(1, 18) - borrowingFee!) * (floatToBigInt(1, 6) - selectedToken!.swapFee)) /
          tokenRatio /
          ethers.parseUnits('1', 6)
        : (valueAsBigint *
            (floatToBigInt(1, 18) - borrowingFee!) *
            tokenRatio *
            (floatToBigInt(1, 6) - selectedToken!.swapFee)) /
          ethers.parseUnits('1', 18 + 18 + 6);

    return expectedPositionSize;
  };

  /**
   * Not exact
   * TODO: Not adjusted for swap fee
   */
  const getPriceImpact = () => {
    const {
      pool: { liqudityPair },
      decimals,
    } = selectedToken!;

    const liq0 = dangerouslyConvertBigIntToNumber(liqudityPair[0], 0);
    const liq1 = dangerouslyConvertBigIntToNumber(convertToEtherPrecission(liqudityPair[1], decimals), 0);

    const currentPrice = liq0 / liq1;

    let newPriceAfterSwap: number;
    if (tabValue === 'Long') {
      // Calculate new amount of the other token after swap
      const newY = (liq1 * liq0) / (liq0 + watchFarmShortValue);
      newPriceAfterSwap = watchFarmShortValue / (liq1 - newY);
    } else {
      // Calculate new amount of jUSD after swap
      const newX = (liq0 * liq1) / (liq1 + watchFarmShortValue);
      newPriceAfterSwap = (liq0 - newX) / watchFarmShortValue;
    }

    // Calculate price impact
    const priceImpact = ((newPriceAfterSwap - currentPrice) / currentPrice) * 100; // in percentage
    return Math.abs(priceImpact) > 1 ? 1 : Math.abs(priceImpact);
  };

  useEffect(() => {
    reset();
    setTabValue('Long');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedToken]);

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
      <div style={{ height: '466px', overflowY: 'scroll' }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth" sx={{ mx: '-15px' }}>
          <Tab label="LONG" value="Long" />
          <Tab
            label="SHORT"
            value="Short"
            disabled={selectedToken?.address ? isCollateralTokenAddress(selectedToken.address) : false}
          />
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
                        {!isNaN(watchFarmShortValue) && selectedToken && borrowingFee
                          ? `${roundCurrency(
                              dangerouslyConvertBigIntToNumber(getExpectedPositionSize(), 9, 9),
                              5,
                              5,
                            )} ${selectedToken.symbol}`
                          : '-'}
                      </span>
                    ) : (
                      <span data-testid="apollon-farm-position-size">
                        {!isNaN(watchFarmShortValue) && selectedToken && borrowingFee
                          ? `${roundCurrency(dangerouslyConvertBigIntToNumber(getExpectedPositionSize()), 5, 5)} jUSD`
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
                  {selectedToken && borrowingFee ? (
                    <span>
                      {roundCurrency(
                        dangerouslyConvertBigIntToNumber(
                          tokenRatio *
                            (ethers.parseEther('1') +
                              selectedToken.swapFee * ethers.parseUnits('1', 12) +
                              borrowingFee),
                          30,
                          6,
                        ),
                        5,
                        5,
                      )}{' '}
                      jUSD
                    </span>
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
                    <span data-testid="apollon-farm-protocol-fee">
                      {' '}
                      {displayPercentage(dangerouslyConvertBigIntToNumber(selectedToken.swapFee, 0, 6))}
                    </span>
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
                  {borrowingFee ? (
                    <span data-testid="apollon-farm-borrowing-fee">
                      {displayPercentage(dangerouslyConvertBigIntToNumber(borrowingFee, 0, 17))}
                    </span>
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
                  {JUSDToken ? (
                    watchFarmShortValue && selectedToken ? (
                      <span>{displayPercentage(getPriceImpact())}</span>
                    ) : (
                      <span>{displayPercentage(0)}</span>
                    )
                  ) : (
                    <Skeleton width="120px" />
                  )}
                </Typography>
              </div>

              <InfoButton
                title="EXECUTE"
                description="The final values will be calculated after the swap."
                disabled={!address || !JUSDToken || (newRatio && newRatio < CRIT_RATIO) || !selectedToken}
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
