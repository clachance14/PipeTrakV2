import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TeamList } from './TeamList'

vi.mock('@/hooks/useOrganization', () => ({
  useOrganization: () => ({
    useOrgMembers: () => ({
      data: {
        members: [
          {
            id: '1',
            email: 'john@example.com',
            full_name: 'John Doe',
            role: 'owner',
            joined_at: '2024-01-01T00:00:00Z',
          },
        ],
        total_count: 1,
      },
      isLoading: false,
    }),
    updateMemberRoleMutation: { mutate: vi.fn() },
    removeMemberMutation: { mutate: vi.fn() },
  }),
}))

const queryClient = new QueryClient()

describe('TeamList', () => {
  it('renders member list', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TeamList organizationId="org-1" currentUserRole="owner" />
      </QueryClientProvider>
    )

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })
})
