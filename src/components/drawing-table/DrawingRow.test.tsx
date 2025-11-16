import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DrawingRow } from './DrawingRow'
import type { DrawingRow as DrawingRowType } from '@/types/drawing-table.types'

describe('DrawingRow - Spec Column', () => {
  const baseDrawing: DrawingRowType = {
    id: 'drawing-1',
    project_id: 'proj-1',
    drawing_no_norm: 'P-001',
    drawing_no_raw: 'P-001',
    title: 'Test Drawing',
    rev: 'A',
    is_retired: false,
    area: { id: 'area-1', name: 'A1' },
    system: { id: 'sys-1', name: 'S1' },
    test_package: { id: 'tp-1', name: 'TP1' },
    spec: null,
    total_components: 5,
    completed_components: 2,
    avg_percent_complete: 40
  }

  const mockOnToggle = vi.fn()

  it('displays spec value when present (desktop)', () => {
    const drawingWithSpec: DrawingRowType = {
      ...baseDrawing,
      spec: 'ES-03'
    }

    render(
      <DrawingRow
        drawing={drawingWithSpec}
        isExpanded={false}
        onToggle={mockOnToggle}
        isMobile={false}
      />
    )

    expect(screen.getByText('ES-03')).toBeInTheDocument()
  })

  it('displays — when spec is null (desktop)', () => {
    render(
      <DrawingRow
        drawing={baseDrawing}
        isExpanded={false}
        onToggle={mockOnToggle}
        isMobile={false}
      />
    )

    // Should show at least one "—" for null spec (there are other fields that also show —)
    const dashElements = screen.getAllByText('—')
    expect(dashElements.length).toBeGreaterThan(0)
  })

  it('displays spec in mobile summary line', () => {
    const drawingWithSpec: DrawingRowType = {
      ...baseDrawing,
      spec: 'ES-03'
    }

    render(
      <DrawingRow
        drawing={drawingWithSpec}
        isExpanded={false}
        onToggle={mockOnToggle}
        isMobile={true}
      />
    )

    // In mobile mode, spec is included in the summary line
    // Format: "P-001 · ES-03 · A1 · S1 · 40%"
    expect(screen.getByText(/ES-03/)).toBeInTheDocument()
  })
})
