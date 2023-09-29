import { fireEvent, render, waitFor } from '@testing-library/react';
import { IntegrationWrapper } from '../../tests/test-utils';
import Swap from './Swap';

// TODO: Write tests to expect arguments in the contract call once they are concluded

describe('Swap', () => {
  it.skip('should call function of mocked contract', async () => {
    const contractMock = {
      approve: jest.fn(),
      totalSupply: jest.fn(),
    };
    const { getByRole, container } = render(
      <IntegrationWrapper
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
    fireEvent(
      submitButton,
      new MouseEvent('click', {
        bubbles: true,
      }),
    );

    await waitFor(() => {
      expect(contractMock.approve).toHaveBeenCalled();
    });
  });
});