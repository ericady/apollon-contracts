import { fireEvent, getAllByTestId, render, waitFor } from '@testing-library/react';
import { IntegrationWrapper } from '../../tests/test-utils';
import StabilityUpdateDialog from './StabilityUpdateDialog';

// TODO: Write tests to expect arguments in the contract call once they are concluded

describe('StabilityUpdateDialog', () => {
  it.skip('should call function of mocked contract', async () => {
    const contractMock = {
      totalSupply: jest.fn(),
    };
    const { getByRole } = render(
      <IntegrationWrapper
        shouldConnectWallet
        mockEthers={{
          contractMock,
        }}
      >
        <StabilityUpdateDialog />
      </IntegrationWrapper>,
    );

    const openButton = getByRole('button', { name: 'Update' });
    fireEvent(
      openButton,
      new MouseEvent('click', {
        bubbles: true,
      }),
    );

    await waitFor(
      () => {
        const firstTokenFormControl = getAllByTestId(
          document.querySelector('body')!,
          'apollon-stability-update-dialog-input',
        )[0];
        expect(firstTokenFormControl).toBeDefined();
      },
      { timeout: 1000 },
    );
    const firstTokenFormControl = getAllByTestId(
      document.querySelector('body')!,
      'apollon-stability-update-dialog-input',
    )[0];

    const inputToken = firstTokenFormControl.querySelector<HTMLInputElement>('input')!;

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
