import { expect, test } from './e2e.setup';

test('should navigate to the about page', async ({ page }) => {
  await page.goto('/spot');

  await expect(page.locator('text="Assets"')).toBeVisible();
});
