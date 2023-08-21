import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import Test from './Test';
import { IntegrationWrapper } from './tests/test-utils';

describe('Home', () => {
  it('renders a heading', () => {
    render(<Test />, { wrapper: IntegrationWrapper });

    const heading = screen.getByText('Learn React');

    expect(heading).toBeInTheDocument();
  });
});
