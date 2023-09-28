import { fireEvent, render, waitFor } from '@testing-library/react';
import { IntegrationWrapper } from '../../tests/test-utils';
import CollateralUpdateDialog from './CollateralUpdateDialog';

// TODO: Write tests to expect arguments in the contract call once they are concluded

describe('CollateralUpdateDialog', () => {
  it.skip('should call function of mocked contract', async () => {
    const contractMock = {
      totalSupply: jest.fn(),
    };
    const { getByRole, getByTestId } = render(
      <IntegrationWrapper
        shouldConnectWallet
        mockEthers={{
          contractMock,
        }}
      >
        <CollateralUpdateDialog buttonVariant="contained" />
      </IntegrationWrapper>,
    );

    const openButton = getByRole('button', { name: 'Update' });
    fireEvent(
      openButton,
      new MouseEvent('click', {
        bubbles: true,
      }),
    );

    await waitFor(() => {
      const firstTokenFormControl = getByTestId('apollon-collateral-update-dialog-ether-amount');
      expect(firstTokenFormControl).toBeDefined();
    });

    const inputToken = document.querySelector<HTMLInputElement>('input[name="etherTokenAmount"]')!;

    fireEvent.change(inputToken, { target: { value: '0' } });

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
