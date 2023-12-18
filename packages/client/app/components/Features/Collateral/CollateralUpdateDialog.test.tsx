import { render, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { graphql } from 'msw';
import { Contracts } from '../../../context/EthersProvider';
import MockedGetCollateralTokens from '../../tests/mockedResponses/GetBorrowerCollateralTokens.mocked.json';
import { server } from '../../tests/setupMSW';
import { IntegrationWrapper } from '../../tests/test-utils';
import CollateralUpdateDialog from './CollateralUpdateDialog';

// TODO: Write tests to expect arguments in the contract call once they are concluded

describe('CollateralUpdateDialog', () => {
  it('should call function of mocked contract', async () => {
    const contractMock = {
      borrowerOperationsContract: {
        addColl: jest.fn(),
      },
    };

    // MOck response so tokens are always available
    server.use(
      graphql.query('GetCollateralTokens', (_, res, ctx) => {
        return res(ctx.status(200), ctx.data(MockedGetCollateralTokens.data));
      }),
    );

    const { getByRole, getByTestId, container, getAllByRole } = render(
      <IntegrationWrapper
        shouldConnectWallet
        mockEthers={{
          contractMock,
        }}
      >
        <CollateralUpdateDialog buttonVariant="contained" />
      </IntegrationWrapper>,
    );

    await waitFor(
      () => {
        const openButton = getByRole('button', { name: 'Update' });
        expect(openButton).toBeDefined();
      },
      { timeout: 5000 },
    );

    const openButton = getByRole('button', { name: 'Update' });

    await userEvent.click(openButton);

    await waitFor(() => {
      const JUSDFormControl = getByTestId('apollon-collateral-update-dialog-JUSD-amount');
      expect(JUSDFormControl).toBeDefined();
    });

    const inputTokenAmount = document.querySelector<HTMLInputElement>(`input[name="${Contracts.ERC20.JUSD}"]`)!;
    await userEvent.type(inputTokenAmount, '10');

    const submitButton = getByRole('button', { name: 'Update' });
    await userEvent.click(submitButton);

    expect(contractMock.borrowerOperationsContract.addColl).toHaveBeenCalledTimes(1);
  });
});
