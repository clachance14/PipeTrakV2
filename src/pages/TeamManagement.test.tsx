import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { TeamManagement } from './TeamManagement'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/hooks/useInvitations', () => ({
  useInvitations: () => ({
    useInvitations: () => ({
      data: { invitations: [], total_count: 0 },
    }),
    resendInvitationMutation: { mutate: vi.fn() },
    revokeInvitationMutation: { mutate: vi.fn() },
  }),
}))

vi.mock('@/hooks/useOrganization', () => ({
  useOrganization: () => ({
    useCurrentOrganization: () => ({
      data: {
        organization: { id: 'org-1', name: 'Test Org', created_at: '2024-01-01' },
        role: 'owner',
      },
      isLoading: false,
      error: null,
    }),
    useOrgMembers: () => ({
      data: { members: [], total_count: 0 },
      isLoading: false,
    }),
    updateMemberRoleMutation: { mutate: vi.fn() },
    removeMemberMutation: { mutate: vi.fn() },
  }),
}))

const queryClient = new QueryClient()

describe('TeamManagement', () => {
  it('renders team management page with organization loaded', () => {
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <TeamManagement />
        </QueryClientProvider>
      </MemoryRouter>
    )

    // Verify the page title renders
    expect(screen.getByText('Team Management')).toBeInTheDocument()
    // Verify the description renders
    expect(screen.getByText('View and manage your team members and their permissions')).toBeInTheDocument()
    // Verify the Add Team Member button renders (only shows when org is loaded)
    expect(screen.getByText('Add Team Member')).toBeInTheDocument()
  })
})
