import { test, expect } from '@playwright/experimental-ct-react';
import Test from './Test';

test.use({ viewport: { width: 500, height: 500 } });

test('should work', async ({ mount }) => {
  const component = await mount(<Test />);
  await expect(component).toContainText('Learn React');
});