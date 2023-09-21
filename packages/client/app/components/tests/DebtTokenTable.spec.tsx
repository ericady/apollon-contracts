import { expect, test } from '@playwright/experimental-ct-react';
import { SetupServer } from 'msw/node';
import DebtTokenTable from '../Features/Stability/StabilityBalance/DebtTokenTable';
import { integrationSuiteSetup, integrationTestSetup } from './integration-test.setup';
import MockedBorrowerDebtTokens from './mockedResponses/GetBorrowerDebtTokens.mocked.json';
import MockedDebtTokensWithoutBorrower from './mockedResponses/GetDebtTokens.mocked.json';
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

test.describe('DebtTokenTable', () => {
  test('should render DebtTokenTable with mocked data when logged in', async ({ mount, page }) => {
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

    const component = await mount(
      <IntegrationWrapper shouldConnectWallet>
        <DebtTokenTable />
      </IntegrationWrapper>,
    );

    await page.waitForSelector('[data-testid="apollon-debt-token-table"]', {
      state: 'visible',
    });

    await expect(component).toHaveScreenshot();
  });

  test('should render DebtTokenTable with mocked data when not logged in', async ({ mount, page }) => {
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

    const component = await mount(
      <IntegrationWrapper shouldConnectWallet>
        <DebtTokenTable />
      </IntegrationWrapper>,
    );

    await page.waitForSelector('[data-testid="apollon-debt-token-table"]', {
      state: 'visible',
    });

    await expect(component).toHaveScreenshot();
  });
});
