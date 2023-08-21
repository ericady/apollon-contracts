import { expect, test } from '@playwright/experimental-ct-react';
import Test from '../Test';
import { IntegrationWrapper } from './test-utils';

test('should work', async ({ mount }) => {
  const component = await mount(
    <IntegrationWrapper>
      <Test />
    </IntegrationWrapper>,
  );
  await expect(component).toContainText('Learn React');
});
