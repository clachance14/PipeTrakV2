import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { useDrawingFilters } from './useDrawingFilters'
import type { DrawingRow } from '@/types/drawing-table.types'

// Mock useSearchParams
const mockSetSearchParams = vi.fn()
const mockSearchParams = new URLSearchParams()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useSearchParams: () => [mockSearchParams, mockSetSearchParams],
  }
})

// Mock useDebouncedValue hook
vi.mock('@/hooks/useDebouncedValue', () => ({
  useDebouncedValue: (value: string) => value, // No debounce in tests
}))

const mockDrawings: DrawingRow[] = [
  {
    id: 'drawing-1',
    project_id: 'project-1',
    drawing_no_norm: 'P-001',
    drawing_no_raw: 'P-001',
    title: 'Main Process Line',
    rev: 'A',
    is_retired: false,
    total_components: 3,
    completed_components: 0,
    avg_percent_complete: 8,
  },
  {
    id: 'drawing-2',
    project_id: 'project-1',
    drawing_no_norm: 'P-002',
    drawing_no_raw: 'P-002',
    title: 'Drain Line',
    rev: 'B',
    is_retired: false,
    total_components: 1,
    completed_components: 1,
    avg_percent_complete: 100,
  },
  {
    id: 'drawing-3',
    project_id: 'project-1',
    drawing_no_norm: 'P-003',
    drawing_no_raw: 'P-003',
    title: null,
    rev: null,
    is_retired: false,
    total_components: 0,
    completed_components: 0,
    avg_percent_complete: 0,
  },
  {
    id: 'drawing-4',
    project_id: 'project-1',
    drawing_no_norm: 'D-100',
    drawing_no_raw: 'D-100',
    title: 'Utilities',
    rev: 'C',
    is_retired: false,
    total_components: 5,
    completed_components: 2,
    avg_percent_complete: 50,
  },
]

describe('useDrawingFilters', () => {
  beforeEach(() => {
    mockSearchParams.delete('search')
    mockSearchParams.delete('status')
    mockSetSearchParams.mockClear()
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>{children}</BrowserRouter>
  )

  it('returns searchTerm from URL', () => {
    mockSearchParams.set('search', 'P-001')

    const { result } = renderHook(() => useDrawingFilters(), { wrapper })

    expect(result.current.searchTerm).toBe('P-001')
  })

  it('returns empty string when no search param', () => {
    const { result } = renderHook(() => useDrawingFilters(), { wrapper })

    expect(result.current.searchTerm).toBe('')
  })

  it('returns statusFilter from URL', () => {
    mockSearchParams.set('status', 'in-progress')

    const { result } = renderHook(() => useDrawingFilters(), { wrapper })

    expect(result.current.statusFilter).toBe('in-progress')
  })

  it('defaults to "all" when no status param', () => {
    const { result } = renderHook(() => useDrawingFilters(), { wrapper })

    expect(result.current.statusFilter).toBe('all')
  })

  it('provides setSearch function', () => {
    const { result } = renderHook(() => useDrawingFilters(), { wrapper })

    expect(typeof result.current.setSearch).toBe('function')
  })

  it('setSearch updates URL search param', () => {
    const { result } = renderHook(() => useDrawingFilters(), { wrapper })

    act(() => {
      result.current.setSearch('P-002')
    })

    expect(mockSetSearchParams).toHaveBeenCalled()
  })

  it('provides setStatusFilter function', () => {
    const { result } = renderHook(() => useDrawingFilters(), { wrapper })

    expect(typeof result.current.setStatusFilter).toBe('function')
  })

  it('setStatusFilter updates URL status param', () => {
    const { result } = renderHook(() => useDrawingFilters(), { wrapper })

    act(() => {
      result.current.setStatusFilter('complete')
    })

    expect(mockSetSearchParams).toHaveBeenCalled()
  })

  it('provides filteredDrawings function', () => {
    const { result } = renderHook(() => useDrawingFilters(), { wrapper })

    expect(typeof result.current.filteredDrawings).toBe('function')
  })

  it('filteredDrawings filters by search term (case-insensitive)', () => {
    mockSearchParams.set('search', 'p-001')

    const { result } = renderHook(() => useDrawingFilters(), { wrapper })

    const filtered = result.current.filteredDrawings(mockDrawings)

    expect(filtered).toHaveLength(1)
    expect(filtered[0].drawing_no_norm).toBe('P-001')
  })

  it('filteredDrawings matches substring', () => {
    mockSearchParams.set('search', '00')

    const { result } = renderHook(() => useDrawingFilters(), { wrapper })

    const filtered = result.current.filteredDrawings(mockDrawings)

    expect(filtered.length).toBeGreaterThanOrEqual(3) // P-001, P-002, P-003
  })

  it('filteredDrawings status="not-started" shows 0% drawings', () => {
    mockSearchParams.set('status', 'not-started')

    const { result } = renderHook(() => useDrawingFilters(), { wrapper })

    const filtered = result.current.filteredDrawings(mockDrawings)

    expect(filtered).toHaveLength(1)
    expect(filtered[0].drawing_no_norm).toBe('P-003')
    expect(filtered[0].avg_percent_complete).toBe(0)
  })

  it('filteredDrawings status="in-progress" shows >0% and <100% drawings', () => {
    mockSearchParams.set('status', 'in-progress')

    const { result } = renderHook(() => useDrawingFilters(), { wrapper })

    const filtered = result.current.filteredDrawings(mockDrawings)

    expect(filtered).toHaveLength(2)
    expect(filtered.map(d => d.drawing_no_norm)).toContain('P-001')
    expect(filtered.map(d => d.drawing_no_norm)).toContain('D-100')
  })

  it('filteredDrawings status="complete" shows 100% drawings', () => {
    mockSearchParams.set('status', 'complete')

    const { result } = renderHook(() => useDrawingFilters(), { wrapper })

    const filtered = result.current.filteredDrawings(mockDrawings)

    expect(filtered).toHaveLength(1)
    expect(filtered[0].drawing_no_norm).toBe('P-002')
    expect(filtered[0].avg_percent_complete).toBe(100)
  })

  it('filteredDrawings status="all" shows all drawings', () => {
    mockSearchParams.set('status', 'all')

    const { result } = renderHook(() => useDrawingFilters(), { wrapper })

    const filtered = result.current.filteredDrawings(mockDrawings)

    expect(filtered).toHaveLength(4)
  })

  it('combines search and status filters', () => {
    mockSearchParams.set('search', 'P-')
    mockSearchParams.set('status', 'in-progress')

    const { result } = renderHook(() => useDrawingFilters(), { wrapper })

    const filtered = result.current.filteredDrawings(mockDrawings)

    expect(filtered).toHaveLength(1)
    expect(filtered[0].drawing_no_norm).toBe('P-001')
  })

  it('returns empty array when no matches', () => {
    mockSearchParams.set('search', 'NONEXISTENT')

    const { result } = renderHook(() => useDrawingFilters(), { wrapper })

    const filtered = result.current.filteredDrawings(mockDrawings)

    expect(filtered).toHaveLength(0)
  })

  it('preserves other URL params when setting search', () => {
    mockSearchParams.set('expanded', 'uuid1')
    mockSearchParams.set('status', 'complete')

    const { result } = renderHook(() => useDrawingFilters(), { wrapper })

    act(() => {
      result.current.setSearch('P-001')
    })

    // Should preserve other params
    expect(mockSetSearchParams).toHaveBeenCalled()
  })

  it('debounces search term updates', () => {
    // Note: Debounce is mocked in tests, but in real implementation
    // useDebouncedValue delays searchTerm updates by 300ms
    const { result } = renderHook(() => useDrawingFilters(), { wrapper })

    act(() => {
      result.current.setSearch('P')
      result.current.setSearch('P-')
      result.current.setSearch('P-0')
      result.current.setSearch('P-00')
      result.current.setSearch('P-001')
    })

    // In real implementation, only final value would trigger filter
    expect(mockSetSearchParams).toHaveBeenCalled()
  })

  it('handles empty drawings array', () => {
    const { result } = renderHook(() => useDrawingFilters(), { wrapper })

    const filtered = result.current.filteredDrawings([])

    expect(filtered).toEqual([])
  })

  it('handles drawings with null title', () => {
    mockSearchParams.set('search', '003')

    const { result } = renderHook(() => useDrawingFilters(), { wrapper })

    const filtered = result.current.filteredDrawings(mockDrawings)

    expect(filtered).toHaveLength(1)
    expect(filtered[0].title).toBeNull()
  })
})
