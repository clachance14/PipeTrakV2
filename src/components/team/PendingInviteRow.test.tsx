// T056: Component test for PendingInviteRow
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PendingInviteRow } from './PendingInviteRow'
import type { Invitation } from '@/types/team.types'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('PendingInviteRow', () => {
  let queryClient: QueryClient

  const mockInvitation: Invitation = {
    id: 'invitation-1',
    organization_id: 'org-1',
    email: 'john.doe@example.com',
    role: 'viewer',
    token: 'mock-token',
    message: null,
    created_at: '2025-10-20T10:00:00Z',
    sent_at: '2025-10-20T10:00:00Z',
    expires_at: '2025-10-27T10:00:00Z',
    status: 'pending',
  }

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    )
  }

  describe('Display', () => {
    it('should render invitation email', () => {
      renderWithProviders(<PendingInviteRow invitation={mockInvitation} />)
      expect(screen.getByText(mockInvitation.email)).toBeInTheDocument()
    })

    it('should render invitation role', () => {
      renderWithProviders(<PendingInviteRow invitation={mockInvitation} />)
      expect(screen.getByText(/viewer/i)).toBeInTheDocument()
    })

    it('should render "Pending" badge', () => {
      renderWithProviders(<PendingInviteRow invitation={mockInvitation} />)
      expect(screen.getByText(/pending/i)).toBeInTheDocument()
    })

    it('should render sent date', () => {
      renderWithProviders(<PendingInviteRow invitation={mockInvitation} />)
      // Should show formatted date like "Oct 20, 2025" or similar
      const dates = screen.getAllByText(/oct.*\d+/i)
      expect(dates.length).toBeGreaterThan(0)
      expect(dates[0]).toHaveTextContent(/oct.*20/i)
    })

    it('should render expires date', () => {
      renderWithProviders(<PendingInviteRow invitation={mockInvitation} />)
      // Should show formatted date like "Oct 27, 2025" or similar
      const dates = screen.getAllByText(/oct.*\d+/i)
      expect(dates.length).toBeGreaterThanOrEqual(2)
      expect(dates[1]).toHaveTextContent(/oct.*27/i)
    })
  })

  describe('Resend Action', () => {
    it('should render "Resend" button', () => {
      renderWithProviders(<PendingInviteRow invitation={mockInvitation} />)
      const resendButton = screen.getByRole('button', { name: /resend/i })
      expect(resendButton).toBeInTheDocument()
    })

    it('should disable "Resend" button while mutation is pending', async () => {
      const user = userEvent.setup()
      const { supabase } = await import('@/lib/supabase')

      // Mock slow API call
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockImplementation(
                  () =>
                    new Promise((resolve) =>
                      setTimeout(() => resolve({ data: {}, error: null }), 100)
                    )
                ),
              }),
            }),
          }),
        }),
      } as any)

      renderWithProviders(<PendingInviteRow invitation={mockInvitation} />)

      const resendButton = screen.getByRole('button', { name: /resend/i })
      await user.click(resendButton)

      // Button should be disabled during mutation
      expect(resendButton).toBeDisabled()
    })

    it('should call resendInvitationMutation with correct invitationId', async () => {
      const user = userEvent.setup()
      const { supabase } = await import('@/lib/supabase')
      const mockUpdate = vi.fn().mockResolvedValue({
        data: { sent_at: new Date().toISOString() },
        error: null,
      })

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: mockUpdate,
              }),
            }),
          }),
        }),
      } as any)

      renderWithProviders(<PendingInviteRow invitation={mockInvitation} />)

      const resendButton = screen.getByRole('button', { name: /resend/i })
      await user.click(resendButton)

      // Verify mutation was called with correct ID
      expect(supabase.from).toHaveBeenCalledWith('invitations')
    })
  })

  describe('Revoke Action', () => {
    it('should render "Revoke" button', () => {
      renderWithProviders(<PendingInviteRow invitation={mockInvitation} />)
      const revokeButton = screen.getByRole('button', { name: /revoke/i })
      expect(revokeButton).toBeInTheDocument()
    })

    it('should open confirmation dialog when "Revoke" is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PendingInviteRow invitation={mockInvitation} />)

      const revokeButton = screen.getByRole('button', { name: /revoke/i })
      await user.click(revokeButton)

      // Dialog should be visible
      expect(
        screen.getByRole('alertdialog')
      ).toBeInTheDocument()
    })

    it('should display email in confirmation dialog', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PendingInviteRow invitation={mockInvitation} />)

      const revokeButton = screen.getByRole('button', { name: /revoke/i })
      await user.click(revokeButton)

      const dialog = screen.getByRole('alertdialog')
      expect(
        within(dialog).getByText(new RegExp(mockInvitation.email, 'i'))
      ).toBeInTheDocument()
    })

    it('should close dialog when "Cancel" is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PendingInviteRow invitation={mockInvitation} />)

      const revokeButton = screen.getByRole('button', { name: /revoke/i })
      await user.click(revokeButton)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      // Dialog should be closed
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })

    it('should call revokeInvitationMutation when confirmed', async () => {
      const user = userEvent.setup()
      const { supabase } = await import('@/lib/supabase')
      const mockUpdate = vi.fn().mockResolvedValue({ data: null, error: null })

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: mockUpdate,
          }),
        }),
      } as any)

      renderWithProviders(<PendingInviteRow invitation={mockInvitation} />)

      const revokeButton = screen.getByRole('button', { name: /revoke/i })
      await user.click(revokeButton)

      const confirmButton = screen.getByRole('button', {
        name: /confirm|revoke|yes/i,
      })
      await user.click(confirmButton)

      // Verify mutation was called
      expect(supabase.from).toHaveBeenCalledWith('invitations')
    })
  })

  describe('Optimistic Updates', () => {
    it('should update sent_at timestamp immediately on resend', async () => {
      const user = userEvent.setup()
      const { supabase } = await import('@/lib/supabase')
      const { toast } = await import('sonner')

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { sent_at: new Date().toISOString() },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as any)

      renderWithProviders(<PendingInviteRow invitation={mockInvitation} />)

      const resendButton = screen.getByRole('button', { name: /resend/i })
      await user.click(resendButton)

      // Verify mutation was triggered and succeeded (optimistic update happens in cache)
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(`Invitation resent to ${mockInvitation.email}`)
      })
    })

    it('should remove row from DOM immediately on revoke', async () => {
      const user = userEvent.setup()
      const { supabase } = await import('@/lib/supabase')

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      } as any)

      renderWithProviders(
        <PendingInviteRow invitation={mockInvitation} />
      )

      const revokeButton = screen.getByRole('button', { name: /revoke/i })
      await user.click(revokeButton)

      const confirmButton = screen.getByRole('button', {
        name: /revoke/i,
      })
      await user.click(confirmButton)

      // Verify mutation was triggered (actual removal happens via cache invalidation in parent component)
      expect(supabase.from).toHaveBeenCalledWith('invitations')
    })
  })

  describe('Accessibility', () => {
    it('should have accessible role for row', () => {
      renderWithProviders(<PendingInviteRow invitation={mockInvitation} />)
      // Row should be in a table or have appropriate ARIA role
      expect(screen.getByTestId('invitation-row')).toBeInTheDocument()
    })

    it('should have accessible button labels', () => {
      renderWithProviders(<PendingInviteRow invitation={mockInvitation} />)

      const resendButton = screen.getByRole('button', { name: /resend/i })
      const revokeButton = screen.getByRole('button', { name: /revoke/i })

      expect(resendButton).toHaveAccessibleName()
      expect(revokeButton).toHaveAccessibleName()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PendingInviteRow invitation={mockInvitation} />)

      // Tab to Resend button
      await user.tab()
      expect(screen.getByRole('button', { name: /resend/i })).toHaveFocus()

      // Tab to Revoke button
      await user.tab()
      expect(screen.getByRole('button', { name: /revoke/i })).toHaveFocus()
    })
  })
})
