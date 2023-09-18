import { expect, test } from '@playwright/experimental-ct-react';
import { SetupServer } from 'msw/node';
import Swap from '../Features/Swap/Swap';
import { integrationSuiteSetup, integrationTestSetup } from './integration-test.setup';
import { IntegrationWrapper } from './test-utils';

let server: SetupServer;

test.beforeAll(() => {
  server = integrationSuiteSetup();
});

test.beforeEach(async ({ page }) => {
  await integrationTestSetup(page);
});

test.afterEach(() => {
  server.resetHandlers();
});

test.afterAll(() => {
  server.close();
});

test.describe('Swap', () => {
  test('should render Swap with mocked data', async ({ mount }) => {
    const component = await mount(
      <IntegrationWrapper shouldPreselectTokens>
        <Swap />
      </IntegrationWrapper>,
    );

    await expect(component).toHaveScreenshot({ maxDiffPixelRatio: 0.01 });
  });

  test.describe('Form behavior', () => {
    test('should update token amount when jUSD amount is specified', async ({ mount }) => {
      const component = await mount(
        <IntegrationWrapper shouldPreselectTokens>
          <Swap />
        </IntegrationWrapper>,
      );

      const jusdInput = component.getByTestId('apollon-swap-jusd-amount').locator('input');
      await jusdInput.fill('100');

      const tokenInput = component.getByTestId('apollon-swap-token-amount').locator('input');
      // check that input has any float number
      await expect(tokenInput).toHaveValue(/^[0-9]*[.,]?[0-9]+$/);
    });

    test('should update jUSD amount when token amount is specified', async ({ mount }) => {
      const component = await mount(
        <IntegrationWrapper shouldPreselectTokens>
          <Swap />
        </IntegrationWrapper>,
      );

      const tokenInput = component.getByTestId('apollon-swap-token-amount').locator('input');
      await tokenInput.fill('100');

      const jusdInput = component.getByTestId('apollon-swap-jusd-amount').locator('input');
      // check that input has any float number
      await expect(jusdInput).toHaveValue(/^[0-9]*[.,]?[0-9]+$/);
    });

    test('should clear token amount when jUSD is cleared', async ({ mount }) => {
      const component = await mount(
        <IntegrationWrapper shouldPreselectTokens>
          <Swap />
        </IntegrationWrapper>,
      );

      const jusdInput = component.getByTestId('apollon-swap-jusd-amount').locator('input');
      await jusdInput.fill('100');
      await jusdInput.clear();

      const tokenInput = component.getByTestId('apollon-swap-token-amount').locator('input');
      await expect(tokenInput).toHaveValue('');
    });

    test('should clear jUSD amount when token is cleared', async ({ mount }) => {
      const component = await mount(
        <IntegrationWrapper shouldPreselectTokens>
          <Swap />
        </IntegrationWrapper>,
      );

      const tokenInput = component.getByTestId('apollon-swap-token-amount').locator('input');
      await tokenInput.fill('100');
      await tokenInput.clear();

      const jusdInput = component.getByTestId('apollon-swap-jusd-amount').locator('input');
      await expect(jusdInput).toHaveValue('');
    });

    test('should update protocol swap fee amount on jUSD change', async ({ mount }) => {
      const component = await mount(
        <IntegrationWrapper shouldPreselectTokens>
          <Swap />
        </IntegrationWrapper>,
      );

      const protocolFee = component.getByTestId('apollon-swap-protocol-fee');
      const protocolFeeText = await protocolFee.innerText();
      expect(protocolFeeText).toBe('0.09 % | -');

      const jusdInput = component.getByTestId('apollon-swap-jusd-amount').locator('input');
      await jusdInput.fill('10');
      const protocolFeeValueForSmalljUSDText = await protocolFee.innerText();
      expect(protocolFeeValueForSmalljUSDText).not.toBe(protocolFeeText);
      expect(protocolFeeValueForSmalljUSDText).toContain('0.09 % |');
      const protocolFeeValueForSmalljUSDValue = parseFloat(
        protocolFeeValueForSmalljUSDText.split(' | ')[1].split(' ')[0],
      );

      await jusdInput.fill('100');

      const protocolFeeValueForBigjUSDText = await protocolFee.innerText();
      const protocolFeeValueForBigjUSDValue = parseFloat(protocolFeeValueForBigjUSDText.split(' | ')[1].split(' ')[0]);

      expect(protocolFeeValueForSmalljUSDValue * 10).toBeCloseTo(protocolFeeValueForBigjUSDValue, 0.01);
    });

    test('should show error if amount is not positive', async ({ mount }) => {
      const component = await mount(
        <IntegrationWrapper shouldPreselectTokens shouldConnectWallet>
          <Swap />
        </IntegrationWrapper>,
      );

      const tokenInput = component.getByTestId('apollon-swap-token-amount').locator('input');
      await tokenInput.fill('-1');

      const swapButton = component.getByRole('button', {
        name: 'Swap',
      });
      await swapButton.click();

      // get the Mui-error class
      const tokenInputError = component.getByTestId('apollon-swap-token-amount').locator('p.Mui-error');
      expect(await tokenInputError.count()).toBe(1);
      const tokenInputErrorMessage = await tokenInputError.textContent();
      expect(tokenInputErrorMessage).toBe('Amount needs to be positive.');

      const jUSDInputError = component.getByTestId('apollon-swap-jusd-amount').locator('p.Mui-error');
      expect(await jUSDInputError.count()).toBe(1);
      const jUSDInputErrorMessage = await jUSDInputError.textContent();
      expect(jUSDInputErrorMessage).toBe('Amount needs to be positive.');
    });

    test('should show error if amount is not specified', async ({ mount }) => {
      const component = await mount(
        <IntegrationWrapper shouldPreselectTokens shouldConnectWallet>
          <Swap />
        </IntegrationWrapper>,
      );

      const swapButton = component.getByRole('button', {
        name: 'Swap',
      });
      await swapButton.click();

      // get the Mui-error class
      const tokenInputError = component.getByTestId('apollon-swap-token-amount').locator('p.Mui-error');
      expect(await tokenInputError.count()).toBe(1);
      const tokenInputErrorMessage = await tokenInputError.textContent();
      expect(tokenInputErrorMessage).toBe('You need to specify an amount.');

      const jUSDInputError = component.getByTestId('apollon-swap-jusd-amount').locator('p.Mui-error');
      expect(await jUSDInputError.count()).toBe(1);
      const jUSDInputErrorMessage = await jUSDInputError.textContent();
      expect(jUSDInputErrorMessage).toBe('You need to specify an amount.');
    });

    test('should hide error only if valid input is submited', async ({ mount }) => {
      const component = await mount(
        <IntegrationWrapper shouldPreselectTokens shouldConnectWallet>
          <Swap />
        </IntegrationWrapper>,
      );

      const swapButton = component.getByRole('button', {
        name: 'Swap',
      });
      await swapButton.click();

      const jusdInput = component.getByTestId('apollon-swap-jusd-amount').locator('input');
      await jusdInput.fill('10');

      const jUSDInputError = component.getByTestId('apollon-swap-jusd-amount').locator('p.Mui-error');
      expect(await jUSDInputError.count()).toBe(1);

      await swapButton.click();

      const jUSDInputErrorAfterUpdate = component.getByTestId('apollon-swap-jusd-amount').locator('p.Mui-error');
      expect(await jUSDInputErrorAfterUpdate.count()).toBe(0);
    });
  });

  test.describe('Slippage', () => {
    test('should not show slippage input by default', async ({ mount, page }) => {
      const component = await mount(
        <IntegrationWrapper shouldPreselectTokens>
          <Swap />
        </IntegrationWrapper>,
      );

      const slippageBox = component.locator("[data-testid='apollon-swap-slippage-amount']");

      expect(await slippageBox.count()).toBe(0);
    });

    test('should show slippage input when "More" button is clicked', async ({ mount, page }) => {
      const component = await mount(
        <IntegrationWrapper shouldPreselectTokens>
          <Swap />
        </IntegrationWrapper>,
      );

      const showSlippageButton = component.getByRole('button', {
        name: 'More',
      });
      await showSlippageButton.click();

      await page.waitForSelector("[data-testid='apollon-swap-slippage-amount']", {
        state: 'visible',
      });
      const slippageInput = component.getByTestId('apollon-swap-slippage-amount').locator('input');
      await expect(slippageInput).toHaveValue('');
    });

    test('should hide slippage input when "Less" button is clicked and reset its value', async ({ mount, page }) => {
      const component = await mount(
        <IntegrationWrapper shouldPreselectTokens>
          <Swap />
        </IntegrationWrapper>,
      );

      const showSlippageButton = component.getByRole('button', {
        name: 'More',
      });
      await showSlippageButton.click();

      await page.waitForSelector("[data-testid='apollon-swap-slippage-amount']", {
        state: 'visible',
      });
      const slippageInput = component.getByTestId('apollon-swap-slippage-amount').locator('input');
      await slippageInput.fill('10');

      const hideSlippageButton = component.getByRole('button', {
        name: 'Less',
      });
      await hideSlippageButton.click();

      await page.waitForSelector("[data-testid='apollon-swap-slippage-amount']", {
        state: 'detached',
      });

      const slippageBox = component.locator("[data-testid='apollon-swap-slippage-amount']");
      expect(await slippageBox.count()).toBe(0);

      await showSlippageButton.click();

      expect(await slippageInput.inputValue()).toBe('');
    });
  });

  test.describe('Guest mode', () => {
    test('should have "Swap" button disabled as guest', async ({ mount }) => {
      const component = await mount(
        <IntegrationWrapper shouldPreselectTokens>
          <Swap />
        </IntegrationWrapper>,
      );

      const swapButton = component.getByRole('button', {
        name: 'Swap',
      });
      await expect(swapButton).toBeDisabled();
    });
  });

  test.describe('Connected mode', () => {
    test('should have "Swap" button disabled as guest', async ({ mount }) => {
      const component = await mount(
        <IntegrationWrapper shouldPreselectTokens shouldConnectWallet>
          <Swap />
        </IntegrationWrapper>,
      );

      const swapButton = component.getByRole('button', {
        name: 'Swap',
      });
      await expect(swapButton).toBeEnabled();
    });
  });
});
