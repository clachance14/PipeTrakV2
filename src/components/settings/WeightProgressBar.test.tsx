/**
 * Tests for WeightProgressBar component (Feature 026 - User Story 2)
 * Visual weight distribution bar showing milestone weights
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WeightProgressBar } from './WeightProgressBar'

describe('WeightProgressBar', () => {
  it('renders all milestone segments with correct widths', () => {
    const weights = [
      { milestone_name: 'Fit-Up', weight: 10 },
      { milestone_name: 'Weld Made', weight: 70 },
      { milestone_name: 'Punch', weight: 10 },
      { milestone_name: 'Test', weight: 5 },
      { milestone_name: 'Restore', weight: 5 }
    ]

    const { container } = render(<WeightProgressBar weights={weights} />)

    // Check for bar segments with correct widths
    const segments = container.querySelectorAll('[data-testid^="weight-segment-"]')
    expect(segments).toHaveLength(5)

    // Check width attributes (as percentages)
    expect(segments[0]).toHaveStyle({ width: '10%' })
    expect(segments[1]).toHaveStyle({ width: '70%' })
    expect(segments[2]).toHaveStyle({ width: '10%' })
    expect(segments[3]).toHaveStyle({ width: '5%' })
    expect(segments[4]).toHaveStyle({ width: '5%' })
  })

  it('displays total weight percentage', () => {
    const weights = [
      { milestone_name: 'Fit-Up', weight: 10 },
      { milestone_name: 'Weld Made', weight: 70 },
      { milestone_name: 'Punch', weight: 10 },
      { milestone_name: 'Test', weight: 5 },
      { milestone_name: 'Restore', weight: 5 }
    ]

    render(<WeightProgressBar weights={weights} />)

    expect(screen.getByText('Total: 100%')).toBeInTheDocument()
  })

  it('shows error state when total is not 100%', () => {
    const weights = [
      { milestone_name: 'Fit-Up', weight: 10 },
      { milestone_name: 'Weld Made', weight: 60 },
      { milestone_name: 'Punch', weight: 10 },
      { milestone_name: 'Test', weight: 15 },
      { milestone_name: 'Restore', weight: 10 } // Total = 105
    ]

    render(<WeightProgressBar weights={weights} />)

    expect(screen.getByText('Total: 105%')).toBeInTheDocument()

    // Should have error styling
    const totalText = screen.getByText('Total: 105%')
    expect(totalText).toHaveClass('text-red-600')
  })

  it('shows success state when total is exactly 100%', () => {
    const weights = [
      { milestone_name: 'Fit-Up', weight: 10 },
      { milestone_name: 'Weld Made', weight: 70 },
      { milestone_name: 'Punch', weight: 10 },
      { milestone_name: 'Test', weight: 5 },
      { milestone_name: 'Restore', weight: 5 }
    ]

    render(<WeightProgressBar weights={weights} />)

    const totalText = screen.getByText('Total: 100%')
    expect(totalText).toHaveClass('text-green-600')
  })

  it('shows different colors for different milestones', () => {
    const weights = [
      { milestone_name: 'Fit-Up', weight: 25 },
      { milestone_name: 'Weld Made', weight: 25 },
      { milestone_name: 'Punch', weight: 25 },
      { milestone_name: 'Test', weight: 25 }
    ]

    const { container } = render(<WeightProgressBar weights={weights} />)

    const segments = container.querySelectorAll('[data-testid^="weight-segment-"]')

    // Each segment should have a different background color class
    const colors = Array.from(segments).map(segment =>
      segment.className.match(/bg-\w+-\d+/)?.[0]
    )

    // Should have at least some color variation
    const uniqueColors = new Set(colors)
    expect(uniqueColors.size).toBeGreaterThan(1)
  })

  it('displays milestone names in tooltips', () => {
    const weights = [
      { milestone_name: 'Fit-Up', weight: 10 },
      { milestone_name: 'Weld Made', weight: 70 },
      { milestone_name: 'Punch', weight: 10 },
      { milestone_name: 'Test', weight: 5 },
      { milestone_name: 'Restore', weight: 5 }
    ]

    const { container } = render(<WeightProgressBar weights={weights} />)

    const segments = container.querySelectorAll('[data-testid^="weight-segment-"]')

    expect(segments[0]).toHaveAttribute('title', 'Fit-Up: 10%')
    expect(segments[1]).toHaveAttribute('title', 'Weld Made: 70%')
    expect(segments[2]).toHaveAttribute('title', 'Punch: 10%')
  })

  it('handles zero weights gracefully', () => {
    const weights = [
      { milestone_name: 'Fit-Up', weight: 0 },
      { milestone_name: 'Weld Made', weight: 100 },
    ]

    const { container } = render(<WeightProgressBar weights={weights} />)

    const segments = container.querySelectorAll('[data-testid^="weight-segment-"]')

    // Should still render both segments, even if one is 0%
    expect(segments).toHaveLength(2)
    expect(segments[0]).toHaveStyle({ width: '0%' })
    expect(segments[1]).toHaveStyle({ width: '100%' })
  })

  it('renders empty state when no weights provided', () => {
    render(<WeightProgressBar weights={[]} />)

    expect(screen.getByText('Total: 0%')).toBeInTheDocument()
  })

  it('calculates total correctly for partial sums', () => {
    const weights = [
      { milestone_name: 'Fit-Up', weight: 10 },
      { milestone_name: 'Weld Made', weight: 50 },
    ]

    render(<WeightProgressBar weights={weights} />)

    expect(screen.getByText('Total: 60%')).toBeInTheDocument()

    const totalText = screen.getByText('Total: 60%')
    expect(totalText).toHaveClass('text-red-600') // Error state
  })

  it('has accessible structure for screen readers', () => {
    const weights = [
      { milestone_name: 'Fit-Up', weight: 10 },
      { milestone_name: 'Weld Made', weight: 70 },
      { milestone_name: 'Punch', weight: 10 },
      { milestone_name: 'Test', weight: 5 },
      { milestone_name: 'Restore', weight: 5 }
    ]

    const { container } = render(<WeightProgressBar weights={weights} />)

    const progressBar = container.querySelector('[role="progressbar"]')
    expect(progressBar).toBeInTheDocument()
    expect(progressBar).toHaveAttribute('aria-label', 'Weight distribution')
  })
})
