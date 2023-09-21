import { expect, test } from '@playwright/experimental-ct-react';
import { SetupServer } from 'msw/node';
import StabilityPoolTable from '../Features/Stability/StabilityBalance/StabilityPoolTable';
import { integrationSuiteSetup, integrationTestSetup } from './integration-test.setup';
import MockedBorrowerCollateralTokens from './mockedResponses/GetBorrowerCollateralTokens.mocked.json';
import MockedBorrowerDebtTokens from './mockedResponses/GetBorrowerDebtTokens.mocked.json';
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

test.describe('StabilityPoolTable', () => {
  test('should render CollateralTokenTable with mocked data when not logged in', async ({ mount, page }) => {
    // We need to mock the exact same data to generate the exact same snapshot
    await page.route('https://flyby-router-demo.herokuapp.com/', async (route) => {
      if (JSON.parse(route.request().postData()!).operationName === 'GetCollateralTokens') {
        return route.fulfill({
          status: 200,
          body: JSON.stringify(MockedBorrowerCollateralTokens),
        });
      }
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
        <StabilityPoolTable />
      </IntegrationWrapper>,
    );

    await page.waitForSelector('[data-testid="apollon-stability-pool-table-lost-token"]', {
      state: 'visible',
    });

    await expect(component).toHaveScreenshot();
  });

  test('should have same assets on same table row', async ({ mount, page }) => {
    const component = await mount(
      <IntegrationWrapper shouldConnectWallet>
        <StabilityPoolTable />
      </IntegrationWrapper>,
    );

    await page.waitForSelector('[data-testid="apollon-stability-pool-table-lost-token"]', {
      state: 'visible',
    });

    // With dynamic mock data we can only be sure that there is always one token in common and it should be moved to the start of the table
    const firstLostToken = await component.getByTestId('apollon-stability-pool-table-lost-token').first().innerText();
    const firstRewardToken = await component
      .getByTestId('apollon-stability-pool-table-reward-token')
      .first()
      .innerText();

    expect(firstLostToken).toBe(firstRewardToken);
  });
});
