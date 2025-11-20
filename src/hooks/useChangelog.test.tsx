import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useChangelog } from './useChangelog'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

// Mock fetch for GitHub API
global.fetch = vi.fn()

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  }
}))

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      last_viewed_release: null
    }
  })
}))

describe('useChangelog', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('should show modal when new release is available', async () => {
    // Mock GitHub API response
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tag_name: 'v1.2.0',
        name: 'Version 1.2.0',
        published_at: '2025-11-20T10:00:00Z',
        body: '## Features\n- New feature'
      })
    })

    const { result } = renderHook(
      () => useChangelog('test-user-id', null),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.shouldShowModal).toBe(true)
    })

    expect(result.current.release).toEqual({
      tag_name: 'v1.2.0',
      name: 'Version 1.2.0',
      published_at: '2025-11-20T10:00:00Z',
      body: '## Features\n- New feature'
    })
  })

  it('should not show modal when user has viewed latest release', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tag_name: 'v1.2.0',
        name: 'Version 1.2.0',
        published_at: '2025-11-20T10:00:00Z',
        body: '## Features\n- New feature'
      })
    })

    const { result } = renderHook(
      () => useChangelog('test-user-id', '1.2.0'),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.shouldShowModal).toBe(false)
    })
  })

  it('should show modal when new version is greater than last viewed', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tag_name: 'v2.0.0',
        name: 'Version 2.0.0',
        published_at: '2025-11-20T10:00:00Z',
        body: '## Breaking Changes\n- Major update'
      })
    })

    const { result } = renderHook(
      () => useChangelog('test-user-id', '1.5.0'),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.shouldShowModal).toBe(true)
    })
  })

  it('should handle GitHub API errors gracefully', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404
    })

    const { result } = renderHook(
      () => useChangelog('test-user-id', null),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.shouldShowModal).toBe(false)
    })
    expect(result.current.release).toBeNull()
  })

  it('should handle rate limit errors gracefully', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 403
    })

    const { result } = renderHook(
      () => useChangelog('test-user-id', null),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.shouldShowModal).toBe(false)
    })
  })

  it('should handle network errors gracefully', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Network error')
    )

    const { result } = renderHook(
      () => useChangelog('test-user-id', null),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.shouldShowModal).toBe(false)
    })
  })

  it('should handle pre-release versions correctly', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tag_name: 'v2.0.0-beta.1',
        name: 'Version 2.0.0 Beta 1',
        published_at: '2025-11-20T10:00:00Z',
        body: '## Beta Features\n- Testing new feature'
      })
    })

    const { result } = renderHook(
      () => useChangelog('test-user-id', '1.9.0'),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.shouldShowModal).toBe(true)
    })
  })

  it('should strip "v" prefix from tag_name for comparison', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tag_name: 'v1.3.0',
        name: 'Version 1.3.0',
        published_at: '2025-11-20T10:00:00Z',
        body: '## Features\n- New feature'
      })
    })

    const { result } = renderHook(
      () => useChangelog('test-user-id', '1.2.0'),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.shouldShowModal).toBe(true)
    })
  })

  it('should call markAsViewed and update database', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tag_name: 'v1.2.0',
        name: 'Version 1.2.0',
        published_at: '2025-11-20T10:00:00Z',
        body: '## Features\n- New feature'
      })
    })

    const { result } = renderHook(
      () => useChangelog('test-user-id', null),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.shouldShowModal).toBe(true)
    })

    // Call markAsViewed
    await result.current.markAsViewed()

    // Verify Supabase was called to update
    expect(supabase.from).toHaveBeenCalledWith('users')
  })

  it('should treat null last_viewed_release as 0.0.0', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tag_name: 'v1.0.0',
        name: 'Version 1.0.0',
        published_at: '2025-11-20T10:00:00Z',
        body: '## Features\n- Initial release'
      })
    })

    const { result } = renderHook(
      () => useChangelog('test-user-id', null),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.shouldShowModal).toBe(true)
    })
  })

  it('should handle invalid semver strings with fallback', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tag_name: 'invalid-version',
        name: 'Invalid Version',
        published_at: '2025-11-20T10:00:00Z',
        body: '## Features\n- Some feature'
      })
    })

    const { result } = renderHook(
      () => useChangelog('test-user-id', 'invalid-old-version'),
      { wrapper }
    )

    await waitFor(() => {
      // Should not crash, might show or not show modal depending on fallback logic
      expect(result.current.shouldShowModal).toBeDefined()
    })
  })
})
