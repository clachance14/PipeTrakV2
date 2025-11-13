import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { useExpandedDrawings } from './useExpandedDrawings'
import React from 'react'

function wrapper({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>
}

describe('useExpandedDrawings - Accordion Mode', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
  })

  it('returns null when no drawing expanded', () => {
    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })
    expect(result.current.expandedDrawingId).toBeNull()
  })

  it('expands single drawing', () => {
    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    act(() => {
      result.current.toggleDrawing('drawing-1')
    })

    expect(result.current.expandedDrawingId).toBe('drawing-1')
    expect(result.current.isExpanded('drawing-1')).toBe(true)
  })

  it('collapses drawing when toggling already expanded drawing', () => {
    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    act(() => {
      result.current.toggleDrawing('drawing-1')
    })

    act(() => {
      result.current.toggleDrawing('drawing-1')
    })

    expect(result.current.expandedDrawingId).toBeNull()
    expect(result.current.isExpanded('drawing-1')).toBe(false)
  })

  it('auto-closes previous drawing when expanding new one', () => {
    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    act(() => {
      result.current.toggleDrawing('drawing-1')
    })

    act(() => {
      result.current.toggleDrawing('drawing-2')
    })

    expect(result.current.expandedDrawingId).toBe('drawing-2')
    expect(result.current.isExpanded('drawing-1')).toBe(false)
    expect(result.current.isExpanded('drawing-2')).toBe(true)
  })

  it('syncs single ID to URL params', () => {
    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    act(() => {
      result.current.toggleDrawing('drawing-1')
    })

    expect(window.location.search).toBe('?expanded=drawing-1')
  })

  it('collapses drawing and clears URL params', () => {
    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    act(() => {
      result.current.toggleDrawing('drawing-1')
    })

    act(() => {
      result.current.collapseDrawing()
    })

    expect(result.current.expandedDrawingId).toBeNull()
    expect(window.location.search).toBe('')
  })

  it('reads single ID from URL on mount', () => {
    window.history.pushState({}, '', '?expanded=drawing-1')

    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    expect(result.current.expandedDrawingId).toBe('drawing-1')
  })

  it('handles legacy multi-ID URLs by taking first ID', () => {
    window.history.pushState({}, '', '?expanded=drawing-1,drawing-2,drawing-3')

    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    expect(result.current.expandedDrawingId).toBe('drawing-1')
  })

  it('ignores invalid URL params', () => {
    window.history.pushState({}, '', '?expanded=')

    const { result } = renderHook(() => useExpandedDrawings(), { wrapper })

    expect(result.current.expandedDrawingId).toBeNull()
  })
})
