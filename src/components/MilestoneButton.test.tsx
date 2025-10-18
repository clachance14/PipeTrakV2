/**
 * Component tests for MilestoneButton (Feature 007)
 * Tests both discrete (checkbox) and partial (slider) milestone UI
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MilestoneButton } from './MilestoneButton'

describe('MilestoneButton - Discrete Milestone (Checkbox)', () => {
  const discreteMilestone = {
    name: 'Receive',
    weight: 5,
    is_partial: false
  }

  it('renders checkbox for discrete milestone', () => {
    render(
      <MilestoneButton
        milestone={discreteMilestone}
        value={false}
        onChange={vi.fn()}
        disabled={false}
      />
    )

    // Should render checkbox input
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeDefined()
  })

  it('shows milestone name and weight', () => {
    render(
      <MilestoneButton
        milestone={discreteMilestone}
        value={false}
        onChange={vi.fn()}
        disabled={false}
      />
    )

    expect(screen.getByText(/Receive/)).toBeDefined()
    expect(screen.getByText(/5%/)).toBeDefined()
  })

  it('renders unchecked when value is false', () => {
    render(
      <MilestoneButton
        milestone={discreteMilestone}
        value={false}
        onChange={vi.fn()}
        disabled={false}
      />
    )

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement
    expect(checkbox.checked).toBe(false)
  })

  it('renders checked when value is true', () => {
    render(
      <MilestoneButton
        milestone={discreteMilestone}
        value={true}
        onChange={vi.fn()}
        disabled={false}
      />
    )

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement
    expect(checkbox.checked).toBe(true)
  })

  it('disables checkbox when disabled prop is true', () => {
    render(
      <MilestoneButton
        milestone={discreteMilestone}
        value={false}
        onChange={vi.fn()}
        disabled={true}
      />
    )

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement
    expect(checkbox.disabled).toBe(true)
  })
})

describe('MilestoneButton - Partial Milestone (Slider)', () => {
  const partialMilestone = {
    name: 'Fabricate',
    weight: 16,
    is_partial: true
  }

  it('renders slider for partial milestone', () => {
    render(
      <MilestoneButton
        milestone={partialMilestone}
        value={0}
        onChange={vi.fn()}
        disabled={false}
      />
    )

    // Should render slider input
    const slider = screen.getByRole('slider')
    expect(slider).toBeDefined()
  })

  it('shows milestone name and weight', () => {
    render(
      <MilestoneButton
        milestone={partialMilestone}
        value={0}
        onChange={vi.fn()}
        disabled={false}
      />
    )

    expect(screen.getByText(/Fabricate/)).toBeDefined()
    expect(screen.getByText(/16%/)).toBeDefined()
  })

  it('displays current percentage value', () => {
    render(
      <MilestoneButton
        milestone={partialMilestone}
        value={85}
        onChange={vi.fn()}
        disabled={false}
      />
    )

    expect(screen.getByText(/85%/)).toBeDefined()
  })

  it('sets slider value to 0 when value is 0', () => {
    render(
      <MilestoneButton
        milestone={partialMilestone}
        value={0}
        onChange={vi.fn()}
        disabled={false}
      />
    )

    const slider = screen.getByRole('slider') as HTMLInputElement
    expect(slider.value).toBe('0')
  })

  it('sets slider value to number value', () => {
    render(
      <MilestoneButton
        milestone={partialMilestone}
        value={85}
        onChange={vi.fn()}
        disabled={false}
      />
    )

    const slider = screen.getByRole('slider') as HTMLInputElement
    expect(slider.value).toBe('85')
  })

  it('disables slider when disabled prop is true', () => {
    render(
      <MilestoneButton
        milestone={partialMilestone}
        value={50}
        onChange={vi.fn()}
        disabled={true}
      />
    )

    const slider = screen.getByRole('slider') as HTMLInputElement
    expect(slider.disabled).toBe(true)
  })
})
