import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserMenu } from '@/components/profile/UserMenu'
import { AuthContext } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe('UserMenu', () => {
  let queryClient: QueryClient

  const mockUser = {
    id: '123',
    email: 'john@example.com',
    role: null as null,
    full_name: null,
    organization_id: null,
    avatar_url: null,
  }

  const mockAuthContext = {
    user: mockUser,
    session: null,
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    vi.clearAllMocks()

    // Mock user profile data fetch
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              ...mockUser,
              organization: null,
            },
            error: null,
          }),
        }),
      }),
    } as any)
  })

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
    expect(screen.getByText(/view profile/i)).toBeInTheDocument()
    expect(screen.getByText(/sign out/i)).toBeInTheDocument()
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
    const signOutItem = screen.getByText(/sign out/i)
    await user.click(signOutItem)

    // Expect signOut called
    expect(mockAuthContext.signOut).toHaveBeenCalledOnce()
  })

  it('displays custom avatar when avatar_url provided', async () => {
    const userWithAvatar = {
      ...mockUser,
      avatar_url: 'https://example.com/avatar.jpg',
    }

    // Mock profileData with avatar_url
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              ...userWithAvatar,
              organization: null,
            },
            error: null,
          }),
        }),
      }),
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={{ ...mockAuthContext, user: userWithAvatar }}>
          <UserMenu />
        </AuthContext.Provider>
      </QueryClientProvider>
    )

    // Wait for profile data to load and avatar to render
    const avatar = await screen.findByAltText(/avatar/i)
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg')
  })
})
