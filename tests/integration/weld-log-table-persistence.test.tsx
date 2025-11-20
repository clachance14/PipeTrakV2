import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WeldLogTable } from '@/components/weld-log/WeldLogTable'
import { useWeldLogPreferencesStore } from '@/stores/useWeldLogPreferencesStore'
import type { EnrichedFieldWeld } from '@/hooks/useFieldWelds'

// Mock welds
const mockWelds: EnrichedFieldWeld[] = [
  {
    id: 'weld-1',
    identityDisplay: '5',
    drawing: { id: 'drawing-1', drawing_no_norm: 'N-26C07' },
    welder: null,
    date_welded: null,
    weld_type: 'socket',
    weld_size: '1"',
    status: 'active',
    component: { id: 'comp-1', percent_complete: 0 },
  } as EnrichedFieldWeld,
  {
    id: 'weld-2',
    identityDisplay: '14',
    drawing: { id: 'drawing-2', drawing_no_norm: 'N-26F07' },
    welder: null,
    date_welded: null,
    weld_type: 'socket',
    weld_size: '1"',
    status: 'active',
    component: { id: 'comp-2', percent_complete: 0 },
  } as EnrichedFieldWeld,
]

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

describe('WeldLogTable - Store Integration', () => {
  beforeEach(() => {
    localStorage.clear()
    // Reset store to defaults
    const { setSortColumn, setSortDirection } = useWeldLogPreferencesStore.getState()
    setSortColumn('weld_id')
    setSortDirection('asc')
  })

  it('should use store for initial sort state', () => {
    render(<WeldLogTable welds={mockWelds} />)

    // Should be sorted by weld_id asc (5, 14)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('5')
    expect(rows[2]).toHaveTextContent('14')
  })

  it('should update store when column header clicked', () => {
    render(<WeldLogTable welds={mockWelds} />)

    const weldIdHeader = screen.getByRole('button', { name: /weld id/i })

    // Click to toggle (should go to desc)
    fireEvent.click(weldIdHeader)

    const store = useWeldLogPreferencesStore.getState()
    expect(store.sortColumn).toBe('weld_id')
    expect(store.sortDirection).toBe('desc')
  })

  it('should respect store state from localStorage', () => {
    // Pre-set store to drawing desc
    const { setSortColumn, setSortDirection } = useWeldLogPreferencesStore.getState()
    setSortColumn('drawing')
    setSortDirection('desc')

    render(<WeldLogTable welds={mockWelds} />)

    // Should be sorted by drawing desc (N-26F07, N-26C07)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('N-26F07')
    expect(rows[2]).toHaveTextContent('N-26C07')
  })

  it('should sort null-date welds by weld_id when sorting by date', () => {
    // Create welds with mix of dates and null dates
    const weldsWithMixedDates: EnrichedFieldWeld[] = [
      {
        id: 'weld-1',
        identityDisplay: '41',
        drawing: { id: 'drawing-1', drawing_no_norm: 'P-26E11' },
        welder: null,
        date_welded: null,
        weld_type: 'butt',
        weld_size: '3"',
        status: 'active',
        component: { id: 'comp-1', percent_complete: 0 },
      } as EnrichedFieldWeld,
      {
        id: 'weld-2',
        identityDisplay: '5',
        drawing: { id: 'drawing-2', drawing_no_norm: 'N-26C07' },
        welder: null,
        date_welded: null,
        weld_type: 'socket',
        weld_size: '1"',
        status: 'active',
        component: { id: 'comp-2', percent_complete: 0 },
      } as EnrichedFieldWeld,
      {
        id: 'weld-3',
        identityDisplay: '64',
        drawing: { id: 'drawing-3', drawing_no_norm: 'V-26B01.1' },
        welder: { id: 'welder-1', stencil: 'G-75', name: 'Jesus Gutierrez' },
        date_welded: '2025-11-12',
        weld_type: 'butt',
        weld_size: '3"',
        status: 'active',
        component: { id: 'comp-3', percent_complete: 70 },
      } as EnrichedFieldWeld,
      {
        id: 'weld-4',
        identityDisplay: '100',
        drawing: { id: 'drawing-4', drawing_no_norm: 'P-26G01' },
        welder: null,
        date_welded: null,
        weld_type: 'butt',
        weld_size: '2"',
        status: 'active',
        component: { id: 'comp-4', percent_complete: 0 },
      } as EnrichedFieldWeld,
    ]

    // Set sort to date_welded ascending
    const { setSortColumn, setSortDirection } = useWeldLogPreferencesStore.getState()
    setSortColumn('date_welded')
    setSortDirection('asc')

    render(<WeldLogTable welds={weldsWithMixedDates} />)

    const rows = screen.getAllByRole('row')

    // First row: weld with date (64 - 2025-11-12)
    expect(rows[1]).toHaveTextContent('64')

    // Next rows: null dates sorted by weld_id (5, 41, 100)
    expect(rows[2]).toHaveTextContent('5')
    expect(rows[3]).toHaveTextContent('41')
    expect(rows[4]).toHaveTextContent('100')
  })
})
