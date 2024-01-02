'use client';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import {
  Alert,
  Box,
  CircularProgress,
  CircularProgressProps,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material';
import { ContractTransactionReceipt, ContractTransactionResponse } from 'ethers/contract';
import { useSnackbar } from 'notistack';
import { Dispatch, ReactNode, SetStateAction, createContext, useContext, useEffect, useState } from 'react';
import Draggable from 'react-draggable';
import CrossIcon from '../components/Icons/CrossIcon';
import DiamondIcon from '../components/Icons/DiamondIcon';

export type TransactionStep = {
  title: string;
  description?: ReactNode;
  transaction: {
    methodCall: () => Promise<ContractTransactionResponse>;
    waitForResponseOf: number[];
  };
};

type StepState = {
  resultPromise?: Promise<void>;
  transactionReceipt?: ContractTransactionReceipt | null;
  status: 'pending' | 'success' | 'error' | 'waiting';
  error?: string;
};

/**
 * Contracts are not yet deployed and therefore we instead show some demo steps in the client.
 * In testing the real implementation is kept because it can be mocked.
 */
const createDemoSteps = (steps: TransactionStep[]): TransactionStep[] => {
  if (process.env.NODE_ENV !== 'test') {
    return steps.map(({ transaction, ...props }, index) => {
      const signTimeout = Math.random() * 1000;
      const mineTimeout = Math.random() * 1000;

      return {
        ...props,
        transaction: {
          methodCall: () =>
            new Promise((res) =>
              setTimeout(
                () =>
                  res({
                    wait: () => new Promise((res) => setTimeout(() => res(true), mineTimeout)),
                  } as any),
                signTimeout,
              ),
            ),
          waitForResponseOf: transaction.waitForResponseOf.length > 0 ? Array(index).map((_, index) => index) : [],
        },
      };
    });
  } else {
    return steps;
  }
};

export const TransactionDialogContext = createContext<{
  steps: TransactionStep[];
  setSteps: Dispatch<SetStateAction<TransactionStep[]>>;
}>({
  steps: [],
  setSteps: () => {},
});

export default function TransactionDialogProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const { enqueueSnackbar } = useSnackbar();

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [steps, setSteps] = useState<TransactionStep[]>([]);
  const [stepsState, setStepsState] = useState<StepState[]>([]);

  const [activeStep, setActiveStep] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (steps.length > 0) {
      setActiveStep(0);
    } else {
      setActiveStep(undefined);
      setStepsState(Array(steps.length).fill({ status: 'waiting' }));
    }
  }, [steps]);

  useEffect(() => {
    if (activeStep !== undefined) {
      const {
        transaction: { methodCall, waitForResponseOf },
      } = steps[activeStep];
      // First wait if previous necessary steps have been mined
      Promise.all(waitForResponseOf.map((stepIndex) => stepsState[stepIndex].resultPromise)).then(async () => {
        // wait for signing
        methodCall()
          .then((resultPromise) => {
            // set initial mining state and update it once Promise resolves.
            setStepsState((stepsState) => {
              const currentStep = activeStep;
              const newStepsState = [...stepsState];
              newStepsState[currentStep] = {
                status: 'pending',
                resultPromise: resultPromise
                  .wait()
                  .then((transactionReceipt) => {
                    setStepsState((stepsState) => {
                      const newStepsState = [...stepsState];
                      newStepsState[currentStep] = { status: 'success', transactionReceipt };
                      return newStepsState;
                    });
                  })
                  .catch((error) => {
                    newStepsState[currentStep] = { status: 'error', error };
                    setStepsState(newStepsState);
                  }),
              };
              return newStepsState;
            });

            if (activeStep < steps.length - 1) {
              setActiveStep((activeStep) => (activeStep as number) + 1);
            } else {
              setShowConfirmation(true);
              setTimeout(() => setActiveStep(undefined), 5000);
            }
          })
          .catch(() => {
            enqueueSnackbar('Transaction was rejected.', { variant: 'error' });
          });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep]);

  const getIcon = (status: StepState['status']) => {
    switch (status) {
      case 'waiting':
        return undefined;
      case 'pending':
        return CircularProgressSmall;
      case 'success':
        return CheckCircleIcon;
      case 'error':
        return ErrorIcon;
      default:
        const _exhaustiveCheck: never = status;
        return undefined;
    }
  };

  return (
    <TransactionDialogContext.Provider
      value={{
        steps,
        // @ts-ignore
        setSteps: (steps: TransactionStep[]) => {
          setSteps(createDemoSteps(steps));
        },
      }}
    >
      <>
        <Draggable handle={'[class*="MuiDialog-root"]'} cancel={'[class*="MuiDialogContent-root"]'}>
          <Dialog
            open={activeStep !== undefined}
            onClose={() => {
              setSteps([]);
              setActiveStep(undefined);
            }}
            maxWidth="sm"
            fullWidth
            disableEnforceFocus // Allows other things to take focus
            hideBackdrop // Hides the shaded backdrop
            disableScrollLock
            disableAutoFocus // Prevents backdrop clicks
            style={{
              height: 'fit-content', // Ensures that the dialog is
              width: 'fit-content', // exactly the same size as its contents
            }}
            // @ts-ignore
            componentsProps={{ backdrop: { 'data-testid': 'apollon-transaction-signer-dialog-backdrop' } }}
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
                  {showConfirmation ? 'Operation successful.' : `${steps.length} transactions in progress.`}
                </Typography>
              </div>
              <IconButton
                onClick={() => {
                  setSteps([]);
                  setActiveStep(undefined);
                }}
                aria-label="close transaction dialog"
              >
                <CrossIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent
              sx={{
                p: 0,
                backgroundColor: 'background.default',
                border: '1px solid',
                borderColor: 'background.paper',
                borderBottom: 'none',
              }}
            >
              {showConfirmation ? (
                <div style={{ display: 'grid', placeItems: 'center', padding: '20px' }}>
                  <CheckCircleIcon fontSize="large" color="success" />
                  <Typography variant="h6" textAlign="center">
                    All transactions have been confirmed. This window will close automatically now.
                  </Typography>
                </div>
              ) : (
                <>
                  <Alert severity="info">
                    Please sign each transaction and do not close this window until all transactions are confirmed. Some
                    actions require previous approvals to be mined first and might take some time.
                  </Alert>

                  <Box sx={{ padding: '20px' }}>
                    <Stepper activeStep={activeStep} orientation="vertical">
                      {steps.map(({ title, description, transaction }, index) => (
                        <Step key={index}>
                          <StepLabel
                            StepIconComponent={getIcon(stepsState[index]?.status)}
                            optional={
                              stepsState[index]?.status === 'error' ? (
                                <Typography variant="caption" fontSize={10} color="error">
                                  Error: {stepsState[index]?.error}
                                </Typography>
                              ) : (
                                description
                              )
                            }
                          >
                            {title}{' '}
                            {transaction.waitForResponseOf.length > 0 &&
                              `(wait until step ${transaction.waitForResponseOf
                                .map((number) => `"${number}"`)
                                .join(', ')} resolve first)`}
                          </StepLabel>
                        </Step>
                      ))}
                    </Stepper>
                  </Box>
                </>
              )}
            </DialogContent>
          </Dialog>
        </Draggable>

        {children}
      </>
    </TransactionDialogContext.Provider>
  );
}

const CircularProgressSmall = (props: CircularProgressProps) => {
  const size = 24;

  return <CircularProgress size={size} {...props} />;
};

export function useTransactionDialog(): {
  steps: TransactionStep[];
  setSteps: Dispatch<SetStateAction<TransactionStep[]>>;
} {
  const context = useContext(TransactionDialogContext);
  if (context === undefined) {
    throw new Error('useTransactionDialog must be used within an TransactionDialogContextProvider');
  }
  return context;
}
