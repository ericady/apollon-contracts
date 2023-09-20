import { expect, test } from '@playwright/experimental-ct-react';
import { SetupServer } from 'msw/node';
import LiquidityPool from '../Features/LiquidityPool/LiquidityPool';
import { integrationSuiteSetup, integrationTestSetup } from './integration-test.setup';
import MockedBorrowerLiquidityPools from './mockedResponses/GetBorrowerLiquidityPools.mocked.json';
import MockedLiquidityPoolsWithoutBorrower from './mockedResponses/GetLiquidityPools.mocked.json';
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

test.describe('LiquidityPool', () => {
  test('should render LiquidityPool with mocked data', async ({ mount, page }) => {
    // We need to mock the exact same data to generate the exact same snapshot
    await page.route('https://flyby-router-demo.herokuapp.com/', async (route) => {
      if (JSON.parse(route.request().postData()!).operationName === 'GetLiquidityPools') {
        return route.fulfill({
          status: 200,
          body: JSON.stringify(MockedLiquidityPoolsWithoutBorrower),
        });
      }
      if (JSON.parse(route.request().postData()!).operationName === 'GetBorrowerLiquidityPools') {
        return route.fulfill({
          status: 200,
          body: JSON.stringify(MockedBorrowerLiquidityPools),
        });
      } else {
        return route.abort();
      }
    });

    const component = await mount(
      <IntegrationWrapper shouldPreselectTokens>
        <LiquidityPool />
      </IntegrationWrapper>,
    );

    await expect(component).toHaveScreenshot();
  });

  test('should preselect first pool', async ({ mount, page }) => {
    await mount(
      <IntegrationWrapper shouldPreselectTokens>
        <LiquidityPool />
      </IntegrationWrapper>,
    );

    await page.waitForSelector('[data-testid="apollon-liquidity-pool-table-row"]', {
      state: 'visible',
    });
    await page.waitForSelector('.Mui-selected', {
      state: 'visible',
    });

    const rows = page.getByTestId('apollon-liquidity-pool-table-row');
    expect(await rows.count()).toBe(55);

    const selectedRow = page.locator('tr.Mui-selected');
    expect(await selectedRow.count()).toBe(1);

    const firstRow = rows.nth(0);
    await expect(firstRow).toHaveClass(/Mui-selected/);
  });

  test('should select a pool when clicked', async ({ mount, page }) => {
    await mount(
      <IntegrationWrapper shouldPreselectTokens>
        <LiquidityPool />
      </IntegrationWrapper>,
    );

    await page.waitForSelector('[data-testid="apollon-liquidity-pool-table-row"]', {
      state: 'visible',
    });
    await page.waitForSelector('.Mui-selected', {
      state: 'visible',
    });

    const rows = page.getByTestId('apollon-liquidity-pool-table-row');
    const secondRow = rows.nth(1);
    await secondRow.click();

    await page.waitForTimeout(500);
    const selectedRow = page.locator('tr.Mui-selected');
    expect(await selectedRow.count()).toBe(1);

    const secondRowAfterUpdate = page.getByTestId('apollon-liquidity-pool-table-row').nth(1);
    await expect(secondRowAfterUpdate).toHaveClass(/Mui-selected/);
  });

  test('should show selected table rows as default', async ({ mount, page }) => {
    await mount(
      <IntegrationWrapper shouldPreselectTokens>
        <LiquidityPool />
      </IntegrationWrapper>,
    );

    await page.waitForSelector('[data-testid="apollon-liquidity-pool-table-row"]', {
      state: 'visible',
    });

    const rows = page.getByTestId('apollon-liquidity-pool-table-row');
    const firstRow = rows.nth(0);
    await firstRow.hover();

    await expect(firstRow).toHaveCSS('cursor', 'default');
  });

  test('should show unselected table rows as selectable', async ({ mount, page }) => {
    await mount(
      <IntegrationWrapper shouldPreselectTokens>
        <LiquidityPool />
      </IntegrationWrapper>,
    );

    await page.waitForSelector('[data-testid="apollon-liquidity-pool-table-row"]', {
      state: 'visible',
    });

    const rows = page.getByTestId('apollon-liquidity-pool-table-row');
    const secondRow = rows.nth(1);
    await secondRow.hover();

    await expect(secondRow).toHaveCSS('cursor', 'pointer');
  });
});
