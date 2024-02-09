'use client';

import { useQuery } from '@apollo/client';
import { Box, FormHelperText, Skeleton } from '@mui/material';
import Button from '@mui/material/Button';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { SyntheticEvent, useCallback, useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { IBase } from '../../../../generated/types/TroveManager';
import { isCollateralTokenAddress, isDebtTokenAddress, useEthers } from '../../../context/EthersProvider';
import { useTransactionDialog } from '../../../context/TransactionDialogProvider';
import {
  GetBorrowerCollateralTokensQuery,
  GetBorrowerCollateralTokensQueryVariables,
  GetBorrowerDebtTokensQuery,
  GetBorrowerDebtTokensQueryVariables,
  GetBorrowerLiquidityPoolsQuery,
} from '../../../generated/gql-types';
import { GET_BORROWER_COLLATERAL_TOKENS, GET_BORROWER_DEBT_TOKENS } from '../../../queries';
import { getHints } from '../../../utils/crypto';
import {
  bigIntStringToFloat,
  dangerouslyConvertBigIntToNumber,
  displayPercentage,
  floatToBigInt,
  roundCurrency,
  roundNumber,
} from '../../../utils/math';
import FeatureBox from '../../FeatureBox/FeatureBox';
import NumberInput from '../../FormControls/NumberInput';
import ForwardIcon from '../../Icons/ForwardIcon';
import Label from '../../Label/Label';
import CollateralRatioVisualization, { CRIT_RATIO } from '../../Visualizations/CollateralRatioVisualization';

const SLIPPAGE = 0.02;

type Props = {
  selectedPool: GetBorrowerLiquidityPoolsQuery['pools'][number];
};

type FieldValues = {
  tokenAAmount: string;
  tokenBAmount: string;
};

function LiquidityDepositWithdraw({ selectedPool }: Props) {
  const { liquidity, borrowerAmount, totalSupply } = selectedPool;
  const [tokenA, tokenB] = liquidity.map((liquidity) => ({
    ...liquidity,
    token: { ...liquidity.token, priceUSD: bigIntStringToFloat(liquidity.token.priceUSD) },
  }));

  const {
    address,
    contracts: {
      swapOperationsContract,
      debtTokenContracts,
      collateralTokenContracts,
      troveManagerContract,
      sortedTrovesContract,
      hintHelpersContract,
    },
  } = useEthers();
  const { setSteps } = useTransactionDialog();

  const [tabValue, setTabValue] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');

  const [oldRatio, setOldRatio] = useState<number | null>(null);
  const [newRatio, setNewRatio] = useState<number | null>(null);
  const [currentDebtValueUSD, setCurrentDebtValueUSD] = useState<number | null>(null);
  const [currentCollateralValueUSD, setCurrentCollateralValueUSD] = useState<number | null>(null);

  const { data: debtTokenData } = useQuery<GetBorrowerDebtTokensQuery, GetBorrowerDebtTokensQueryVariables>(
    GET_BORROWER_DEBT_TOKENS,
    {
      variables: { borrower: address },
      skip: !address,
    },
  );
  const { data: collTokenData } = useQuery<GetBorrowerCollateralTokensQuery, GetBorrowerCollateralTokensQueryVariables>(
    GET_BORROWER_COLLATERAL_TOKENS,
    {
      variables: { borrower: address },
      skip: !address,
    },
  );

  const foundTokenA = debtTokenData?.debtTokenMetas.find(({ token }) => token.id === tokenA.token.id) ??
    collTokenData?.collateralTokenMetas.find(({ token }) => token.id === tokenA.token.id) ?? {
      walletAmount: BigInt(0),
      troveRepableDebtAmount: BigInt(0),
    };
  const relevantTokenA = {
    ...foundTokenA,
    // @ts-ignore
    investedAmount: foundTokenA.troveRepableDebtAmount ?? foundTokenA.troveLockedAmount ?? BigInt(0),
  };

  const foundTokenB = debtTokenData?.debtTokenMetas.find(({ token }) => token.id === tokenB.token.id) ??
    collTokenData?.collateralTokenMetas.find(({ token }) => token.id === tokenA.token.id) ?? {
      walletAmount: BigInt(0),
      troveRepableDebtAmount: BigInt(0),
    };
  const relevantTokenB = {
    ...foundTokenA,
    // @ts-ignore
    investedAmount: foundTokenB.troveRepableDebtAmount ?? foundTokenB.troveLockedAmount ?? BigInt(0),
  };

  const handleChange = (_: SyntheticEvent, newValue: 'DEPOSIT' | 'WITHDRAW') => {
    setTabValue(newValue);
    reset();
  };

  const methods = useForm<FieldValues>({
    defaultValues: {
      tokenAAmount: '',
      tokenBAmount: '',
    },
    reValidateMode: 'onChange',
    shouldUnregister: true,
  });
  const { handleSubmit, setValue, reset, formState, watch } = methods;

  const onSubmit = async (data: FieldValues) => {
    const tokenAAmount = data.tokenAAmount ? parseFloat(data.tokenAAmount) : 0;
    const tokenBAmount = data.tokenBAmount ? parseFloat(data.tokenBAmount) : 0;
    const deadline = new Date().getTime() + 1000 * 60 * 2; // 2 minutes
    const _maxMintFeePercentage = floatToBigInt(0.02);

    const collAmounts: IBase.TokenAmountStruct[] = [
      {
        tokenAddress: tokenA.token.address,
        amount: floatToBigInt(tokenAAmount),
      },
      {
        tokenAddress: tokenB.token.address,
        amount: floatToBigInt(tokenBAmount),
      },
    ].filter(({ tokenAddress }) => isCollateralTokenAddress(tokenAddress));

    const debtAmounts: IBase.TokenAmountStruct[] = [
      {
        tokenAddress: tokenA.token.address,
        amount: floatToBigInt(tokenAAmount),
      },
      {
        tokenAddress: tokenB.token.address,
        amount: floatToBigInt(tokenBAmount),
      },
    ].filter(({ tokenAddress }) => isDebtTokenAddress(tokenAddress));

    if (tabValue === 'DEPOSIT') {
      setSteps([
        {
          title: `Approve spending of ${tokenA.token.symbol}.`,
          transaction: {
            methodCall: async () => {
              if (isDebtTokenAddress(tokenA.token.address)) {
                return debtTokenContracts[tokenA.token.address].approve(selectedPool.address, tokenAAmount);
              } else if (isCollateralTokenAddress(tokenA.token.address)) {
                return collateralTokenContracts[tokenA.token.address].approve(selectedPool.address, tokenAAmount);
              }

              return null as any;
            },
            waitForResponseOf: [],
          },
        },
        {
          title: `Approve spending of ${tokenB.token.symbol}.`,
          transaction: {
            methodCall: async () => {
              if (isDebtTokenAddress(tokenB.token.address)) {
                return debtTokenContracts[tokenB.token.address].approve(selectedPool.address, tokenBAmount);
              } else if (isCollateralTokenAddress(tokenB.token.address)) {
                return collateralTokenContracts[tokenB.token.address].approve(selectedPool.address, tokenAAmount);
              }

              return null as any;
            },
            waitForResponseOf: [],
          },
        },
        {
          title: `Add Liquidity for ${tokenA.token.symbol} and ${tokenB.token.symbol}.`,
          transaction: {
            methodCall: async () => {
              const [upperHint, lowerHint] = await getHints(
                troveManagerContract,
                sortedTrovesContract,
                hintHelpersContract,
                {
                  borrower: address,
                  addedColl: collAmounts,
                  addedDebt: debtAmounts,
                  removedColl: [],
                  removedDebt: [],
                },
              );

              return swapOperationsContract.addLiquidity(
                tokenA.token.address,
                tokenB.token.address,
                floatToBigInt(tokenAAmount),
                floatToBigInt(tokenBAmount),
                floatToBigInt(tokenAAmount * (1 - SLIPPAGE)),
                floatToBigInt(tokenBAmount * (1 - SLIPPAGE)),
                {
                  lowerHint,
                  upperHint,
                  maxFeePercentage: _maxMintFeePercentage,
                },
                deadline,
              );
            },
            waitForResponseOf: [0, 1],
          },
        },
      ]);
    } else {
      const percentageFromPool = tokenAAmount / bigIntStringToFloat(totalSupply);
      const tokenAAmountForWithdraw = percentageFromPool * bigIntStringToFloat(tokenA.totalAmount);
      const tokenBAmountForWithdraw = percentageFromPool * bigIntStringToFloat(tokenB.totalAmount);

      setSteps([
        {
          title: `Remove Liquidity from the ${tokenA.token.symbol}-${tokenB.token.symbol} pool.`,
          transaction: {
            methodCall: async () => {
              const [upperHint, lowerHint] = await getHints(
                troveManagerContract,
                sortedTrovesContract,
                hintHelpersContract,
                {
                  borrower: address,
                  addedColl: [],
                  addedDebt: [],
                  removedColl: collAmounts,
                  removedDebt: debtAmounts,
                },
              );

              return swapOperationsContract.removeLiquidity(
                tokenA.token.address,
                tokenB.token.address,
                floatToBigInt(tokenAAmount),
                floatToBigInt(tokenAAmountForWithdraw * (1 - SLIPPAGE)),
                floatToBigInt(tokenBAmountForWithdraw * (1 - SLIPPAGE)),
                upperHint,
                lowerHint,
                deadline,
              );
            },
            waitForResponseOf: [],
          },
        },
      ]);
    }

    reset();
  };

  const ratioChangeCallback = useCallback(
    (newRatio: number, oldRatio: number, currentDebtValueUSD: number, currentCollateralValueUSD: number) => {
      setNewRatio(newRatio);
      setOldRatio(oldRatio);
      setCurrentDebtValueUSD(currentDebtValueUSD);
      setCurrentCollateralValueUSD(currentCollateralValueUSD);
    },
    [setNewRatio, setOldRatio],
  );

  useEffect(() => {
    if (!borrowerAmount) {
      setTabValue('DEPOSIT');
    }

    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPool]);

  const handleInput = (fieldName: keyof FieldValues, value: string) => {
    const numericValue = isNaN(parseFloat(value)) ? 0 : parseFloat(value);

    if (tabValue === 'DEPOSIT') {
      if (fieldName === 'tokenAAmount') {
        const pairValue = roundNumber(
          (numericValue * bigIntStringToFloat(tokenA.totalAmount)) / bigIntStringToFloat(tokenB.totalAmount),
          5,
        );
        setValue('tokenBAmount', pairValue.toString(), {
          shouldValidate: true,
          shouldDirty: true,
        });
      } else {
        const pairValue = roundNumber(
          (numericValue * bigIntStringToFloat(tokenB.totalAmount)) / bigIntStringToFloat(tokenA.totalAmount),
          5,
        );

        setValue('tokenAAmount', pairValue.toString(), {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    } else {
    }
  };

  const fillMaxInputValue = (fieldName: keyof FieldValues) => {
    if (tabValue === 'DEPOSIT') {
      if (fieldName === 'tokenAAmount') {
        setValue(fieldName, dangerouslyConvertBigIntToNumber(relevantTokenA.walletAmount, 9, 9).toString(), {
          shouldValidate: true,
          shouldDirty: true,
        });
        handleInput(fieldName, dangerouslyConvertBigIntToNumber(relevantTokenA.walletAmount, 9, 9).toString());
      } else if (fieldName === 'tokenBAmount') {
        setValue(fieldName, dangerouslyConvertBigIntToNumber(relevantTokenB.walletAmount, 9, 9).toString(), {
          shouldValidate: true,
          shouldDirty: true,
        });
        handleInput(fieldName, dangerouslyConvertBigIntToNumber(relevantTokenB.walletAmount, 9, 9).toString());
      }
    } else {
      setValue(fieldName, dangerouslyConvertBigIntToNumber(borrowerAmount, 9, 9).toString(), {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  };

  const fill150PercentInputValue = () => {
    // Check if current collateral is less than 150% of current debt
    if (currentDebtValueUSD && currentCollateralValueUSD) {
      const tokenAAmount = calculate150PercentTokenValue(
        currentDebtValueUSD,
        currentCollateralValueUSD,
        { totalAmount: bigIntStringToFloat(tokenA.totalAmount), priceUSD: tokenA.token.priceUSD },
        { totalAmount: bigIntStringToFloat(tokenB.totalAmount), priceUSD: tokenB.token.priceUSD },
        relevantTokenA,
        relevantTokenB,
      );

      setValue('tokenAAmount', tokenAAmount.toString(), {
        shouldValidate: true,
        shouldDirty: true,
      });
      handleInput('tokenAAmount', tokenAAmount.toString());
    }
  };

  const tokenAAmount = watch('tokenAAmount');
  const tokenBAmount = watch('tokenBAmount');

  // Withdraw
  const percentageFromPool = (tokenAAmount ? parseFloat(tokenAAmount) : 0) / bigIntStringToFloat(totalSupply);
  const tokenAAmountForWithdraw = percentageFromPool * bigIntStringToFloat(tokenA.totalAmount);
  const tokenBAmountForWithdraw = percentageFromPool * bigIntStringToFloat(tokenB.totalAmount);

  const addedDebtUSD =
    tabValue === 'DEPOSIT'
      ? (tokenAAmount
          ? Math.max(
              (parseFloat(tokenAAmount) - dangerouslyConvertBigIntToNumber(relevantTokenA.walletAmount, 9, 9)) *
                tokenA.token.priceUSD,
              0,
            )
          : 0) +
        (tokenBAmount
          ? Math.max(
              (parseFloat(tokenBAmount) - dangerouslyConvertBigIntToNumber(relevantTokenB.walletAmount, 9, 9)) *
                tokenB.token.priceUSD,
              0,
            )
          : 0)
      : ((relevantTokenA.investedAmount > tokenAAmountForWithdraw
          ? tokenAAmountForWithdraw * tokenA.token.priceUSD
          : dangerouslyConvertBigIntToNumber(relevantTokenA.investedAmount, 9, 9) * tokenA.token.priceUSD) +
          (relevantTokenB.investedAmount > tokenBAmountForWithdraw
            ? tokenBAmountForWithdraw * tokenB.token.priceUSD
            : dangerouslyConvertBigIntToNumber(relevantTokenB.investedAmount, 9, 9) * tokenB.token.priceUSD)) *
        -1;

  return (
    <FeatureBox title="Your Liquidity" noPadding headBorder="bottom" border="full">
      <Tabs value={tabValue} onChange={handleChange} variant="fullWidth" sx={{ mt: 2 }}>
        <Tab label="DEPOSIT" value="DEPOSIT" disableRipple />
        <Tab label="WITHDRAW" value="WITHDRAW" disableRipple disabled={!borrowerAmount} />
      </Tabs>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* DEPOSIT */}

          {tabValue === 'DEPOSIT' && (
            <>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '20px',
                  gap: '50px',
                  borderBottom: '1px solid',
                  borderColor: 'background.paper',
                }}
              >
                <div style={{ marginTop: 6 }}>
                  <Label variant="success">{tokenA.token.symbol}</Label>

                  <Typography
                    sx={{ fontWeight: '400', marginTop: '10px' }}
                    data-testid="apollon-liquidity-pool-deposit-token-a-funds-label"
                  >
                    {roundCurrency(
                      dangerouslyConvertBigIntToNumber(
                        (borrowerAmount * BigInt(tokenA.totalAmount)) / BigInt(totalSupply),
                        12,
                        6,
                      ),
                      5,
                      5,
                    )}
                  </Typography>
                  <Typography variant="label">Deposited</Typography>
                </div>

                <div>
                  <NumberInput
                    name="tokenAAmount"
                    data-testid="apollon-liquidity-pool-deposit-token-a-amount"
                    placeholder="Value"
                    fullWidth
                    onChange={(event) => {
                      handleInput('tokenAAmount', event.target.value);
                    }}
                    rules={{
                      min: { value: 0, message: 'You can only invest positive amounts.' },
                      required: 'This field is required.',
                    }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <Typography
                        variant="caption"
                        data-testid="apollon-collateral-update-dialog-deposit-ether-funds-label"
                        color="info.main"
                      >
                        {tokenAAmount
                          ? roundCurrency(
                              parseFloat(tokenAAmount) <
                                dangerouslyConvertBigIntToNumber(relevantTokenA.walletAmount, 9, 9)
                                ? parseFloat(tokenAAmount)
                                : dangerouslyConvertBigIntToNumber(relevantTokenA.walletAmount, 12, 6),
                              5,
                              5,
                            )
                          : 0}
                      </Typography>
                      <Typography variant="label" paragraph>
                        from Wallet
                      </Typography>
                    </div>

                    <Button
                      disabled={relevantTokenA.walletAmount <= 0}
                      variant="undercover"
                      sx={{ textDecoration: 'underline', p: 0, mt: 0.25, height: 25 }}
                      onClick={() => fillMaxInputValue('tokenAAmount')}
                    >
                      max
                    </Button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <Typography
                        variant="caption"
                        data-testid="apollon-collateral-update-dialog-deposit-ether-funds-label"
                        color="info.main"
                      >
                        {tokenAAmount
                          ? roundCurrency(
                              parseFloat(tokenAAmount) >
                                dangerouslyConvertBigIntToNumber(relevantTokenA.walletAmount, 9, 9)
                                ? parseFloat(tokenAAmount) -
                                    dangerouslyConvertBigIntToNumber(relevantTokenA.walletAmount, 12, 6)
                                : 0,
                              5,
                              5,
                            )
                          : 0}
                      </Typography>
                      <Typography variant="label" paragraph>
                        newly minted
                      </Typography>
                    </div>

                    <Button
                      disabled={
                        !currentCollateralValueUSD ||
                        !currentDebtValueUSD ||
                        currentCollateralValueUSD / currentDebtValueUSD < 1.5
                      }
                      variant="undercover"
                      sx={{ textDecoration: 'underline', p: 0, mt: 0.25, height: 25 }}
                      onClick={() => fill150PercentInputValue()}
                    >
                      to 150%
                    </Button>
                  </div>
                </div>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '20px',
                  gap: '50px',
                  borderBottom: '1px solid',
                  borderColor: 'background.paper',
                }}
              >
                <div style={{ marginTop: 6 }}>
                  <Label variant="success">{tokenB.token.symbol}</Label>

                  <Typography
                    sx={{ fontWeight: '400', marginTop: '10px' }}
                    data-testid="apollon-liquidity-pool-deposit-token-b-funds-label"
                  >
                    {roundCurrency(
                      dangerouslyConvertBigIntToNumber(
                        (borrowerAmount * BigInt(tokenB.totalAmount)) / BigInt(totalSupply),
                        12,
                        6,
                      ),
                      5,
                      5,
                    )}
                  </Typography>
                  <Typography variant="label">Deposited</Typography>
                </div>

                <div>
                  <NumberInput
                    name="tokenBAmount"
                    data-testid="apollon-liquidity-pool-deposit-token-b-amount"
                    placeholder="Value"
                    fullWidth
                    onChange={(event) => {
                      handleInput('tokenBAmount', event.target.value);
                    }}
                    rules={{
                      min: { value: 0, message: 'You can only invest positive amounts.' },
                      required: 'This field is required.',
                    }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <Typography
                        variant="caption"
                        data-testid="apollon-collateral-update-dialog-deposit-ether-funds-label"
                        color="info.main"
                      >
                        {tokenBAmount
                          ? roundCurrency(
                              parseFloat(tokenBAmount) <
                                dangerouslyConvertBigIntToNumber(relevantTokenB.walletAmount, 9, 9)
                                ? parseFloat(tokenBAmount)
                                : dangerouslyConvertBigIntToNumber(relevantTokenB.walletAmount, 12, 6),
                              5,
                              5,
                            )
                          : 0}
                      </Typography>
                      <Typography variant="label" paragraph>
                        from Wallet
                      </Typography>
                    </div>

                    <Button
                      disabled={relevantTokenB.walletAmount <= 0}
                      variant="undercover"
                      sx={{ textDecoration: 'underline', p: 0, mt: 0.25, height: 25 }}
                      onClick={() => fillMaxInputValue('tokenBAmount')}
                    >
                      max
                    </Button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <Typography
                        variant="caption"
                        data-testid="apollon-collateral-update-dialog-deposit-ether-funds-label"
                        color="info.main"
                      >
                        {tokenBAmount
                          ? roundCurrency(
                              parseFloat(tokenBAmount) >
                                dangerouslyConvertBigIntToNumber(relevantTokenB.walletAmount, 9, 9)
                                ? parseFloat(tokenBAmount) -
                                    dangerouslyConvertBigIntToNumber(relevantTokenB.walletAmount, 12, 9)
                                : 0,
                              5,
                              5,
                            )
                          : 0}
                      </Typography>
                      <Typography variant="label" paragraph>
                        newly minted
                      </Typography>
                    </div>

                    <Button
                      disabled={
                        !currentCollateralValueUSD ||
                        !currentDebtValueUSD ||
                        currentCollateralValueUSD / currentDebtValueUSD < 1.5
                      }
                      variant="undercover"
                      sx={{ textDecoration: 'underline', p: 0, mt: 0.25, height: 25 }}
                      onClick={() => fill150PercentInputValue()}
                    >
                      to 150%
                    </Button>
                  </div>
                </div>
              </Box>
            </>
          )}

          {/* WITHDRAW */}

          {tabValue === 'WITHDRAW' && borrowerAmount > 0 && (
            <Box style={{ display: 'flex', flexDirection: 'column' }}>
              <Box
                sx={{
                  height: '125px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '20px',
                  borderBottom: '1px solid',
                  borderColor: 'background.paper',
                }}
              >
                <div style={{ marginTop: 6 }}>
                  <Label variant="success">MNT-USDT</Label>
                </div>

                <div>
                  <NumberInput
                    name="tokenAAmount"
                    data-testid="apollon-liquidity-pool-withdraw-token-a-amount"
                    placeholder="Value"
                    fullWidth
                    rules={{
                      min: { value: 0, message: 'You can only invest positive amounts.' },
                      max: {
                        value: dangerouslyConvertBigIntToNumber(borrowerAmount, 9, 9),
                        message: 'This amount is greater than your deposited amount.',
                      },
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <Typography
                        variant="caption"
                        data-testid="apollon-liquidity-pool-withdraw-token-a-funds-label"
                        color="info.main"
                      >
                        {roundCurrency(dangerouslyConvertBigIntToNumber(borrowerAmount, 12, 6), 5, 5)}
                      </Typography>
                      <br />
                      <Typography variant="label">Deposited</Typography>
                    </div>
                    <Button
                      variant="undercover"
                      sx={{ textDecoration: 'underline', p: 0, mt: 0.25, height: 25 }}
                      onClick={() => fillMaxInputValue('tokenAAmount')}
                    >
                      max
                    </Button>
                  </div>
                </div>
              </Box>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '20px 20px 0 20px',
                }}
              >
                <Label variant="success">{tokenA.token.symbol}</Label>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: 250,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography component="span" style={{ marginRight: '8px' }}>
                      {roundCurrency(tokenAAmountForWithdraw, 5, 5)}
                    </Typography>

                    <Typography variant="label">Payout</Typography>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography component="span" style={{ marginRight: '8px' }}>
                      {tokenAAmountForWithdraw > relevantTokenA.investedAmount
                        ? roundCurrency(dangerouslyConvertBigIntToNumber(relevantTokenA.investedAmount, 12, 6), 5, 5)
                        : roundCurrency(tokenAAmountForWithdraw, 5, 5)}
                    </Typography>

                    <Typography variant="label">Debt payed of</Typography>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '20px 20px 0 20px',
                }}
              >
                <Label variant="success">{tokenB.token.symbol}</Label>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: 250,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography component="span" style={{ marginRight: '8px' }}>
                      {roundCurrency(tokenBAmountForWithdraw, 5, 5)}
                    </Typography>

                    <Typography variant="label">Payout</Typography>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography component="span" style={{ marginRight: '8px' }}>
                      {tokenBAmountForWithdraw > relevantTokenB.investedAmount
                        ? roundCurrency(dangerouslyConvertBigIntToNumber(relevantTokenB.investedAmount, 12, 6), 5, 5)
                        : roundCurrency(tokenBAmountForWithdraw, 5, 5)}
                    </Typography>

                    <Typography variant="label">Debt payed of</Typography>
                  </div>
                </div>
              </div>
            </Box>
          )}

          <Box
            sx={{
              padding: '20px',
              borderBottom: '1px solid',
              borderBottomColor: 'background.paper',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="titleAlternate">Collateral Ratio</Typography>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Typography
                  sx={{ fontFamily: 'Space Grotesk Variable', color: 'info.main', fontWeight: '700', fontSize: '20px' }}
                >
                  {oldRatio !== null ? (
                    displayPercentage(oldRatio, 'default', 0)
                  ) : (
                    <Skeleton variant="text" width={50} />
                  )}
                </Typography>
                <ForwardIcon />
                <Typography
                  sx={{ fontFamily: 'Space Grotesk Variable', color: 'info.main', fontWeight: '700', fontSize: '20px' }}
                >
                  {newRatio === 0 ? (
                    '∞'
                  ) : newRatio !== null ? (
                    displayPercentage(newRatio, 'default', 0)
                  ) : (
                    <Skeleton variant="text" width={50} />
                  )}
                </Typography>
              </div>
            </Box>
            <CollateralRatioVisualization addedDebtUSD={addedDebtUSD} callback={ratioChangeCallback} />
          </Box>

          <div style={{ width: '100%', padding: '20px' }}>
            <Button
              type="submit"
              variant="outlined"
              disabled={(newRatio && newRatio < CRIT_RATIO && tabValue === 'DEPOSIT') || !address}
            >
              Update
            </Button>
            {formState.isSubmitted && !formState.isDirty && (
              <FormHelperText error sx={{ mt: '10px' }} data-testid="apollon-liquidity-deposit-withdraw-error">
                You must specify at least one token to update.
              </FormHelperText>
            )}
          </div>
        </form>
      </FormProvider>
    </FeatureBox>
  );
}

export default LiquidityDepositWithdraw;

/**
 * Calculates tokenA amount to reach 150% collateralization.
 * Both Token have a ratio of the LiquidityPool and price. If a user has tokens in their wallet these are used first before
 * new debt is accrued.
 *
 * @param currentDebtValueUSD current constant debt value in USD
 * @param currentCollateralValueUSD current constant collateral value in USD
 * @param tokenA PoolLiquidity of A
 * @param tokenB PoolLiquidity of B
 * @param relevantDebtTokenA DebtTokenMeta of A to get wallet amount
 * @param relevantDebtTokenB DebtTokenMeta of B to get wallet amount
 */
export const calculate150PercentTokenValue = (
  currentDebtValueUSD: number,
  currentCollateralValueUSD: number,
  tokenA: { priceUSD: number; totalAmount: number },
  tokenB: { priceUSD: number; totalAmount: number },
  relevantDebtTokenA: { walletAmount: bigint },
  relevantDebtTokenB: { walletAmount: bigint },
) => {
  // Calculate the USD difference needed to reach 150% collateralization
  const targetDebtUSD = currentCollateralValueUSD / 1.5;
  const diffUSD = targetDebtUSD - currentDebtValueUSD;

  const tokenBTotokenARatio = tokenA.totalAmount / tokenB.totalAmount;
  const ratioWithPrice = (tokenBTotokenARatio * tokenB.priceUSD) / tokenA.priceUSD;

  if (relevantDebtTokenA.walletAmount === BigInt(0) && relevantDebtTokenB.walletAmount === BigInt(0)) {
    const diffTokenAUSD = diffUSD / (1 + ratioWithPrice);

    const tokenAAmount = diffTokenAUSD / tokenA.priceUSD;

    return tokenAAmount;
  }

  const diffWalletTokenA =
    dangerouslyConvertBigIntToNumber(relevantDebtTokenA.walletAmount, 9, 9) -
    dangerouslyConvertBigIntToNumber(relevantDebtTokenB.walletAmount, 9, 9) * ratioWithPrice;

  if (diffWalletTokenA > 0) {
    // fill tokenB with amount for complete diff
    if (diffUSD < diffWalletTokenA * tokenA.priceUSD) {
      const tokenBAmount = diffUSD / tokenB.priceUSD;
      const tokenAAmount = (tokenBAmount * tokenB.totalAmount) / tokenA.totalAmount;

      return tokenAAmount;
    } else {
      const restDebtToShare = diffUSD - diffWalletTokenA * tokenA.priceUSD;
      const diffTokenAUSD = restDebtToShare / (1 + ratioWithPrice);

      const tokenAAmount = diffTokenAUSD / tokenA.priceUSD;

      return dangerouslyConvertBigIntToNumber(relevantDebtTokenA.walletAmount, 9, 9) + tokenAAmount;
    }
  } else {
    const diffWalletTokenBasA = Math.abs(
      dangerouslyConvertBigIntToNumber(relevantDebtTokenA.walletAmount, 9, 9) -
        dangerouslyConvertBigIntToNumber(relevantDebtTokenB.walletAmount, 9, 9) * ratioWithPrice,
    );

    if (diffUSD < diffWalletTokenBasA * tokenA.priceUSD) {
      // fill tokenA with amount for complete diff
      const tokenAAmount = diffUSD / tokenA.priceUSD;

      return tokenAAmount;
    } else {
      const restDebtToShare = diffUSD - diffWalletTokenBasA * tokenA.priceUSD;
      let diffTokenAUSD = restDebtToShare / (1 + ratioWithPrice);

      const tokenAAmount = diffTokenAUSD / tokenA.priceUSD;

      return dangerouslyConvertBigIntToNumber(relevantDebtTokenB.walletAmount, 9, 9) * ratioWithPrice + tokenAAmount;
    }
  }
};
