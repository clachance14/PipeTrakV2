import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ForgotPasswordPage } from './ForgotPasswordPage'
import { supabase } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn(),
    },
  },
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

function renderForgotPasswordPage() {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ForgotPasswordPage />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders forgot password page with title and form', () => {
    renderForgotPasswordPage()

    expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
  })

  it('displays back to login link', () => {
    renderForgotPasswordPage()

    const backLink = screen.getByRole('link', { name: /back to login/i })
    expect(backLink).toBeInTheDocument()
    expect(backLink).toHaveAttribute('href', '/login')
  })

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup()
    renderForgotPasswordPage()

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /send reset link/i })

    await user.type(emailInput, 'invalid-email')
    await user.click(submitButton)

    expect(screen.queryByText(/check your email/i)).not.toBeInTheDocument()
  })

  it('successfully sends password reset email', async () => {
    const user = userEvent.setup()
    const mockResetPasswordForEmail = vi.mocked(supabase.auth.resetPasswordForEmail)
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null } as any)

    renderForgotPasswordPage()

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /send reset link/i })

    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          redirectTo: expect.stringContaining('/reset-password'),
        })
      )
    })

    expect(await screen.findByText(/check your email/i)).toBeInTheDocument()
  })

  it('displays error message when reset email fails', async () => {
    const user = userEvent.setup()
    const mockResetPasswordForEmail = vi.mocked(supabase.auth.resetPasswordForEmail)
    mockResetPasswordForEmail.mockResolvedValue({
      data: {},
      error: { message: 'Rate limit exceeded', name: 'AuthError', status: 429 },
    } as any)

    renderForgotPasswordPage()

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /send reset link/i })

    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)

    expect(await screen.findByText(/rate limit exceeded/i)).toBeInTheDocument()
  })

  it('disables submit button while sending email', async () => {
    const user = userEvent.setup()
    const mockResetPasswordForEmail = vi.mocked(supabase.auth.resetPasswordForEmail)
    mockResetPasswordForEmail.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: {}, error: null } as any), 100))
    )

    renderForgotPasswordPage()

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /send reset link/i })

    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)

    expect(submitButton).toBeDisabled()
    expect(screen.getByText(/sending/i)).toBeInTheDocument()
  })
})
