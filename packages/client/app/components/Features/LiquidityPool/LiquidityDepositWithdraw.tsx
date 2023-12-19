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
import { displayPercentage, floatToBigInt, roundCurrency } from '../../../utils/math';
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
  const { liquidity } = selectedPool;
  const [tokenA, tokenB] = liquidity;

  const {
    address,
    contracts: { swapOperationsContract, debtTokenContracts },
  } = useEthers();

  const [tabValue, setTabValue] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
  const [readOnlyField, setReadOnlyField] = useState<keyof FieldValues | null>(null);

  const [oldRatio, setOldRatio] = useState<number | null>(null);
  const [newRatio, setNewRatio] = useState<number | null>(null);

  const { data } = useQuery<GetBorrowerDebtTokensQuery, GetBorrowerDebtTokensQueryVariables>(GET_BORROWER_DEBT_TOKENS, {
    variables: { borrower: address },
    skip: !address,
  });

  const relevantDebtTokenA = data?.getDebtTokens.find(({ token }) => token.id === tokenA.token.id) ?? {
    walletAmount: 0,
  };
  const relevantDebtTokenB = data?.getDebtTokens.find(({ token }) => token.id === tokenB.token.id) ?? {
    walletAmount: 0,
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
  });
  const { handleSubmit, setValue, reset, formState, watch } = methods;

  const onSubmit = (data: FieldValues) => {
    const tokenAAmount = data.tokenAAmount ? parseInt(data.tokenAAmount) : 0;
    const tokenBAmount = data.tokenBAmount ? parseInt(data.tokenBAmount) : 0;
    const deadline = new Date().getTime() + 1000 * 60 * 2; // 2 minutes
    const _maxMintFeePercentage = floatToBigInt(0.02);

    if (tabValue === 'DEPOSIT') {
      // @ts-ignore
      (debtTokenContracts[tokenA.token.address] as DebtToken).approve(selectedPool.id, tokenAAmount);
      // @ts-ignore
      (debtTokenContracts[tokenB.token.address] as DebtToken).approve(selectedPool.id, tokenBAmount);
      swapOperationsContract.addLiquidity(
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
    }
  };

  const ratioChangeCallback = useCallback(
    (newRatio: number, oldRatio: number) => {
      setNewRatio(newRatio);
      setOldRatio(oldRatio);
    },
    [setNewRatio, setOldRatio],
  );

  useEffect(() => {
    if (!tokenA.borrowerAmount && !tokenB.borrowerAmount) {
      setTabValue('DEPOSIT');
    }

    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPool]);

  const handleInput = (fieldName: keyof FieldValues, value: string) => {
    const numericValue = isNaN(parseFloat(value)) ? 0 : parseFloat(value);

    if (tabValue === 'DEPOSIT') {
      if (fieldName === 'tokenAAmount') {
        const pairValue = roundCurrency((numericValue * tokenA.totalAmount) / tokenB.totalAmount, 5);

        setValue('tokenBAmount', pairValue.toString(), {
          shouldValidate: true,
          shouldDirty: true,
        });
      } else {
        const pairValue = roundCurrency((numericValue * tokenB.totalAmount) / tokenA.totalAmount, 5);

        setValue('tokenAAmount', pairValue.toString(), {
          shouldValidate: true,
          shouldDirty: true,
        });
      }

      setReadOnlyField(fieldName);
    } else {
    }
  };

  const fillMaxInputValue = (fieldName: keyof FieldValues) => {
    if (tabValue === 'DEPOSIT') {
      if (fieldName === 'tokenAAmount' && tokenA.borrowerAmount) {
        setValue(fieldName, relevantDebtTokenA.walletAmount.toString(), {
          shouldValidate: true,
          shouldDirty: true,
        });
      } else if (fieldName === 'tokenBAmount' && tokenB.borrowerAmount) {
        setValue(fieldName, relevantDebtTokenB.walletAmount.toString(), {
          shouldValidate: true,
          shouldDirty: true,
        });
      }

      setReadOnlyField(fieldName);
    } else {
    }
  };

  const tokenAAmount = watch('tokenAAmount');
  const tokenBAmount = watch('tokenBAmount');

  const addedDebtUSD =
    ((tokenAAmount ? parseInt(tokenAAmount) * tokenA.token.priceUSD : 0) +
      (tokenBAmount ? parseInt(tokenBAmount) * tokenB.token.priceUSD : 0)) *
    (tabValue === 'DEPOSIT' ? -1 : 1);

  return (
    <FeatureBox title="Your Liquidity" noPadding headBorder="bottom" border="full">
      <Tabs value={tabValue} onChange={handleChange} variant="fullWidth" sx={{ mt: 2 }}>
        <Tab label="DEPOSIT" value="DEPOSIT" disableRipple />
        <Tab
          label="WITHDRAW"
          value="WITHDRAW"
          disableRipple
          disabled={!tokenA.borrowerAmount && !tokenB.borrowerAmount}
        />
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
                    {roundCurrency(tokenA.borrowerAmount ?? 0, 5)}
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
                              parseInt(tokenAAmount) < relevantDebtTokenA.walletAmount
                                ? parseInt(tokenAAmount)
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
                              parseInt(tokenAAmount) > relevantDebtTokenA.walletAmount
                                ? parseInt(tokenAAmount) - relevantDebtTokenA.walletAmount
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
                      onClick={() => fillMaxInputValue('tokenBAmount')}
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
                    {roundCurrency(tokenB.borrowerAmount ?? 0, 5)}
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
                              parseInt(tokenBAmount) < relevantDebtTokenB.walletAmount
                                ? parseInt(tokenBAmount)
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
                              parseInt(tokenBAmount) > relevantDebtTokenB.walletAmount
                                ? parseInt(tokenBAmount) - relevantDebtTokenB.walletAmount
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
                      onClick={() => fillMaxInputValue('tokenBAmount')}
                    >
                      to 150%
                    </Button>
                  </div>
                </div>
              </Box>
            </>
          )}

          {/* WITHDRAW */}

          {tabValue === 'WITHDRAW' && tokenA.borrowerAmount && (
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
                <Label variant="success">{tokenA.token.symbol}</Label>
              </div>
              {/* TODO: Each stock token must be implemented with etherjs. Cant show a label here */}

              <div>
                <NumberInput
                  name="tokenAAmount"
                  data-testid="apollon-liquidity-pool-withdraw-token-a-amount"
                  placeholder="Value"
                  fullWidth
                  rules={{
                    min: { value: 0, message: 'You can only invest positive amounts.' },
                    max: {
                      value: tokenA.borrowerAmount!,
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
                      {roundCurrency(tokenA.borrowerAmount!, 5)}
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
          )}

          {tabValue === 'WITHDRAW' && tokenB.borrowerAmount && (
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
                <Label variant="success">{tokenB.token.symbol}</Label>
              </div>
              {/* TODO: Each stock token must be implemented with etherjs. Cant show a label here */}

              <div>
                <NumberInput
                  name="tokenBAmount"
                  data-testid="apollon-liquidity-pool-withdraw-token-b-amount"
                  placeholder="Value"
                  fullWidth
                  rules={{
                    min: { value: 0, message: 'You can only invest positive amounts.' },
                    max: {
                      value: tokenB.borrowerAmount!,
                      message: 'This amount is greater than your deposited amount.',
                    },
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <Typography
                      variant="caption"
                      data-testid="apollon-liquidity-pool-withdraw-token-b-funds-label"
                      color="info.main"
                    >
                      {roundCurrency(tokenB.borrowerAmount!, 5)}
                    </Typography>
                    <br />
                    <Typography variant="label">Deposited</Typography>
                  </div>
                  <Button
                    variant="undercover"
                    sx={{ textDecoration: 'underline', p: 0, mt: 0.25, height: 25 }}
                    onClick={() => fillMaxInputValue('tokenBAmount')}
                  >
                    max
                  </Button>
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
