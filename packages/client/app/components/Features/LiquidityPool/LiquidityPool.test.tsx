import { fireEvent, render, waitFor } from '@testing-library/react';
import { IntegrationWrapper } from '../../tests/test-utils';
import LiquidityPool from './LiquidityPool';

// TODO: Write tests to expect arguments in the contract call once they are concluded

describe('LiquidityPool', () => {
  it.skip('should call function of mocked contract', async () => {
    const contractMock = {
      totalSupply: jest.fn(),
    };
    const { getByRole, container, getByTestId } = render(
      <IntegrationWrapper
        shouldConnectWallet
        mockEthers={{
          contractMock,
        }}
      >
        <LiquidityPool />
      </IntegrationWrapper>,
    );

    await waitFor(() => {
      const firstTokenFormControl = getByTestId('apollon-liquidity-pool-deposit-token-a-amount');
      expect(firstTokenFormControl).toBeDefined();
    });

    const inputToken = container.querySelector<HTMLInputElement>('input[name="tokenAAmount"]')!;

    fireEvent.change(inputToken, { target: { value: '100' } });

    const submitButton = getByRole('button', { name: 'Update' });
    fireEvent(
      submitButton,
      new MouseEvent('click', {
        bubbles: true,
      }),
    );

    await waitFor(() => {
      expect(contractMock.totalSupply).toHaveBeenCalled();
    });
  });
});
