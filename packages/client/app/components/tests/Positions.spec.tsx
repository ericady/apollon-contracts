import { expect, test } from '@playwright/experimental-ct-react';
import { SetupServer } from 'msw/node';
import Positions from '../Features/Positions/Positions';
import { integrationSuiteSetup, integrationTestSetup } from './integration-test.setup';
import MockedBorrowerPositions from './mockedResponses/BorrowerPositions.mocked.json';
import MockedPositionsWithoutBorrower from './mockedResponses/Positions.mocked.json';
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
          body: JSON.stringify(MockedPositionsWithoutBorrower),
        });
      } else {
        return route.abort();
      }
    });

    const component = await mount(
      <IntegrationWrapper>
        <Positions />
      </IntegrationWrapper>,
    );

    await expect(component).toHaveScreenshot();
  });

  test.describe('Guest mode', () => {
    test('should have "Collateral" tab disabled', async ({ mount }) => {
      const component = await mount(
        <IntegrationWrapper>
          <Positions />
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
          <Positions />
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
          <Positions />
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
            body: JSON.stringify(MockedBorrowerPositions),
          });
        } else {
          return route.abort();
        }
      });

      const component = await mount(
        <IntegrationWrapper>
          <Positions />
        </IntegrationWrapper>,
      );

      await expect(component).toHaveScreenshot();
    });

    test('should have "Collateral" tab enabled', async ({ mount }) => {
      const component = await mount(
        <IntegrationWrapper shouldConnectWallet>
          <Positions />
        </IntegrationWrapper>,
      );

      const collateralTab = component.getByRole('tab', {
        name: 'Collateral',
      });
      await expect(collateralTab).toBeEnabled();
    });

    test('should have "Positions" tab enabled', async ({ mount }) => {
      const component = await mount(
        <IntegrationWrapper shouldConnectWallet>
          <Positions />
        </IntegrationWrapper>,
      );

      const collateralTab = component.getByRole('tab', {
        name: 'Positions',
      });
      await expect(collateralTab).toBeEnabled();
    });

    test('should have "History" tab enabled', async ({ mount }) => {
      const component = await mount(
        <IntegrationWrapper shouldConnectWallet>
          <Positions />
        </IntegrationWrapper>,
      );

      const collateralTab = component.getByRole('tab', {
        name: 'History',
      });
      await expect(collateralTab).toBeEnabled();
    });
  });
});
