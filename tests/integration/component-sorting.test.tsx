import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useComponentSort } from '@/hooks/useComponentSort'
import type { Database } from '@/types/database.types'

type Component = Database['public']['Tables']['components']['Row'] & {
  drawing?: { drawing_no_norm: string } | null;
  area?: { name: string } | null;
  system?: { name: string } | null;
  test_package?: { name: string } | null;
}

// Mock test data with clear differences for sorting
const mockComponents: Component[] = [
  {
    id: '1',
    identity_key: { drawing_norm: 'B', commodity_code: '001', size: '2', seq: 1 },
    percent_complete: 75,
    component_type: 'spool',
    project_id: 'proj-1',
    created_at: '2025-01-01',
    last_updated_at: '2025-01-01',
    is_retired: false,
    current_milestones: {},
    drawing_id: null,
    last_updated_by: null,
    drawing: { drawing_no_norm: 'PW-002' },
  },
  {
    id: '2',
    identity_key: { drawing_norm: 'A', commodity_code: '001', size: '2', seq: 1 },
    percent_complete: 50,
    component_type: 'field_weld',
    project_id: 'proj-1',
    created_at: '2025-01-01',
    last_updated_at: '2025-01-01',
    is_retired: false,
    current_milestones: {},
    drawing_id: null,
    last_updated_by: null,
    drawing: { drawing_no_norm: 'PW-001' },
  },
  {
    id: '3',
    identity_key: { drawing_norm: 'C', commodity_code: '001', size: '2', seq: 1 },
    percent_complete: 100,
    component_type: 'spool',
    project_id: 'proj-1',
    created_at: '2025-01-01',
    last_updated_at: '2025-01-01',
    is_retired: false,
    current_milestones: {},
    drawing_id: null,
    last_updated_by: null,
    drawing: { drawing_no_norm: 'PW-003' },
  },
]

describe('Component Sorting Integration', () => {
  it('sorts components by progress in ascending and descending order', () => {
    const { result } = renderHook(() => useComponentSort())

    // Initial state - default sort by identity_key ascending
    expect(result.current.sortField).toBe('identity_key')
    expect(result.current.sortDirection).toBe('asc')

    // Initial sort by identity_key (A -> B -> C based on JSON stringify)
    let sorted = result.current.sortComponents(mockComponents)
    expect(sorted[0].identity_key.drawing_norm).toBe('A')
    expect(sorted[1].identity_key.drawing_norm).toBe('B')
    expect(sorted[2].identity_key.drawing_norm).toBe('C')

    // Sort by progress ascending (50% -> 75% -> 100%)
    act(() => {
      result.current.handleSort('percent_complete', 'asc')
    })

    expect(result.current.sortField).toBe('percent_complete')
    expect(result.current.sortDirection).toBe('asc')

    sorted = result.current.sortComponents(mockComponents)
    expect(sorted[0].percent_complete).toBe(50) // Component 2
    expect(sorted[1].percent_complete).toBe(75) // Component 1
    expect(sorted[2].percent_complete).toBe(100) // Component 3

    // Sort by progress descending (100% -> 75% -> 50%)
    act(() => {
      result.current.handleSort('percent_complete', 'desc')
    })

    expect(result.current.sortField).toBe('percent_complete')
    expect(result.current.sortDirection).toBe('desc')

    sorted = result.current.sortComponents(mockComponents)
    expect(sorted[0].percent_complete).toBe(100) // Component 3
    expect(sorted[1].percent_complete).toBe(75) // Component 1
    expect(sorted[2].percent_complete).toBe(50) // Component 2
  })

  it('sorts components by identity_key in ascending and descending order', () => {
    const { result } = renderHook(() => useComponentSort())

    // Sort by identity_key ascending (A -> B -> C)
    act(() => {
      result.current.handleSort('identity_key', 'asc')
    })

    let sorted = result.current.sortComponents(mockComponents)
    expect(sorted[0].identity_key.drawing_norm).toBe('A')
    expect(sorted[1].identity_key.drawing_norm).toBe('B')
    expect(sorted[2].identity_key.drawing_norm).toBe('C')

    // Sort by identity_key descending (C -> B -> A)
    act(() => {
      result.current.handleSort('identity_key', 'desc')
    })

    sorted = result.current.sortComponents(mockComponents)
    expect(sorted[0].identity_key.drawing_norm).toBe('C')
    expect(sorted[1].identity_key.drawing_norm).toBe('B')
    expect(sorted[2].identity_key.drawing_norm).toBe('A')
  })

  it('sorts components by drawing in ascending and descending order', () => {
    const { result } = renderHook(() => useComponentSort())

    // Sort by drawing ascending (PW-001 -> PW-002 -> PW-003)
    act(() => {
      result.current.handleSort('drawing', 'asc')
    })

    let sorted = result.current.sortComponents(mockComponents)
    expect(sorted[0].drawing?.drawing_no_norm).toBe('PW-001')
    expect(sorted[1].drawing?.drawing_no_norm).toBe('PW-002')
    expect(sorted[2].drawing?.drawing_no_norm).toBe('PW-003')

    // Sort by drawing descending (PW-003 -> PW-002 -> PW-001)
    act(() => {
      result.current.handleSort('drawing', 'desc')
    })

    sorted = result.current.sortComponents(mockComponents)
    expect(sorted[0].drawing?.drawing_no_norm).toBe('PW-003')
    expect(sorted[1].drawing?.drawing_no_norm).toBe('PW-002')
    expect(sorted[2].drawing?.drawing_no_norm).toBe('PW-001')
  })

  it('handles components without drawing data', () => {
    const componentsWithoutDrawing = [
      ...mockComponents,
      {
        ...mockComponents[0],
        id: '4',
        drawing: null,
      },
    ]

    const { result } = renderHook(() => useComponentSort())

    act(() => {
      result.current.handleSort('drawing', 'asc')
    })

    const sorted = result.current.sortComponents(componentsWithoutDrawing)

    // Component without drawing should sort to the beginning (empty string sorts first)
    expect(sorted.length).toBe(4)
    expect(sorted.some(c => c.id === '4')).toBe(true)
    expect(sorted[0].drawing).toBeNull()
  })

  it('maintains stable sort for equal values', () => {
    const componentsWithEqualProgress = [
      {
        ...mockComponents[0],
        id: 'a',
        percent_complete: 50,
      },
      {
        ...mockComponents[1],
        id: 'b',
        percent_complete: 50,
      },
      {
        ...mockComponents[2],
        id: 'c',
        percent_complete: 50,
      },
    ]

    const { result } = renderHook(() => useComponentSort())

    act(() => {
      result.current.handleSort('percent_complete', 'asc')
    })

    const sorted1 = result.current.sortComponents(componentsWithEqualProgress)
    const sorted2 = result.current.sortComponents(componentsWithEqualProgress)

    // Order should be consistent across multiple sorts
    expect(sorted1.map(c => c.id)).toEqual(sorted2.map(c => c.id))
  })
})
