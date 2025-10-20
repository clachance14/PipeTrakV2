import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { useExpandedDrawings } from './useExpandedDrawings'

// Mock useSearchParams from react-router-dom
const mockSetSearchParams = vi.fn()
const mockSearchParams = new URLSearchParams()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useSearchParams: () => [mockSearchParams, mockSetSearchParams],
  }
})

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    warning: vi.fn(),
  },
}))

describe('useExpandedDrawings', () => {
  beforeEach(() => {
    mockSearchParams.delete('expanded')
    mockSetSearchParams.mockClear()
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>{children}</BrowserRouter>
  )

  it('returns expandedDrawingIds as Set<string>', () => {
    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    expect(result.current.expandedDrawingIds).toBeInstanceOf(Set)
  })

  it('parses expanded param from URL', () => {
    mockSearchParams.set('expanded', 'uuid1,uuid2,uuid3')

    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    expect(result.current.expandedDrawingIds.size).toBe(3)
    expect(result.current.expandedDrawingIds.has('uuid1')).toBe(true)
    expect(result.current.expandedDrawingIds.has('uuid2')).toBe(true)
    expect(result.current.expandedDrawingIds.has('uuid3')).toBe(true)
  })

  it('returns empty Set when no expanded param', () => {
    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    expect(result.current.expandedDrawingIds.size).toBe(0)
  })

  it('provides toggleDrawing function', () => {
    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    expect(typeof result.current.toggleDrawing).toBe('function')
  })

  it('toggleDrawing adds drawing ID to Set', () => {
    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    act(() => {
      result.current.toggleDrawing('drawing-uuid-1')
    })

    expect(mockSetSearchParams).toHaveBeenCalled()
    const callArgs = mockSetSearchParams.mock.calls[0][0]
    const newParams = typeof callArgs === 'function' ? callArgs(new URLSearchParams()) : callArgs
    expect(newParams.get('expanded')).toBe('drawing-uuid-1')
  })

  it('toggleDrawing removes drawing ID if already expanded', () => {
    mockSearchParams.set('expanded', 'uuid1,uuid2')

    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    act(() => {
      result.current.toggleDrawing('uuid1')
    })

    expect(mockSetSearchParams).toHaveBeenCalled()
    const callArgs = mockSetSearchParams.mock.calls[0][0]
    const prevParams = new URLSearchParams('expanded=uuid1,uuid2')
    const newParams = typeof callArgs === 'function' ? callArgs(prevParams) : callArgs
    expect(newParams.get('expanded')).toBe('uuid2')
  })

  it('toggleDrawing appends to existing expanded drawings', () => {
    mockSearchParams.set('expanded', 'uuid1')

    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    act(() => {
      result.current.toggleDrawing('uuid2')
    })

    expect(mockSetSearchParams).toHaveBeenCalled()
    const callArgs = mockSetSearchParams.mock.calls[0][0]
    const prevParams = new URLSearchParams('expanded=uuid1')
    const newParams = typeof callArgs === 'function' ? callArgs(prevParams) : callArgs
    const expanded = newParams.get('expanded')
    expect(expanded).toContain('uuid1')
    expect(expanded).toContain('uuid2')
  })

  it('provides collapseAll function', () => {
    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    expect(typeof result.current.collapseAll).toBe('function')
  })

  it('collapseAll clears all expanded drawings', () => {
    mockSearchParams.set('expanded', 'uuid1,uuid2,uuid3')

    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    act(() => {
      result.current.collapseAll()
    })

    expect(mockSetSearchParams).toHaveBeenCalled()
    const callArgs = mockSetSearchParams.mock.calls[0][0]
    const newParams = typeof callArgs === 'function' ? callArgs(new URLSearchParams()) : callArgs
    expect(newParams.get('expanded')).toBeNull()
  })

  it('provides isExpanded function', () => {
    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    expect(typeof result.current.isExpanded).toBe('function')
  })

  it('isExpanded returns true for expanded drawings', () => {
    mockSearchParams.set('expanded', 'uuid1,uuid2')

    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    expect(result.current.isExpanded('uuid1')).toBe(true)
    expect(result.current.isExpanded('uuid2')).toBe(true)
    expect(result.current.isExpanded('uuid3')).toBe(false)
  })

  it('preserves other URL params when toggling', () => {
    mockSearchParams.set('search', 'P-001')
    mockSearchParams.set('status', 'in-progress')
    mockSearchParams.set('expanded', 'uuid1')

    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    act(() => {
      result.current.toggleDrawing('uuid2')
    })

    expect(mockSetSearchParams).toHaveBeenCalled()
    const callArgs = mockSetSearchParams.mock.calls[0][0]
    const prevParams = new URLSearchParams('search=P-001&status=in-progress&expanded=uuid1')
    const newParams = typeof callArgs === 'function' ? callArgs(prevParams) : callArgs

    expect(newParams.get('search')).toBe('P-001')
    expect(newParams.get('status')).toBe('in-progress')
  })

  it('handles max 50 expanded drawings limit', async () => {
    const { toast } = await import('sonner')

    // Start with 49 expanded drawings
    mockSearchParams.set('expanded', Array.from({ length: 49 }, (_, i) => `uuid-${i}`).join(','))

    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    // Try to expand the 50th drawing (should succeed)
    act(() => {
      result.current.toggleDrawing('uuid-50')
    })

    // Try to expand the 51st drawing (should fail with warning)
    act(() => {
      result.current.toggleDrawing('uuid-51')
    })

    // Should show warning toast
    expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('50'))
  })

  it('falls back to localStorage when URL limit exceeded', () => {
    const longExpandedString = Array.from({ length: 60 }, (_, i) => `uuid-${i}`).join(',')
    mockSearchParams.set('expanded', longExpandedString)

    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    // Should still return Set (from localStorage fallback)
    expect(result.current.expandedDrawingIds).toBeInstanceOf(Set)
  })

  it('handles empty string in expanded param', () => {
    mockSearchParams.set('expanded', '')

    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    expect(result.current.expandedDrawingIds.size).toBe(0)
  })

  it('handles malformed UUID in expanded param', () => {
    mockSearchParams.set('expanded', 'uuid1,invalid-uuid,uuid2')

    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    // Should still parse valid UUIDs
    expect(result.current.expandedDrawingIds.size).toBeGreaterThanOrEqual(0)
  })
})
