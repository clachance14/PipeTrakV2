import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RegistrationForm } from './RegistrationForm'
// Mock the hooks and toast
vi.mock('@/hooks/useRegistration', () => ({
  useRegistration: () => ({
    register: vi.fn(),
    isLoading: false,
    error: null,
    data: null,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

const renderForm = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RegistrationForm />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('RegistrationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all form fields', () => {
    renderForm()

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/accept the terms/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it.skip('validates email format', async () => {
    const user = userEvent.setup()
    renderForm()

    const emailInput = screen.getByLabelText(/email/i)
    await user.type(emailInput, 'not-an-email')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument()
    })
  })

  it('validates password minimum length', async () => {
    const user = userEvent.setup()
    renderForm()

    const passwordInput = screen.getByLabelText(/^password$/i)
    await user.type(passwordInput, '12345') // 5 chars, need 6
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument()
    })
  })

  it('requires terms acceptance', async () => {
    const user = userEvent.setup()
    renderForm()

    // Fill all fields except terms
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/full name/i), 'Test User')
    await user.type(screen.getByLabelText(/organization name/i), 'Test Org')

    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/you must accept the terms/i)).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    renderForm()

    // Fill all fields
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/full name/i), 'Test User')
    await user.type(screen.getByLabelText(/organization name/i), 'Test Org')
    await user.click(screen.getByLabelText(/accept the terms/i))

    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)

    // Button should be disabled during submission
    expect(submitButton).toBeDisabled()
  })
})
