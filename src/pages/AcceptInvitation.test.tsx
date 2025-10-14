import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AcceptInvitation } from './AcceptInvitation'

vi.mock('@/hooks/useInvitations', () => ({
  useInvitations: () => ({
    useValidateToken: () => ({
      data: {
        valid: true,
        invitation: {
          organization_name: 'Test Org',
          role: 'foreman',
          expires_at: '2025-12-31',
        },
      },
      isLoading: false,
    }),
    acceptInvitationMutation: { mutate: vi.fn() },
  }),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}))

const queryClient = new QueryClient()

describe('AcceptInvitation', () => {
  it('renders invitation details', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AcceptInvitation />
        </BrowserRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText(/you've been invited/i)).toBeInTheDocument()
    expect(screen.getByText('Test Org')).toBeInTheDocument()
  })
})
