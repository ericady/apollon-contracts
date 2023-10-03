import { expect, test } from '@playwright/experimental-ct-react';
import { SetupServer } from 'msw/node';
import StabilityUpdateDialog from '../Features/Stability/StabilityUpdateDialog';
import { integrationSuiteSetup, integrationTestSetup } from './integration-test.setup';
import MockedBorrowerDebtTokens from './mockedResponses/GetBorrowerDebtTokens.mocked.json';
import MockedDebtTokensWithoutBorrower from './mockedResponses/GetDebtTokens.mocked.json';
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

test.describe('StabilityUpdateDialog', () => {
  test('should render StabilityUpdateDialog with mocked data', async ({ mount, page }) => {
    // We need to mock the exact same data to generate the exact same snapshot
    await page.route('https://flyby-router-demo.herokuapp.com/', async (route) => {
      if (JSON.parse(route.request().postData()!).operationName === 'GetBorrowerDebtTokens') {
        return route.fulfill({
          status: 200,
          body: JSON.stringify(MockedBorrowerDebtTokens),
        });
      } else {
        return route.abort();
      }
    });

    await mount(
      <IntegrationWrapper shouldConnectWallet>
        <StabilityUpdateDialog />
      </IntegrationWrapper>,
    );

    const updateButton = page.getByRole('button', {
      name: 'Update',
    });
    await updateButton.click();

    await page.waitForSelector('[data-testid="apollon-stability-update-dialog"]', {
      state: 'visible',
    });

    await expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.01 });
  });

  test('should render StabilityUpdateDialog with mocked data when not logged in', async ({ mount, page }) => {
    // We need to mock the exact same data to generate the exact same snapshot
    await page.route('https://flyby-router-demo.herokuapp.com/', async (route) => {
      if (JSON.parse(route.request().postData()!).operationName === 'GetBorrowerDebtTokens') {
        return route.fulfill({
          status: 200,
          body: JSON.stringify(MockedDebtTokensWithoutBorrower),
        });
      } else {
        return route.abort();
      }
    });

    await mount(
      <IntegrationWrapper>
        <StabilityUpdateDialog />
      </IntegrationWrapper>,
    );

    const updateButton = page.getByRole('button', {
      name: 'Update',
    });
    await updateButton.click();

    await page.waitForSelector('[data-testid="apollon-stability-update-dialog"]', {
      state: 'visible',
    });

    await expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.01 });
  });

  test('should close StabilityUpdateDialog when clicking the close button', async ({ mount, page }) => {
    await mount(
      <IntegrationWrapper shouldConnectWallet>
        <StabilityUpdateDialog />
      </IntegrationWrapper>,
    );

    const updateButton = page.getByRole('button', {
      name: 'Update',
    });
    await updateButton.click();

    await page.waitForSelector('[data-testid="apollon-stability-update-dialog"]', {
      state: 'visible',
    });

    const closeButton = (await page.$('button[aria-label="close stability update dialog"]'))!;
    await closeButton.click();

    await page.waitForSelector('[data-testid="apollon-stability-update-dialog"]', {
      state: 'detached',
    });
  });

  test('should close StabilityUpdateDialog when clicking the background', async ({ mount, page }) => {
    await mount(
      <IntegrationWrapper shouldConnectWallet>
        <StabilityUpdateDialog />
      </IntegrationWrapper>,
    );

    const updateButton = page.getByRole('button', {
      name: 'Update',
    });
    await updateButton.click();

    await page.waitForSelector('[data-testid="apollon-stability-update-dialog"]', {
      state: 'visible',
    });

    const dialogBackground = page.getByTestId('apollon-stability-update-dialog-backdrop');

    // must click somewhere but the middle (where the actual dialog is) and bypass actionability because the background is aria-hidden
    await dialogBackground.click({ position: { x: 50, y: 50 }, force: true });

    await page.waitForSelector('[data-testid="apollon-stability-update-dialog"]', {
      state: 'detached',
    });
  });

  test.describe('Form behavior', () => {
    test('should clear token input when changing tabs', async ({ mount, page }) => {
      await mount(
        <IntegrationWrapper shouldConnectWallet>
          <StabilityUpdateDialog />
        </IntegrationWrapper>,
      );

      const updateButton = page.getByRole('button', {
        name: 'Update',
      });
      await updateButton.click();

      await page.waitForSelector('[data-testid="apollon-stability-update-dialog"]', {
        state: 'visible',
      });

      const amountInput = page.getByTestId('apollon-stability-update-dialog-input').first().locator('input');
      await amountInput.fill('10');

      const withdrawTab = page.getByRole('tab', { name: 'Withdraw' });
      await withdrawTab.click();

      await expect(amountInput).toHaveValue('');

      await amountInput.fill('10');
      const depositTab = page.getByRole('tab', { name: 'Deposit' });
      await depositTab.click();

      await expect(amountInput).toHaveValue('');
    });

    test('should fill deposit token input when clicking "max"', async ({ mount, page }) => {
      await mount(
        <IntegrationWrapper shouldConnectWallet>
          <StabilityUpdateDialog />
        </IntegrationWrapper>,
      );

      const updateButton = page.getByRole('button', {
        name: 'Update',
      });
      await updateButton.click();

      await page.waitForSelector('[data-testid="apollon-stability-update-dialog"]', {
        state: 'visible',
      });

      const depositLabelText = await page
        .getByTestId('apollon-stability-update-dialog-deposit-funds-label')
        .first()
        .innerText();
      const depositLabelAmount = parseNumberString(depositLabelText);
      await page.getByRole('button', { name: 'max' }).first().click();

      const amountInput = page.getByTestId('apollon-stability-update-dialog-input').first().locator('input');
      await expect(amountInput).toHaveValue(depositLabelAmount.toString());
    });

    test('should fill withdraw token input when clicking "max"', async ({ mount, page }) => {
      await mount(
        <IntegrationWrapper shouldConnectWallet>
          <StabilityUpdateDialog />
        </IntegrationWrapper>,
      );

      const updateButton = page.getByRole('button', {
        name: 'Update',
      });
      await updateButton.click();

      await page.waitForSelector('[data-testid="apollon-stability-update-dialog"]', {
        state: 'visible',
      });

      const withdrawTab = page.getByRole('tab', { name: 'Withdraw' });
      await withdrawTab.click();

      const withdrawLabelText = await page
        .getByTestId('apollon-stability-update-dialog-withdraw-funds-label')
        .first()
        .innerText();
      const withdrawLabelAmount = parseNumberString(withdrawLabelText);
      await page.getByRole('button', { name: 'max' }).first().click();

      const amountInput = page.getByTestId('apollon-stability-update-dialog-input').first().locator('input');
      await expect(amountInput).toHaveValue(withdrawLabelAmount.toString());
    });

    test.describe('Validation', () => {
      test.describe('Deposit', () => {
        test('should show an error if no input has been dirtied before submission and remove the error if valid data is supplied', async ({
          mount,
          page,
        }) => {
          await mount(
            <IntegrationWrapper shouldConnectWallet>
              <StabilityUpdateDialog />
            </IntegrationWrapper>,
          );

          const updateButton = page.getByRole('button', {
            name: 'Update',
          });
          await updateButton.click();

          await page.waitForSelector('[data-testid="apollon-stability-update-dialog"]', {
            state: 'visible',
          });

          const formSubmissionButton = page
            .getByRole('button', {
              name: 'Update',
            })
            .nth(1);

          await formSubmissionButton.click();

          const formError = page.getByTestId('apollon-stability-update-dialog-error');
          expect(await formError.innerText()).toBe('You must specify at least one token to update.');

          const amountInput = page.getByTestId('apollon-stability-update-dialog-input').first().locator('input');
          await amountInput.fill('1');

          await page.waitForSelector('[data-testid="apollon-stability-update-dialog-error"]', {
            state: 'detached',
          });
        });

        test('should show error on negative numbers', async ({ mount, page }) => {
          await mount(
            <IntegrationWrapper shouldConnectWallet>
              <StabilityUpdateDialog />
            </IntegrationWrapper>,
          );

          const updateButton = page.getByRole('button', {
            name: 'Update',
          });
          await updateButton.click();

          await page.waitForSelector('[data-testid="apollon-stability-update-dialog"]', {
            state: 'visible',
          });

          const amountInput = page.getByTestId('apollon-stability-update-dialog-input').first().locator('input');
          await amountInput.fill('-1');

          const formSubmissionButton = page
            .getByRole('button', {
              name: 'Update',
            })
            .nth(1);
          await formSubmissionButton.click();

          const tokenInputError = await page
            .getByTestId('apollon-stability-update-dialog-input')
            .locator('p.Mui-error');
          expect(await tokenInputError.count()).toBe(1);
          const tokenInputErrorText = await tokenInputError.textContent();
          expect(tokenInputErrorText).toBe('Amount needs to be positive.');
        });

        test('should clear error when positive number is input', async ({ mount, page }) => {
          await mount(
            <IntegrationWrapper shouldConnectWallet>
              <StabilityUpdateDialog />
            </IntegrationWrapper>,
          );

          const updateButton = page.getByRole('button', {
            name: 'Update',
          });
          await updateButton.click();

          await page.waitForSelector('[data-testid="apollon-stability-update-dialog"]', {
            state: 'visible',
          });

          const amountInput = page.getByTestId('apollon-stability-update-dialog-input').first().locator('input');
          await amountInput.fill('-1');

          const formSubmissionButton = page
            .getByRole('button', {
              name: 'Update',
            })
            .nth(1);
          await formSubmissionButton.click();

          await amountInput.fill('1');

          await page.waitForSelector('p.Mui-error', {
            state: 'detached',
          });
        });

        test('should show error if amount is too big', async ({ mount, page }) => {
          await mount(
            <IntegrationWrapper shouldConnectWallet>
              <StabilityUpdateDialog />
            </IntegrationWrapper>,
          );

          const updateButton = page.getByRole('button', {
            name: 'Update',
          });
          await updateButton.click();

          await page.waitForSelector('[data-testid="apollon-stability-update-dialog"]', {
            state: 'visible',
          });

          const amountInput = page.getByTestId('apollon-stability-update-dialog-input').first().locator('input');
          await amountInput.fill('99999999');

          const formSubmissionButton = page
            .getByRole('button', {
              name: 'Update',
            })
            .nth(1);
          await formSubmissionButton.click();

          const tokenInputError = await page
            .getByTestId('apollon-stability-update-dialog-input')
            .locator('p.Mui-error');
          expect(await tokenInputError.count()).toBe(1);
          const tokenInputErrorText = await tokenInputError.textContent();
          expect(tokenInputErrorText).toBe('Your wallet does not contain the specified amount.');
        });

        test('should remove error if amount is changed to a valid number', async ({ mount, page }) => {
          await mount(
            <IntegrationWrapper shouldConnectWallet>
              <StabilityUpdateDialog />
            </IntegrationWrapper>,
          );

          const updateButton = page.getByRole('button', {
            name: 'Update',
          });
          await updateButton.click();

          await page.waitForSelector('[data-testid="apollon-stability-update-dialog"]', {
            state: 'visible',
          });

          const amountInput = page.getByTestId('apollon-stability-update-dialog-input').first().locator('input');
          await amountInput.fill('99999999');

          const formSubmissionButton = page
            .getByRole('button', {
              name: 'Update',
            })
            .nth(1);
          await formSubmissionButton.click();

          await amountInput.fill('1');

          await page.waitForSelector('p.Mui-error', {
            state: 'detached',
          });
        });
      });

      test.describe('Withdraw', () => {
        test('should show an error if no input has been dirtied before submission and remove the error if valid data is supplied', async ({
          mount,
          page,
        }) => {
          await mount(
            <IntegrationWrapper shouldConnectWallet>
              <StabilityUpdateDialog />
            </IntegrationWrapper>,
          );

          const updateButton = page.getByRole('button', {
            name: 'Update',
          });
          await updateButton.click();

          await page.waitForSelector('[data-testid="apollon-stability-update-dialog"]', {
            state: 'visible',
          });

          const withdrawTab = page.getByRole('tab', { name: 'Withdraw' });
          await withdrawTab.click();

          const formSubmissionButton = page
            .getByRole('button', {
              name: 'Update',
            })
            .nth(1);

          await formSubmissionButton.click();

          const formError = page.getByTestId('apollon-stability-update-dialog-error');
          expect(await formError.innerText()).toBe('You must specify at least one token to update.');

          const amountInput = page.getByTestId('apollon-stability-update-dialog-input').first().locator('input');
          await amountInput.fill('1');

          await page.waitForSelector('[data-testid="apollon-stability-update-dialog-error"]', {
            state: 'detached',
          });
        });

        test('should show error on negative numbers', async ({ mount, page }) => {
          await mount(
            <IntegrationWrapper shouldConnectWallet>
              <StabilityUpdateDialog />
            </IntegrationWrapper>,
          );

          const updateButton = page.getByRole('button', {
            name: 'Update',
          });
          await updateButton.click();

          await page.waitForSelector('[data-testid="apollon-stability-update-dialog"]', {
            state: 'visible',
          });

          const withdrawTab = page.getByRole('tab', { name: 'Withdraw' });
          await withdrawTab.click();

          const amountInput = page.getByTestId('apollon-stability-update-dialog-input').first().locator('input');
          await amountInput.fill('-1');

          const formSubmissionButton = page
            .getByRole('button', {
              name: 'Update',
            })
            .nth(1);
          await formSubmissionButton.click();

          const tokenInputError = await page
            .getByTestId('apollon-stability-update-dialog-input')
            .locator('p.Mui-error');
          expect(await tokenInputError.count()).toBe(1);
          const tokenInputErrorText = await tokenInputError.textContent();
          expect(tokenInputErrorText).toBe('Amount needs to be positive.');
        });

        test('should clear error when positive number is input', async ({ mount, page }) => {
          await mount(
            <IntegrationWrapper shouldConnectWallet>
              <StabilityUpdateDialog />
            </IntegrationWrapper>,
          );

          const updateButton = page.getByRole('button', {
            name: 'Update',
          });
          await updateButton.click();

          await page.waitForSelector('[data-testid="apollon-stability-update-dialog"]', {
            state: 'visible',
          });

          const withdrawTab = page.getByRole('tab', { name: 'Withdraw' });
          await withdrawTab.click();

          const amountInput = page.getByTestId('apollon-stability-update-dialog-input').first().locator('input');
          await amountInput.fill('-1');

          const formSubmissionButton = page
            .getByRole('button', {
              name: 'Update',
            })
            .nth(1);
          await formSubmissionButton.click();

          await amountInput.fill('1');

          await page.waitForSelector('p.Mui-error', {
            state: 'detached',
          });
        });

        test('should show error if amount is too big', async ({ mount, page }) => {
          await mount(
            <IntegrationWrapper shouldConnectWallet>
              <StabilityUpdateDialog />
            </IntegrationWrapper>,
          );

          const updateButton = page.getByRole('button', {
            name: 'Update',
          });
          await updateButton.click();

          await page.waitForSelector('[data-testid="apollon-stability-update-dialog"]', {
            state: 'visible',
          });

          const withdrawTab = page.getByRole('tab', { name: 'Withdraw' });
          await withdrawTab.click();

          const amountInput = page.getByTestId('apollon-stability-update-dialog-input').first().locator('input');
          await amountInput.fill('99999999');

          const formSubmissionButton = page
            .getByRole('button', {
              name: 'Update',
            })
            .nth(1);
          await formSubmissionButton.click();

          const tokenInputError = await page
            .getByTestId('apollon-stability-update-dialog-input')
            .locator('p.Mui-error');
          expect(await tokenInputError.count()).toBe(1);
          const tokenInputErrorText = await tokenInputError.textContent();
          expect(tokenInputErrorText).toBe('Your deposited stability does not contain the specified amount.');
        });

        test('should remove error if amount is changed to a valid number', async ({ mount, page }) => {
          await mount(
            <IntegrationWrapper shouldConnectWallet>
              <StabilityUpdateDialog />
            </IntegrationWrapper>,
          );

          const updateButton = page.getByRole('button', {
            name: 'Update',
          });
          await updateButton.click();

          await page.waitForSelector('[data-testid="apollon-stability-update-dialog"]', {
            state: 'visible',
          });

          const withdrawTab = page.getByRole('tab', { name: 'Withdraw' });
          await withdrawTab.click();

          const amountInput = page.getByTestId('apollon-stability-update-dialog-input').first().locator('input');
          await amountInput.fill('99999999');

          const formSubmissionButton = page
            .getByRole('button', {
              name: 'Update',
            })
            .nth(1);
          await formSubmissionButton.click();

          await amountInput.fill('1');

          await page.waitForSelector('p.Mui-error', {
            state: 'detached',
          });
        });
      });

      test('should remove any form errors on tab change', async ({ mount, page }) => {
        await mount(
          <IntegrationWrapper shouldConnectWallet>
            <StabilityUpdateDialog />
          </IntegrationWrapper>,
        );

        const updateButton = page.getByRole('button', {
          name: 'Update',
        });
        await updateButton.click();

        await page.waitForSelector('[data-testid="apollon-stability-update-dialog"]', {
          state: 'visible',
        });

        const formSubmissionButton = page
          .getByRole('button', {
            name: 'Update',
          })
          .nth(1);

        await formSubmissionButton.click();

        const withdrawTab = page.getByRole('tab', { name: 'Withdraw' });
        await withdrawTab.click();

        await page.waitForSelector('[data-testid="apollon-stability-update-dialog-error"]', {
          state: 'detached',
        });
      });

      test('should remove any input errors on tab change', async ({ mount, page }) => {
        await mount(
          <IntegrationWrapper shouldConnectWallet>
            <StabilityUpdateDialog />
          </IntegrationWrapper>,
        );

        const updateButton = page.getByRole('button', {
          name: 'Update',
        });
        await updateButton.click();

        await page.waitForSelector('[data-testid="apollon-stability-update-dialog"]', {
          state: 'visible',
        });

        const amountInput = page.getByTestId('apollon-stability-update-dialog-input').first().locator('input');
        await amountInput.fill('-1');

        const formSubmissionButton = page
          .getByRole('button', {
            name: 'Update',
          })
          .nth(1);
        await formSubmissionButton.click();

        const withdrawTab = page.getByRole('tab', { name: 'Withdraw' });
        await withdrawTab.click();

        const tokenInputError = await page.getByTestId('apollon-stability-update-dialog-input').locator('p.Mui-error');
        expect(await tokenInputError.count()).toBe(0);
      });
    });
  });

  test.describe('Connected mode', () => {
    test('should have "Update" button enabled', async ({ mount, page }) => {
      await mount(
        <IntegrationWrapper shouldConnectWallet>
          <StabilityUpdateDialog />
        </IntegrationWrapper>,
      );

      const updateButton = page.getByRole('button', {
        name: 'Update',
      });
      await expect(updateButton).toBeEnabled();
    });

    test('should have inner "Update" button for form enabled', async ({ mount, page }) => {
      await mount(
        <IntegrationWrapper shouldConnectWallet>
          <StabilityUpdateDialog />
        </IntegrationWrapper>,
      );

      const updateButton = page.getByRole('button', {
        name: 'Update',
      });
      await updateButton.click();

      const formSubmissionButton = page
        .getByRole('button', {
          name: 'Update',
        })
        .nth(1);
      await expect(formSubmissionButton).toBeEnabled();
    });

    test('should have "Withdraw" tab disabled', async ({ mount, page }) => {
      await mount(
        <IntegrationWrapper shouldConnectWallet>
          <StabilityUpdateDialog />
        </IntegrationWrapper>,
      );

      const updateButton = page.getByRole('button', {
        name: 'Update',
      });
      await updateButton.click();

      const formSubmissionButton = page.getByRole('tab', {
        name: 'Withdraw',
      });
      await expect(formSubmissionButton).toBeEnabled();
    });
  });

  test.describe('Guest mode', () => {
    test('should have "Update" button enabled', async ({ mount, page }) => {
      await mount(
        <IntegrationWrapper>
          <StabilityUpdateDialog />
        </IntegrationWrapper>,
      );

      const updateButton = page.getByRole('button', {
        name: 'Update',
      });
      await expect(updateButton).toBeEnabled();
    });

    test('should have inner "Update" button for form disabled', async ({ mount, page }) => {
      await mount(
        <IntegrationWrapper>
          <StabilityUpdateDialog />
        </IntegrationWrapper>,
      );

      const updateButton = page.getByRole('button', {
        name: 'Update',
      });
      await updateButton.click();

      const formSubmissionButton = page
        .getByRole('button', {
          name: 'Update',
        })
        .nth(1);
      await expect(formSubmissionButton).toBeDisabled();
    });

    test('should have "Withdraw" tab disabled', async ({ mount, page }) => {
      await mount(
        <IntegrationWrapper>
          <StabilityUpdateDialog />
        </IntegrationWrapper>,
      );

      const updateButton = page.getByRole('button', {
        name: 'Update',
      });
      await updateButton.click();

      const formSubmissionButton = page.getByRole('tab', {
        name: 'Withdraw',
      });
      await expect(formSubmissionButton).toBeDisabled();
    });
  });
});
