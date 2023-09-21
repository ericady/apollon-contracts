import { expect, test } from '@playwright/experimental-ct-react';
import { SetupServer } from 'msw/node';
import CollateralTokenTable from '../Features/Collateral/CollateralBalance/CollateralTokenTable';
import { integrationSuiteSetup, integrationTestSetup } from './integration-test.setup';
import MockedBorrowerCollateralTokens from './mockedResponses/GetBorrowerCollateralTokens.mocked.json';
import MockedCollateralTokensWithoutBorrower from './mockedResponses/GetCollateralTokens.mocked.json';
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

test.describe('CollateralTokenTable', () => {
  test('should render CollateralTokenTable with mocked data when not logged in', async ({ mount, page }) => {
    // We need to mock the exact same data to generate the exact same snapshot
    await page.route('https://flyby-router-demo.herokuapp.com/', async (route) => {
      if (JSON.parse(route.request().postData()!).operationName === 'GetCollateralTokens') {
        return route.fulfill({
          status: 200,
          body: JSON.stringify(MockedCollateralTokensWithoutBorrower),
        });
      } else {
        return route.abort();
      }
    });

    const component = await mount(
      <IntegrationWrapper>
        <CollateralTokenTable />
      </IntegrationWrapper>,
    );

    await page.waitForSelector('[data-testid="apollon-collateral-token-table"]', {
      state: 'visible',
    });

    await expect(component).toHaveScreenshot();
  });

  test('should render CollateralTokenTable with mocked data when logged in', async ({ mount, page }) => {
    // We need to mock the exact same data to generate the exact same snapshot
    await page.route('https://flyby-router-demo.herokuapp.com/', async (route) => {
      if (JSON.parse(route.request().postData()!).operationName === 'GetCollateralTokens') {
        return route.fulfill({
          status: 200,
          body: JSON.stringify(MockedBorrowerCollateralTokens),
        });
      } else {
        return route.abort();
      }
    });

    const component = await mount(
      <IntegrationWrapper shouldConnectWallet>
        <CollateralTokenTable />
      </IntegrationWrapper>,
    );

    await page.waitForSelector('[data-testid="apollon-collateral-token-table"]', {
      state: 'visible',
    });

    await expect(component).toHaveScreenshot();
  });
});
