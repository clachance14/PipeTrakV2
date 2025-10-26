/**
 * Unit Tests: FieldWeldRow Component (T045)
 * Tests field weld row display with milestones and actions
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FieldWeldRow } from './FieldWeldRow'

describe('FieldWeldRow', () => {
  const mockActiveWeld = {
    id: 'weld-1',
    component_id: 'comp-1',
    weld_type: 'BW',
    weld_size: '2"',
    welder: { stencil: 'K-07', name: 'John Smith' },
    date_welded: '2024-01-15',
    nde_type: 'RT',
    nde_result: 'PASS',
    status: 'active',
    percent_complete: 95,
    is_repair: false,
  }

  it('renders all weld columns', () => {
    render(<FieldWeldRow fieldWeld={mockActiveWeld as any} />)

    expect(screen.getByText('weld-1')).toBeInTheDocument()
    expect(screen.getByText(/BW/)).toBeInTheDocument()
    expect(screen.getByText(/2"/)).toBeInTheDocument()
    expect(screen.getByText('K-07')).toBeInTheDocument()
    expect(screen.getByText(/2024-01-15/)).toBeInTheDocument()
    expect(screen.getByText(/RT PASS/)).toBeInTheDocument()
  })

  it('displays welder info correctly', () => {
    render(<FieldWeldRow fieldWeld={mockActiveWeld as any} />)

    expect(screen.getByText('K-07')).toBeInTheDocument()
  })

  it('NDE status shows correct formatting', () => {
    render(<FieldWeldRow fieldWeld={mockActiveWeld as any} />)

    expect(screen.getByText(/RT PASS/)).toBeInTheDocument()
  })

  it('status badges show correct colors', () => {
    const { container } = render(<FieldWeldRow fieldWeld={mockActiveWeld as any} />)

    // Active should have blue background
    expect(container.querySelector('.bg-blue-100')).toBeInTheDocument()
  })

  it('progress bar shows percentage', () => {
    render(<FieldWeldRow fieldWeld={mockActiveWeld as any} />)

    expect(screen.getByText(/95%/)).toBeInTheDocument()
  })

  it('action buttons visible only on active welds', () => {
    render(<FieldWeldRow fieldWeld={mockActiveWeld as any} />)

    expect(screen.getByRole('button', { name: /assign welder/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /record NDE/i })).toBeInTheDocument()
  })

  it('action buttons hidden on rejected welds', () => {
    const rejectedWeld = { ...mockActiveWeld, status: 'rejected' }

    render(<FieldWeldRow fieldWeld={rejectedWeld as any} />)

    expect(screen.queryByRole('button', { name: /assign welder/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /record NDE/i })).not.toBeInTheDocument()
  })

  it('repair history link shows for repair welds', () => {
    const repairWeld = { ...mockActiveWeld, is_repair: true, original_weld_id: 'weld-0' }

    render(<FieldWeldRow fieldWeld={repairWeld as any} />)

    expect(screen.getByText(/view repair history/i)).toBeInTheDocument()
  })

  it('grayed out styling for rejected welds', () => {
    const rejectedWeld = { ...mockActiveWeld, status: 'rejected' }
    const { container } = render(<FieldWeldRow fieldWeld={rejectedWeld as any} />)

    // Should have opacity or gray class
    expect(container.querySelector('.opacity-50') || container.querySelector('.text-gray-400')).toBeInTheDocument()
  })
})
