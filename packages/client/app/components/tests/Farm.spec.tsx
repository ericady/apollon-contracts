import { expect, test } from '@playwright/experimental-ct-react';
import { SetupServer } from 'msw/node';
import Farm from '../Features/Farm/Farm';
import { integrationSuiteSetup, integrationTestSetup } from './integration-test.setup';
import MockedPositionsWithoutBorrower from './mockedResponses/GetDebtTokens.mocked.json';
import { parseNumberString } from './test-helpers';
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

test.describe('Farm', () => {
  test('should render Farm with mocked data', async ({ mount, page }) => {
    // We need to mock the exact same data to generate the exact same snapshot
    await page.route('https://flyby-router-demo.herokuapp.com/', async (route) => {
      if (JSON.parse(route.request().postData()!).operationName === 'GetDebtTokens') {
        return route.fulfill({
          status: 200,
          body: JSON.stringify(MockedPositionsWithoutBorrower),
        });
      } else {
        return route.abort();
      }
    });

    const component = await mount(
      <IntegrationWrapper shouldPreselectTokens>
        <Farm />
      </IntegrationWrapper>,
    );

    await expect(component).toHaveScreenshot();
  });

  test.describe('Form behavior', () => {
    test('should reset position size on either position type change', async ({ mount }) => {
      const component = await mount(
        <IntegrationWrapper shouldPreselectTokens>
          <Farm />
        </IntegrationWrapper>,
      );

      const amountInput = component.getByTestId('apollon-farm-amount').locator('input');
      await amountInput.fill('1000');

      const shortTab = component.getByRole('tab', { name: 'Short' });
      await shortTab.click();

      await expect(amountInput).toHaveValue('');

      await amountInput.fill('1000');

      const longButton = component.getByRole('tab', { name: 'Long' });
      await longButton.click();

      await expect(amountInput).toHaveValue('');
    });

    test('should reset slippage amount on either position type change', async ({ mount, page }) => {
      const component = await mount(
        <IntegrationWrapper shouldPreselectTokens>
          <Farm />
        </IntegrationWrapper>,
      );

      const showSlippageButton = component.getByRole('button', {
        name: 'More',
      });
      await showSlippageButton.click();

      await page.waitForSelector("[data-testid='apollon-farm-slippage-amount']", {
        state: 'visible',
      });
      const slippageInput = component.getByTestId('apollon-farm-slippage-amount').locator('input');
      await slippageInput.fill('10');

      const shortTab = component.getByRole('tab', { name: 'Short' });
      await shortTab.click();

      await expect(slippageInput).toHaveValue('');
      await slippageInput.fill('10');

      const longButton = component.getByRole('tab', { name: 'Long' });
      await longButton.click();

      await expect(slippageInput).toHaveValue('');
    });

    test.describe('Long Tab', () => {
      test('should update position size on long position amount change', async ({ mount }) => {
        const component = await mount(
          <IntegrationWrapper shouldPreselectTokens>
            <Farm />
          </IntegrationWrapper>,
        );

        const positionSize = component.getByTestId('apollon-farm-position-size');
        const positionSizeText = await positionSize.innerText();
        expect(positionSizeText).toBe('-');

        const amountInput = component.getByTestId('apollon-farm-amount').locator('input');
        await amountInput.fill('1000');
        const positionSizeValueForSmallAmountText = await positionSize.innerText();
        expect(positionSizeValueForSmallAmountText).not.toBe(positionSizeText);
        const positionSizeValueForSmallAmountValue = parseNumberString(
          positionSizeValueForSmallAmountText.split(' jUSD')[0],
        );
        expect(positionSizeValueForSmallAmountValue).not.toBeNaN();

        await amountInput.fill('10000');

        const positionSizeValueForBigAmountText = await positionSize.innerText();
        const positionSizeValueForBigAmountValue = parseNumberString(
          positionSizeValueForBigAmountText.split(' jUSD')[0],
        );

        expect(positionSizeValueForSmallAmountValue * 10).toBeCloseTo(positionSizeValueForBigAmountValue, 0.01);
      });

      test('should update protocol fee amount on long position amount change', async ({ mount }) => {
        const component = await mount(
          <IntegrationWrapper shouldPreselectTokens>
            <Farm />
          </IntegrationWrapper>,
        );

        const protocolFee = component.getByTestId('apollon-farm-protocol-fee');
        const protocolFeeText = await protocolFee.innerText();
        expect(protocolFeeText).toBe('0.20 % | -');

        const amountInput = component.getByTestId('apollon-farm-amount').locator('input');
        await amountInput.fill('100');
        const protocolFeeValueForSmallAmountText = await protocolFee.innerText();
        expect(protocolFeeValueForSmallAmountText).not.toBe(protocolFeeText);
        expect(protocolFeeValueForSmallAmountText).toContain('0.20 % |');
        const protocolFeeValueForSmallAmountValue = parseNumberString(
          protocolFeeValueForSmallAmountText.split(' | ')[1].split(' ')[0],
        );

        await amountInput.fill('1000');

        const protocolFeeValueForBigAmountText = await protocolFee.innerText();
        const protocolFeeValueForBigAmountValue = parseNumberString(
          protocolFeeValueForBigAmountText.split(' | ')[1].split(' ')[0],
        );

        expect(protocolFeeValueForSmallAmountValue * 10).toBeCloseTo(protocolFeeValueForBigAmountValue, 0.01);
      });

      test('should show error if amount is not positive', async ({ mount }) => {
        const component = await mount(
          <IntegrationWrapper shouldPreselectTokens shouldConnectWallet>
            <Farm />
          </IntegrationWrapper>,
        );

        const tokenInput = component.getByTestId('apollon-farm-amount').locator('input');
        await tokenInput.fill('-1');

        const executeButton = component.getByRole('button', {
          name: 'Execute',
        });
        await executeButton.click();

        // get the Mui-error class
        const tokenInputError = component.getByTestId('apollon-farm-amount').locator('p.Mui-error');
        expect(await tokenInputError.count()).toBe(1);
        const tokenInputErrorMessage = await tokenInputError.textContent();
        expect(tokenInputErrorMessage).toBe('Amount needs to be positive.');
      });

      test('should show error if amount is not specified', async ({ mount }) => {
        const component = await mount(
          <IntegrationWrapper shouldPreselectTokens shouldConnectWallet>
            <Farm />
          </IntegrationWrapper>,
        );

        const executeButton = component.getByRole('button', {
          name: 'Execute',
        });
        await executeButton.click();

        // get the Mui-error class
        const tokenInputError = component.getByTestId('apollon-farm-amount').locator('p.Mui-error');
        expect(await tokenInputError.count()).toBe(1);
        const tokenInputErrorMessage = await tokenInputError.textContent();
        expect(tokenInputErrorMessage).toBe('You need to specify an amount.');
      });

      test('should hide error if valid data is input', async ({ mount }) => {
        const component = await mount(
          <IntegrationWrapper shouldPreselectTokens shouldConnectWallet>
            <Farm />
          </IntegrationWrapper>,
        );

        const executeButton = component.getByRole('button', {
          name: 'Execute',
        });
        await executeButton.click();

        const tokenInput = component.getByTestId('apollon-farm-amount').locator('input');
        await tokenInput.fill('10');

        const tokenInputError = component.getByTestId('apollon-farm-amount').locator('p.Mui-error');
        expect(await tokenInputError.count()).toBe(0);

        await expect(executeButton).toBeEnabled();
      });
    });

    test.describe('Short Tab', () => {
      test('should update position size on short position amount change', async ({ mount }) => {
        const component = await mount(
          <IntegrationWrapper shouldPreselectTokens>
            <Farm />
          </IntegrationWrapper>,
        );

        const shortTab = component.getByRole('tab', { name: 'Short' });
        await shortTab.click();

        const positionSize = component.getByTestId('apollon-farm-position-size');
        const positionSizeText = await positionSize.innerText();
        expect(positionSizeText).toBe('-');

        const amountInput = component.getByTestId('apollon-farm-amount').locator('input');
        await amountInput.fill('1000');
        const positionSizeValueForSmallAmountText = await positionSize.innerText();
        expect(positionSizeValueForSmallAmountText).not.toBe(positionSizeText);
        const positionSizeValueForSmallAmountValue = parseNumberString(
          positionSizeValueForSmallAmountText.split(' jUSD')[0],
        );
        expect(positionSizeValueForSmallAmountValue).not.toBeNaN();

        await amountInput.fill('10000');

        const positionSizeValueForBigAmountText = await positionSize.innerText();
        const positionSizeValueForBigAmountValue = parseNumberString(
          positionSizeValueForBigAmountText.split(' jUSD')[0],
        );

        expect(positionSizeValueForSmallAmountValue * 10).toBeCloseTo(positionSizeValueForBigAmountValue, 0.01);
      });

      test('should update protocol fee amount on short position amount change', async ({ mount }) => {
        const component = await mount(
          <IntegrationWrapper shouldPreselectTokens>
            <Farm />
          </IntegrationWrapper>,
        );

        const shortTab = component.getByRole('tab', { name: 'Short' });
        await shortTab.click();

        const protocolFee = component.getByTestId('apollon-farm-protocol-fee');
        const protocolFeeText = await protocolFee.innerText();
        expect(protocolFeeText).toBe('0.20 % | -');

        const amountInput = component.getByTestId('apollon-farm-amount').locator('input');
        await amountInput.fill('100');
        const protocolFeeValueForSmallAmountText = await protocolFee.innerText();
        expect(protocolFeeValueForSmallAmountText).not.toBe(protocolFeeText);
        expect(protocolFeeValueForSmallAmountText).toContain('0.20 % |');
        const protocolFeeValueForSmallAmountValue = parseNumberString(
          protocolFeeValueForSmallAmountText.split(' | ')[1].split(' ')[0],
        );

        await amountInput.fill('1000');

        const protocolFeeValueForBigAmountText = await protocolFee.innerText();
        const protocolFeeValueForBigAmountValue = parseNumberString(
          protocolFeeValueForBigAmountText.split(' | ')[1].split(' ')[0],
        );

        expect(protocolFeeValueForSmallAmountValue * 10).toBeCloseTo(protocolFeeValueForBigAmountValue, 0.01);
      });

      test('should show error if amount is not positive', async ({ mount }) => {
        const component = await mount(
          <IntegrationWrapper shouldPreselectTokens shouldConnectWallet>
            <Farm />
          </IntegrationWrapper>,
        );

        const shortTab = component.getByRole('tab', { name: 'Short' });
        await shortTab.click();

        const tokenInput = component.getByTestId('apollon-farm-amount').locator('input');
        await tokenInput.fill('-1');

        const executeButton = component.getByRole('button', {
          name: 'Execute',
        });
        await executeButton.click();

        // get the Mui-error class
        const tokenInputError = component.getByTestId('apollon-farm-amount').locator('p.Mui-error');
        expect(await tokenInputError.count()).toBe(1);
        const tokenInputErrorMessage = await tokenInputError.textContent();
        expect(tokenInputErrorMessage).toBe('Amount needs to be positive.');
      });

      test('should show error if amount is not specified', async ({ mount }) => {
        const component = await mount(
          <IntegrationWrapper shouldPreselectTokens shouldConnectWallet>
            <Farm />
          </IntegrationWrapper>,
        );

        const shortTab = component.getByRole('tab', { name: 'Short' });
        await shortTab.click();

        const executeButton = component.getByRole('button', {
          name: 'Execute',
        });
        await executeButton.click();

        // get the Mui-error class
        const tokenInputError = component.getByTestId('apollon-farm-amount').locator('p.Mui-error');
        expect(await tokenInputError.count()).toBe(1);
        const tokenInputErrorMessage = await tokenInputError.textContent();
        expect(tokenInputErrorMessage).toBe('You need to specify an amount.');
      });

      test('should hide error when valid data is input', async ({ mount }) => {
        const component = await mount(
          <IntegrationWrapper shouldPreselectTokens shouldConnectWallet>
            <Farm />
          </IntegrationWrapper>,
        );

        const shortTab = component.getByRole('tab', { name: 'Short' });
        await shortTab.click();

        const executeButton = component.getByRole('button', {
          name: 'Execute',
        });
        await executeButton.click();

        const tokenInput = component.getByTestId('apollon-farm-amount').locator('input');
        await tokenInput.fill('10');

        const tokenInputError = component.getByTestId('apollon-farm-amount').locator('p.Mui-error');
        expect(await tokenInputError.count()).toBe(0);

        await expect(executeButton).toBeEnabled();
      });
    });
  });

  test.describe('Slippage', () => {
    test('should not show slippage input by default', async ({ mount, page }) => {
      const component = await mount(
        <IntegrationWrapper shouldPreselectTokens>
          <Farm />
        </IntegrationWrapper>,
      );

      const slippageBox = component.locator("[data-testid='apollon-farm-slippage-amount']");

      expect(await slippageBox.count()).toBe(0);
    });

    test('should show slippage input when "More" button is clicked', async ({ mount, page }) => {
      const component = await mount(
        <IntegrationWrapper shouldPreselectTokens>
          <Farm />
        </IntegrationWrapper>,
      );

      const showSlippageButton = component.getByRole('button', {
        name: 'More',
      });
      await showSlippageButton.click();

      await page.waitForSelector("[data-testid='apollon-farm-slippage-amount']", {
        state: 'visible',
      });
      const slippageInput = component.getByTestId('apollon-farm-slippage-amount').locator('input');
      await expect(slippageInput).toHaveValue('');
    });

    test('should hide slippage input when "Less" button is clicked and reset its value', async ({ mount, page }) => {
      const component = await mount(
        <IntegrationWrapper shouldPreselectTokens>
          <Farm />
        </IntegrationWrapper>,
      );

      const showSlippageButton = component.getByRole('button', {
        name: 'More',
      });
      await showSlippageButton.click();

      await page.waitForSelector("[data-testid='apollon-farm-slippage-amount']", {
        state: 'visible',
      });
      const slippageInput = component.getByTestId('apollon-farm-slippage-amount').locator('input');
      await slippageInput.fill('10');

      const hideSlippageButton = component.getByRole('button', {
        name: 'Less',
      });
      await hideSlippageButton.click();

      await page.waitForSelector("[data-testid='apollon-farm-slippage-amount']", {
        state: 'detached',
      });

      const slippageBox = component.locator("[data-testid='apollon-farm-slippage-amount']");
      expect(await slippageBox.count()).toBe(0);

      await showSlippageButton.click();

      expect(await slippageInput.inputValue()).toBe('');
    });
  });

  test.describe('Guest mode', () => {
    test('should have "Execute" button disabled as guest', async ({ mount }) => {
      const component = await mount(
        <IntegrationWrapper shouldPreselectTokens>
          <Farm />
        </IntegrationWrapper>,
      );

      const swapButton = component.getByRole('button', {
        name: 'Execute',
      });
      await expect(swapButton).toBeDisabled();
    });
  });

  test.describe('Connected mode', () => {
    test('should have "Execute" button enabled when logged in', async ({ mount }) => {
      const component = await mount(
        <IntegrationWrapper shouldPreselectTokens shouldConnectWallet>
          <Farm />
        </IntegrationWrapper>,
      );

      const swapButton = component.getByRole('button', {
        name: 'Execute',
      });
      await expect(swapButton).toBeEnabled();
    });
  });
});
