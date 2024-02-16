'use client';

import { useQuery } from '@apollo/client';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormHelperText,
  IconButton,
  Skeleton,
} from '@mui/material';
import Button, { ButtonProps } from '@mui/material/Button';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { SyntheticEvent, useCallback, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { IBase } from '../../../../generated/types/BorrowerOperations';
import { isCollateralTokenAddress, useEthers } from '../../../context/EthersProvider';
import { useTransactionDialog } from '../../../context/TransactionDialogProvider';
import { Contracts } from '../../../context/contracts.config';
import {
  GetBorrowerCollateralTokensQuery,
  GetBorrowerCollateralTokensQueryVariables,
} from '../../../generated/gql-types';
import { GET_BORROWER_COLLATERAL_TOKENS, GET_BORROWER_DEBT_TOKENS } from '../../../queries';
import { getHints } from '../../../utils/crypto';
import {
  bigIntStringToFloat,
  dangerouslyConvertBigIntToNumber,
  displayPercentage,
  floatToBigInt,
  roundCurrency,
} from '../../../utils/math';
import NumberInput from '../../FormControls/NumberInput';
import CrossIcon from '../../Icons/CrossIcon';
import DiamondIcon from '../../Icons/DiamondIcon';
import ForwardIcon from '../../Icons/ForwardIcon';
import Label from '../../Label/Label';
import CollateralRatioVisualization, { CRIT_RATIO } from '../../Visualizations/CollateralRatioVisualization';

type Props = {
  buttonVariant: ButtonProps['variant'];
  buttonSx?: ButtonProps['sx'];
};

type FieldValues = {
  [Contracts.ERC20.GOV]: string;
  [Contracts.ERC20.BTC]: string;
  [Contracts.ERC20.USDT]: string;
};

const CollateralUpdateDialog = ({ buttonVariant, buttonSx = {} }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tabValue, setTabValue] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
  const [oldRatio, setOldRatio] = useState(0);
  const [newRatio, setNewRatio] = useState(0);

  const {
    address,
    contracts: {
      borrowerOperationsContract,
      collateralTokenContracts,
      sortedTrovesContract,
      troveManagerContract,
      hintHelpersContract,
    },
  } = useEthers();
  const { setSteps } = useTransactionDialog();

  const { data } = useQuery<GetBorrowerCollateralTokensQuery, GetBorrowerCollateralTokensQueryVariables>(
    GET_BORROWER_COLLATERAL_TOKENS,
    {
      variables: {
        borrower: address,
      },
      skip: !address,
    },
  );

  const methods = useForm<FieldValues>({
    defaultValues: {
      [Contracts.ERC20.GOV]: '',
      [Contracts.ERC20.BTC]: '',
      [Contracts.ERC20.USDT]: '',
    },
    reValidateMode: 'onChange',
  });
  const { handleSubmit, setValue, reset, formState, watch } = methods;

  const ratioChangeCallback = useCallback(
    (newRatio: number, oldRatio: number) => {
      setNewRatio(newRatio);
      setOldRatio(oldRatio);
    },
    [setNewRatio, setOldRatio],
  );

  const handleChange = (_: SyntheticEvent, newValue: 'DEPOSIT' | 'WITHDRAW') => {
    setTabValue(newValue);
    reset();
  };

  const collateralToDeposit: GetBorrowerCollateralTokensQuery['collateralTokenMetas'] =
    data?.collateralTokenMetas ?? [];
  if (collateralToDeposit.length === 0)
    return (
      <Button
        variant={buttonVariant}
        sx={{
          width: 'auto',
          padding: '0 50px',
          ...buttonSx,
        }}
        disabled
      >
        Update
      </Button>
    );

  const fillMaxInputValue = (fieldName: keyof FieldValues, index: number) => {
    if (tabValue === 'DEPOSIT') {
      setValue(fieldName, dangerouslyConvertBigIntToNumber(collateralToDeposit[index].walletAmount, 9, 9).toString(), {
        shouldValidate: true,
        shouldDirty: true,
      });
    } else {
      setValue(
        fieldName,
        dangerouslyConvertBigIntToNumber(collateralToDeposit[index].troveLockedAmount, 9, 9).toString(),
        {
          shouldValidate: true,
          shouldDirty: true,
        },
      );
    }
  };

  const hasNoOpenTrove = !collateralToDeposit.some(({ troveLockedAmount }) => troveLockedAmount > 0);

  const onSubmit = async (data: FieldValues) => {
    const tokenAmounts = Object.entries(data)
      .filter(([_, amount]) => amount !== '')
      .map<IBase.TokenAmountStruct>(([address, amount]) => ({
        tokenAddress: address,
        amount: floatToBigInt(parseFloat(amount)),
      }));

    if (tokenAmounts.length === 0) return;

    if (tabValue === 'DEPOSIT') {
      setSteps([
        ...tokenAmounts.map(({ tokenAddress, amount }) => ({
          title: `Approve ${
            Object.entries(Contracts.ERC20).find(([_, value]) => value === tokenAddress)![0]
          } spending.`,
          transaction: {
            methodCall: async () => {
              // @ts-ignore
              if (isCollateralTokenAddress(tokenAddress)) {
                const collContract = collateralTokenContracts[tokenAddress];
                return collContract.approve(Contracts.BorrowerOperations, amount);
              }

              return null as any;
            },
            waitForResponseOf: [],
          },
        })),
        {
          title: hasNoOpenTrove ? 'Open Trove.' : 'Add Collateral to Trove.',
          transaction: {
            methodCall: async () => {
              if (hasNoOpenTrove) {
                return borrowerOperationsContract.openTrove(tokenAmounts);
              } else {
                const [upperHint, lowerHint] = await getHints(
                  troveManagerContract,
                  sortedTrovesContract,
                  hintHelpersContract,
                  {
                    borrower: address,
                    addedColl: tokenAmounts,
                    addedDebt: [],
                    removedColl: [],
                    removedDebt: [],
                  },
                );

                return borrowerOperationsContract.addColl(tokenAmounts, upperHint, lowerHint);
              }
            },
            reloadQueriesAferMined: hasNoOpenTrove
              ? [GET_BORROWER_COLLATERAL_TOKENS, GET_BORROWER_DEBT_TOKENS]
              : [GET_BORROWER_COLLATERAL_TOKENS],
            // wait for all approvals
            waitForResponseOf: Array.of(tokenAmounts.length).map((_, index) => index),
          },
        },
      ]);
    } else {
      setSteps([
        {
          title: 'Withdraw Collateral',
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
                  removedColl: tokenAmounts,
                  removedDebt: [],
                },
              );

              return borrowerOperationsContract.withdrawColl(tokenAmounts, upperHint, lowerHint);
            },
            reloadQueriesAferMined: [GET_BORROWER_COLLATERAL_TOKENS],
            waitForResponseOf: [],
          },
        },
      ]);
    }

    reset();
    setIsOpen(false);
  };

  const allTokenAmount = watch([Contracts.ERC20.GOV, Contracts.ERC20.BTC, Contracts.ERC20.USDT]);
  const allTokenAmountUSD =
    allTokenAmount.reduce((acc, curr, index) => {
      const address = [Contracts.ERC20.GOV, Contracts.ERC20.BTC, Contracts.ERC20.USDT][index];
      const { token } = collateralToDeposit.find(({ token }) => token.address === address)!;

      return acc + (isNaN(parseFloat(curr)) ? 0 : parseFloat(curr) * dangerouslyConvertBigIntToNumber(token.priceUSDOracle, 9, 9));
    }, 0) * (tabValue === 'DEPOSIT' ? -1 : 1);

  return (
    <>
      <Button
        variant={buttonVariant}
        sx={{
          width: 'auto',
          padding: '0 50px',
          ...buttonSx,
        }}
        onClick={() => setIsOpen(true)}
        disabled={
          !address ||
          !collateralToDeposit.some(({ walletAmount, troveLockedAmount }) => walletAmount > 0 || troveLockedAmount > 0)
        }
      >
        Update
      </Button>
      <Dialog
        open={isOpen}
        onClose={() => {
          reset();
          setIsOpen(false);
        }}
        fullWidth
        // @ts-ignore
        componentsProps={{ backdrop: { 'data-testid': 'apollon-collateral-update-dialog-backdrop' } }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'background.default',
            border: '1px solid',
            borderColor: 'background.paper',
            borderBottom: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <DiamondIcon isDialog />
            <Typography variant="h6" display="inline-block">
              COLLATERAL UPDATE
            </Typography>
          </div>
          <IconButton onClick={() => setIsOpen(false)} aria-label="close collateral update dialog">
            <CrossIcon />
          </IconButton>
        </DialogTitle>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogContent
              sx={{
                p: 0,
                backgroundColor: 'background.default',
                border: '1px solid',
                borderColor: 'background.paper',
                borderBottom: 'none',
              }}
            >
              <Tabs value={tabValue} onChange={handleChange} variant="fullWidth" sx={{ mt: 2 }}>
                <Tab label="DEPOSIT" value="DEPOSIT" />
                <Tab label="WITHDRAW" value="WITHDRAW" disabled={hasNoOpenTrove} />
              </Tabs>

              {collateralToDeposit
                .filter(
                  ({ troveLockedAmount, walletAmount }) =>
                    (tabValue === 'DEPOSIT' && walletAmount > 0) || (tabValue === 'WITHDRAW' && troveLockedAmount > 0),
                )
                .map(({ walletAmount, troveLockedAmount, token: { symbol, address } }, index) => {
                  return (
                    <div
                      key={address}
                      style={{ display: 'flex', justifyContent: 'space-between', padding: 20, height: 114 }}
                    >
                      {tabValue === 'DEPOSIT' && (
                        <div style={{ marginTop: 6 }}>
                          <Label variant="success">{symbol}</Label>
                          <Typography sx={{ fontWeight: '400', marginTop: '10px' }}>
                            {roundCurrency(dangerouslyConvertBigIntToNumber(troveLockedAmount, 12, 6), 5, 5)}
                          </Typography>
                          <Typography variant="label" paragraph>
                            Trove
                          </Typography>
                        </div>
                      )}
                      {tabValue === 'WITHDRAW' && (
                        <div style={{ marginTop: 6 }}>
                          <Label variant="success">{symbol}</Label>
                        </div>
                      )}

                      <div>
                        <NumberInput
                          name={address}
                          data-testid={`apollon-collateral-update-dialog-${symbol}-amount`}
                          placeholder="Value"
                          fullWidth
                          rules={{
                            min: { value: 0, message: 'Amount needs to be positive.' },
                            max:
                              tabValue === 'DEPOSIT'
                                ? {
                                    value: dangerouslyConvertBigIntToNumber(walletAmount, 12, 6),
                                    message: 'Your wallet does not contain the specified amount.',
                                  }
                                : {
                                    value: dangerouslyConvertBigIntToNumber(troveLockedAmount, 12, 6),
                                    message: 'Your trove does not contain the specified amount.',
                                  },
                          }}
                        />

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div>
                            {tabValue === 'DEPOSIT' && (
                              <>
                                <Typography
                                  variant="caption"
                                  data-testid="apollon-collateral-update-dialog-deposit-ether-funds-label"
                                  color="info.main"
                                >
                                  {roundCurrency(dangerouslyConvertBigIntToNumber(walletAmount, 12, 6), 5, 5)}
                                </Typography>
                                <Typography variant="label" paragraph>
                                  Wallet
                                </Typography>
                              </>
                            )}
                            {tabValue === 'WITHDRAW' && (
                              <>
                                <Typography
                                  variant="caption"
                                  data-testid="apollon-collateral-update-dialog-withdraw-ether-funds-label"
                                  color="info.main"
                                >
                                  {roundCurrency(dangerouslyConvertBigIntToNumber(troveLockedAmount, 12, 6), 5, 5)}
                                </Typography>
                                <Typography variant="label" paragraph>
                                  Trove
                                </Typography>
                              </>
                            )}
                          </div>

                          <Button
                            variant="undercover"
                            sx={{ textDecoration: 'underline', p: 0, mt: 0.25, height: 25 }}
                            onClick={() => fillMaxInputValue(address as keyof FieldValues, index)}
                          >
                            max
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

              <Box
                sx={{
                  padding: '20px',
                  borderTop: '1px solid',
                  borderColor: 'background.paper',
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
                      sx={{
                        fontFamily: 'Space Grotesk Variable',
                        color: 'info.main',
                        fontWeight: '700',
                        fontSize: '20px',
                      }}
                    >
                      {oldRatio !== null ? (
                        displayPercentage(oldRatio, 'default', 0)
                      ) : (
                        <Skeleton variant="text" width={50} />
                      )}
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

                <CollateralRatioVisualization addedDebtUSD={allTokenAmountUSD} callback={ratioChangeCallback} />
              </Box>
            </DialogContent>
            <DialogActions
              sx={{
                border: '1px solid',
                borderColor: 'background.paper',
                backgroundColor: 'background.default',
                p: '30px 20px',
              }}
            >
              <div style={{ width: '100%' }}>
                <Button
                  type="submit"
                  variant="outlined"
                  sx={{ borderColor: 'primary.contrastText' }}
                  disabled={tabValue === 'WITHDRAW' && newRatio < CRIT_RATIO}
                >
                  Update
                </Button>
                {formState.isSubmitted && !formState.isDirty && (
                  <FormHelperText error sx={{ mt: '10px' }} data-testid="apollon-collateral-update-dialog-error">
                    You must specify at least one token to update.
                  </FormHelperText>
                )}
              </div>
            </DialogActions>
          </form>
        </FormProvider>
      </Dialog>
    </>
  );
};

export default CollateralUpdateDialog;
