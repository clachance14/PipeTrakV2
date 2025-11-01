import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ComponentsPage } from '@/pages/ComponentsPage'

// Mock dependencies
vi.mock('@/hooks/useComponents', () => ({
  useComponents: vi.fn(() => ({
    data: [
      {
        id: '1',
        identity_key: { drawing_norm: 'B', commodity_code: '001', size: '2', seq: 1 },
        percent_complete: 75,
        component_type: 'spool',
        project_id: 'proj-1',
        created_at: '2025-01-01',
        last_updated_at: '2025-01-01',
        is_retired: false,
        current_milestones: {},
        drawing_id: null,
        last_updated_by: null,
        drawing: { drawing_no_norm: 'PW-002' },
      },
      {
        id: '2',
        identity_key: { drawing_norm: 'A', commodity_code: '001', size: '2', seq: 1 },
        percent_complete: 50,
        component_type: 'field_weld',
        project_id: 'proj-1',
        created_at: '2025-01-01',
        last_updated_at: '2025-01-01',
        is_retired: false,
        current_milestones: {},
        drawing_id: null,
        last_updated_by: null,
        drawing: { drawing_no_norm: 'PW-001' },
      },
    ],
    isLoading: false,
  })),
}))

vi.mock('@/contexts/ProjectContext', () => ({
  useProject: () => ({ selectedProjectId: 'proj-1' }),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    session: { access_token: 'test-token' },
    loading: false,
  }),
}))

describe('Component Sorting Integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
  })

  it('sorts components when clicking column headers', async () => {
    const user = userEvent.setup()

    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ComponentsPage projectId="proj-1" />
        </QueryClientProvider>
      </BrowserRouter>
    )

    // Find Progress header - initially not sorted
    const progressHeader = screen.getByRole('button', { name: /progress.*not sorted/i })
    expect(progressHeader).toHaveAttribute('aria-sort', 'none')

    // Click to sort by progress
    await user.click(progressHeader)

    // Verify button now shows it's sorted by progress ascending
    expect(progressHeader).toHaveAttribute('aria-sort', 'ascending')
    expect(progressHeader).toHaveAccessibleName(/progress.*sorted ascending/i)

    // Click again to sort descending
    await user.click(progressHeader)
    expect(progressHeader).toHaveAttribute('aria-sort', 'descending')
    expect(progressHeader).toHaveAccessibleName(/progress.*sorted descending/i)
  })
})
