import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WeldLogFilters } from '@/components/weld-log/WeldLogFilters'
import { useWeldLogPreferencesStore } from '@/stores/useWeldLogPreferencesStore'
import type { EnrichedFieldWeld } from '@/hooks/useFieldWelds'

const mockWelds: EnrichedFieldWeld[] = []
const mockDrawings = [{ id: 'drawing-1', drawing_no_norm: 'N-26C07' }]
const mockWelders = [{ id: 'welder-1', stencil: 'JD', name: 'John Doe' }]
const mockPackages = [{ id: 'pkg-1', name: 'Package 1' }]
const mockSystems = [{ id: 'sys-1', name: 'System 1' }]

describe('WeldLogFilters - Store Integration', () => {
  beforeEach(() => {
    localStorage.clear()
    const store = useWeldLogPreferencesStore.getState()
    store.clearAllFilters()
  })

  it('should use store for initial filter state', () => {
    const onFilteredWeldsChange = vi.fn()

    render(
      <MemoryRouter>
        <WeldLogFilters
          welds={mockWelds}
          drawings={mockDrawings}
          welders={mockWelders}
          testPackages={mockPackages}
          systems={mockSystems}
          onFilteredWeldsChange={onFilteredWeldsChange}
        />
      </MemoryRouter>
    )

    const store = useWeldLogPreferencesStore.getState()
    expect(store.drawingFilter).toBe('all')
    expect(store.welderFilter).toBe('all')
    expect(store.statusFilter).toBe('all')
  })

  it('should update store when filter changed', async () => {
    const onFilteredWeldsChange = vi.fn()

    render(
      <MemoryRouter>
        <WeldLogFilters
          welds={mockWelds}
          drawings={mockDrawings}
          welders={mockWelders}
          testPackages={mockPackages}
          systems={mockSystems}
          onFilteredWeldsChange={onFilteredWeldsChange}
        />
      </MemoryRouter>
    )

    // Expand filters first (mobile collapsed by default)
    const toggleButton = screen.getByRole('button', { name: /show filter controls/i })
    fireEvent.click(toggleButton)

    // Find drawing filter by text content
    const drawingSelect = screen.getByText('All Drawings').closest('button')
    if (!drawingSelect) throw new Error('Drawing select not found')
    fireEvent.click(drawingSelect)

    // Select a drawing
    const drawingOption = await screen.findByText('N-26C07')
    fireEvent.click(drawingOption)

    await waitFor(() => {
      const store = useWeldLogPreferencesStore.getState()
      expect(store.drawingFilter).toBe('drawing-1')
    })
  })

  it('should restore filters from store', () => {
    // Pre-set store
    const { setDrawingFilter, setStatusFilter } = useWeldLogPreferencesStore.getState()
    setDrawingFilter('drawing-1')
    setStatusFilter('active')

    const onFilteredWeldsChange = vi.fn()

    render(
      <MemoryRouter>
        <WeldLogFilters
          welds={mockWelds}
          drawings={mockDrawings}
          welders={mockWelders}
          testPackages={mockPackages}
          systems={mockSystems}
          onFilteredWeldsChange={onFilteredWeldsChange}
        />
      </MemoryRouter>
    )

    // Check that filters are applied
    expect(screen.getByText('N-26C07')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('should clear all filters via store', async () => {
    // Pre-set some filters
    const { setDrawingFilter, setStatusFilter } = useWeldLogPreferencesStore.getState()
    setDrawingFilter('drawing-1')
    setStatusFilter('active')

    const onFilteredWeldsChange = vi.fn()

    render(
      <MemoryRouter>
        <WeldLogFilters
          welds={mockWelds}
          drawings={mockDrawings}
          welders={mockWelders}
          testPackages={mockPackages}
          systems={mockSystems}
          onFilteredWeldsChange={onFilteredWeldsChange}
        />
      </MemoryRouter>
    )

    // Click clear button
    const clearButton = screen.getByRole('button', { name: /clear/i })
    fireEvent.click(clearButton)

    await waitFor(() => {
      const store = useWeldLogPreferencesStore.getState()
      expect(store.drawingFilter).toBe('all')
      expect(store.statusFilter).toBe('all')
    })
  })
})
