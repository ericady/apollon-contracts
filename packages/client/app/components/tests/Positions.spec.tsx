import { expect, test } from '@playwright/experimental-ct-react';
import { SetupServer } from 'msw/node';
import BalanceTable from '../Features/BalanceTable/BalanceTable';
import { integrationSuiteSetup, integrationTestSetup } from './integration-test.setup';
import MockedGetBorrowerCollateralTokens from './mockedResponses/GetBorrowerCollateralTokens.mocked.json';
import MockedBorrowerDebtTokens from './mockedResponses/GetBorrowerDebtTokens.mocked.json';
import MockedBorrowerPositions from './mockedResponses/GetBorrowerSwapEvents.mocked.json';
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

test.describe('Positions', () => {
  test('should render Positions with mocked data', async ({ mount, page }) => {
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
      <IntegrationWrapper>
        <BalanceTable />
      </IntegrationWrapper>,
    );

    await expect(component).toHaveScreenshot({ maxDiffPixelRatio: 0.01 });
  });

  test.describe('Guest mode', () => {
    test('should have "Collateral" tab disabled', async ({ mount }) => {
      const component = await mount(
        <IntegrationWrapper>
          <BalanceTable />
        </IntegrationWrapper>,
      );

      const collateralTab = component.getByRole('tab', {
        name: 'Collateral',
      });
      await expect(collateralTab).toBeDisabled();
    });

    test('should have "Positions" tab disabled', async ({ mount }) => {
      const component = await mount(
        <IntegrationWrapper>
          <BalanceTable />
        </IntegrationWrapper>,
      );

      const collateralTab = component.getByRole('tab', {
        name: 'Positions',
      });
      await expect(collateralTab).toBeDisabled();
    });

    test('should have "History" tab disabled', async ({ mount }) => {
      const component = await mount(
        <IntegrationWrapper>
          <BalanceTable />
        </IntegrationWrapper>,
      );

      const collateralTab = component.getByRole('tab', {
        name: 'History',
      });
      await expect(collateralTab).toBeDisabled();
    });
  });

  test.describe('Connected mode', () => {
    test('should render Positions with borrower mocked data when logged in', async ({ mount, page }) => {
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
        <IntegrationWrapper>
          <BalanceTable />
        </IntegrationWrapper>,
      );

      await expect(component).toHaveScreenshot({ maxDiffPixelRatio: 0.01 });
    });

    test.describe('Collateral Tab', () => {
      test('should have "Collateral" tab enabled', async ({ mount }) => {
        const component = await mount(
          <IntegrationWrapper shouldConnectWallet>
            <BalanceTable />
          </IntegrationWrapper>,
        );

        const collateralTab = component.getByRole('tab', {
          name: 'Collateral',
        });
        await expect(collateralTab).toBeEnabled();
      });

      test('should render Collateral tab with mocked data', async ({ mount, page }) => {
        // We need to mock the exact same data to generate the exact same snapshot
        await page.route('https://flyby-router-demo.herokuapp.com/', async (route) => {
          if (JSON.parse(route.request().postData()!).operationName === 'GetCollateralTokens') {
            return route.fulfill({
              status: 200,
              body: JSON.stringify(MockedGetBorrowerCollateralTokens),
            });
          } else {
            return route.abort();
          }
        });

        const component = await mount(
          <IntegrationWrapper shouldConnectWallet>
            <BalanceTable />
          </IntegrationWrapper>,
        );

        const collateralTab = component.getByRole('tab', {
          name: 'Collateral',
        });
        await collateralTab.click();

        await page.waitForSelector('[data-testid="apollon-collateral-table"]', {
          state: 'visible',
        });

        await expect(component).toHaveScreenshot({ maxDiffPixelRatio: 0.01 });
      });
    });

    test.describe('Positions Tab', () => {
      test('should have "Positions" tab enabled', async ({ mount }) => {
        const component = await mount(
          <IntegrationWrapper shouldConnectWallet>
            <BalanceTable />
          </IntegrationWrapper>,
        );

        const collateralTab = component.getByRole('tab', {
          name: 'Positions',
        });
        await expect(collateralTab).toBeEnabled();
      });

      test('should render Positions tab with mocked data', async ({ mount, page }) => {
        // We need to mock the exact same data to generate the exact same snapshot
        await page.route('https://flyby-router-demo.herokuapp.com/', async (route) => {
          if (JSON.parse(route.request().postData()!).operationName === 'GetDebtTokens') {
            return route.fulfill({
              status: 200,
              body: JSON.stringify(MockedDebtTokensWithoutBorrower),
            });
          }

          if (JSON.parse(route.request().postData()!).operationName === 'GetBorrowerSwapEvents') {
            return route.fulfill({
              status: 200,
              body: JSON.stringify(MockedBorrowerPositions),
            });
          } else {
            return route.abort();
          }
        });

        const component = await mount(
          <IntegrationWrapper shouldConnectWallet>
            <BalanceTable />
          </IntegrationWrapper>,
        );

        const positionsTab = component.getByRole('tab', {
          name: 'Positions',
        });
        await positionsTab.click();

        await page.waitForSelector('[data-testid="apollon-positions-table"]', {
          state: 'visible',
        });

        await expect(component).toHaveScreenshot({ maxDiffPixelRatio: 0.02 });
      });

      test('should display position number label in the tab', async ({ mount, page }) => {
        await mount(
          <IntegrationWrapper shouldConnectWallet>
            <BalanceTable />
          </IntegrationWrapper>,
        );

        await page.waitForSelector('[data-testid="apollon-positions-count"]', {
          state: 'visible',
        });

        const rows = page.getByTestId('apollon-positions-count');
        expect(await rows.count()).toBe(1);
      });
    });

    test.describe('History Tab', () => {
      test('should have "History" tab enabled', async ({ mount }) => {
        const component = await mount(
          <IntegrationWrapper shouldConnectWallet>
            <BalanceTable />
          </IntegrationWrapper>,
        );

        const collateralTab = component.getByRole('tab', {
          name: 'History',
        });
        await expect(collateralTab).toBeEnabled();
      });

      test('should render History tab with mocked data', async ({ mount, page }) => {
        // We need to mock the exact same data to generate the exact same snapshot
        await page.route('https://flyby-router-demo.herokuapp.com/', async (route) => {
          if (JSON.parse(route.request().postData()!).operationName === 'GetBorrowerSwapEvents') {
            return route.fulfill({
              status: 200,
              body: JSON.stringify(MockedBorrowerPositions),
            });
          } else {
            return route.abort();
          }
        });

        const component = await mount(
          <IntegrationWrapper shouldConnectWallet>
            <BalanceTable />
          </IntegrationWrapper>,
        );

        const historyTab = component.getByRole('tab', {
          name: 'History',
        });
        await historyTab.click();

        await page.waitForSelector('[data-testid="apollon-history-table"]', {
          state: 'visible',
        });

        await expect(component).toHaveScreenshot({ maxDiffPixelRatio: 0.02 });
      });

      test('should display history number label in the tab', async ({ mount, page }) => {
        await mount(
          <IntegrationWrapper shouldConnectWallet>
            <BalanceTable />
          </IntegrationWrapper>,
        );

        await page.waitForSelector('[data-testid="apollon-history-count"]', {
          state: 'visible',
        });

        const rows = page.getByTestId('apollon-history-count');
        expect(await rows.count()).toBe(1);
      });
    });
  });
});
