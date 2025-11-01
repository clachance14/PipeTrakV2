import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useComponentSort } from './useComponentSort'

describe('useComponentSort', () => {
  it('initializes with identity_key ascending sort', () => {
    const { result } = renderHook(() => useComponentSort())

    expect(result.current.sortField).toBe('identity_key')
    expect(result.current.sortDirection).toBe('asc')
  })
})
