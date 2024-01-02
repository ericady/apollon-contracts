import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Contracts } from '../../../context/EthersProvider';
import { IntegrationWrapper, PreselectedTestToken } from '../../tests/test-utils';
import Swap from './Swap';

describe('Swap', () => {
  it('should call "swapTokensForExactTokens" function and "approve" function of collateral Token of mocked contract', async () => {
    const contractMock = {
      swapOperationsContract: {
        swapTokensForExactTokens: jest.fn(async () => ({
          wait: async () => {},
        })),
      },
      collateralTokenContracts: {
        [Contracts.ERC20.JUSD]: {
          approve: jest.fn(async () => ({
            wait: async () => {},
          })),
        },
      },
    };
    const { getByRole, container } = render(
      <IntegrationWrapper
        shouldPreselectTokens
        shouldConnectWallet
        mockEthers={
          {
            contractMock,
          } as any
        }
      >
        <Swap />
      </IntegrationWrapper>,
    );

    await new Promise((resolve) => setTimeout(resolve, 500));

    const inputJUSD = container.querySelector<HTMLInputElement>('input[name="jUSDAmount"]')!;

    await userEvent.type(inputJUSD, '100');

    const submitButton = getByRole('button', { name: 'SWAP' });

    expect(submitButton).toBeEnabled();
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(contractMock.collateralTokenContracts[Contracts.ERC20.JUSD].approve).toHaveBeenCalledTimes(1);
      expect(contractMock.swapOperationsContract.swapTokensForExactTokens).toHaveBeenCalledTimes(1);
    });
  });

  it('should call swapExactTokensForTokens function of mocked contract', async () => {
    const contractMock = {
      swapOperationsContract: {
        swapExactTokensForTokens: jest.fn(async () => ({
          wait: async () => {},
        })),
      },
      debtTokenContracts: {
        [PreselectedTestToken.address]: {
          approve: jest.fn(async () => ({
            wait: async () => {},
          })),
        },
      },
    };
    const { getByRole, container } = render(
      <IntegrationWrapper
        shouldPreselectTokens
        shouldConnectWallet
        mockEthers={{
          // @ts-ignore
          contractMock,
        }}
      >
        <Swap />
      </IntegrationWrapper>,
    );

    await new Promise((resolve) => setTimeout(resolve, 500));

    const inputTokenAmount = container.querySelector<HTMLInputElement>('input[name="tokenAmount"]')!;

    await userEvent.type(inputTokenAmount, '100');

    const submitButton = getByRole('button', { name: 'SWAP' });

    expect(submitButton).toBeEnabled();
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(contractMock.debtTokenContracts[PreselectedTestToken.address].approve).toHaveBeenCalledTimes(1);
      expect(contractMock.swapOperationsContract.swapExactTokensForTokens).toHaveBeenCalledTimes(1);
    });
  });
});
