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
import { useEthers } from '../../../context/EthersProvider';
import { useTransactionDialog } from '../../../context/TransactionDialogProvider';
import { isCollateralTokenAddress, isDebtTokenAddress } from '../../../context/contracts.config';
import {
  DebtTokenMeta,
  GetBorrowerCollateralTokensQuery,
  GetBorrowerCollateralTokensQueryVariables,
  GetBorrowerDebtTokensQuery,
  GetBorrowerDebtTokensQueryVariables,
  GetBorrowerLiquidityPoolsQuery,
  GetBorrowerLiquidityPoolsQueryVariables,
} from '../../../generated/gql-types';
import {
  GET_BORROWER_COLLATERAL_TOKENS,
  GET_BORROWER_DEBT_TOKENS,
  GET_BORROWER_LIQUIDITY_POOLS,
} from '../../../queries';
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
  selectedPoolId: string | null;
};

type FieldValues = {
  tokenAAmount: string;
  tokenBAmount: string;
};

function LiquidityDepositWithdraw({ selectedPoolId }: Props) {
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

  // For Update after TX
  const { data: borrowerPoolsData, loading } = useQuery<
    GetBorrowerLiquidityPoolsQuery,
    GetBorrowerLiquidityPoolsQueryVariables
  >(GET_BORROWER_LIQUIDITY_POOLS, { variables: { borrower: address } });
  const selectedPool = borrowerPoolsData?.pools.find(({ id }) => id === selectedPoolId);

  const methods = useForm<FieldValues>({
    defaultValues: {
      tokenAAmount: '',
      tokenBAmount: '',
    },
    reValidateMode: 'onChange',
    shouldUnregister: true,
  });
  const { handleSubmit, setValue, reset, formState, watch } = methods;

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
    if (!selectedPool?.borrowerAmount) {
      setTabValue('DEPOSIT');
    }

    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPool]);

  // Wait until pool has been selected
  if (!selectedPool) return null;

  const { liquidity, borrowerAmount, totalSupply } = selectedPool;
  const [tokenA, tokenB] = liquidity.map((liquidity) => ({
    ...liquidity,
    token: { ...liquidity.token, priceUSD: dangerouslyConvertBigIntToNumber(liquidity.token.priceUSDOracle, 9, 9) },
  }));

  const isCollateralPair = isCollateralTokenAddress(tokenA.token.id) || isCollateralTokenAddress(tokenB.token.id);

  const foundTokenA = (isDebtTokenAddress(tokenA.token.id)
    ? debtTokenData?.debtTokenMetas.find(({ token }) => token.id === tokenA.token.id) ?? {
        walletAmount: BigInt(0),
        troveRepableDebtAmount: BigInt(0),
      }
    : collTokenData?.collateralTokenMetas.find(({ token }) => token.id === tokenA.token.id)) ?? {
    walletAmount: BigInt(0),
  };

  const foundTokenB = (isDebtTokenAddress(tokenB.token.id)
    ? debtTokenData?.debtTokenMetas.find(({ token }) => token.id === tokenB.token.id) ?? {
        walletAmount: BigInt(0),
        troveRepableDebtAmount: BigInt(0),
      }
    : collTokenData?.collateralTokenMetas.find(({ token }) => token.id === tokenB.token.id)) ?? {
    walletAmount: BigInt(0),
  };

  const handleChange = (_: SyntheticEvent, newValue: 'DEPOSIT' | 'WITHDRAW') => {
    setTabValue(newValue);
    reset();
  };

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
        amount: floatToBigInt(tokenBAmount, tokenB.token.decimals),
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
                return debtTokenContracts[tokenA.token.address].approve(
                  selectedPool.address,
                  floatToBigInt(tokenAAmount),
                );
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
                return debtTokenContracts[tokenB.token.address].approve(
                  selectedPool.address,
                  floatToBigInt(tokenBAmount),
                );
              } else if (isCollateralTokenAddress(tokenB.token.address)) {
                return collateralTokenContracts[tokenB.token.address].approve(
                  selectedPool.address,
                  floatToBigInt(tokenBAmount, tokenB.token.decimals),
                );
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
            reloadQueriesAferMined: [
              GET_BORROWER_COLLATERAL_TOKENS,
              GET_BORROWER_DEBT_TOKENS,
              GET_BORROWER_LIQUIDITY_POOLS,
            ],
          },
        },
      ]);
    } else {
      const percentageFromPool = tokenAAmount / bigIntStringToFloat(totalSupply);
      const tokenAAmountForWithdraw =
        percentageFromPool * bigIntStringToFloat(tokenA.totalAmount, tokenA.token.decimals);
      const tokenBAmountForWithdraw =
        percentageFromPool * bigIntStringToFloat(tokenB.totalAmount, tokenB.token.decimals);

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
            reloadQueriesAferMined: [
              GET_BORROWER_COLLATERAL_TOKENS,
              GET_BORROWER_DEBT_TOKENS,
              GET_BORROWER_LIQUIDITY_POOLS,
            ],
          },
        },
      ]);
    }

    reset();
  };

  const handleInput = (fieldName: keyof FieldValues, value: string) => {
    const numericValue = isNaN(parseFloat(value)) ? 0 : parseFloat(value);

    if (tabValue === 'DEPOSIT') {
      if (fieldName === 'tokenAAmount') {
        const pairValue = roundNumber(
          (numericValue * bigIntStringToFloat(tokenB.totalAmount, tokenB.token.decimals)) /
            bigIntStringToFloat(tokenA.totalAmount, tokenA.token.decimals),
          5,
        );
        setValue('tokenBAmount', pairValue.toString(), {
          shouldValidate: true,
          shouldDirty: true,
        });
      } else {
        const pairValue = roundNumber(
          (numericValue * bigIntStringToFloat(tokenA.totalAmount, tokenA.token.decimals)) /
            bigIntStringToFloat(tokenB.totalAmount, tokenB.token.decimals),
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
    // calculate max value of walletAmount for pool distribution
    if (isCollateralPair) {
      if (tabValue === 'DEPOSIT') {
        const walletAmountAForPool =
          (dangerouslyConvertBigIntToNumber(foundTokenA.walletAmount, 9, 9) *
            bigIntStringToFloat(tokenB.totalAmount, tokenB.token.decimals)) /
          bigIntStringToFloat(tokenA.totalAmount, tokenA.token.decimals);

        if (
          walletAmountAForPool <
          dangerouslyConvertBigIntToNumber(foundTokenB.walletAmount, tokenB.token.decimals - 9, 9)
        ) {
          setValue('tokenAAmount', dangerouslyConvertBigIntToNumber(foundTokenA.walletAmount, 9, 9).toString(), {
            shouldValidate: true,
            shouldDirty: true,
          });
          handleInput('tokenAAmount', dangerouslyConvertBigIntToNumber(foundTokenA.walletAmount, 9, 9).toString());
        } else {
          setValue('tokenBAmount', dangerouslyConvertBigIntToNumber(foundTokenB.walletAmount, 9, 9).toString(), {
            shouldValidate: true,
            shouldDirty: true,
          });
          handleInput(
            'tokenBAmount',
            dangerouslyConvertBigIntToNumber(foundTokenB.walletAmount, tokenB.token.decimals - 9, 9).toString(),
          );
        }
      } else {
        setValue(fieldName, dangerouslyConvertBigIntToNumber(borrowerAmount, 9, 9).toString(), {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    }
    // New token can be minted, just will the walletAmount
    else {
      if (tabValue === 'DEPOSIT') {
        if (fieldName === 'tokenAAmount') {
          setValue(fieldName, dangerouslyConvertBigIntToNumber(foundTokenA.walletAmount, 9, 9).toString(), {
            shouldValidate: true,
            shouldDirty: true,
          });
          handleInput(fieldName, dangerouslyConvertBigIntToNumber(foundTokenA.walletAmount, 9, 9).toString());
        } else if (fieldName === 'tokenBAmount') {
          setValue(fieldName, dangerouslyConvertBigIntToNumber(foundTokenB.walletAmount, 9, 9).toString(), {
            shouldValidate: true,
            shouldDirty: true,
          });
          handleInput(fieldName, dangerouslyConvertBigIntToNumber(foundTokenB.walletAmount, 9, 9).toString());
        }
      } else {
        setValue(fieldName, dangerouslyConvertBigIntToNumber(borrowerAmount, 9, 9).toString(), {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    }
  };

  /**
   * Can only be called is the pair is a DebtTokenPair
   */
  const fill150PercentInputValue = () => {
    // Check if current collateral is less than 150% of current debt
    if (currentDebtValueUSD && currentCollateralValueUSD) {
      const tokenAAmount = calculate150PercentTokenValue(
        currentDebtValueUSD,
        currentCollateralValueUSD,
        {
          totalAmount: bigIntStringToFloat(tokenA.totalAmount, tokenA.token.decimals),
          priceUSD: dangerouslyConvertBigIntToNumber(tokenA.token.priceUSDOracle, 9, 9),
        },
        {
          totalAmount: bigIntStringToFloat(tokenB.totalAmount, tokenB.token.decimals),
          priceUSD: dangerouslyConvertBigIntToNumber(tokenB.token.priceUSDOracle, 9, 9),
        },
        foundTokenA,
        foundTokenB,
      );

      console.log('tokenAAmount: ', tokenAAmount);

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
  const tokenAAmountForWithdraw = percentageFromPool * bigIntStringToFloat(tokenA.totalAmount, tokenA.token.decimals);
  const tokenBAmountForWithdraw = percentageFromPool * bigIntStringToFloat(tokenB.totalAmount, tokenB.token.decimals);

  // If it is a CollTokenPair there is no Debt to take
  const addedDebtUSD = !isCollateralPair
    ? tabValue === 'DEPOSIT'
      ? (tokenAAmount
          ? Math.max(
              (parseFloat(tokenAAmount) - dangerouslyConvertBigIntToNumber(foundTokenA.walletAmount, 9, 9)) *
                dangerouslyConvertBigIntToNumber(tokenA.token.priceUSDOracle, 9, 9),
              0,
            )
          : 0) +
        (tokenBAmount
          ? Math.max(
              (parseFloat(tokenBAmount) - dangerouslyConvertBigIntToNumber(foundTokenB.walletAmount, 9, 9)) *
                dangerouslyConvertBigIntToNumber(tokenB.token.priceUSDOracle, 9, 9),
              0,
            )
          : 0)
      : (((foundTokenA as DebtTokenMeta).troveRepableDebtAmount > tokenAAmountForWithdraw
          ? tokenAAmountForWithdraw * dangerouslyConvertBigIntToNumber(tokenA.token.priceUSDOracle, 9, 9)
          : dangerouslyConvertBigIntToNumber((foundTokenA as DebtTokenMeta).troveRepableDebtAmount, 9, 9) *
            dangerouslyConvertBigIntToNumber(tokenA.token.priceUSDOracle, 9, 9)) +
          ((foundTokenB as DebtTokenMeta).troveRepableDebtAmount > tokenBAmountForWithdraw
            ? tokenBAmountForWithdraw * dangerouslyConvertBigIntToNumber(tokenB.token.priceUSDOracle, 9, 9)
            : dangerouslyConvertBigIntToNumber((foundTokenB as DebtTokenMeta).troveRepableDebtAmount, 9, 9) *
              dangerouslyConvertBigIntToNumber(tokenB.token.priceUSDOracle, 9, 9))) *
        -1
    : 0;

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
                        tokenA.token.decimals - 6,
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
                      max: isCollateralPair
                        ? {
                            value: dangerouslyConvertBigIntToNumber(
                              foundTokenA.walletAmount,
                              tokenA.token.decimals - 9,
                              9,
                            ),
                            message: 'You wallet does not contain the specified amount.',
                          }
                        : undefined,
                      required: 'This field is required.',
                    }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    {isCollateralPair ? (
                      <div>
                        <Typography
                          variant="caption"
                          data-testid="apollon-collateral-update-dialog-deposit-ether-funds-label"
                          color="info.main"
                        >
                          {roundCurrency(dangerouslyConvertBigIntToNumber(foundTokenA.walletAmount, 12, 6), 5, 5)}
                        </Typography>
                        <Typography variant="label" paragraph>
                          Wallet
                        </Typography>
                      </div>
                    ) : (
                      <div>
                        <Typography
                          variant="caption"
                          data-testid="apollon-collateral-update-dialog-deposit-ether-funds-label"
                          color="info.main"
                        >
                          {tokenAAmount
                            ? roundCurrency(
                                parseFloat(tokenAAmount) <
                                  dangerouslyConvertBigIntToNumber(foundTokenA.walletAmount, 9, 9)
                                  ? parseFloat(tokenAAmount)
                                  : dangerouslyConvertBigIntToNumber(foundTokenA.walletAmount, 12, 6),
                                5,
                                5,
                              )
                            : 0}
                        </Typography>
                        <Typography variant="label" paragraph>
                          from Wallet
                        </Typography>
                      </div>
                    )}

                    <Button
                      disabled={foundTokenA.walletAmount <= 0}
                      variant="undercover"
                      sx={{ textDecoration: 'underline', p: 0, mt: 0.25, height: 25 }}
                      onClick={() => fillMaxInputValue('tokenAAmount')}
                    >
                      max
                    </Button>
                  </div>

                  {!isCollateralPair && (
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
                                  dangerouslyConvertBigIntToNumber(foundTokenA.walletAmount, 9, 9)
                                  ? parseFloat(tokenAAmount) -
                                      dangerouslyConvertBigIntToNumber(foundTokenA.walletAmount, 12, 6)
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
                        disabled
                        // disabled={
                        //   !currentCollateralValueUSD ||
                        //   !currentDebtValueUSD ||
                        //   currentCollateralValueUSD / currentDebtValueUSD < 1.5
                        // }
                        variant="undercover"
                        sx={{ textDecoration: 'underline', p: 0, mt: 0.25, height: 25 }}
                        onClick={() => fill150PercentInputValue()}
                      >
                        to 150%
                      </Button>
                    </div>
                  )}
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
                        tokenB.token.decimals - 6,
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
                      // Make sure coll data is already loaded.
                      max: isCollateralPair
                        ? {
                            value: dangerouslyConvertBigIntToNumber(
                              foundTokenB.walletAmount,
                              tokenB.token.decimals - 9,
                              9,
                            ),
                            message: 'You wallet does not contain the specified amount.',
                          }
                        : undefined,
                      required: 'This field is required.',
                    }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    {isCollateralPair ? (
                      <div>
                        <Typography
                          variant="caption"
                          data-testid="apollon-collateral-update-dialog-deposit-ether-funds-label"
                          color="info.main"
                        >
                          {roundCurrency(
                            dangerouslyConvertBigIntToNumber(foundTokenB.walletAmount, tokenB.token.decimals - 6, 6),
                            5,
                            5,
                          )}
                        </Typography>
                        <Typography variant="label" paragraph>
                          Wallet
                        </Typography>
                      </div>
                    ) : (
                      <div>
                        <Typography
                          variant="caption"
                          data-testid="apollon-collateral-update-dialog-deposit-ether-funds-label"
                          color="info.main"
                        >
                          {tokenBAmount
                            ? roundCurrency(
                                parseFloat(tokenBAmount) <
                                  dangerouslyConvertBigIntToNumber(foundTokenB.walletAmount, 9, 9)
                                  ? parseFloat(tokenBAmount)
                                  : dangerouslyConvertBigIntToNumber(foundTokenB.walletAmount, 12, 6),
                                5,
                                5,
                              )
                            : 0}
                        </Typography>
                        <Typography variant="label" paragraph>
                          from Wallet
                        </Typography>
                      </div>
                    )}

                    <Button
                      disabled={foundTokenB.walletAmount <= 0}
                      variant="undercover"
                      sx={{ textDecoration: 'underline', p: 0, mt: 0.25, height: 25 }}
                      onClick={() => fillMaxInputValue('tokenBAmount')}
                    >
                      max
                    </Button>
                  </div>

                  {!isCollateralPair && (
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
                                  dangerouslyConvertBigIntToNumber(foundTokenB.walletAmount, 9, 9)
                                  ? parseFloat(tokenBAmount) -
                                      dangerouslyConvertBigIntToNumber(foundTokenB.walletAmount, 12, 9)
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
                        disabled
                        // disabled={
                        //   !currentCollateralValueUSD ||
                        //   !currentDebtValueUSD ||
                        //   currentCollateralValueUSD / currentDebtValueUSD < 1.5
                        // }
                        variant="undercover"
                        sx={{ textDecoration: 'underline', p: 0, mt: 0.25, height: 25 }}
                        onClick={() => fill150PercentInputValue()}
                      >
                        to 150%
                      </Button>
                    </div>
                  )}
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
                  <Label variant="success">MNT-{tokenB.token.symbol}</Label>
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

                  {!isCollateralPair && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography component="span" style={{ marginRight: '8px' }}>
                        {tokenAAmountForWithdraw >
                        dangerouslyConvertBigIntToNumber((foundTokenA as DebtTokenMeta).troveRepableDebtAmount, 12, 6)
                          ? roundCurrency(
                              dangerouslyConvertBigIntToNumber(
                                (foundTokenA as DebtTokenMeta).troveRepableDebtAmount,
                                12,
                                6,
                              ),
                              5,
                              5,
                            )
                          : roundCurrency(tokenAAmountForWithdraw, 5, 5)}
                      </Typography>

                      <Typography variant="label">Debt payed of</Typography>
                    </div>
                  )}
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

                  {!isCollateralPair && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography component="span" style={{ marginRight: '8px' }}>
                        {tokenBAmountForWithdraw >
                        dangerouslyConvertBigIntToNumber((foundTokenB as DebtTokenMeta).troveRepableDebtAmount, 12, 6)
                          ? roundCurrency(
                              dangerouslyConvertBigIntToNumber(
                                (foundTokenB as DebtTokenMeta).troveRepableDebtAmount,
                                12,
                                6,
                              ),
                              5,
                              5,
                            )
                          : roundCurrency(tokenBAmountForWithdraw, 5, 5)}
                      </Typography>

                      <Typography variant="label">Debt payed of</Typography>
                    </div>
                  )}
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
  const ratioWithPrice = (tokenBTotokenARatio * tokenA.priceUSD) / tokenB.priceUSD;

  if (relevantDebtTokenA.walletAmount === BigInt(0) && relevantDebtTokenB.walletAmount === BigInt(0)) {
    const diffTokenAUSD = diffUSD / (1 + ratioWithPrice);

    const tokenAAmount = diffTokenAUSD / tokenA.priceUSD;

    return tokenAAmount;
  }

  const diffWalletTokenA =
    dangerouslyConvertBigIntToNumber(relevantDebtTokenA.walletAmount, 9, 9) -
    dangerouslyConvertBigIntToNumber(relevantDebtTokenB.walletAmount, 9, 9) * tokenBTotokenARatio * ratioWithPrice;
  if (diffWalletTokenA > 0) {
    // fill tokenB with amount for complete diff
    if (diffUSD < diffWalletTokenA * tokenA.priceUSD) {
      const tokenBAmount = diffUSD / tokenB.priceUSD;
      const tokenAAmount = (tokenBAmount * tokenA.totalAmount) / tokenB.totalAmount;

      return tokenAAmount;
    } else {
      const restDebtToShare = diffUSD - diffWalletTokenA * tokenA.priceUSD;
      const diffTokenAUSD = restDebtToShare / (1 + ratioWithPrice);

      const tokenAAmount = diffTokenAUSD / tokenA.priceUSD;

      return dangerouslyConvertBigIntToNumber(relevantDebtTokenA.walletAmount, 9, 9) + tokenAAmount;
    }
  }
  // We have more token B than A
  else {
    const diffWalletTokenBasA = Math.abs(diffWalletTokenA);

    // Everything comes from TokenA / TokenB is not Minted
    if (diffUSD < diffWalletTokenBasA * tokenA.priceUSD) {
      // fill tokenA with amount for complete diff + wallet amount
      const tokenAAmountAsDebt = diffUSD / tokenA.priceUSD;

      return tokenAAmountAsDebt + dangerouslyConvertBigIntToNumber(relevantDebtTokenA.walletAmount, 9, 9);
    } else {
      const restDebtToShare = diffUSD - diffWalletTokenBasA * tokenA.priceUSD;
      let diffTokenAUSD = (restDebtToShare * tokenBTotokenARatio) / (1 + ratioWithPrice);

      const tokenAAmount = diffTokenAUSD / tokenA.priceUSD;

      return (
        dangerouslyConvertBigIntToNumber(relevantDebtTokenB.walletAmount, 9, 9) * tokenBTotokenARatio * ratioWithPrice +
        tokenAAmount
      );
    }
  }
};
