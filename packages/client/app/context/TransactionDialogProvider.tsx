'use client';
import { Dialog, DialogContent, DialogTitle, Step, StepLabel, Stepper } from '@mui/material';
import { ContractTransactionResponse } from 'ethers/contract';
import { Dispatch, SetStateAction, createContext, useContext, useEffect, useState } from 'react';
import Draggable from 'react-draggable';

type TransactionStep = {
  title: string;
  transaction: {
    methodCall: () => Promise<ContractTransactionResponse>;
    resultPromise?: ContractTransactionResponse;
    waitForResponseOf: number[];
  };
};

export const TransactionDialogContext = createContext<{
  steps: TransactionStep[];
  setSteps: Dispatch<SetStateAction<TransactionStep[]>>;
}>({
  steps: [],
  setSteps: () => {},
});

export default function TransactionDialogProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [steps, setSteps] = useState<TransactionStep[]>([]);
  const [activeStep, setActiveStep] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (steps.length > 0) {
      setActiveStep(0);
    } else {
      setActiveStep(undefined);
    }
  }, [steps]);

  useEffect(() => {
    if (activeStep !== undefined) {
      const {
        transaction: { methodCall, waitForResponseOf },
      } = steps[activeStep];
      console.log('TransactionDialogProvider: activeStep !== undefined');
      // First wait if previous necessary steps have been mined
      Promise.all(waitForResponseOf.map((stepIndex) => steps[stepIndex].transaction.resultPromise?.wait())).then(
        async () => {
          console.log(
            'TransactionDialogProvider: Promise.all(waitForResponseOf.map((stepIndex) => steps[stepIndex].transaction.resultPromise?.wait()))',
          );
          // wait for signing
          steps[activeStep].transaction.resultPromise = await methodCall();
          console.log('AFTER');
          setActiveStep((activeStep) => (activeStep as number) + 1);
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep]);

  // TODO: handle exit and success screen + second initialisation
  // const handleSetSteps: () => {};

  return (
    <TransactionDialogContext.Provider value={{ steps, setSteps }}>
      <>
        <Draggable handle={'[class*="MuiDialog-root"]'} cancel={'[class*="MuiDialogContent-root"]'}>
          <Dialog
            open={activeStep !== undefined}
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
          >
            <DialogTitle>Transactions in progress</DialogTitle>
            <DialogContent>
              <Stepper activeStep={activeStep} alternativeLabel>
                {steps.map(({ title }, index) => (
                  <Step key={index}>
                    <StepLabel>{title}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </DialogContent>
          </Dialog>
        </Draggable>

        {children}
      </>
    </TransactionDialogContext.Provider>
  );
}

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
