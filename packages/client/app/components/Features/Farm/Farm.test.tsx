import { fireEvent, render, waitFor } from '@testing-library/react';
import { IntegrationWrapper } from '../../tests/test-utils';
import Farm from './Farm';

// TODO: Write tests to expect arguments in the contract call once they are concluded

describe('Farm', () => {
  it.skip('should call function of mocked contract', async () => {
    const contractMock = {
      totalSupply: jest.fn(),
    };
    const { getByRole, container } = render(
      <IntegrationWrapper
        shouldConnectWallet
        mockEthers={{
          contractMock,
        }}
      >
        <Farm />
      </IntegrationWrapper>,
    );

    const inputToken = container.querySelector<HTMLInputElement>('input[name="farmShortValue"]')!;

    fireEvent.change(inputToken, { target: { value: '100' } });

    const submitButton = getByRole('button', { name: 'EXECUTE' });
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
