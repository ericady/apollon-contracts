import { expect, test } from '@playwright/experimental-ct-react';
import { setupServer } from 'msw/node';
import 'whatwg-fetch';
import { handlers } from '../../../mocks/handlers';
import Assets from '../Features/Assets/Assets';
import { IntegrationWrapper } from './test-utils';

test.beforeAll(() => {
  const server = setupServer(...handlers);
  server.listen();
});

test('should render Assets', async ({ mount, page }) => {
  const makeFetchToMSW = async (
    postData: string | null,
    headers: {
      [key: string]: string;
    },
  ) => {
    const response = await fetch('https://flyby-router-demo.herokuapp.com/', {
      body: postData,
      method: 'POST',
      headers,
    });

    return response;
  };

  await page.route('https://flyby-router-demo.herokuapp.com/', async (route) => {
    const mswResponse = await makeFetchToMSW(route.request().postData(), route.request().headers());

    return route.fulfill({
      status: mswResponse.status,
      body: await mswResponse.text(),
    });
  });

  const component = await mount(
    <IntegrationWrapper>
      <Assets />
    </IntegrationWrapper>,
  );

  await expect(component).toHaveScreenshot({ maxDiffPixelRatio: 0.03 });
});
