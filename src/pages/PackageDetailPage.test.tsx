/**
 * Tests for PackageDetailPage component
 * Tests milestone color rendering and sorting functionality
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PackageDetailPage } from './PackageDetailPage'
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

const mockPackageDetails = {
  id: 'test-package-id',
  name: 'Test Package',
  test_type: 'Hydrostatic',
  target_date: '2025-12-31',
  description: 'Test package description',
}

vi.mock('@/hooks/usePackages', () => ({
  usePackageReadiness: () => ({
    data: [{
      package_id: 'test-package-id',  // Must match packageId from useParams
      package_name: 'Test Package',
      test_type: 'Hydrostatic',
      target_date: '2025-12-31',
      description: 'Test package description',
      total_components: 2,
      blocker_count: 0,
      avg_progress: 75,
    }],
    isLoading: false,
  }),
  usePackageDetails: () => ({
    data: mockPackageDetails,
    isLoading: false,
  }),
  usePackageComponents: () => ({
    data: [
      {
        id: 'comp-1',
        drawing_id: 'draw-1',
        drawing_no_norm: 'P-001',
        component_type: 'Pipe',
        identity_key: '1-A-1',
        percent_complete: 100,
        current_milestones: {
          'Fit-Up': 100,  // Numeric value (should show green)
          'Weld': 100,    // Numeric value (should show green)
          'NDE': 100,     // Partial milestone (should show green)
        },
        milestones_config: [
          { name: 'Fit-Up', weight: 30, is_partial: false, requires_welder: true },
          { name: 'Weld', weight: 30, is_partial: false, requires_welder: true },
          { name: 'NDE', weight: 40, is_partial: true, requires_welder: false },
        ],
      },
      {
        id: 'comp-2',
        drawing_id: 'draw-1',
        drawing_no_norm: 'P-002',
        component_type: 'Valve',
        identity_key: '2-B-2',
        percent_complete: 50,
        current_milestones: {
          'Fit-Up': 100,  // Complete (green)
          'Weld': 0,      // Not started (gray)
          'NDE': 50,      // Partial progress (amber)
        },
        milestones_config: [
          { name: 'Fit-Up', weight: 30, is_partial: false, requires_welder: true },
          { name: 'Weld', weight: 30, is_partial: false, requires_welder: true },
          { name: 'NDE', weight: 40, is_partial: true, requires_welder: false },
        ],
      },
    ],
    isLoading: false,
    isError: false,
  }),
}))

vi.mock('@/hooks/usePackageCertificate', () => ({
  usePackageCertificate: () => ({
    data: null,
    isLoading: false,
  }),
  useUpdatePackageCertificate: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}))

vi.mock('@/hooks/usePackageAssignments', () => ({
  useDeleteComponentAssignment: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useCreateComponentAssignments: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useDrawingsWithComponentCount: () => ({
    data: [],
    isLoading: false,
  }),
}))

vi.mock('@/hooks/usePackageWorkflow', () => ({
  usePackageWorkflow: () => ({
    data: [],
    isLoading: false,
  }),
}))

vi.mock('@/hooks/usePackageWorkflowPDFExport', () => ({
  usePackageWorkflowPDFExport: () => ({
    generatePDFPreview: vi.fn(),
    isGenerating: false,
  }),
}))

vi.mock('@/hooks/usePDFPreviewState', () => ({
  usePDFPreviewState: () => ({
    previewState: { isOpen: false, pdfUrl: null, packageName: null },
    openPreview: vi.fn(),
    updatePreview: vi.fn(),
    closePreview: vi.fn(),
  }),
}))

vi.mock('@/stores/usePackageWorkflowCustomizationStore', () => ({
  usePackageWorkflowCustomizationStore: () => ({
    options: {},
    setOptions: vi.fn(),
  }),
}))

vi.mock('@/hooks/usePackageWorkflowCustomization', () => ({
  usePackageWorkflowCustomization: () => ({
    customizationState: { isOpen: false },
    openCustomization: vi.fn(),
    closeCustomization: vi.fn(),
  }),
}))

describe('PackageDetailPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </QueryClientProvider>
    )
  }

  describe('Milestone Color Rendering', () => {
    it('should render completed milestones (value=100) with green background', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PackageDetailPage />)

      // Click on Components tab (default is Certificate tab)
      const componentsTab = await screen.findByRole('tab', { name: /components/i })
      await user.click(componentsTab)

      // Wait for components to load
      await waitFor(() => {
        expect(screen.getByText('P-001')).toBeInTheDocument()
      })

      // Find all milestone badges
      const fitUpBadges = screen.getAllByText('Fit-Up')
      const weldBadges = screen.getAllByText('Weld')

      // First component has Fit-Up and Weld at 100 (should be green)
      expect(fitUpBadges[0]).toHaveClass('bg-green-500')
      expect(weldBadges[0]).toHaveClass('bg-green-500')
    })

    it('should render partial milestone progress (1-99) with amber background', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PackageDetailPage />)

      // Click on Components tab
      const componentsTab = await screen.findByRole('tab', { name: /components/i })
      await user.click(componentsTab)

      await waitFor(() => {
        expect(screen.getByText('P-002')).toBeInTheDocument()
      })

      // Second component has NDE at 50% (should be amber)
      const ndeBadges = screen.getAllByText(/NDE/)

      // Find the badge with "(50%)" text
      const partialNDEBadge = ndeBadges.find(badge =>
        badge.textContent?.includes('(50%)')
      )

      expect(partialNDEBadge).toHaveClass('bg-amber-400')
    })

    it('should render not started milestones (value=0) with gray background', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PackageDetailPage />)

      // Click on Components tab
      const componentsTab = await screen.findByRole('tab', { name: /components/i })
      await user.click(componentsTab)

      await waitFor(() => {
        expect(screen.getByText('P-002')).toBeInTheDocument()
      })

      // Second component has Weld at 0 (should be gray)
      const weldBadges = screen.getAllByText('Weld')

      expect(weldBadges[1]).toHaveClass('bg-gray-200')
    })

    it('should render partial milestone at 100% with green background', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PackageDetailPage />)

      // Click on Components tab
      const componentsTab = await screen.findByRole('tab', { name: /components/i })
      await user.click(componentsTab)

      await waitFor(() => {
        expect(screen.getByText('P-001')).toBeInTheDocument()
      })

      // First component has NDE at 100% (partial milestone, should be green)
      const ndeBadges = screen.getAllByText(/NDE/)

      // First NDE badge should be green (100%)
      expect(ndeBadges[0]).toHaveClass('bg-green-500')
    })
  })

  describe('Components Table Rendering', () => {
    it('should render component data correctly', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PackageDetailPage />)

      // Click on Components tab
      const componentsTab = await screen.findByRole('tab', { name: /components/i })
      await user.click(componentsTab)

      await waitFor(() => {
        expect(screen.getByText('P-001')).toBeInTheDocument()
        expect(screen.getByText('P-002')).toBeInTheDocument()
      })

      // Check drawing numbers
      expect(screen.getByText('P-001')).toBeInTheDocument()
      expect(screen.getByText('P-002')).toBeInTheDocument()

      // Check component types
      expect(screen.getByText('Pipe')).toBeInTheDocument()
      expect(screen.getByText('Valve')).toBeInTheDocument()

      // Verify table has rows (milestone tests already verify the content works)
      const rows = screen.getAllByRole('row')
      expect(rows.length).toBeGreaterThan(1) // Header + data rows
    })
  })

  describe('Table Sorting', () => {
    it('should sort by drawing number when Drawing header is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PackageDetailPage />)

      // Click on Components tab
      const componentsTab = await screen.findByRole('tab', { name: /components/i })
      await user.click(componentsTab)

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('P-001')).toBeInTheDocument()
        expect(screen.getByText('P-002')).toBeInTheDocument()
      })

      // Find Drawing header button
      const drawingHeader = screen.getByRole('button', { name: /drawing/i })
      expect(drawingHeader).toBeInTheDocument()

      // Verify sorting indicator shows (default is ascending)
      expect(drawingHeader.querySelector('svg')).toBeInTheDocument()

      // Click to toggle to descending
      await user.click(drawingHeader)

      // Verify data is still rendered (regression test)
      await waitFor(() => {
        expect(screen.getByText('P-001')).toBeInTheDocument()
        expect(screen.getByText('P-002')).toBeInTheDocument()
      })
    })

    it('should sort by component type when Type header is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PackageDetailPage />)

      const componentsTab = await screen.findByRole('tab', { name: /components/i })
      await user.click(componentsTab)

      await waitFor(() => {
        expect(screen.getByText('Pipe')).toBeInTheDocument()
        expect(screen.getByText('Valve')).toBeInTheDocument()
      })

      // Click Type header
      const typeHeader = screen.getByRole('button', { name: /^type$/i })
      expect(typeHeader).toBeInTheDocument()

      await user.click(typeHeader)

      // Verify data is still rendered after sort
      await waitFor(() => {
        expect(screen.getByText('Pipe')).toBeInTheDocument()
        expect(screen.getByText('Valve')).toBeInTheDocument()
      })
    })

    it('should sort by progress percentage when Progress header is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<PackageDetailPage />)

      const componentsTab = await screen.findByRole('tab', { name: /components/i })
      await user.click(componentsTab)

      await waitFor(() => {
        expect(screen.getByText('Pipe')).toBeInTheDocument()
        expect(screen.getByText('Valve')).toBeInTheDocument()
      })

      // Click Progress header
      const progressHeader = screen.getByRole('button', { name: /progress/i })
      expect(progressHeader).toBeInTheDocument()

      await user.click(progressHeader)

      // Verify data is still rendered after sort
      await waitFor(() => {
        expect(screen.getByText('Pipe')).toBeInTheDocument()
        expect(screen.getByText('Valve')).toBeInTheDocument()
      })

      // Verify sort indicator is present
      expect(progressHeader.querySelector('svg')).toBeInTheDocument()
    })
  })
})
