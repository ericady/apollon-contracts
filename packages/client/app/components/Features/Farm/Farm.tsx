'use client';

import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
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
import { WIDGET_HEIGHTS } from '../../../utils/contants';
import { displayPercentage, roundCurrency } from '../../../utils/math';
import InfoButton from '../../Buttons/InfoButton';
import FeatureBox from '../../FeatureBox/FeatureBox';
import NumberInput from '../../FormControls/NumberInput';
import Label from '../../Label/Label';
import CollateralRatioVisualization from '../../Visualizations/CollateralRatioVisualization';

export const SLIPPAGE = 0.0053;
export const PROTOCOL_FEE = 0.002;

type FieldValues = {
  farmShortValue: string;
  maxSlippage: string;
};

const Farm = () => {
  const [tabValue, setTabValue] = useState<'Long' | 'Short'>('Long');
  const [showSlippage, setShowSlippage] = useState(false);
  const [oldRatio, setOldRatio] = useState(0);
  const [newRatio, setNewRatio] = useState(0);

  const { address } = useEthers();

  const methods = useForm<FieldValues>({
    defaultValues: {
      farmShortValue: '',
      maxSlippage: '',
    },
    shouldUnregister: true,
    reValidateMode: 'onChange',
  });
  const { handleSubmit, reset, watch } = methods;

  const { selectedToken, tokenRatio } = useSelectedToken();

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

  const onSubmit = () => {
    console.log('onSubmit called');
    // TODO: Implement contract call
  };

  const watchFarmShortValue = parseInt(watch('farmShortValue'));

  const addedDebtUSD = !isNaN(watchFarmShortValue) ? watchFarmShortValue * selectedToken!.priceUSD : 0;

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
      <div style={{ height: '432px', overflowY: 'scroll' }}>
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
                        <Label variant="none">{selectedToken.symbol}</Label>
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
                    placeholder="5"
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
                  Position size:
                  {selectedToken ? (
                    <span data-testid="apollon-farm-position-size">
                      {!isNaN(watchFarmShortValue) ? `${roundCurrency(watchFarmShortValue * tokenRatio)} jUSD` : '-'}
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
                  Price per unit:
                  <span>{selectedToken ? `${roundCurrency(tokenRatio)} jUSD` : <Skeleton width="120px" />}</span>
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
                  Protocol fee:
                  {selectedToken ? (
                    <span data-testid="apollon-farm-protocol-fee">
                      {displayPercentage(PROTOCOL_FEE)} |
                      {/* <Divider
                    orientation="vertical"
                    sx={{
                      margin: '0 5px',
                      border: '1px solid #282531',
                      height: '15px',
                    }}
                  /> */}{' '}
                      {!isNaN(watchFarmShortValue)
                        ? `${roundCurrency(watchFarmShortValue * tokenRatio * PROTOCOL_FEE)} jUSD`
                        : '-'}
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
                  Slippage: {selectedToken ? <span>{displayPercentage(SLIPPAGE)}</span> : <Skeleton width="120px" />}
                </Typography>
              </div>

              <InfoButton
                title="EXECUTE"
                description="The final values will be calculated after the swap."
                disabled={!address}
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
              {displayPercentage(oldRatio, 'default', 0)}
            </Typography>
            <ArrowForwardIosIcon sx={{ color: '#46434F', fontSize: '18px' }} />
            <Typography
              sx={{
                fontFamily: 'Space Grotesk Variable',
                color: 'info.main',
                fontWeight: '700',
                fontSize: '20px',
              }}
            >
              {displayPercentage(newRatio, 'default', 0)}
            </Typography>
          </div>
        </Box>

        <CollateralRatioVisualization addedDebtUSD={addedDebtUSD} callback={ratioChangeCallback} />
      </div>
    </FeatureBox>
  );
};

export default Farm;
