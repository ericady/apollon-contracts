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
import {
  GetBorrowerDebtTokensQuery,
  GetBorrowerDebtTokensQueryVariables,
  GetBorrowerLiquidityPoolsQuery,
} from '../../../generated/gql-types';
import { GET_BORROWER_DEBT_TOKENS } from '../../../queries';
import { displayPercentage, floatToBigInt, roundCurrency, roundNumber } from '../../../utils/math';
import FeatureBox from '../../FeatureBox/FeatureBox';
import NumberInput from '../../FormControls/NumberInput';
import ForwardIcon from '../../Icons/ForwardIcon';
import Label from '../../Label/Label';
import CollateralRatioVisualization from '../../Visualizations/CollateralRatioVisualization';

const SLIPPAGE = 0.02;

type Props = {
  selectedPool: GetBorrowerLiquidityPoolsQuery['getPools'][number];
};

type FieldValues = {
  tokenAAmount: string;
  tokenBAmount: string;
};

function LiquidityDepositWithdraw({ selectedPool }: Props) {
  const { liquidity, borrowerAmount, totalSupply } = selectedPool;
  const [tokenA, tokenB] = liquidity;

  const {
    address,
    contracts: { swapOperationsContract, debtTokenContracts },
  } = useEthers();

  const [tabValue, setTabValue] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');

  const [oldRatio, setOldRatio] = useState<number | null>(null);
  const [newRatio, setNewRatio] = useState<number | null>(null);
  const [currentDebtValueUSD, setCurrentDebtValueUSD] = useState<number | null>(null);
  const [currentCollateralValueUSD, setCurrentCollateralValueUSD] = useState<number | null>(null);

  const { data } = useQuery<GetBorrowerDebtTokensQuery, GetBorrowerDebtTokensQueryVariables>(GET_BORROWER_DEBT_TOKENS, {
    variables: { borrower: address },
    skip: !address,
  });

  const relevantDebtTokenA = data?.getDebtTokens.find(({ token }) => token.id === tokenA.token.id) ?? {
    walletAmount: 0,
    troveMintedAmount: 0,
  };
  const relevantDebtTokenB = data?.getDebtTokens.find(({ token }) => token.id === tokenB.token.id) ?? {
    walletAmount: 0,
    troveMintedAmount: 0,
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
      // @ts-ignore
      await (debtTokenContracts[tokenA.token.address] as DebtToken).approve(selectedPool.id, tokenAAmount);
      // @ts-ignore
      await (debtTokenContracts[tokenB.token.address] as DebtToken).approve(selectedPool.id, tokenBAmount);
      await swapOperationsContract.addLiquidity(
        tokenA.token.address,
        tokenB.token.address,
        floatToBigInt(tokenAAmount),
        floatToBigInt(tokenBAmount),
        floatToBigInt(tokenAAmount * (1 - SLIPPAGE)),
        floatToBigInt(tokenBAmount * (1 - SLIPPAGE)),
        _maxMintFeePercentage,
        deadline,
      );
    } else {
      const percentageFromPool = tokenAAmount / totalSupply;
      const percentagefromUser = tokenAAmount / borrowerAmount;
      const tokenAAmountForWithdraw = percentageFromPool * tokenA.totalAmount;
      const tokenBAmountForWithdraw = percentageFromPool * tokenB.totalAmount;

      await swapOperationsContract.removeLiquidity(
        tokenA.token.address,
        tokenB.token.address,
        floatToBigInt(percentagefromUser),
        floatToBigInt(tokenAAmountForWithdraw * (1 - SLIPPAGE)),
        floatToBigInt(tokenBAmountForWithdraw * (1 - SLIPPAGE)),
        deadline,
      );
    }
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
        const pairValue = roundNumber((numericValue * tokenA.totalAmount) / tokenB.totalAmount, 5);
        setValue('tokenBAmount', pairValue.toString(), {
          shouldValidate: true,
          shouldDirty: true,
        });
      } else {
        const pairValue = roundNumber((numericValue * tokenB.totalAmount) / tokenA.totalAmount, 5);

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
      if (fieldName === 'tokenAAmount' && relevantDebtTokenA.walletAmount) {
        setValue(fieldName, relevantDebtTokenA.walletAmount.toString(), {
          shouldValidate: true,
          shouldDirty: true,
        });
        handleInput(fieldName, relevantDebtTokenA.walletAmount.toString());
      } else if (fieldName === 'tokenBAmount' && relevantDebtTokenB.walletAmount) {
        setValue(fieldName, relevantDebtTokenB.walletAmount.toString(), {
          shouldValidate: true,
          shouldDirty: true,
        });
        handleInput(fieldName, relevantDebtTokenB.walletAmount.toString());
      }
    } else {
      setValue(fieldName, borrowerAmount.toString(), {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  };

  // TODO: Create a unit test for this, I am too stupid to do it from the top of my head
  const fill150PercentInputValue = (fieldName: keyof FieldValues) => {
    // Create the diff to have 150% currentCollateralValueUSD of currentDebtValueUSD
    // if (currentDebtValueUSD && currentCollateralValueUSD && currentCollateralValueUSD / currentDebtValueUSD < 1.5) {
    //   const diffUSD = Math.abs(currentCollateralValueUSD / 1.5 - currentDebtValueUSD);
    //   if (relevantDebtTokenA.walletAmount === 0 && relevantDebtTokenB.walletAmount === 0) {
    //     const tokenBTotokenARatio = (1 * tokenA.totalAmount) / tokenB.totalAmount;
    //     const ratioWithPrice = (tokenBTotokenARatio * tokenB.token.priceUSD) / (1 * tokenA.token.priceUSD);
    //     const diffTokenBUSD = diffUSD / ratioWithPrice;
    //     const diffTokenBAmount = diffTokenBUSD / tokenB.token.priceUSD;
    //     setValue('tokenBAmount', diffTokenBAmount.toString());
    //     handleInput('tokenBAmount', diffTokenBAmount.toString());
    //   }
    //   const diffWalletTokenAUSD =
    //     relevantDebtTokenA.walletAmount * tokenA.token.priceUSD -
    //     relevantDebtTokenB.walletAmount * tokenB.token.priceUSD;
    //   if (diffWalletTokenAUSD > 0) {
    //     // fill tokenB with amount for complete diff
    //     if (diffUSD < diffWalletTokenAUSD) {
    //       const targetTokenBUSD = diffUSD / tokenB.token.priceUSD;
    //       const targetTokenBAmount = targetTokenBUSD / tokenB.token.priceUSD;
    //       setValue('tokenBAmount', targetTokenBAmount.toString());
    //       handleInput('tokenBAmount', targetTokenBAmount.toString());
    //     } else {
    //       const restDebtToShare = diffUSD - diffWalletTokenAUSD;
    //       const tokenBTotokenARatio = (1 * tokenA.totalAmount) / tokenB.totalAmount;
    //       const diffTokenBUSD = restDebtToShare / (tokenBTotokenARatio + 1);
    //       const diffTokenBAmount = diffTokenBUSD / tokenB.token.priceUSD;
    //       setValue('tokenBAmount', diffTokenBAmount.toString());
    //       handleInput('tokenBAmount', (relevantDebtTokenB.walletAmount + diffTokenBAmount).toString());
    //     }
    //   } else {
    //   }
    //   }
  };

  const tokenAAmount = watch('tokenAAmount');
  const tokenBAmount = watch('tokenBAmount');

  // Withdraw
  const percentageFromPool = (tokenAAmount ? parseFloat(tokenAAmount) : 0) / totalSupply;
  const tokenAAmountForWithdraw = percentageFromPool * tokenA.totalAmount;
  const tokenBAmountForWithdraw = percentageFromPool * tokenB.totalAmount;

  const addedDebtUSD =
    tabValue === 'DEPOSIT'
      ? (tokenAAmount
          ? Math.max(parseFloat(tokenAAmount) - relevantDebtTokenA.walletAmount * tokenA.token.priceUSD, 0)
          : 0) +
        (tokenBAmount
          ? Math.max(parseFloat(tokenBAmount) - relevantDebtTokenB.walletAmount * tokenB.token.priceUSD, 0)
          : 0)
      : ((relevantDebtTokenA.troveMintedAmount > tokenAAmountForWithdraw
          ? tokenAAmountForWithdraw * tokenA.token.priceUSD
          : relevantDebtTokenA.troveMintedAmount * tokenA.token.priceUSD) +
          (relevantDebtTokenB.troveMintedAmount > tokenBAmountForWithdraw
            ? tokenBAmountForWithdraw * tokenB.token.priceUSD
            : relevantDebtTokenB.troveMintedAmount * tokenB.token.priceUSD)) *
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
                    {roundCurrency((borrowerAmount / totalSupply) * tokenA.totalAmount, 5)}
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
                              parseFloat(tokenAAmount) < relevantDebtTokenA.walletAmount
                                ? parseFloat(tokenAAmount)
                                : relevantDebtTokenA.walletAmount,
                              5,
                            )
                          : 0}
                      </Typography>
                      <Typography variant="label" paragraph>
                        from Wallet
                      </Typography>
                    </div>

                    <Button
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
                              parseFloat(tokenAAmount) > relevantDebtTokenA.walletAmount
                                ? parseFloat(tokenAAmount) - relevantDebtTokenA.walletAmount
                                : 0,
                              5,
                            )
                          : 0}
                      </Typography>
                      <Typography variant="label" paragraph>
                        newly minted
                      </Typography>
                    </div>

                    <Button
                      variant="undercover"
                      sx={{ textDecoration: 'underline', p: 0, mt: 0.25, height: 25 }}
                      onClick={() => fill150PercentInputValue('tokenAAmount')}
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
                    {roundCurrency((borrowerAmount / totalSupply) * tokenB.totalAmount, 5)}
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
                              parseFloat(tokenBAmount) < relevantDebtTokenB.walletAmount
                                ? parseFloat(tokenBAmount)
                                : relevantDebtTokenB.walletAmount,
                              5,
                            )
                          : 0}
                      </Typography>
                      <Typography variant="label" paragraph>
                        from Wallet
                      </Typography>
                    </div>

                    <Button
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
                              parseFloat(tokenBAmount) > relevantDebtTokenB.walletAmount
                                ? parseFloat(tokenBAmount) - relevantDebtTokenB.walletAmount
                                : 0,
                              5,
                            )
                          : 0}
                      </Typography>
                      <Typography variant="label" paragraph>
                        newly minted
                      </Typography>
                    </div>

                    <Button
                      variant="undercover"
                      sx={{ textDecoration: 'underline', p: 0, mt: 0.25, height: 25 }}
                      onClick={() => fill150PercentInputValue('tokenBAmount')}
                    >
                      to 150%
                    </Button>
                  </div>
                </div>
              </Box>
            </>
          )}

          {/* WITHDRAW */}

          {tabValue === 'WITHDRAW' && borrowerAmount && (
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
                  <Label variant="success">Proxy Token</Label>
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
                        value: borrowerAmount,
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
                        {roundCurrency(borrowerAmount, 5)}
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
                      {roundCurrency(tokenAAmountForWithdraw, 5)}
                    </Typography>

                    <Typography variant="label">Payout</Typography>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography component="span" style={{ marginRight: '8px' }}>
                      {tokenAAmountForWithdraw > relevantDebtTokenA.troveMintedAmount
                        ? roundCurrency(relevantDebtTokenA.troveMintedAmount, 5)
                        : roundCurrency(tokenAAmountForWithdraw, 5)}
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
                      {roundCurrency(tokenBAmountForWithdraw, 5)}
                    </Typography>

                    <Typography variant="label">Payout</Typography>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography component="span" style={{ marginRight: '8px' }}>
                      {tokenBAmountForWithdraw > relevantDebtTokenB.troveMintedAmount
                        ? roundCurrency(relevantDebtTokenB.troveMintedAmount, 5)
                        : roundCurrency(tokenBAmountForWithdraw, 5)}
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
            <Button type="submit" variant="outlined" disabled={!address}>
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
