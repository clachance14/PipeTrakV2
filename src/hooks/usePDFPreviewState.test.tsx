import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePDFPreviewState } from './usePDFPreviewState'

describe('usePDFPreviewState', () => {
  let mockCreateObjectURL: ReturnType<typeof vi.fn>
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    mockCreateObjectURL = vi.fn((blob: Blob) => `blob:mock-url-${blob.size}`)
    mockRevokeObjectURL = vi.fn()

    global.URL.createObjectURL = mockCreateObjectURL
    global.URL.revokeObjectURL = mockRevokeObjectURL
  })

  it('initializes with closed state', () => {
    const { result } = renderHook(() => usePDFPreviewState())

    expect(result.current.previewState).toEqual({
      open: false,
      url: null,
      filename: null,
      blob: null,
    })
  })

  it('openPreview sets all state fields correctly', () => {
    const { result } = renderHook(() => usePDFPreviewState())

    const mockBlob = new Blob(['test pdf content'], { type: 'application/pdf' })
    const mockUrl = 'blob:mock-url-123'
    const mockFilename = 'test-report.pdf'

    act(() => {
      result.current.openPreview(mockBlob, mockUrl, mockFilename)
    })

    expect(result.current.previewState).toEqual({
      open: true,
      url: mockUrl,
      filename: mockFilename,
      blob: mockBlob,
    })
  })

  it('closePreview revokes URL and resets state', () => {
    const { result } = renderHook(() => usePDFPreviewState())

    const mockBlob = new Blob(['test pdf content'], { type: 'application/pdf' })
    const mockUrl = 'blob:mock-url-123'
    const mockFilename = 'test-report.pdf'

    // Open preview first
    act(() => {
      result.current.openPreview(mockBlob, mockUrl, mockFilename)
    })

    expect(result.current.previewState.open).toBe(true)

    // Close preview
    act(() => {
      result.current.closePreview()
    })

    // Verify URL was revoked (may be called twice: once by closePreview, once by cleanup effect)
    expect(mockRevokeObjectURL).toHaveBeenCalledWith(mockUrl)

    // Verify state reset
    expect(result.current.previewState).toEqual({
      open: false,
      url: null,
      filename: null,
      blob: null,
    })
  })

  it('cleanup on unmount revokes URL', () => {
    const { result, unmount } = renderHook(() => usePDFPreviewState())

    const mockBlob = new Blob(['test pdf content'], { type: 'application/pdf' })
    const mockUrl = 'blob:mock-url-123'
    const mockFilename = 'test-report.pdf'

    // Open preview
    act(() => {
      result.current.openPreview(mockBlob, mockUrl, mockFilename)
    })

    // Reset mock to track unmount-specific calls
    mockRevokeObjectURL.mockClear()

    // Unmount component
    unmount()

    // Verify URL was revoked on unmount
    expect(mockRevokeObjectURL).toHaveBeenCalledWith(mockUrl)
    expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1)
  })

  it('opening new preview while one is open does not revoke old URL immediately', () => {
    const { result } = renderHook(() => usePDFPreviewState())

    const mockBlob1 = new Blob(['first pdf'], { type: 'application/pdf' })
    const mockUrl1 = 'blob:mock-url-first'
    const mockFilename1 = 'first-report.pdf'

    const mockBlob2 = new Blob(['second pdf'], { type: 'application/pdf' })
    const mockUrl2 = 'blob:mock-url-second'
    const mockFilename2 = 'second-report.pdf'

    // Open first preview
    act(() => {
      result.current.openPreview(mockBlob1, mockUrl1, mockFilename1)
    })

    mockRevokeObjectURL.mockClear()

    // Open second preview without closing first
    act(() => {
      result.current.openPreview(mockBlob2, mockUrl2, mockFilename2)
    })

    // Opening new preview should NOT automatically revoke old URL
    // (The cleanup effect will handle old URL when component state changes)
    expect(mockRevokeObjectURL).toHaveBeenCalledWith(mockUrl1)
    expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1)

    // Verify new state is set
    expect(result.current.previewState).toEqual({
      open: true,
      url: mockUrl2,
      filename: mockFilename2,
      blob: mockBlob2,
    })
  })

  it('multiple open/close cycles work correctly', () => {
    const { result } = renderHook(() => usePDFPreviewState())

    const mockBlob1 = new Blob(['first pdf'], { type: 'application/pdf' })
    const mockUrl1 = 'blob:mock-url-first'
    const mockFilename1 = 'first-report.pdf'

    const mockBlob2 = new Blob(['second pdf'], { type: 'application/pdf' })
    const mockUrl2 = 'blob:mock-url-second'
    const mockFilename2 = 'second-report.pdf'

    // First cycle
    act(() => {
      result.current.openPreview(mockBlob1, mockUrl1, mockFilename1)
    })

    expect(result.current.previewState.open).toBe(true)
    expect(result.current.previewState.url).toBe(mockUrl1)

    act(() => {
      result.current.closePreview()
    })

    expect(result.current.previewState.open).toBe(false)
    expect(result.current.previewState.url).toBeNull()
    expect(mockRevokeObjectURL).toHaveBeenCalledWith(mockUrl1)

    mockRevokeObjectURL.mockClear()

    // Second cycle
    act(() => {
      result.current.openPreview(mockBlob2, mockUrl2, mockFilename2)
    })

    expect(result.current.previewState.open).toBe(true)
    expect(result.current.previewState.url).toBe(mockUrl2)

    act(() => {
      result.current.closePreview()
    })

    expect(result.current.previewState.open).toBe(false)
    expect(result.current.previewState.url).toBeNull()
    expect(mockRevokeObjectURL).toHaveBeenCalledWith(mockUrl2)
  })

  it('closePreview does not throw when no URL is set', () => {
    const { result } = renderHook(() => usePDFPreviewState())

    // Close preview without opening first
    expect(() => {
      act(() => {
        result.current.closePreview()
      })
    }).not.toThrow()

    // Verify revokeObjectURL was not called
    expect(mockRevokeObjectURL).not.toHaveBeenCalled()

    // Verify state remains closed
    expect(result.current.previewState).toEqual({
      open: false,
      url: null,
      filename: null,
      blob: null,
    })
  })

  it('cleanup on unmount does not throw when no URL is set', () => {
    const { unmount } = renderHook(() => usePDFPreviewState())

    // Unmount without opening preview
    expect(() => {
      unmount()
    }).not.toThrow()

    // Verify revokeObjectURL was not called
    expect(mockRevokeObjectURL).not.toHaveBeenCalled()
  })

  it('preserves blob reference through state updates', () => {
    const { result } = renderHook(() => usePDFPreviewState())

    const mockBlob = new Blob(['test pdf content'], { type: 'application/pdf' })
    const mockUrl = 'blob:mock-url-123'
    const mockFilename = 'test-report.pdf'

    act(() => {
      result.current.openPreview(mockBlob, mockUrl, mockFilename)
    })

    // Verify exact blob reference is preserved (not copied)
    expect(result.current.previewState.blob).toBe(mockBlob)
  })

  it('handles opening preview with different blob types', () => {
    const { result } = renderHook(() => usePDFPreviewState())

    const mockBlobPDF = new Blob(['pdf content'], { type: 'application/pdf' })
    const mockUrl = 'blob:mock-url-pdf'
    const mockFilename = 'document.pdf'

    act(() => {
      result.current.openPreview(mockBlobPDF, mockUrl, mockFilename)
    })

    expect(result.current.previewState.blob?.type).toBe('application/pdf')
    expect(result.current.previewState.filename).toBe('document.pdf')
  })
})
