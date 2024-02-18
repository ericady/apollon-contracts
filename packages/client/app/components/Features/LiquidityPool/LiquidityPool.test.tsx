import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockedGetBorrowerLiquidityPools from '../../tests/mockedResponses/GetBorrowerLiquidityPools.mocked.json';
import { IntegrationWrapper } from '../../tests/test-utils';
import LiquidityDepositWithdraw from './LiquidityDepositWithdraw';

// TODO: Write tests to expect arguments in the contract call once they are concluded

describe('LiquidityPool', () => {
  it('Deposit: should call function of mocked contract', async () => {
    const mockedPool = MockedGetBorrowerLiquidityPools.data.pools[0];

    const contractMock = {
      swapOperationsContract: {
        addLiquidity: jest.fn(async () => ({
          wait: async () => {},
        })),
      },
      debtTokenContracts: {
        [mockedPool.liquidity[0].token.address]: {
          approve: jest.fn(async () => ({
            wait: async () => {},
          })),
        },
        [mockedPool.liquidity[1].token.address]: {
          approve: jest.fn(async () => ({
            wait: async () => {},
          })),
        },
      },
    };

    const { getByRole, container, getByTestId } = render(
      <IntegrationWrapper
        shouldConnectWallet
        mockEthers={
          {
            contractMock,
          } as any
        }
      >
        <LiquidityDepositWithdraw selectedPool={mockedPool as any} />
      </IntegrationWrapper>,
    );

    await waitFor(() => {
      const firstTokenFormControl = getByTestId('apollon-liquidity-pool-deposit-token-a-amount');
      expect(firstTokenFormControl).toBeDefined();
    });

    const inputTokenAmount = container.querySelector<HTMLInputElement>('input[name="tokenAAmount"]')!;
    await userEvent.type(inputTokenAmount, '10');

    const openButton = getByRole('button', { name: 'Update' });
    await userEvent.click(openButton);

    await waitFor(() => {
      expect(contractMock.debtTokenContracts[mockedPool.liquidity[0].token.address].approve).toHaveBeenNthCalledWith(
        1,
        '9141ac09-f968-4afb-9e1d-43beff3a5d39',
        10,
      );
      expect(contractMock.debtTokenContracts[mockedPool.liquidity[1].token.address].approve).toHaveBeenNthCalledWith(
        1,
        '9141ac09-f968-4afb-9e1d-43beff3a5d39',
        24.37809,
      );
      expect(contractMock.swapOperationsContract.addLiquidity).toHaveBeenNthCalledWith(
        1,
        '578b9a18-7b07-4028-8354-7861f78b22ea',
        '16fdb8e8-f202-4564-9af5-71b77ebc11a3',
        10000000000000000000n,
        24378090000000000000n,
        9800000000000000000n,
        23890528200000000000n,
        20000000000000000n,
        expect.any(Number),
      );
    });
  });

  it('Withdraw: should call function of mocked contract', async () => {
    const mockedPool = MockedGetBorrowerLiquidityPools.data.pools[0];

    const contractMock = {
      swapOperationsContract: {
        removeLiquidity: jest.fn(async () => ({
          wait: async () => {},
        })),
      },
    };

    const { getByRole, container, getByTestId } = render(
      <IntegrationWrapper
        shouldConnectWallet
        mockEthers={
          {
            contractMock,
          } as any
        }
      >
        <LiquidityDepositWithdraw selectedPool={mockedPool as any} />
      </IntegrationWrapper>,
    );

    await waitFor(() => {
      const firstTokenFormControl = getByTestId('apollon-liquidity-pool-deposit-token-a-amount');
      expect(firstTokenFormControl).toBeDefined();
    });

    const withdrawTab = getByRole('tab', { name: 'WITHDRAW' });
    await userEvent.click(withdrawTab);

    const inputTokenAmount = container.querySelector<HTMLInputElement>('input[name="tokenAAmount"]')!;
    await userEvent.type(inputTokenAmount, '10');

    const openButton = getByRole('button', { name: 'Update' });
    await userEvent.click(openButton);

    await waitFor(() => {
      expect(contractMock.swapOperationsContract.removeLiquidity).toHaveBeenNthCalledWith(
        1,
        '578b9a18-7b07-4028-8354-7861f78b22ea',
        '16fdb8e8-f202-4564-9af5-71b77ebc11a3',
        10000000000000000000n,
        4623533623218507776n,
        1896593718238564608n,
        expect.any(Number),
      );
    });
  });

  // TODO: Write some more unit tests for edge cases
  it.skip('calculate token amount when walletAmount is 0', () => {
    // const tokenA = MockedGetBorrowerLiquidityPools.data.pools[0].liquidity[0] as PoolLiquidity;
    // const tokenB = MockedGetBorrowerLiquidityPools.data.pools[0].liquidity[1] as PoolLiquidity;
    // const result = calculate150PercentTokenValue(
    //   1000,
    //   6000,
    //   tokenA,
    //   tokenB,
    //   { walletAmount: 0 } as any,
    //   { walletAmount: 0 } as any,
    // );

    // const tokenAUSD = result * tokenA.token.priceUSDOracle;
    // expect(tokenAUSD).toBeCloseTo(2474.71);
    // const tokenBUSD = ((result * tokenA.totalAmount) / tokenB.totalAmount) * tokenB.token.priceUSDOracle;
    // expect(tokenBUSD).toBeCloseTo(525.285);
    expect(tokenAUSD + tokenBUSD).toBeCloseTo(3000);
  });
});
