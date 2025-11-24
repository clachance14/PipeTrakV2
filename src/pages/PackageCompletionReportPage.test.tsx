/**
 * Tests for PackageCompletionReportPage component
 * Ensures navigation and report rendering work correctly
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PackageCompletionReportPage } from './PackageCompletionReportPage'
import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ packageId: 'test-package-id' }),
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@/contexts/ProjectContext', () => ({
  useProject: () => ({ selectedProjectId: 'test-project-id' }),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    isLoading: false,
  }),
}))

vi.mock('@/hooks/usePackages', () => ({
  usePackageDetails: () => ({
    data: {
      id: 'test-package-id',
      name: 'Test Package',
      test_type: 'Hydrostatic',
      target_date: '2025-12-31',
      description: 'Test package description',
    },
    isLoading: false,
  }),
}))

vi.mock('@/hooks/usePackageCompletionReport', () => ({
  usePackageCompletionReport: () => ({
    data: {
      package_id: 'test-package-id',
      package_name: 'Test Package',
      test_type: 'Hydrostatic',
      target_date: '2025-12-31',
      component_summary: [],
      support_summary: [],
      is_draft: true,
      drawing_groups: [],
      total_components: 0,
      total_unique_supports: 0,
      overall_nde_summary: {
        total_welds: 0,
        nde_required_count: 0,
        nde_pass_count: 0,
        nde_fail_count: 0,
        nde_pending_count: 0,
      },
    },
    isLoading: false,
    isError: false,
    error: null,
  }),
}))

describe('PackageCompletionReportPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    mockNavigate.mockClear()
  })

  it('navigates to package detail page when Back to Package is clicked', async () => {
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <PackageCompletionReportPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Back to Package')).toBeInTheDocument()
    })

    const backButton = screen.getByRole('button', { name: /back to package/i })
    await user.click(backButton)

    expect(mockNavigate).toHaveBeenCalledWith('/packages/test-package-id/components')
  })
})
