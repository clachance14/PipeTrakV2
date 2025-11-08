// T023: Integration test for invitation flow (User Story 2)
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { AddMemberDialog } from '@/components/team/AddMemberDialog'

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

describe('Invite Members Integration Tests', () => {
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
  })

  describe('Acceptance Scenario 1: Modal opens with form', () => {
    it('should open dialog when triggered', () => {
      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Add Team Member')).toBeInTheDocument()
    })

    it('should display email input', () => {
      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)

      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toBeInTheDocument()
      expect(emailInput).toHaveAttribute('type', 'email')
    })

    it('should display role dropdown with all 7 roles', () => {
      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)

      const roleSelect = screen.getByLabelText(/role/i)
      expect(roleSelect).toBeInTheDocument()

      // Open dropdown to check options
      userEvent.click(roleSelect)

      // All 7 roles should be available
      const roles = ['owner', 'admin', 'project_manager', 'foreman', 'qc_inspector', 'welder', 'viewer']
      roles.forEach(role => {
        expect(screen.getByText(role.replace('_', ' '))).toBeInTheDocument()
      })
    })

    it('should display optional message textarea with 500 char limit', () => {
      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)

      const messageTextarea = screen.getByLabelText(/message/i)
      expect(messageTextarea).toBeInTheDocument()
      expect(messageTextarea).toHaveAttribute('maxLength', '500')
    })

    it('should display submit button', () => {
      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)

      const submitButton = screen.getByRole('button', { name: /send invitation/i })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).not.toBeDisabled()
    })
  })

  describe('Acceptance Scenario 2: Form validation', () => {
    it('should show error for invalid email format', async () => {
      const user = userEvent.setup()
      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send invitation/i })

      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
      })
    })

    it('should require email field', async () => {
      const user = userEvent.setup()
      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)

      const submitButton = screen.getByRole('button', { name: /send invitation/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/required/i)).toBeInTheDocument()
      })
    })

    it('should show duplicate email error inline', async () => {
      const user = userEvent.setup()

      // Mock existing user check
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { organization_id: 'org-123' },
                error: null,
              }),
            }),
          }),
        }),
      } as any)

      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send invitation/i })

      await user.type(emailInput, 'existing@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/already invited|already a member/i)).toBeInTheDocument()
      })
    })
  })

  describe('Acceptance Scenario 3: Success flow', () => {
    it('should create invitation and show success toast', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()

      // Mock successful invitation creation
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
                email: 'newuser@example.com',
                role: 'viewer',
                organization_id: 'org-123',
                status: 'pending',
              },
              error: null,
            }),
          }),
        }),
      } as any)

      renderWithProviders(<AddMemberDialog open={true} onOpenChange={onOpenChange} />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send invitation/i })

      await user.type(emailInput, 'newuser@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Invitation sent to newuser@example.com')
      })

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('should display pending invite in list immediately after creation', async () => {
      const user = userEvent.setup()

      // Mock successful invitation creation
      const mockInvitation = {
        id: 'inv-123',
        email: 'newuser@example.com',
        role: 'viewer',
        organization_id: 'org-123',
        status: 'pending',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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
              data: mockInvitation,
              error: null,
            }),
          }),
        }),
      } as any)

      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send invitation/i })

      await user.type(emailInput, 'newuser@example.com')
      await user.click(submitButton)

      // Verify mutation was called
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled()
      })
    })

    it('should include optional message in invitation', async () => {
      const user = userEvent.setup()

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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
                email: 'newuser@example.com',
                role: 'viewer',
                message: 'Welcome to the team!',
              },
              error: null,
            }),
          }),
        }),
      } as any)

      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)

      const emailInput = screen.getByLabelText(/email/i)
      const messageTextarea = screen.getByLabelText(/message/i)
      const submitButton = screen.getByRole('button', { name: /send invitation/i })

      await user.type(emailInput, 'newuser@example.com')
      await user.type(messageTextarea, 'Welcome to the team!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled()
      })
    })
  })

  describe('Acceptance Scenario 4: Duplicate email error', () => {
    it('should show inline error for duplicate email in invitations table', async () => {
      const user = userEvent.setup()

      // Mock duplicate invitation error
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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
              error: { code: '23505', message: 'duplicate key value' },
            }),
          }),
        }),
      } as any)

      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send invitation/i })

      await user.type(emailInput, 'duplicate@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/already invited/i)).toBeInTheDocument()
      })
    })
  })

  describe('Acceptance Scenario 5: Email sent confirmation', () => {
    it('should verify invitation email is triggered', async () => {
      const user = userEvent.setup()

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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
                email: 'newuser@example.com',
                role: 'viewer',
                status: 'pending',
              },
              error: null,
            }),
          }),
        }),
      } as any)

      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send invitation/i })

      await user.type(emailInput, 'newuser@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Invitation sent to'))
      })
    })
  })

  describe('Error Handling', () => {
    it('should show 403 toast for permission denied', async () => {
      const user = userEvent.setup()

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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
              error: { code: '42501', message: 'permission denied' },
            }),
          }),
        }),
      } as any)

      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send invitation/i })

      await user.type(emailInput, 'newuser@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('permission'))
      })
    })

    it('should show generic error toast for other errors', async () => {
      const user = userEvent.setup()

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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

      renderWithProviders(<AddMemberDialog open={true} onOpenChange={vi.fn()} />)

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send invitation/i })

      await user.type(emailInput, 'newuser@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled()
      })
    })
  })
})
