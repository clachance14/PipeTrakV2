import { renderHook, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import { mockSupabaseClient } from '../../tests/setup'

describe('AuthContext', () => {
  it('provides session when authenticated', async () => {
    // Mock authenticated session
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: '123', email: 'test@example.com' },
          access_token: 'token',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Date.now() + 3600000,
          refresh_token: 'refresh',
        },
      },
      error: null,
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toBeDefined()
    expect(result.current.user?.id).toBe('123')
    expect(result.current.session).toBeDefined()
  })

  it('provides null when unauthenticated', async () => {
    // Mock unauthenticated state
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toBeNull()
    expect(result.current.session).toBeNull()
  })

  it('calls signOut on logout', async () => {
    // Mock authenticated session
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: '123', email: 'test@example.com' },
          access_token: 'token',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Date.now() + 3600000,
          refresh_token: 'refresh',
        },
      },
      error: null,
    })

    mockSupabaseClient.auth.signOut.mockResolvedValue({
      error: null,
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await result.current.signOut()

    expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
  })
})
