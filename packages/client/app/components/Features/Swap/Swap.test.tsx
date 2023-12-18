import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntegrationWrapper } from '../../tests/test-utils';
import Swap from './Swap';

describe('Swap', () => {
  it('should call swapTokensForExactTokens function of mocked contract', async () => {
    const contractMock = {
      swapOperationsContract: {
        swapTokensForExactTokens: jest.fn(),
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
        <Swap />
      </IntegrationWrapper>,
    );

    const inputJUSD = container.querySelector<HTMLInputElement>('input[name="jUSDAmount"]')!;

    await userEvent.type(inputJUSD, '100');

    const submitButton = getByRole('button', { name: 'SWAP' });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    await userEvent.click(submitButton);
    expect(contractMock.swapOperationsContract.swapTokensForExactTokens).toHaveBeenCalledTimes(1);
  });

  it('should call swapExactTokensForTokens function of mocked contract', async () => {
    const contractMock = {
      swapOperationsContract: {
        swapExactTokensForTokens: jest.fn(),
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
        <Swap />
      </IntegrationWrapper>,
    );

    const inputTokenAmount = container.querySelector<HTMLInputElement>('input[name="tokenAmount"]')!;

    await userEvent.type(inputTokenAmount, '100');

    const submitButton = getByRole('button', { name: 'SWAP' });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    await userEvent.click(submitButton);
    expect(contractMock.swapOperationsContract.swapExactTokensForTokens).toHaveBeenCalledTimes(1);
  });
});
