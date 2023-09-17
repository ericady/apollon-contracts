import { act, render, screen } from '@testing-library/react';
import { IntegrationWrapper } from '../../tests/test-utils';
import Assets from './Assets';

describe('Home', () => {
  it('renders a heading', async () => {
    render(<Assets />, { wrapper: IntegrationWrapper });

    const heading = screen.getByText('Assets');

    await act(async () => {
      await new Promise((res) => setTimeout(res, 1000));
    });

    expect(heading).toBeInTheDocument();
  });
});
