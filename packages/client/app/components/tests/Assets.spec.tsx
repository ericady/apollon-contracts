import { expect, test } from '@playwright/experimental-ct-react';
import Assets from '../Features/Assets/Assets';
import { IntegrationWrapper } from './test-utils';

test('should render Assets', async ({ mount }) => {
  const component = await mount(
    <IntegrationWrapper>
      <Assets />
    </IntegrationWrapper>,
  );
  await expect(component).toContainText('Learn React');
});
