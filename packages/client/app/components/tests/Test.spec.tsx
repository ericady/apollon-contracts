import { expect, test } from '@playwright/experimental-ct-react';
import Test from '../Test';

test('should work', async ({ mount }) => {
  const component = await mount(<Test />);
  await expect(component).toContainText('Learn React');
});
