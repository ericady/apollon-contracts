import { expect, test } from '@playwright/test';

test('should navigate to the about page', async ({ page }) => {
  // Start from the index page (the baseURL is set via the webServer in the playwright.config.ts)
  await page.goto('/');
  // Find an element with the text 'About Page' and click on it
  const text = await page.locator('[data-test-id="test"]');
  // The new URL should be "/about" (baseURL is used there)
  await expect(text).toHaveText('Learn React');
  // The new page should contain an h1 with "About Page"
});
