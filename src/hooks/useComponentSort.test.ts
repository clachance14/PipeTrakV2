import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useComponentSort } from './useComponentSort'

describe('useComponentSort', () => {
  it('initializes with identity_key ascending sort', () => {
    const { result } = renderHook(() => useComponentSort())

    expect(result.current.sortField).toBe('identity_key')
    expect(result.current.sortDirection).toBe('asc')
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
    const { result } = renderHook(() => useComponentSort())

    // Trigger descending sort
    act(() => {
      result.current.handleSort('identity_key', 'desc')
    })

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
    const { result } = renderHook(() => useComponentSort())

    act(() => {
      result.current.handleSort('percent_complete', 'asc')
    })

    const components = [
      { id: '1', identity_key: {}, percent_complete: 75 },
      { id: '2', identity_key: {}, percent_complete: 10 },
      { id: '3', identity_key: {}, percent_complete: 95 },
    ] as any[]

    const sorted = result.current.sortComponents(components)

    expect(sorted[0].percent_complete).toBe(10)
    expect(sorted[1].percent_complete).toBe(75)
    expect(sorted[2].percent_complete).toBe(95)
  })

  it('sorts by drawing alphabetically', () => {
    const { result } = renderHook(() => useComponentSort())

    act(() => {
      result.current.handleSort('drawing', 'asc')
    })

    const components = [
      { id: '1', identity_key: {}, percent_complete: 0, drawing: { drawing_no_norm: 'PW-002' } },
      { id: '2', identity_key: {}, percent_complete: 0, drawing: { drawing_no_norm: 'PW-001' } },
      { id: '3', identity_key: {}, percent_complete: 0, drawing: null },
    ] as any[]

    const sorted = result.current.sortComponents(components)

    expect(sorted[0].id).toBe('3') // null/empty sorts first
    expect(sorted[1].drawing?.drawing_no_norm).toBe('PW-001')
    expect(sorted[2].drawing?.drawing_no_norm).toBe('PW-002')
  })

  it('sorts by area alphabetically with null handling', () => {
    const { result } = renderHook(() => useComponentSort())

    act(() => {
      result.current.handleSort('area', 'asc')
    })

    const components = [
      { id: '1', identity_key: {}, percent_complete: 0, area: { name: 'A3' } },
      { id: '2', identity_key: {}, percent_complete: 0, area: { name: 'A1' } },
      { id: '3', identity_key: {}, percent_complete: 0, area: null },
    ] as any[]

    const sorted = result.current.sortComponents(components)

    expect(sorted[0].id).toBe('3') // null sorts first
    expect(sorted[1].area?.name).toBe('A1')
    expect(sorted[2].area?.name).toBe('A3')
  })

  it('sorts by system alphabetically with null handling', () => {
    const { result } = renderHook(() => useComponentSort())

    act(() => {
      result.current.handleSort('system', 'asc')
    })

    const components = [
      { id: '1', identity_key: {}, percent_complete: 0, system: { name: 'System B' } },
      { id: '2', identity_key: {}, percent_complete: 0, system: { name: 'System A' } },
      { id: '3', identity_key: {}, percent_complete: 0, system: null },
    ] as any[]

    const sorted = result.current.sortComponents(components)

    expect(sorted[0].id).toBe('3') // null sorts first
    expect(sorted[1].system?.name).toBe('System A')
    expect(sorted[2].system?.name).toBe('System B')
  })

  it('sorts by test_package alphabetically with null handling', () => {
    const { result } = renderHook(() => useComponentSort())

    act(() => {
      result.current.handleSort('test_package', 'asc')
    })

    const components = [
      { id: '1', identity_key: {}, percent_complete: 0, test_package: { name: 'Package C' } },
      { id: '2', identity_key: {}, percent_complete: 0, test_package: { name: 'Package A' } },
      { id: '3', identity_key: {}, percent_complete: 0, test_package: null },
    ] as any[]

    const sorted = result.current.sortComponents(components)

    expect(sorted[0].id).toBe('3') // null sorts first
    expect(sorted[1].test_package?.name).toBe('Package A')
    expect(sorted[2].test_package?.name).toBe('Package C')
  })
})
