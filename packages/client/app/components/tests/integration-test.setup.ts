import { Page } from '@playwright/test';
import { setupServer } from 'msw/node';
import 'whatwg-fetch';
import { handlers } from '../../../mocks/handlers';

export const makeFetchToMSW = async (
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

export const integrationSuiteSetup = () => {
  const server = setupServer(...handlers);
  server.listen();

  return server;
};

export const integrationTestSetup = async (page: Page) => {
  await page.route('https://flyby-router-demo.herokuapp.com/', async (route) => {
    const mswResponse = await makeFetchToMSW(route.request().postData(), route.request().headers());

    return route.fulfill({
      status: mswResponse.status,
      body: await mswResponse.text(),
    });
  });
};
