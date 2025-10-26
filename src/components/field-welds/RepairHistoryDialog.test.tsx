/**
 * Unit Tests: RepairHistoryDialog Component (T043)
 * Tests timeline display of repair chain
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RepairHistoryDialog } from './RepairHistoryDialog'

vi.mock('@/hooks/useRepairHistory', () => ({
  useRepairHistory: () => ({
    data: [
      {
        id: 'weld-1',
        weld_type: 'BW',
        weld_size: '2"',
        spec: 'HC05',
        welder: { stencil: 'K-07', name: 'John Smith' },
        date_welded: '2024-01-15',
        nde_result: 'FAIL',
        nde_notes: 'Porosity detected',
        status: 'rejected',
        is_repair: false,
      },
      {
        id: 'weld-2',
        weld_type: 'BW',
        weld_size: '2"',
        spec: 'HC05',
        welder: { stencil: 'R-05', name: 'Jane Doe' },
        date_welded: '2024-01-20',
        nde_result: 'PASS',
        status: 'accepted',
        is_repair: true,
      },
    ],
  }),
}))

describe('RepairHistoryDialog', () => {
  it('shows timeline layout with original weld', () => {
    render(
      <RepairHistoryDialog
        open={true}
        onOpenChange={vi.fn()}
        fieldWeldId="weld-1"
      />
    )

    expect(screen.getByText(/original weld/i)).toBeInTheDocument()
  })

  it('displays all fields for original weld', () => {
    render(
      <RepairHistoryDialog
        open={true}
        onOpenChange={vi.fn()}
        fieldWeldId="weld-1"
      />
    )

    expect(screen.getByText('K-07')).toBeInTheDocument()
    expect(screen.getByText('John Smith')).toBeInTheDocument()
    expect(screen.getByText(/2024-01-15/)).toBeInTheDocument()
    expect(screen.getByText(/FAIL/)).toBeInTheDocument()
    expect(screen.getByText(/Porosity detected/)).toBeInTheDocument()
  })

  it('shows arrow separators between welds', () => {
    const { container } = render(
      <RepairHistoryDialog
        open={true}
        onOpenChange={vi.fn()}
        fieldWeldId="weld-1"
      />
    )

    // Check for arrow/separator element
    expect(container.textContent).toContain('↓')
  })

  it('displays all repairs in order', () => {
    render(
      <RepairHistoryDialog
        open={true}
        onOpenChange={vi.fn()}
        fieldWeldId="weld-1"
      />
    )

    expect(screen.getByText('R-05')).toBeInTheDocument()
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('summary footer shows correct counts', () => {
    render(
      <RepairHistoryDialog
        open={true}
        onOpenChange={vi.fn()}
        fieldWeldId="weld-1"
      />
    )

    expect(screen.getByText(/total attempts/i)).toBeInTheDocument()
    expect(screen.getByText(/2/)).toBeInTheDocument() // 2 attempts
  })

  it('final status badge is correct', () => {
    render(
      <RepairHistoryDialog
        open={true}
        onOpenChange={vi.fn()}
        fieldWeldId="weld-1"
      />
    )

    expect(screen.getByText(/final status/i)).toBeInTheDocument()
    expect(screen.getByText(/accepted/i)).toBeInTheDocument()
  })
})
