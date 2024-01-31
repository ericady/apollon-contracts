'use client';

import { useQuery } from '@apollo/client';
import { Box, FormHelperText, Skeleton } from '@mui/material';
import Button from '@mui/material/Button';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { SyntheticEvent, useCallback, useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { DebtToken } from '../../../../generated/types';
import { useEthers } from '../../../context/EthersProvider';
import { useTransactionDialog } from '../../../context/TransactionDialogProvider';
import {
  DebtTokenMeta,
  GetBorrowerDebtTokensQuery,
  GetBorrowerDebtTokensQueryVariables,
  GetBorrowerLiquidityPoolsQuery,
} from '../../../generated/gql-types';
import { GET_BORROWER_DEBT_TOKENS } from '../../../queries';
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
    contracts: { swapOperationsContract, debtTokenContracts },
  } = useEthers();
  const { setSteps } = useTransactionDialog();

  const [tabValue, setTabValue] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');

  const [oldRatio, setOldRatio] = useState<number | null>(null);
  const [newRatio, setNewRatio] = useState<number | null>(null);
  const [currentDebtValueUSD, setCurrentDebtValueUSD] = useState<number | null>(null);
  const [currentCollateralValueUSD, setCurrentCollateralValueUSD] = useState<number | null>(null);

  const { data } = useQuery<GetBorrowerDebtTokensQuery, GetBorrowerDebtTokensQueryVariables>(GET_BORROWER_DEBT_TOKENS, {
    variables: { borrower: address },
    skip: !address,
  });

  const relevantDebtTokenA = data?.debtTokenMetas.find(({ token }) => token.id === tokenA.token.id) ?? {
    walletAmount: BigInt(0),
    troveMintedAmount: BigInt(0),
  };
  const relevantDebtTokenB = data?.debtTokenMetas.find(({ token }) => token.id === tokenB.token.id) ?? {
    walletAmount: BigInt(0),
    troveMintedAmount: BigInt(0),
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

    if (tabValue === 'DEPOSIT') {
      setSteps([
        {
          title: `Approve spending of ${tokenA.token.symbol}.`,
          transaction: {
            methodCall: async () => {
              // @ts-ignore
              return (debtTokenContracts[tokenA.token.address] as DebtToken).approve(selectedPool.id, tokenAAmount);
            },
            waitForResponseOf: [],
          },
        },
        {
          title: `Approve spending of ${tokenB.token.symbol}.`,
          transaction: {
            methodCall: async () => {
              // @ts-ignore
              return (debtTokenContracts[tokenB.token.address] as DebtToken).approve(selectedPool.id, tokenBAmount);
            },
            waitForResponseOf: [],
          },
        },
        {
          title: `Add Liquidity for ${tokenA.token.symbol} and ${tokenB.token.symbol}.`,
          transaction: {
            methodCall: async () => {
              return swapOperationsContract.addLiquidity(
                tokenA.token.address,
                tokenB.token.address,
                floatToBigInt(tokenAAmount),
                floatToBigInt(tokenBAmount),
                floatToBigInt(tokenAAmount * (1 - SLIPPAGE)),
                floatToBigInt(tokenBAmount * (1 - SLIPPAGE)),
                // FIXME: What is MintMeta?
                _maxMintFeePercentage as any,
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
              // FIXME: Adjust for new params
              return swapOperationsContract.removeLiquidity(
                // @ts-ignore
                tokenA.token.address,
                tokenB.token.address,
                floatToBigInt(tokenAAmount),
                floatToBigInt(tokenAAmountForWithdraw * (1 - SLIPPAGE)),
                floatToBigInt(tokenBAmountForWithdraw * (1 - SLIPPAGE)),
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
        setValue(fieldName, dangerouslyConvertBigIntToNumber(relevantDebtTokenA.walletAmount, 9, 9).toString(), {
          shouldValidate: true,
          shouldDirty: true,
        });
        handleInput(fieldName, dangerouslyConvertBigIntToNumber(relevantDebtTokenA.walletAmount, 9, 9).toString());
      } else if (fieldName === 'tokenBAmount') {
        setValue(fieldName, dangerouslyConvertBigIntToNumber(relevantDebtTokenB.walletAmount, 9, 9).toString(), {
          shouldValidate: true,
          shouldDirty: true,
        });
        handleInput(fieldName, dangerouslyConvertBigIntToNumber(relevantDebtTokenB.walletAmount, 9, 9).toString());
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
        relevantDebtTokenA as DebtTokenMeta,
        relevantDebtTokenB as DebtTokenMeta,
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
              (parseFloat(tokenAAmount) - dangerouslyConvertBigIntToNumber(relevantDebtTokenA.walletAmount, 9, 9)) *
                tokenA.token.priceUSD,
              0,
            )
          : 0) +
        (tokenBAmount
          ? Math.max(
              (parseFloat(tokenBAmount) - dangerouslyConvertBigIntToNumber(relevantDebtTokenB.walletAmount, 9, 9)) *
                tokenB.token.priceUSD,
              0,
            )
          : 0)
      : ((relevantDebtTokenA.troveMintedAmount > tokenAAmountForWithdraw
          ? tokenAAmountForWithdraw * tokenA.token.priceUSD
          : dangerouslyConvertBigIntToNumber(relevantDebtTokenA.troveMintedAmount, 9, 9) * tokenA.token.priceUSD) +
          (relevantDebtTokenB.troveMintedAmount > tokenBAmountForWithdraw
            ? tokenBAmountForWithdraw * tokenB.token.priceUSD
            : dangerouslyConvertBigIntToNumber(relevantDebtTokenB.troveMintedAmount, 9, 9) * tokenB.token.priceUSD)) *
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
                                dangerouslyConvertBigIntToNumber(relevantDebtTokenA.walletAmount, 9, 9)
                                ? parseFloat(tokenAAmount)
                                : dangerouslyConvertBigIntToNumber(relevantDebtTokenA.walletAmount, 12, 6),
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
                      disabled={relevantDebtTokenA.walletAmount <= 0}
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
                                dangerouslyConvertBigIntToNumber(relevantDebtTokenA.walletAmount, 9, 9)
                                ? parseFloat(tokenAAmount) -
                                    dangerouslyConvertBigIntToNumber(relevantDebtTokenA.walletAmount, 12, 6)
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
                                dangerouslyConvertBigIntToNumber(relevantDebtTokenB.walletAmount, 9, 9)
                                ? parseFloat(tokenBAmount)
                                : dangerouslyConvertBigIntToNumber(relevantDebtTokenB.walletAmount, 12, 6),
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
                      disabled={relevantDebtTokenB.walletAmount <= 0}
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
                                dangerouslyConvertBigIntToNumber(relevantDebtTokenB.walletAmount, 9, 9)
                                ? parseFloat(tokenBAmount) -
                                    dangerouslyConvertBigIntToNumber(relevantDebtTokenB.walletAmount, 12, 9)
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
                      {tokenAAmountForWithdraw > relevantDebtTokenA.troveMintedAmount
                        ? roundCurrency(
                            dangerouslyConvertBigIntToNumber(relevantDebtTokenA.troveMintedAmount, 12, 6),
                            5,
                            5,
                          )
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
                      {tokenBAmountForWithdraw > relevantDebtTokenB.troveMintedAmount
                        ? roundCurrency(
                            dangerouslyConvertBigIntToNumber(relevantDebtTokenB.troveMintedAmount, 12, 6),
                            5,
                            5,
                          )
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
  relevantDebtTokenA: DebtTokenMeta,
  relevantDebtTokenB: DebtTokenMeta,
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
