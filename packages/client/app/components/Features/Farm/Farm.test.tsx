import { fireEvent, render, waitFor } from '@testing-library/react';
import { IntegrationWrapper } from '../../tests/test-utils';
import Farm from './Farm';

describe('Farm', () => {
  it('should call openLongPosition function of mocked contract', async () => {
    const contractMock = {
      swapOperationsContract: {
        openLongPosition: jest.fn(),
      },
    };
    const { getByRole, container } = render(
      <IntegrationWrapper
        shouldPreselectTokens
        shouldConnectWallet
        mockEthers={{
          contractMock,
        }}
      >
        <Farm />
      </IntegrationWrapper>,
    );

    const inputJUSD = container.querySelector<HTMLInputElement>('input[name="farmShortValue"]')!;

    fireEvent.change(inputJUSD, { target: { value: '100' } });

    const submitButton = getByRole('button', { name: 'EXECUTE' });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    fireEvent(
      submitButton,
      new MouseEvent('click', {
        bubbles: true,
      }),
    );

    await waitFor(() => {
      expect(contractMock.swapOperationsContract.openLongPosition).toHaveBeenCalledTimes(1);
    });
  });

  it('should call openShortPosition function of mocked contract', async () => {
    const contractMock = {
      swapOperationsContract: {
        openShortPosition: jest.fn(),
      },
    };
    const { getByRole, container } = render(
      <IntegrationWrapper
        shouldPreselectTokens
        shouldConnectWallet
        mockEthers={{
          contractMock,
        }}
      >
        <Farm />
      </IntegrationWrapper>,
    );

    const shortTab = getByRole('tab', { name: 'SHORT' });
    fireEvent(
      shortTab,
      new MouseEvent('click', {
        bubbles: true,
      }),
    );

    const inputJUSD = container.querySelector<HTMLInputElement>('input[name="farmShortValue"]')!;

    fireEvent.change(inputJUSD, { target: { value: '100' } });

    const submitButton = getByRole('button', { name: 'EXECUTE' });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    fireEvent(
      submitButton,
      new MouseEvent('click', {
        bubbles: true,
      }),
    );

    await waitFor(() => {
      expect(contractMock.swapOperationsContract.openShortPosition).toHaveBeenCalledTimes(1);
    });
  });
});
