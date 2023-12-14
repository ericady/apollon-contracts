import { fireEvent, render, waitFor } from '@testing-library/react';
import { IntegrationWrapper } from '../../tests/test-utils';
import Swap from './Swap';

// TODO: Write tests to expect arguments in the contract call once they are concluded

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

    fireEvent.change(inputJUSD, { target: { value: '100' } });

    const submitButton = getByRole('button', { name: 'SWAP' });

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
      expect(contractMock.swapOperationsContract.swapTokensForExactTokens).toHaveBeenCalledTimes(1);
    });
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

    fireEvent.change(inputTokenAmount, { target: { value: '100' } });

    const submitButton = getByRole('button', { name: 'SWAP' });

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
      expect(contractMock.swapOperationsContract.swapExactTokensForTokens).toHaveBeenCalledTimes(1);
    });
  });
});
