import { render, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { graphql } from 'msw';
import { Contracts } from '../../../context/EthersProvider';
import { GET_BORROWER_COLLATERAL_TOKENS, GET_BORROWER_DEBT_TOKENS } from '../../../queries';
import MockedGetCollateralTokens from '../../tests/mockedResponses/GetBorrowerCollateralTokens.mocked.json';
import MockedGetBorrowerDebtTokens from '../../tests/mockedResponses/GetBorrowerDebtTokens.mocked.json';
import { server } from '../../tests/setupMSW';
import { IntegrationWrapper } from '../../tests/test-utils';
import CollateralUpdateDialog from './CollateralUpdateDialog';

describe('CollateralUpdateDialog', () => {
  it('DEPOSIT: should call function of mocked contract', async () => {
    const contractMock = {
      borrowerOperationsContract: {
        addColl: jest.fn(),
      },
      collateralTokenContracts: {
        [Contracts.ERC20.JUSD]: {
          approve: jest.fn(),
        },
      },
    };

    // Mock response so tokens are always available
    server.use(
      graphql.query(GET_BORROWER_COLLATERAL_TOKENS, (_, res, ctx) => {
        return res(ctx.status(200), ctx.data(MockedGetCollateralTokens.data));
      }),

      graphql.query(GET_BORROWER_DEBT_TOKENS, (_, res, ctx) => {
        return res(ctx.status(200), ctx.data(MockedGetBorrowerDebtTokens.data));
      }),
    );

    const { getByRole, getByTestId } = render(
      <IntegrationWrapper
        shouldConnectWallet
        mockEthers={
          {
            contractMock,
          } as any
        }
      >
        <CollateralUpdateDialog buttonVariant="contained" />
      </IntegrationWrapper>,
    );

    await waitFor(
      () => {
        const openButton = getByRole('button', { name: 'Update' });
        expect(openButton).toBeEnabled();
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

    expect(contractMock.collateralTokenContracts[Contracts.ERC20.JUSD].approve).toHaveBeenCalledTimes(1);
    expect(contractMock.borrowerOperationsContract.addColl).toHaveBeenNthCalledWith(1, [
      { amount: 10000000000000000000n, tokenAddress: '0x509ee0d083ddf8ac028f2a56731412edd63223b8' },
    ]);
  });

  it('WITHDRAW: should call function of mocked contract', async () => {
    const contractMock = {
      borrowerOperationsContract: {
        withdrawColl: jest.fn(),
      },
    };

    // Mock response so tokens are always available
    server.use(
      graphql.query(GET_BORROWER_COLLATERAL_TOKENS, (_, res, ctx) => {
        return res(ctx.status(200), ctx.data(MockedGetCollateralTokens.data));
      }),

      graphql.query(GET_BORROWER_DEBT_TOKENS, (_, res, ctx) => {
        return res(ctx.status(200), ctx.data(MockedGetBorrowerDebtTokens.data));
      }),
    );

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

    await waitFor(
      () => {
        const openButton = getByRole('button', { name: 'Update' });
        expect(openButton).toBeDefined();
      },
      { timeout: 5000 },
    );

    const openButton = getByRole('button', { name: 'Update' });
    await userEvent.click(openButton);

    await waitFor(
      () => {
        const withdrawTab = getByRole('tab', { name: 'WITHDRAW' });
        expect(withdrawTab).toBeEnabled();
      },
      { timeout: 5000 },
    );

    const withdrawTab = getByRole('tab', { name: 'WITHDRAW' });
    await userEvent.click(withdrawTab);

    await waitFor(() => {
      const JUSDFormControl = getByTestId('apollon-collateral-update-dialog-JUSD-amount');
      expect(JUSDFormControl).toBeDefined();
    });

    const inputTokenAmount = document.querySelector<HTMLInputElement>(`input[name="${Contracts.ERC20.JUSD}"]`)!;
    await userEvent.type(inputTokenAmount, '10');

    const submitButton = getByRole('button', { name: 'Update' });
    await userEvent.click(submitButton);

    expect(contractMock.borrowerOperationsContract.withdrawColl).toHaveBeenNthCalledWith(1, [
      { amount: 10000000000000000000n, tokenAddress: '0x509ee0d083ddf8ac028f2a56731412edd63223b8' },
    ]);
  });
});
