// T024: Component test for AddMemberDialog
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AddMemberDialog } from './AddMemberDialog'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe('AddMemberDialog Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock authenticated user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'owner@example.com',
          created_at: '2024-01-01',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
        },
      },
      error: null,
    })

    // Mock user's organization
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { organization_id: 'org-123' },
            error: null,
          }),
        }),
      }),
    } as any)
  })

  describe('Rendering', () => {
    it('should not render when open is false', () => {
      renderWithProviders(<AddMemberDialog open={false} onOpenChange={vi.fn()} />)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should render when open is true', () => {
      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should render title "Add Team Member"', () => {
      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)
      expect(screen.getByText('Add Team Member')).toBeInTheDocument()
    })

    it('should render email input field', () => {
      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)
      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toBeInTheDocument()
      expect(emailInput).toHaveAttribute('type', 'email')
    })

    it('should render role dropdown', () => {
      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)
      expect(screen.getByLabelText(/role/i)).toBeInTheDocument()
    })

    it('should render optional message textarea', () => {
      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)
      const messageTextarea = screen.getByLabelText(/message/i)
      expect(messageTextarea).toBeInTheDocument()
      expect(messageTextarea.tagName).toBe('TEXTAREA')
    })

    it('should limit message to 500 characters', () => {
      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)
      const messageTextarea = screen.getByLabelText(/message/i)
      expect(messageTextarea).toHaveAttribute('maxLength', '500')
    })

    it('should render submit button', () => {
      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)
      const submitButton = screen.getByRole('button', { name: /send invitation/i })
      expect(submitButton).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should show error for empty email', async () => {
      const user = userEvent.setup()
      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)

      const submitButton = screen.getByRole('button', { name: /send invitation/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/required/i)).toBeInTheDocument()
      })
    })

    it('should show error for invalid email format', async () => {
      const user = userEvent.setup()
      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'not-an-email')

      const submitButton = screen.getByRole('button', { name: /send invitation/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
      })
    })

    it('should accept valid email format', async () => {
      const user = userEvent.setup()
      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'valid@example.com')

      // Should not show validation error
      expect(screen.queryByText(/invalid email/i)).not.toBeInTheDocument()
    })

    it('should require role selection', () => {
      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)

      const roleSelect = screen.getByLabelText(/role/i)
      expect(roleSelect).toBeRequired()
    })
  })

  describe('Submit Behavior', () => {
    it('should call onOpenChange(false) on successful submission', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()

      // Mock successful invitation
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-123' },
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'inv-123',
                email: 'test@example.com',
                role: 'viewer',
              },
              error: null,
            }),
          }),
        }),
      } as any)

      renderWithProviders(<AddMemberDialog open={true} onOpenChange={onOpenChange} />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByRole('button', { name: /send invitation/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('should disable submit button while submitting', async () => {
      const user = userEvent.setup()

      // Mock slow invitation
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve({ data: null, error: null }), 100))
              ),
            }),
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-123' },
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(
              () => new Promise(resolve => setTimeout(() => resolve({
                data: { id: 'inv-123', email: 'test@example.com', role: 'viewer' },
                error: null,
              }), 100))
            ),
          }),
        }),
      } as any)

      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByRole('button', { name: /send invitation/i })
      await user.click(submitButton)

      // Button should be disabled immediately
      expect(submitButton).toBeDisabled()
    })

    it('should clear form after successful submission', async () => {
      const user = userEvent.setup()

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-123' },
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'inv-123',
                email: 'test@example.com',
                role: 'viewer',
              },
              error: null,
            }),
          }),
        }),
      } as any)

      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
      const messageTextarea = screen.getByLabelText(/message/i) as HTMLTextAreaElement

      await user.type(emailInput, 'test@example.com')
      await user.type(messageTextarea, 'Welcome!')

      const submitButton = screen.getByRole('button', { name: /send invitation/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(emailInput.value).toBe('')
        expect(messageTextarea.value).toBe('')
      })
    })
  })

  describe('Error States', () => {
    it('should show inline error for duplicate email', async () => {
      const user = userEvent.setup()

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { organization_id: 'org-123' },
                error: null,
              }),
            }),
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-123' },
              error: null,
            }),
          }),
        }),
      } as any)

      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'duplicate@example.com')

      const submitButton = screen.getByRole('button', { name: /send invitation/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/already/i)).toBeInTheDocument()
      })
    })

    it('should not close dialog on error', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-123' },
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Network error' },
            }),
          }),
        }),
      } as any)

      renderWithProviders(<AddMemberDialog open={true} onOpenChange={onOpenChange} />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByRole('button', { name: /send invitation/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled()
      })

      expect(onOpenChange).not.toHaveBeenCalledWith(false)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/role/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/message/i)).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)

      const emailInput = screen.getByLabelText(/email/i)

      // Tab to email input
      await user.tab()
      expect(emailInput).toHaveFocus()

      // Type email
      await user.keyboard('test@example.com')
      expect(emailInput).toHaveValue('test@example.com')

      // Tab to role select
      await user.tab()
      const roleSelect = screen.getByLabelText(/role/i)
      expect(roleSelect).toHaveFocus()
    })
  })
})
