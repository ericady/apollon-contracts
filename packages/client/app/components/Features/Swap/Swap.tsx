'use client';

import { Skeleton } from '@mui/material';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import Typography from '@mui/material/Typography';
import { ChangeEvent, useEffect, useState } from 'react';
import { FormProvider, useController, useForm } from 'react-hook-form';
import { Contracts, useEthers } from '../../../context/EthersProvider';
import { useSelectedToken } from '../../../context/SelectedTokenProvider';
import { useTransactionDialog } from '../../../context/TransactionDialogProvider';
import { WIDGET_HEIGHTS } from '../../../utils/contants';
import { displayPercentage, floatToBigInt, roundCurrency, roundNumber } from '../../../utils/math';
import InfoButton from '../../Buttons/InfoButton';
import FeatureBox from '../../FeatureBox/FeatureBox';
import NumberInput from '../../FormControls/NumberInput';
import ExchangeIcon from '../../Icons/ExchangeIcon';
import Label from '../../Label/Label';

export const RESULTING_POOL_SLIPPAGE = 0.02;

type FieldValues = {
  jUSDAmount: string;
  tokenAmount: string;
  maxSlippage: string;
};

const Swap = () => {
  const [showSlippage, setShowSlippage] = useState(false);
  const [tradingDirection, setTradingDirection] = useState<'jUSDSpent' | 'jUSDAquired'>('jUSDSpent');

  const {
    address,
    contracts: { swapOperationsContract, collateralTokenContracts, debtTokenContracts },
  } = useEthers();
  const { setSteps } = useTransactionDialog();
  const { selectedToken, tokenRatio, JUSDToken } = useSelectedToken();

  const methods = useForm<FieldValues>({
    defaultValues: {
      jUSDAmount: '',
      tokenAmount: '',
      maxSlippage: '2',
    },
    reValidateMode: 'onChange',
  });
  const { handleSubmit, setValue, watch, control, trigger } = methods;
  const { field: jUSDField } = useController({ name: 'jUSDAmount', control });
  const { field: tokenAmountField } = useController({ name: 'tokenAmount', control });

  const handleSwapValueChange = (variant: 'JUSD' | 'Token', value: string) => {
    const numericValue = parseFloat(value);

    if (variant === 'JUSD') {
      if (!isNaN(numericValue)) {
        setValue('tokenAmount', roundNumber((numericValue / tokenRatio) * (1 - selectedToken!.swapFee)).toString());
        setTradingDirection('jUSDSpent');
      } else {
        setValue('tokenAmount', '');
      }

      setValue('jUSDAmount', value);
    } else {
      if (!isNaN(numericValue)) {
        setValue('jUSDAmount', roundNumber(numericValue * tokenRatio * (1 - selectedToken!.swapFee)).toString());
        setTradingDirection('jUSDAquired');
      } else {
        setValue('jUSDAmount', '');
      }

      setValue('tokenAmount', value);
    }

    trigger();
  };

  const onSubmit = async (data: FieldValues) => {
    const jUSDAmount = parseFloat(data.jUSDAmount);
    const tokenAmount = parseFloat(data.tokenAmount);
    const maxSlippage = parseFloat(data.maxSlippage) / 100;
    const deadline = new Date().getTime() + 1000 * 60 * 2; // 2 minutes

    if (tradingDirection === 'jUSDSpent') {
      setSteps([
        {
          title: 'Approve jUSD spending.',
          transaction: {
            methodCall: async () => {
              return collateralTokenContracts[Contracts.ERC20.JUSD]!.approve(
                selectedToken!.pool.id,
                floatToBigInt(jUSDAmount),
              );
            },
            waitForResponseOf: [],
          },
        },
        {
          title: `Swap jUSD for ${selectedToken?.symbol}.`,
          transaction: {
            methodCall: async () => {
              return swapOperationsContract.swapTokensForExactTokens(
                floatToBigInt(tokenAmount),
                floatToBigInt(jUSDAmount * (1 + maxSlippage)),
                [selectedToken!.address, JUSDToken!.address],
                address,
                deadline,
              );
            },
            waitForResponseOf: [0],
          },
        },
      ]);
    } else {
      setSteps([
        {
          title: `Approve spending of ${selectedToken?.symbol}`,
          transaction: {
            methodCall: async () => {
              // @ts-ignore
              return debtTokenContracts[selectedToken!.address].approve(
                selectedToken!.pool.id,
                floatToBigInt(tokenAmount),
              );
            },
            waitForResponseOf: [],
          },
        },
        {
          title: `Swap ${selectedToken?.symbol} for jUSD`,
          transaction: {
            methodCall: async () => {
              return swapOperationsContract.swapExactTokensForTokens(
                floatToBigInt(tokenAmount),
                floatToBigInt(jUSDAmount * (1 - maxSlippage)),
                [selectedToken!.address, JUSDToken!.address],
                address,
                deadline,
              );
            },
            waitForResponseOf: [0],
          },
        },
      ]);
    }
  };

  const jUSDAmount = parseFloat(watch('jUSDAmount'));
  const tokenAmount = parseFloat(watch('tokenAmount'));

  // TODO: Not adjusted for swap fee
  const getPriceImpact = () => {
    const {
      pool: { liqudityPair },
    } = selectedToken!;

    const currentPrice = liqudityPair[0] / liqudityPair[1];

    let newPriceAfterSwap;
    if (tradingDirection === 'jUSDSpent') {
      // Calculate new amount of the other token after swap
      const newY = (liqudityPair[1] * liqudityPair[0]) / (liqudityPair[0] + jUSDAmount);
      newPriceAfterSwap = jUSDAmount / (liqudityPair[1] - newY);
    } else {
      // Calculate new amount of jUSD after swap
      const newX = (liqudityPair[0] * liqudityPair[1]) / (liqudityPair[1] + tokenAmount);
      newPriceAfterSwap = (liqudityPair[0] - newX) / tokenAmount;
    }

    // Calculate price impact
    const priceImpact = ((newPriceAfterSwap - currentPrice) / currentPrice) * 100; // in percentage
    return Math.abs(priceImpact) > 1 ? 1 : Math.abs(priceImpact);
  };

  useEffect(() => {
    if (jUSDAmount) {
      handleSwapValueChange('JUSD', jUSDAmount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedToken]);

  return (
    <FeatureBox
      title="Swap"
      border="bottom"
      isDraggable={{
        y: '1',
        gsHeight: WIDGET_HEIGHTS['apollon-swap-widget'].toString(),
        gsWidth: '1',
        id: 'apollon-swap-widget',
      }}
    >
      <div
        style={{
          height: '247px',
          overflowY: 'scroll',
        }}
      >
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <NumberInput
                name="tokenAmount"
                data-testid="apollon-swap-token-amount"
                rules={{
                  required: { value: true, message: 'You need to specify an amount.' },
                  min: { value: 0, message: 'Amount needs to be positive.' },
                }}
                disabled={!selectedToken}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  tokenAmountField.onChange(e);
                  handleSwapValueChange('Token', e.target.value);
                }}
                InputProps={{
                  endAdornment: selectedToken && (
                    <InputAdornment position="end">
                      <Label variant="none">{selectedToken.symbol}</Label>
                    </InputAdornment>
                  ),
                }}
              />

              <ExchangeIcon
                style={{
                  transform: tradingDirection === 'jUSDSpent' ? 'rotate(180deg)' : 'rotate(0deg)',
                  margin: '0px 10px',
                }}
              />

              {/* TODO: Add Validation that not more than the wallet amount can be entered. */}
              <NumberInput
                name="jUSDAmount"
                data-testid="apollon-swap-jusd-amount"
                rules={{
                  required: { value: true, message: 'You need to specify an amount.' },
                  min: { value: 0, message: 'Amount needs to be positive.' },
                }}
                disabled={!selectedToken}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  jUSDField.onChange(e);
                  handleSwapValueChange('JUSD', e.target.value);
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Label variant="none">jUSD</Label>
                    </InputAdornment>
                  ),
                }}
              />
            </div>

            {showSlippage && (
              <NumberInput
                name="maxSlippage"
                data-testid="apollon-swap-slippage-amount"
                rules={{
                  min: { value: 0, message: 'Amount needs to be positive.' },
                  max: { value: 100, message: 'Can not specify a greater amount.' },
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
                Price per unit:
                {selectedToken ? (
                  <span>{roundCurrency(tokenRatio * (1 - selectedToken.swapFee), 5, 5)} jUSD</span>
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
                Swap fee:
                {selectedToken ? (
                  <span data-testid="apollon-swap-protocol-fee">{displayPercentage(selectedToken.swapFee)}</span>
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
                Resulting pool slippage:
                {JUSDToken ? (
                  jUSDAmount || tokenAmount ? (
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
              title="SWAP"
              description="The final values will be calculated after the swap."
              disabled={!address || !JUSDToken}
            />
          </form>
        </FormProvider>
      </div>
    </FeatureBox>
  );
};

export default Swap;
