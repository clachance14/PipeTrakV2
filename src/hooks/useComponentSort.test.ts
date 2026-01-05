import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useComponentSort } from './useComponentSort'
import { useComponentPreferencesStore } from '@/stores/useComponentPreferencesStore'

// Mock the store
vi.mock('@/stores/useComponentPreferencesStore')

describe('useComponentSort', () => {
  let mockStore: any

  beforeEach(() => {
    // Reset mock before each test
    vi.clearAllMocks()

    // Setup default mock implementation
    mockStore = {
      sortRules: [{ field: 'identity_key', direction: 'asc' }],
      addSortRule: vi.fn(),
      removeSortRule: vi.fn(),
      clearSortRules: vi.fn(),
      setSortRules: vi.fn(),
    }
    vi.mocked(useComponentPreferencesStore).mockReturnValue(mockStore)
  })

  it('initializes with identity_key ascending sort from store', () => {
    const { result } = renderHook(() => useComponentSort())

    expect(result.current.sortRules).toEqual([{ field: 'identity_key', direction: 'asc' }])
    expect(result.current.getSortInfo('identity_key')).toEqual({
      direction: 'asc',
      priority: 1,
    })
  })

  it('sorts by identity_key ascending - groups by line number', () => {
    const { result } = renderHook(() => useComponentSort())

    const components = [
      { id: '1', identity_key: { commodity_code: 'G4G-1450-10AA', size: '2', seq: 1 }, component_type: 'support', percent_complete: 50 },
      { id: '2', identity_key: { commodity_code: 'G4G-1425-05AA', size: '2', seq: 1 }, component_type: 'support', percent_complete: 75 },
      { id: '3', identity_key: { commodity_code: 'G4G-1430-05AB', size: '2', seq: 1 }, component_type: 'support', percent_complete: 60 },
    ] as any[]

    const sorted = result.current.sortComponents(components)

    // Line number sorting: 1425 < 1430 < 1450
    expect(sorted[0].id).toBe('2') // 1425
    expect(sorted[1].id).toBe('3') // 1430
    expect(sorted[2].id).toBe('1') // 1450
  })

  it('sorts by identity_key descending - reverses line number order', () => {
    mockStore.sortRules = [{ field: 'identity_key', direction: 'desc' }]
    const { result } = renderHook(() => useComponentSort())

    const components = [
      { id: '1', identity_key: { commodity_code: 'G4G-1425-05AA', size: '2', seq: 1 }, component_type: 'support', percent_complete: 50 },
      { id: '2', identity_key: { commodity_code: 'G4G-1450-10AA', size: '2', seq: 1 }, component_type: 'support', percent_complete: 75 },
      { id: '3', identity_key: { commodity_code: 'G4G-1430-05AB', size: '2', seq: 1 }, component_type: 'support', percent_complete: 60 },
    ] as any[]

    const sorted = result.current.sortComponents(components)

    // Descending: 1450 > 1430 > 1425
    expect(sorted[0].id).toBe('2') // 1450
    expect(sorted[1].id).toBe('3') // 1430
    expect(sorted[2].id).toBe('1') // 1425
  })

  it('sorts by percent_complete numerically', () => {
    mockStore.sortRules = [{ field: 'percent_complete', direction: 'asc' }]
    const { result } = renderHook(() => useComponentSort())

    const components = [
      { id: '1', identity_key: {}, component_type: 'support', percent_complete: 75 },
      { id: '2', identity_key: {}, component_type: 'support', percent_complete: 10 },
      { id: '3', identity_key: {}, component_type: 'support', percent_complete: 95 },
    ] as any[]

    const sorted = result.current.sortComponents(components)

    expect(sorted[0].percent_complete).toBe(10)
    expect(sorted[1].percent_complete).toBe(75)
    expect(sorted[2].percent_complete).toBe(95)
  })

  it('sorts by drawing alphabetically', () => {
    mockStore.sortRules = [{ field: 'drawing', direction: 'asc' }]
    const { result } = renderHook(() => useComponentSort())

    const components = [
      { id: '1', identity_key: {}, component_type: 'support', percent_complete: 0, drawing: { drawing_no_norm: 'PW-002' } },
      { id: '2', identity_key: {}, component_type: 'support', percent_complete: 0, drawing: { drawing_no_norm: 'PW-001' } },
      { id: '3', identity_key: {}, component_type: 'support', percent_complete: 0, drawing: null },
    ] as any[]

    const sorted = result.current.sortComponents(components)

    expect(sorted[0].id).toBe('3') // null/empty sorts first
    expect(sorted[1].drawing?.drawing_no_norm).toBe('PW-001')
    expect(sorted[2].drawing?.drawing_no_norm).toBe('PW-002')
  })

  it('sorts by area alphabetically with null handling', () => {
    mockStore.sortRules = [{ field: 'area', direction: 'asc' }]
    const { result } = renderHook(() => useComponentSort())

    const components = [
      { id: '1', identity_key: {}, component_type: 'support', percent_complete: 0, area: { name: 'A3' } },
      { id: '2', identity_key: {}, component_type: 'support', percent_complete: 0, area: { name: 'A1' } },
      { id: '3', identity_key: {}, component_type: 'support', percent_complete: 0, area: null },
    ] as any[]

    const sorted = result.current.sortComponents(components)

    expect(sorted[0].id).toBe('3') // null sorts first
    expect(sorted[1].area?.name).toBe('A1')
    expect(sorted[2].area?.name).toBe('A3')
  })

  it('sorts by system alphabetically with null handling', () => {
    mockStore.sortRules = [{ field: 'system', direction: 'asc' }]
    const { result } = renderHook(() => useComponentSort())

    const components = [
      { id: '1', identity_key: {}, component_type: 'support', percent_complete: 0, system: { name: 'System B' } },
      { id: '2', identity_key: {}, component_type: 'support', percent_complete: 0, system: { name: 'System A' } },
      { id: '3', identity_key: {}, component_type: 'support', percent_complete: 0, system: null },
    ] as any[]

    const sorted = result.current.sortComponents(components)

    expect(sorted[0].id).toBe('3') // null sorts first
    expect(sorted[1].system?.name).toBe('System A')
    expect(sorted[2].system?.name).toBe('System B')
  })

  it('sorts by test_package alphabetically with null handling', () => {
    mockStore.sortRules = [{ field: 'test_package', direction: 'asc' }]
    const { result } = renderHook(() => useComponentSort())

    const components = [
      { id: '1', identity_key: {}, component_type: 'support', percent_complete: 0, test_package: { name: 'Package C' } },
      { id: '2', identity_key: {}, component_type: 'support', percent_complete: 0, test_package: { name: 'Package A' } },
      { id: '3', identity_key: {}, component_type: 'support', percent_complete: 0, test_package: null },
    ] as any[]

    const sorted = result.current.sortComponents(components)

    expect(sorted[0].id).toBe('3') // null sorts first
    expect(sorted[1].test_package?.name).toBe('Package A')
    expect(sorted[2].test_package?.name).toBe('Package C')
  })

  describe('multi-sort functionality', () => {
    it('sorts by multiple columns with proper priority', () => {
      mockStore.sortRules = [
        { field: 'area', direction: 'asc' },
        { field: 'percent_complete', direction: 'desc' },
      ]
      const { result } = renderHook(() => useComponentSort())

      const components = [
        { id: '1', identity_key: {}, component_type: 'support', area: { name: 'A1' }, percent_complete: 50 },
        { id: '2', identity_key: {}, component_type: 'support', area: { name: 'A1' }, percent_complete: 90 },
        { id: '3', identity_key: {}, component_type: 'support', area: { name: 'A2' }, percent_complete: 70 },
        { id: '4', identity_key: {}, component_type: 'support', area: { name: 'A1' }, percent_complete: 20 },
      ] as any[]

      const sorted = result.current.sortComponents(components)

      // First by area (A1 < A2), then by percent_complete descending
      expect(sorted[0].id).toBe('2') // A1, 90%
      expect(sorted[1].id).toBe('1') // A1, 50%
      expect(sorted[2].id).toBe('4') // A1, 20%
      expect(sorted[3].id).toBe('3') // A2, 70%
    })

    it('handles up to 3 sort rules', () => {
      mockStore.sortRules = [
        { field: 'area', direction: 'asc' },
        { field: 'system', direction: 'asc' },
        { field: 'percent_complete', direction: 'desc' },
      ]
      const { result } = renderHook(() => useComponentSort())

      const components = [
        { id: '1', identity_key: {}, component_type: 'support', area: { name: 'A1' }, system: { name: 'S1' }, percent_complete: 50 },
        { id: '2', identity_key: {}, component_type: 'support', area: { name: 'A1' }, system: { name: 'S1' }, percent_complete: 90 },
        { id: '3', identity_key: {}, component_type: 'support', area: { name: 'A1' }, system: { name: 'S2' }, percent_complete: 70 },
      ] as any[]

      const sorted = result.current.sortComponents(components)

      // First area, then system, then percent_complete
      expect(sorted[0].id).toBe('2') // A1, S1, 90%
      expect(sorted[1].id).toBe('1') // A1, S1, 50%
      expect(sorted[2].id).toBe('3') // A1, S2, 70%
    })

    it('calls clearSortRules and addSortRule when sorting without Shift', () => {
      const { result } = renderHook(() => useComponentSort())

      act(() => {
        result.current.handleSort('area', 'asc', false)
      })

      expect(mockStore.clearSortRules).toHaveBeenCalledTimes(1)
      expect(mockStore.addSortRule).toHaveBeenCalledWith('area', 'asc')
    })

    it('adds secondary sort rule when Shift+click on different field', () => {
      const { result } = renderHook(() => useComponentSort())

      act(() => {
        result.current.handleSort('area', 'asc', true)
      })

      expect(mockStore.clearSortRules).not.toHaveBeenCalled()
      expect(mockStore.addSortRule).toHaveBeenCalledWith('area', 'asc')
    })

    it('toggles direction when Shift+click on existing field', () => {
      mockStore.sortRules = [
        { field: 'identity_key', direction: 'asc' },
        { field: 'area', direction: 'asc' },
      ]
      const { result } = renderHook(() => useComponentSort())

      act(() => {
        result.current.handleSort('area', 'desc', true)
      })

      expect(mockStore.setSortRules).toHaveBeenCalledWith([
        { field: 'identity_key', direction: 'asc' },
        { field: 'area', direction: 'desc' },
      ])
    })

    it('enforces max 3 sort rules', () => {
      mockStore.sortRules = [
        { field: 'area', direction: 'asc' },
        { field: 'system', direction: 'asc' },
        { field: 'percent_complete', direction: 'desc' },
      ]
      const { result } = renderHook(() => useComponentSort())

      act(() => {
        result.current.handleSort('drawing', 'asc', true)
      })

      // Should not add 4th rule
      expect(mockStore.addSortRule).not.toHaveBeenCalled()
    })

    it('returns correct priority numbers for multi-sort', () => {
      mockStore.sortRules = [
        { field: 'area', direction: 'asc' },
        { field: 'system', direction: 'asc' },
        { field: 'percent_complete', direction: 'desc' },
      ]
      const { result } = renderHook(() => useComponentSort())

      expect(result.current.getSortInfo('area')).toEqual({ direction: 'asc', priority: 1 })
      expect(result.current.getSortInfo('system')).toEqual({ direction: 'asc', priority: 2 })
      expect(result.current.getSortInfo('percent_complete')).toEqual({ direction: 'desc', priority: 3 })
      expect(result.current.getSortInfo('drawing')).toBeNull()
    })

    it('resets to default sort', () => {
      const { result } = renderHook(() => useComponentSort())

      act(() => {
        result.current.resetToDefaultSort()
      })

      expect(mockStore.clearSortRules).toHaveBeenCalledTimes(1)
      expect(mockStore.addSortRule).toHaveBeenCalledWith('identity_key', 'asc')
    })
  })
})
