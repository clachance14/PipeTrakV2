import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWeldLogPreferencesStore } from '@/stores/useWeldLogPreferencesStore'

describe('useWeldLogPreferencesStore', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Reset the store to default state by calling clearAllFilters and resetting sort
    const store = useWeldLogPreferencesStore.getState()
    store.clearAllFilters()
    store.setSortColumn('weld_id')
    store.setSortDirection('asc')
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useWeldLogPreferencesStore())

    expect(result.current.sortColumn).toBe('weld_id')
    expect(result.current.sortDirection).toBe('asc')
    expect(result.current.drawingFilter).toBe('all')
    expect(result.current.welderFilter).toBe('all')
    expect(result.current.statusFilter).toBe('all')
    expect(result.current.packageFilter).toBe('all')
    expect(result.current.systemFilter).toBe('all')
    expect(result.current.searchTerm).toBe('')
  })

  it('should toggle sort - same column flips direction', () => {
    const { result } = renderHook(() => useWeldLogPreferencesStore())

    // Initial state: weld_id asc
    expect(result.current.sortColumn).toBe('weld_id')
    expect(result.current.sortDirection).toBe('asc')

    // Toggle same column
    act(() => {
      result.current.toggleSort('weld_id')
    })

    expect(result.current.sortColumn).toBe('weld_id')
    expect(result.current.sortDirection).toBe('desc')

    // Toggle again
    act(() => {
      result.current.toggleSort('weld_id')
    })

    expect(result.current.sortDirection).toBe('asc')
  })

  it('should toggle sort - new column sets to asc', () => {
    const { result } = renderHook(() => useWeldLogPreferencesStore())

    // Toggle to different column
    act(() => {
      result.current.toggleSort('drawing')
    })

    expect(result.current.sortColumn).toBe('drawing')
    expect(result.current.sortDirection).toBe('asc')
  })

  it('should update filter values', () => {
    const { result } = renderHook(() => useWeldLogPreferencesStore())

    act(() => {
      result.current.setDrawingFilter('drawing-123')
      result.current.setWelderFilter('welder-456')
      result.current.setStatusFilter('active')
      result.current.setSearchTerm('test search')
    })

    expect(result.current.drawingFilter).toBe('drawing-123')
    expect(result.current.welderFilter).toBe('welder-456')
    expect(result.current.statusFilter).toBe('active')
    expect(result.current.searchTerm).toBe('test search')
  })

  it('should clear all filters', () => {
    const { result } = renderHook(() => useWeldLogPreferencesStore())

    // Set some filters
    act(() => {
      result.current.setDrawingFilter('drawing-123')
      result.current.setWelderFilter('welder-456')
      result.current.setStatusFilter('active')
      result.current.setSearchTerm('test')
    })

    // Clear all
    act(() => {
      result.current.clearAllFilters()
    })

    expect(result.current.drawingFilter).toBe('all')
    expect(result.current.welderFilter).toBe('all')
    expect(result.current.statusFilter).toBe('all')
    expect(result.current.packageFilter).toBe('all')
    expect(result.current.systemFilter).toBe('all')
    expect(result.current.searchTerm).toBe('')
  })

  it('should persist state to localStorage', () => {
    const { result } = renderHook(() => useWeldLogPreferencesStore())

    act(() => {
      result.current.toggleSort('drawing')
      result.current.setStatusFilter('active')
    })

    // Check localStorage
    const stored = localStorage.getItem('pipetrak:weld-log-preferences')
    expect(stored).toBeTruthy()

    const parsed = JSON.parse(stored!)
    expect(parsed.state.sortColumn).toBe('drawing')
    expect(parsed.state.statusFilter).toBe('active')
  })

  it('should have correct localStorage structure', () => {
    const { result } = renderHook(() => useWeldLogPreferencesStore())

    // Set some state
    act(() => {
      result.current.toggleSort('welder')
      result.current.setDrawingFilter('drawing-789')
      result.current.setSearchTerm('test')
    })

    // Verify localStorage structure
    const stored = localStorage.getItem('pipetrak:weld-log-preferences')
    expect(stored).toBeTruthy()

    const parsed = JSON.parse(stored!)
    expect(parsed).toHaveProperty('state')
    expect(parsed).toHaveProperty('version')
    expect(parsed.state).toHaveProperty('sortColumn')
    expect(parsed.state).toHaveProperty('sortDirection')
    expect(parsed.state).toHaveProperty('drawingFilter')
    expect(parsed.state).toHaveProperty('welderFilter')
    expect(parsed.state).toHaveProperty('statusFilter')
    expect(parsed.state).toHaveProperty('packageFilter')
    expect(parsed.state).toHaveProperty('systemFilter')
    expect(parsed.state).toHaveProperty('searchTerm')
  })
})
