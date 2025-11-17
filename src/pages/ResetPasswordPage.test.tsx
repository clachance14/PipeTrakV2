import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ResetPasswordPage } from './ResetPasswordPage'
import { supabase } from '@/lib/supabase'

const mockNavigate = vi.fn()

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}))

// Mock AuthContext
const mockSetIsInRecoveryMode = vi.fn()
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    setIsInRecoveryMode: mockSetIsInRecoveryMode,
  }),
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

function renderResetPasswordPage() {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ResetPasswordPage />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSetIsInRecoveryMode.mockClear()
  })

  it('renders reset password page with title', () => {
    const mockOnAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange)
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    } as any)

    renderResetPasswordPage()

    expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument()
  })

  it('shows loading state while checking for recovery token', () => {
    const mockOnAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange)
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    } as any)

    renderResetPasswordPage()

    expect(screen.getByText(/verifying/i)).toBeInTheDocument()
  })

  it('shows error when no recovery token is present', async () => {
    const mockOnAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange)
    const unsubscribe = vi.fn()

    mockOnAuthStateChange.mockImplementation((callback) => {
      // Don't trigger PASSWORD_RECOVERY event
      setTimeout(() => callback('SIGNED_OUT', null), 0)
      return {
        data: { subscription: { unsubscribe } },
      } as any
    })

    renderResetPasswordPage()

    await waitFor(() => {
      expect(screen.getByText(/invalid or expired reset link/i)).toBeInTheDocument()
    })
  })

  it('shows password form when PASSWORD_RECOVERY event detected', async () => {
    const mockOnAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange)
    const unsubscribe = vi.fn()

    mockOnAuthStateChange.mockImplementation((callback) => {
      setTimeout(() => callback('PASSWORD_RECOVERY', { user: { id: '123' } } as any), 0)
      return {
        data: { subscription: { unsubscribe } },
      } as any
    })

    renderResetPasswordPage()

    await waitFor(() => {
      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    })
  })

  it('validates password requirements', async () => {
    const user = userEvent.setup()
    const mockOnAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange)

    mockOnAuthStateChange.mockImplementation((callback) => {
      setTimeout(() => callback('PASSWORD_RECOVERY', { user: { id: '123' } } as any), 0)
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      } as any
    })

    renderResetPasswordPage()

    await waitFor(() => {
      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument()
    })

    const passwordInput = screen.getByLabelText(/^new password$/i)
    const confirmInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /reset password/i })

    // Test short password
    await user.type(passwordInput, 'short')
    await user.type(confirmInput, 'short')
    await user.click(submitButton)

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument()
  })

  it('validates password confirmation match', async () => {
    const user = userEvent.setup()
    const mockOnAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange)

    mockOnAuthStateChange.mockImplementation((callback) => {
      setTimeout(() => callback('PASSWORD_RECOVERY', { user: { id: '123' } } as any), 0)
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      } as any
    })

    renderResetPasswordPage()

    await waitFor(() => {
      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument()
    })

    const passwordInput = screen.getByLabelText(/^new password$/i)
    const confirmInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /reset password/i })

    await user.type(passwordInput, 'ValidPassword123!')
    await user.type(confirmInput, 'DifferentPassword123!')
    await user.click(submitButton)

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument()
  })

  it('successfully resets password and redirects to dashboard', async () => {
    const user = userEvent.setup()
    const mockOnAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange)
    const mockUpdateUser = vi.mocked(supabase.auth.updateUser)

    mockOnAuthStateChange.mockImplementation((callback) => {
      setTimeout(() => callback('PASSWORD_RECOVERY', { user: { id: '123' } } as any), 0)
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      } as any
    })

    mockUpdateUser.mockResolvedValue({ data: { user: {} }, error: null } as any)

    renderResetPasswordPage()

    await waitFor(() => {
      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument()
    })

    const passwordInput = screen.getByLabelText(/^new password$/i)
    const confirmInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /reset password/i })

    await user.type(passwordInput, 'ValidPassword123!')
    await user.type(confirmInput, 'ValidPassword123!')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'ValidPassword123!' })
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('displays error when password update fails', async () => {
    const user = userEvent.setup()
    const mockOnAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange)
    const mockUpdateUser = vi.mocked(supabase.auth.updateUser)

    mockOnAuthStateChange.mockImplementation((callback) => {
      setTimeout(() => callback('PASSWORD_RECOVERY', { user: { id: '123' } } as any), 0)
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      } as any
    })

    mockUpdateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Password update failed', name: 'AuthError', status: 400 },
    } as any)

    renderResetPasswordPage()

    await waitFor(() => {
      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument()
    })

    const passwordInput = screen.getByLabelText(/^new password$/i)
    const confirmInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /reset password/i })

    await user.type(passwordInput, 'ValidPassword123!')
    await user.type(confirmInput, 'ValidPassword123!')
    await user.click(submitButton)

    expect(await screen.findByText(/password update failed/i)).toBeInTheDocument()
  })

  it('disables submit button while updating password', async () => {
    const user = userEvent.setup()
    const mockOnAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange)
    const mockUpdateUser = vi.mocked(supabase.auth.updateUser)

    mockOnAuthStateChange.mockImplementation((callback) => {
      setTimeout(() => callback('PASSWORD_RECOVERY', { user: { id: '123' } } as any), 0)
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      } as any
    })

    mockUpdateUser.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: { user: {} }, error: null } as any), 100))
    )

    renderResetPasswordPage()

    await waitFor(() => {
      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument()
    })

    const passwordInput = screen.getByLabelText(/^new password$/i)
    const confirmInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /reset password/i })

    await user.type(passwordInput, 'ValidPassword123!')
    await user.type(confirmInput, 'ValidPassword123!')
    await user.click(submitButton)

    expect(submitButton).toBeDisabled()
    expect(screen.getByText(/updating/i)).toBeInTheDocument()
  })

  it('cleans up auth listener on unmount', () => {
    const mockOnAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange)
    const unsubscribe = vi.fn()

    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe } },
    } as any)

    const { unmount } = renderResetPasswordPage()

    unmount()

    expect(unsubscribe).toHaveBeenCalled()
  })

  it('detects recovery token from URL hash', async () => {
    const mockOnAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange)

    // Set URL hash to simulate recovery link
    window.location.hash = '#access_token=some-token&type=recovery'

    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    } as any)

    renderResetPasswordPage()

    // Should detect hash and show ready state immediately
    await waitFor(() => {
      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument()
    })

    // Clean up hash
    window.location.hash = ''
  })

  it('clears recovery mode after successful password reset', async () => {
    const user = userEvent.setup()
    const mockOnAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange)
    const mockUpdateUser = vi.mocked(supabase.auth.updateUser)

    mockOnAuthStateChange.mockImplementation((callback) => {
      setTimeout(() => callback('PASSWORD_RECOVERY', { user: { id: '123' } } as any), 0)
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      } as any
    })

    mockUpdateUser.mockResolvedValue({ data: { user: {} }, error: null } as any)

    renderResetPasswordPage()

    await waitFor(() => {
      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument()
    })

    const passwordInput = screen.getByLabelText(/^new password$/i)
    const confirmInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /reset password/i })

    await user.type(passwordInput, 'ValidPassword123!')
    await user.type(confirmInput, 'ValidPassword123!')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockSetIsInRecoveryMode).toHaveBeenCalledWith(false)
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })
})
