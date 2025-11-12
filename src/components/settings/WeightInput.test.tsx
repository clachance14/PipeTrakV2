/**
 * Tests for WeightInput component (Feature 026 - User Story 2)
 * Numeric input for milestone weight with validation (0-100)
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WeightInput } from './WeightInput'

describe('WeightInput', () => {
  it('renders input with milestone name label', () => {
    render(
      <WeightInput
        milestoneName="Fit-Up"
        value={10}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByLabelText('Fit-Up')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10')).toBeInTheDocument()
  })

  it('displays current weight value', () => {
    render(
      <WeightInput
        milestoneName="Weld Made"
        value={70}
        onChange={vi.fn()}
      />
    )

    const input = screen.getByRole('spinbutton')
    expect(input).toHaveValue(70)
  })

  it('calls onChange with numeric value when user types', () => {
    const handleChange = vi.fn()

    render(
      <WeightInput
        milestoneName="Fit-Up"
        value={10}
        onChange={handleChange}
      />
    )

    const input = screen.getByRole('spinbutton')

    // Simulate user changing the value
    fireEvent.change(input, { target: { value: '25' } })

    expect(handleChange).toHaveBeenCalledWith('Fit-Up', 25)
  })

  it('shows error border when value exceeds 100', () => {
    render(
      <WeightInput
        milestoneName="Fit-Up"
        value={110}
        onChange={vi.fn()}
        error="Weight must be between 0 and 100"
      />
    )

    const input = screen.getByRole('spinbutton')
    expect(input).toHaveClass('border-red-500')
  })

  it('shows error border when value is negative', () => {
    render(
      <WeightInput
        milestoneName="Fit-Up"
        value={-5}
        onChange={vi.fn()}
        error="Weight must be between 0 and 100"
      />
    )

    const input = screen.getByRole('spinbutton')
    expect(input).toHaveClass('border-red-500')
  })

  it('displays error message when provided', () => {
    render(
      <WeightInput
        milestoneName="Fit-Up"
        value={110}
        onChange={vi.fn()}
        error="Weight must be between 0 and 100"
      />
    )

    expect(screen.getByText('Weight must be between 0 and 100')).toBeInTheDocument()
  })

  it('accepts values between 0 and 100 inclusive', () => {
    const handleChange = vi.fn()

    const { rerender } = render(
      <WeightInput
        milestoneName="Fit-Up"
        value={0}
        onChange={handleChange}
      />
    )

    let input = screen.getByRole('spinbutton')
    expect(input).toHaveValue(0)

    // Test boundary value 100
    rerender(
      <WeightInput
        milestoneName="Fit-Up"
        value={100}
        onChange={handleChange}
      />
    )

    input = screen.getByRole('spinbutton')
    expect(input).toHaveValue(100)
  })

  it('handles empty input gracefully', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(
      <WeightInput
        milestoneName="Fit-Up"
        value={10}
        onChange={handleChange}
      />
    )

    const input = screen.getByRole('spinbutton')

    await user.clear(input)

    // Empty input should call onChange with 0
    expect(handleChange).toHaveBeenCalledWith('Fit-Up', 0)
  })

  it('displays percentage symbol (%) after input', () => {
    render(
      <WeightInput
        milestoneName="Fit-Up"
        value={10}
        onChange={vi.fn()}
      />
    )

    // Check for % symbol in the component
    expect(screen.getByText('%')).toBeInTheDocument()
  })

  it('is disabled when disabled prop is true', () => {
    render(
      <WeightInput
        milestoneName="Fit-Up"
        value={10}
        onChange={vi.fn()}
        disabled={true}
      />
    )

    const input = screen.getByRole('spinbutton')
    expect(input).toBeDisabled()
  })

  it('has accessible ARIA attributes', () => {
    render(
      <WeightInput
        milestoneName="Fit-Up"
        value={10}
        onChange={vi.fn()}
      />
    )

    const input = screen.getByRole('spinbutton')
    expect(input).toHaveAttribute('aria-label', 'Fit-Up')
    expect(input).toHaveAttribute('aria-valuenow', '10')
    expect(input).toHaveAttribute('aria-valuemin', '0')
    expect(input).toHaveAttribute('aria-valuemax', '100')
  })

  it('marks input as invalid when error present', () => {
    render(
      <WeightInput
        milestoneName="Fit-Up"
        value={110}
        onChange={vi.fn()}
        error="Weight must be between 0 and 100"
      />
    )

    const input = screen.getByRole('spinbutton')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('converts string input to number', () => {
    const handleChange = vi.fn()

    render(
      <WeightInput
        milestoneName="Fit-Up"
        value={42}
        onChange={handleChange}
      />
    )

    const input = screen.getByRole('spinbutton')

    // Value prop should be number (verified by test)
    expect(input).toHaveValue(42)
    expect(typeof (input as HTMLInputElement).value).toBe('string') // DOM returns string
  })
})
