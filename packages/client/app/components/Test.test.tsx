import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Test from './Test'
 
describe('Home', () => {
  it('renders a heading', () => {
    render(<Test />)
 
    const heading = screen.getByText('Learn React')
 
    expect(heading).toBeInTheDocument()
  })
})