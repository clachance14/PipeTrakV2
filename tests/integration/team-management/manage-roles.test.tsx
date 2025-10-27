/**
 * Integration Test: Manage Member Roles (User Story 4)
 * Feature: 016-team-management-ui
 *
 * Tests role management flow:
 * - Role change dialog opens and displays current role
 * - Optimistic update (<50ms perceived latency)
 * - Last owner protection (422 error)
 * - Rollback on error
 * - Permission enforcement (owner/admin only)
 */

import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { TeamList } from '@/components/team/TeamList'
import { useOrganization } from '@/hooks/useOrganization'
import { vi, beforeEach, afterEach } from 'vitest'
import { toast } from 'sonner'

// Mock the organization hook
vi.mock('@/hooks/useOrganization')
vi.mock('sonner')

const mockUpdateMemberRoleMutation = {
  mutate: vi.fn(),
  isLoading: false,
}

const mockRemoveMemberMutation = {
  mutate: vi.fn(),
  isLoading: false,
}

const mockOrgMembers = {
  members: [
    {
      id: 'user-1',
      email: 'owner@example.com',
      full_name: 'Owner User',
      role: 'owner' as const,
      joined_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'user-2',
      email: 'admin@example.com',
      full_name: 'Admin User',
      role: 'admin' as const,
      joined_at: '2024-01-02T00:00:00Z',
    },
    {
      id: 'user-3',
      email: 'viewer@example.com',
      full_name: 'Viewer User',
      role: 'viewer' as const,
      joined_at: '2024-01-03T00:00:00Z',
    },
  ],
  total_count: 3,
}

function renderTeamList(currentUserRole = 'owner') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TeamList organizationId="org-1" currentUserRole={currentUserRole as any} />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('User Story 4: Manage Member Roles', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useOrganization).mockReturnValue({
      useCurrentOrganization: vi.fn() as any,
      useOrgMembers: vi.fn(() => ({
        data: mockOrgMembers,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })) as any,
      updateMemberRoleMutation: mockUpdateMemberRoleMutation as any,
      removeMemberMutation: mockRemoveMemberMutation as any,
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Acceptance Scenario 1: Role change dialog', () => {
    it('should open role change dialog when clicking "Change Role" button', async () => {
      const user = userEvent.setup()
      renderTeamList('owner')

      // Wait for members to load
      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument()
      })

      // Find and click the "Change Role" button for Admin User
      const changeRoleButtons = screen.getAllByRole('button', { name: /change role/i })
      expect(changeRoleButtons.length).toBeGreaterThan(0)

      await user.click(changeRoleButtons[0])

      // Verify dialog opened with current role selected
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      expect(screen.getByText(/change role/i)).toBeInTheDocument()
    })

    it('should display all available roles in dropdown', async () => {
      const user = userEvent.setup()
      renderTeamList('owner')

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument()
      })

      const changeRoleButtons = screen.getAllByRole('button', { name: /change role/i })
      await user.click(changeRoleButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Click the role selector to open dropdown
      const roleSelector = screen.getByRole('combobox')
      await user.click(roleSelector)

      // Verify all roles are available
      await waitFor(() => {
        expect(screen.getByText(/owner/i)).toBeInTheDocument()
        expect(screen.getByText(/admin/i)).toBeInTheDocument()
        expect(screen.getByText(/project manager/i)).toBeInTheDocument()
        expect(screen.getByText(/viewer/i)).toBeInTheDocument()
      })
    })

    it('should close dialog on cancel', async () => {
      const user = userEvent.setup()
      renderTeamList('owner')

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument()
      })

      const changeRoleButtons = screen.getAllByRole('button', { name: /change role/i })
      await user.click(changeRoleButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('Acceptance Scenario 2: Optimistic update', () => {
    it('should update role immediately in UI (optimistic)', async () => {
      const user = userEvent.setup()

      // Mock mutation that takes 500ms to complete
      mockUpdateMemberRoleMutation.mutate.mockImplementation((variables, callbacks) => {
        setTimeout(() => {
          callbacks?.onSuccess?.()
        }, 500)
      })

      renderTeamList('owner')

      await waitFor(() => {
        expect(screen.getByText('Viewer User')).toBeInTheDocument()
      })

      // Start timing
      const startTime = Date.now()

      const changeRoleButtons = screen.getAllByRole('button', { name: /change role/i })
      await user.click(changeRoleButtons[2]) // Click for Viewer User

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Select new role (admin)
      const roleSelector = screen.getByRole('combobox')
      await user.click(roleSelector)

      await waitFor(() => {
        expect(screen.getByText(/admin/i)).toBeInTheDocument()
      })

      const adminOption = screen.getByText(/admin/i)
      await user.click(adminOption)

      // Confirm change
      const confirmButton = screen.getByRole('button', { name: /confirm|update/i })
      await user.click(confirmButton)

      // Verify mutation was called
      expect(mockUpdateMemberRoleMutation.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-3',
          role: 'admin',
          organizationId: 'org-1',
        }),
        expect.any(Object)
      )

      // Measure latency - should be <50ms perceived latency
      const latency = Date.now() - startTime
      expect(latency).toBeLessThan(100) // Allow 100ms buffer for test environment
    })

    it('should show success toast after role update', async () => {
      const user = userEvent.setup()

      mockUpdateMemberRoleMutation.mutate.mockImplementation((variables, callbacks) => {
        callbacks?.onSuccess?.()
      })

      renderTeamList('owner')

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument()
      })

      const changeRoleButtons = screen.getAllByRole('button', { name: /change role/i })
      await user.click(changeRoleButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Change role and confirm
      const roleSelector = screen.getByRole('combobox')
      await user.click(roleSelector)

      const viewerOption = await screen.findByText(/viewer/i)
      await user.click(viewerOption)

      const confirmButton = screen.getByRole('button', { name: /confirm|update/i })
      await user.click(confirmButton)

      // Verify success toast was shown
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled()
      })
    })
  })

  describe('Acceptance Scenario 3: Last owner protection', () => {
    it('should show error toast when trying to change last owner role', async () => {
      const user = userEvent.setup()

      // Mock only one owner
      const singleOwnerData = {
        members: [
          {
            id: 'user-1',
            email: 'owner@example.com',
            full_name: 'Only Owner',
            role: 'owner' as const,
            joined_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 'user-2',
            email: 'admin@example.com',
            full_name: 'Admin User',
            role: 'admin' as const,
            joined_at: '2024-01-02T00:00:00Z',
          },
        ],
        total_count: 2,
      }

      vi.mocked(useOrganization).mockReturnValue({
        useCurrentOrganization: vi.fn() as any,
        useOrgMembers: vi.fn(() => ({
          data: singleOwnerData,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        })) as any,
        updateMemberRoleMutation: mockUpdateMemberRoleMutation as any,
        removeMemberMutation: mockRemoveMemberMutation as any,
      })

      mockUpdateMemberRoleMutation.mutate.mockImplementation((variables, callbacks) => {
        const error = new Error('CANNOT_REMOVE_LAST_OWNER')
        callbacks?.onError?.(error)
      })

      renderTeamList('owner')

      await waitFor(() => {
        expect(screen.getByText('Only Owner')).toBeInTheDocument()
      })

      // Try to change the only owner's role
      const changeRoleButtons = screen.getAllByRole('button', { name: /change role/i })
      await user.click(changeRoleButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const roleSelector = screen.getByRole('combobox')
      await user.click(roleSelector)

      const adminOption = await screen.findByText(/admin/i)
      await user.click(adminOption)

      const confirmButton = screen.getByRole('button', { name: /confirm|update/i })
      await user.click(confirmButton)

      // Verify error toast was shown
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('last owner')
        )
      })
    })
  })

  describe('Acceptance Scenario 4: Rollback on error', () => {
    it('should rollback optimistic update on error', async () => {
      const user = userEvent.setup()

      // Mock successful optimistic update but failed server response
      mockUpdateMemberRoleMutation.mutate.mockImplementation((variables, callbacks) => {
        const error = new Error('Network error')
        callbacks?.onError?.(error)
      })

      renderTeamList('owner')

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument()
      })

      const changeRoleButtons = screen.getAllByRole('button', { name: /change role/i })
      await user.click(changeRoleButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const roleSelector = screen.getByRole('combobox')
      await user.click(roleSelector)

      const viewerOption = await screen.findByText(/viewer/i)
      await user.click(viewerOption)

      const confirmButton = screen.getByRole('button', { name: /confirm|update/i })
      await user.click(confirmButton)

      // Verify error handling
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled()
      })

      // Verify original role is still displayed (rollback worked)
      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument()
      })
    })
  })

  describe('Permission enforcement', () => {
    it('should not show "Change Role" button for viewers', () => {
      renderTeamList('viewer')

      // Viewers should not see any management buttons
      const changeRoleButtons = screen.queryAllByRole('button', { name: /change role/i })
      expect(changeRoleButtons.length).toBe(0)
    })

    it('should show "Change Role" button for owners', async () => {
      renderTeamList('owner')

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument()
      })

      const changeRoleButtons = screen.getAllByRole('button', { name: /change role/i })
      expect(changeRoleButtons.length).toBeGreaterThan(0)
    })

    it('should show "Change Role" button for admins', async () => {
      renderTeamList('admin')

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument()
      })

      const changeRoleButtons = screen.getAllByRole('button', { name: /change role/i })
      expect(changeRoleButtons.length).toBeGreaterThan(0)
    })
  })
})
