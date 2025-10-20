import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MilestoneCheckbox } from './MilestoneCheckbox'
import type { MilestoneConfig } from '@/types/drawing-table.types'

describe('MilestoneCheckbox', () => {
  const mockMilestone: MilestoneConfig = {
    name: 'Receive',
    weight: 10,
    order: 1,
    is_partial: false,
    requires_welder: false,
  }

  it('renders checkbox with milestone name as label', () => {
    render(
      <MilestoneCheckbox
        milestone={mockMilestone}
        checked={false}
        onChange={vi.fn()}
        disabled={false}
      />
    )

    expect(screen.getByRole('checkbox')).toBeInTheDocument()
    expect(screen.getByText('Receive')).toBeInTheDocument()
  })

  it('shows checked state when checked prop is true', async () => {
    render(
      <MilestoneCheckbox
        milestone={mockMilestone}
        checked={true}
        onChange={vi.fn()}
        disabled={false}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('data-state', 'checked')
  })

  it('shows unchecked state when checked prop is false', () => {
    render(
      <MilestoneCheckbox
        milestone={mockMilestone}
        checked={false}
        onChange={vi.fn()}
        disabled={false}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('data-state', 'unchecked')
  })

  it('calls onChange when clicked', async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()

    render(
      <MilestoneCheckbox
        milestone={mockMilestone}
        checked={false}
        onChange={handleChange}
        disabled={false}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)

    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(handleChange).toHaveBeenCalledWith(true)
  })

  it('toggles from checked to unchecked when clicked', async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()

    render(
      <MilestoneCheckbox
        milestone={mockMilestone}
        checked={true}
        onChange={handleChange}
        disabled={false}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)

    expect(handleChange).toHaveBeenCalledWith(false)
  })

  it('applies disabled styling when disabled', () => {
    render(
      <MilestoneCheckbox
        milestone={mockMilestone}
        checked={false}
        onChange={vi.fn()}
        disabled={true}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeDisabled()
  })

  it('does not call onChange when disabled and clicked', async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()

    render(
      <MilestoneCheckbox
        milestone={mockMilestone}
        checked={false}
        onChange={handleChange}
        disabled={true}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)

    expect(handleChange).not.toHaveBeenCalled()
  })

  it('shows milestone weight in tooltip on hover', async () => {
    const user = userEvent.setup()

    render(
      <MilestoneCheckbox
        milestone={mockMilestone}
        checked={false}
        onChange={vi.fn()}
        disabled={false}
      />
    )

    const container = screen.getByRole('checkbox').closest('div')
    await user.hover(container!)

    // Tooltip should show weight (10% of total progress)
    expect(await screen.findByText(/10% of total progress/)).toBeInTheDocument()
  })

  it('supports keyboard navigation with Space key', async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()

    render(
      <MilestoneCheckbox
        milestone={mockMilestone}
        checked={false}
        onChange={handleChange}
        disabled={false}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    checkbox.focus()
    await user.keyboard(' ')

    expect(handleChange).toHaveBeenCalledWith(true)
  })

  it('has correct ARIA attributes', () => {
    render(
      <MilestoneCheckbox
        milestone={mockMilestone}
        checked={false}
        onChange={vi.fn()}
        disabled={false}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('aria-checked', 'false')
    expect(checkbox).toHaveAttribute('aria-label', 'Receive milestone')
  })

  it('updates ARIA checked attribute when checked changes', () => {
    const { rerender } = render(
      <MilestoneCheckbox
        milestone={mockMilestone}
        checked={false}
        onChange={vi.fn()}
        disabled={false}
      />
    )

    let checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('aria-checked', 'false')

    rerender(
      <MilestoneCheckbox
        milestone={mockMilestone}
        checked={true}
        onChange={vi.fn()}
        disabled={false}
      />
    )

    checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('aria-checked', 'true')
  })

  it('applies cursor-not-allowed when disabled', () => {
    render(
      <MilestoneCheckbox
        milestone={mockMilestone}
        checked={false}
        onChange={vi.fn()}
        disabled={true}
      />
    )

    const container = screen.getByRole('checkbox').closest('div')
    expect(container).toHaveClass('cursor-not-allowed')
  })

  it('applies opacity-50 when disabled', () => {
    render(
      <MilestoneCheckbox
        milestone={mockMilestone}
        checked={false}
        onChange={vi.fn()}
        disabled={true}
      />
    )

    const container = screen.getByRole('checkbox').closest('div')
    expect(container).toHaveClass('opacity-50')
  })
})
