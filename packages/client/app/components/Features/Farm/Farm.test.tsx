import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

    await userEvent.type(inputJUSD, '100');

    const submitButton = getByRole('button', { name: 'EXECUTE' });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    await userEvent.click(submitButton);
    expect(contractMock.swapOperationsContract.openLongPosition).toHaveBeenCalledTimes(1);
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
    await userEvent.click(shortTab);

    const inputJUSD = container.querySelector<HTMLInputElement>('input[name="farmShortValue"]')!;

    await userEvent.type(inputJUSD, '100');

    const submitButton = getByRole('button', { name: 'EXECUTE' });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    await userEvent.click(submitButton);
    expect(contractMock.swapOperationsContract.openShortPosition).toHaveBeenCalledTimes(1);
  });
});
