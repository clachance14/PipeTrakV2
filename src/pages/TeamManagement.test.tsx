import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TeamManagement } from './TeamManagement'

vi.mock('@/stores/organizationStore', () => ({
  useOrganizationStore: () => ({
    activeOrgId: 'org-1',
  }),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
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
  it('renders team management page', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TeamManagement />
      </QueryClientProvider>
    )

    expect(screen.getByText('Team Management')).toBeInTheDocument()
    // "Team Members" appears multiple times (tab + heading)
    expect(screen.getAllByText('Team Members').length).toBeGreaterThan(0)
  })
})
