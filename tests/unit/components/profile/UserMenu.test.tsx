import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserMenu } from '@/components/profile/UserMenu'
import { AuthContext } from '@/contexts/AuthContext'

// Mock useUserProfile hook
vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: vi.fn()
}))

import { useUserProfile } from '@/hooks/useUserProfile'

describe('UserMenu', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })

    // Default mock implementation
    vi.mocked(useUserProfile).mockReturnValue({
      data: {
        id: '123',
        email: 'john@example.com',
        full_name: 'John Doe',
        avatar_url: null,
        organization_id: 'org-123',
        role: 'project_manager',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        deleted_at: null,
        organization: { id: 'org-123', name: 'Acme Corp' }
      },
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null
    } as any)
  })

  const mockUser = {
    id: '123',
    email: 'john@example.com',
    full_name: 'John Doe',
    avatar_url: null,
    organization_id: 'org-123',
    role: 'project_manager',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    deleted_at: null
  }

  const mockAuthContext = {
    user: mockUser,
    session: null,
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    refreshUser: vi.fn()
  }

  it('displays user avatar button', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={mockAuthContext}>
          <UserMenu />
        </AuthContext.Provider>
      </QueryClientProvider>
    )

    // Expect avatar button with initial letter
    const avatarButton = screen.getByRole('button', { name: /user menu/i })
    expect(avatarButton).toBeInTheDocument()
    expect(avatarButton).toHaveTextContent('J') // First letter of email
  })

  it('opens dropdown menu when avatar clicked', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={mockAuthContext}>
          <UserMenu />
        </AuthContext.Provider>
      </QueryClientProvider>
    )

    // Click avatar button
    const avatarButton = screen.getByRole('button', { name: /user menu/i })
    await user.click(avatarButton)

    // Expect dropdown with menu items
    expect(screen.getByRole('menuitem', { name: /view profile/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument()
  })

  it('calls signOut when Sign Out clicked', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={mockAuthContext}>
          <UserMenu />
        </AuthContext.Provider>
      </QueryClientProvider>
    )

    // Open dropdown
    const avatarButton = screen.getByRole('button', { name: /user menu/i })
    await user.click(avatarButton)

    // Click Sign Out
    const signOutItem = screen.getByRole('menuitem', { name: /sign out/i })
    await user.click(signOutItem)

    // Expect signOut called
    expect(mockAuthContext.signOut).toHaveBeenCalledOnce()
  })

  it('displays avatar image when avatar_url is provided', () => {
    // Mock useUserProfile to return avatar_url
    vi.mocked(useUserProfile).mockReturnValue({
      data: {
        id: '123',
        email: 'john@example.com',
        full_name: 'John Doe',
        avatar_url: 'https://example.com/avatar.jpg',
        organization_id: 'org-123',
        role: 'project_manager',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        deleted_at: null,
        organization: { id: 'org-123', name: 'Acme Corp' }
      },
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={mockAuthContext}>
          <UserMenu />
        </AuthContext.Provider>
      </QueryClientProvider>
    )

    const avatarButton = screen.getByRole('button', { name: /user menu/i })
    const avatarImg = avatarButton.querySelector('img')
    expect(avatarImg).toBeInTheDocument()
    expect(avatarImg).toHaveAttribute('src', 'https://example.com/avatar.jpg')
  })

  it('returns null when user is not loaded', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={{ ...mockAuthContext, user: null }}>
          <UserMenu />
        </AuthContext.Provider>
      </QueryClientProvider>
    )

    expect(screen.queryByRole('button', { name: /user menu/i })).not.toBeInTheDocument()
  })
})
