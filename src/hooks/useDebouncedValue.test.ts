import { renderHook, act } from '@testing-library/react'
import { useDebouncedValue } from './useDebouncedValue'

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('initial', 300))
    expect(result.current).toBe('initial')
  })

  it('debounces value changes with default delay (300ms)', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'initial' } }
    )

    expect(result.current).toBe('initial')

    // Update value
    act(() => {
      rerender({ value: 'updated' })
    })

    // Value should not update immediately
    expect(result.current).toBe('initial')

    // Fast-forward time by 299ms (just before delay)
    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(result.current).toBe('initial')

    // Fast-forward remaining 1ms to complete delay
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe('updated')
  })

  it('debounces value changes with custom delay', () => {
    const customDelay = 500
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, customDelay),
      { initialProps: { value: 'initial' } }
    )

    act(() => {
      rerender({ value: 'updated' })
    })

    // Should not update before custom delay
    act(() => {
      vi.advanceTimersByTime(customDelay - 1)
    })
    expect(result.current).toBe('initial')

    // Should update after custom delay
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe('updated')
  })

  it('cancels previous timeout on rapid value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'first' } }
    )

    expect(result.current).toBe('first')

    // Rapid updates - each rerender and timer advance needs separate acts
    rerender({ value: 'second' })
    act(() => vi.advanceTimersByTime(100))

    rerender({ value: 'third' })
    act(() => vi.advanceTimersByTime(100))

    rerender({ value: 'fourth' })
    act(() => vi.advanceTimersByTime(100))

    // Should still be initial value (none of the timeouts completed)
    expect(result.current).toBe('first')

    // Complete the final timeout (300ms from last update)
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current).toBe('fourth')
  })

  it('handles different data types (number)', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 0 } }
    )

    expect(result.current).toBe(0)

    rerender({ value: 42 })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe(42)
  })

  it('handles different data types (object)', () => {
    const initialObj = { id: 1, name: 'test' }
    const updatedObj = { id: 2, name: 'updated' }

    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: initialObj } }
    )

    expect(result.current).toEqual(initialObj)

    rerender({ value: updatedObj })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toEqual(updatedObj)
  })

  it('handles null and undefined values', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue<string | null>(value, 300),
      { initialProps: { value: 'initial' as string | null } }
    )

    expect(result.current).toBe('initial')

    rerender({ value: null })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe(null)
  })

  it('cleans up timeout on unmount', () => {
    const { unmount } = renderHook(() => useDebouncedValue('test', 300))

    // Unmount before timeout completes
    unmount()

    // Advance timers - should not throw error
    expect(() => vi.advanceTimersByTime(300)).not.toThrow()
  })
})
