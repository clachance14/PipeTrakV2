/**
 * TopPackagesWidget Component Tests
 *
 * Test scenarios:
 * 1. Loading state - shows skeleton when loading
 * 2. Empty state - shows message when no packages exist
 * 3. With packages - shows top 5 sorted by avg_percent_complete DESC
 * 4. Click navigation - package rows link to detail page
 * 5. Fewer than 5 packages - shows all available packages
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { TopPackagesWidget } from './TopPackagesWidget';

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('@/hooks/usePackages');

import { usePackageReadiness } from '@/hooks/usePackages';

// ============================================================================
// TEST SETUP
// ============================================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function renderWidget(projectId: string = 'test-project-123') {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TopPackagesWidget projectId={projectId} />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockPackages = [
  {
    package_id: 'pkg-1',
    project_id: 'test-project-123',
    package_name: 'Package Alpha',
    description: 'First package',
    target_date: '2025-03-01',
    total_components: 50,
    completed_components: 25,
    avg_percent_complete: 50,
    blocker_count: 2,
    last_activity_at: '2025-01-10T10:00:00Z',
  },
  {
    package_id: 'pkg-2',
    project_id: 'test-project-123',
    package_name: 'Package Beta',
    description: 'Second package',
    target_date: '2025-04-01',
    total_components: 100,
    completed_components: 85,
    avg_percent_complete: 85,
    blocker_count: 0,
    last_activity_at: '2025-01-09T10:00:00Z',
  },
  {
    package_id: 'pkg-3',
    project_id: 'test-project-123',
    package_name: 'Package Gamma',
    description: 'Third package',
    target_date: '2025-05-01',
    total_components: 30,
    completed_components: 10,
    avg_percent_complete: 33,
    blocker_count: 1,
    last_activity_at: '2025-01-08T10:00:00Z',
  },
  {
    package_id: 'pkg-4',
    project_id: 'test-project-123',
    package_name: 'Package Delta',
    description: 'Fourth package',
    target_date: null,
    total_components: 75,
    completed_components: 75,
    avg_percent_complete: 100,
    blocker_count: 0,
    last_activity_at: '2025-01-07T10:00:00Z',
  },
  {
    package_id: 'pkg-5',
    project_id: 'test-project-123',
    package_name: 'Package Epsilon',
    description: 'Fifth package',
    target_date: '2025-06-01',
    total_components: 20,
    completed_components: 14,
    avg_percent_complete: 72,
    blocker_count: 0,
    last_activity_at: '2025-01-06T10:00:00Z',
  },
  {
    package_id: 'pkg-6',
    project_id: 'test-project-123',
    package_name: 'Package Zeta',
    description: 'Sixth package (should not appear)',
    target_date: '2025-07-01',
    total_components: 10,
    completed_components: 1,
    avg_percent_complete: 10,
    blocker_count: 0,
    last_activity_at: '2025-01-05T10:00:00Z',
  },
];

// ============================================================================
// TEST SUITE
// ============================================================================

describe('TopPackagesWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // LOADING STATE
  // ==========================================================================

  describe('Loading state', () => {
    it('should show skeleton loaders when loading', () => {
      vi.mocked(usePackageReadiness).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as ReturnType<typeof usePackageReadiness>);

      renderWidget();

      expect(screen.getByText('Top Packages')).toBeInTheDocument();
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // EMPTY STATE
  // ==========================================================================

  describe('Empty state', () => {
    it('should show empty message when no packages exist', () => {
      vi.mocked(usePackageReadiness).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePackageReadiness>);

      renderWidget();

      expect(screen.getByText('Top Packages')).toBeInTheDocument();
      expect(screen.getByText('No packages yet')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // WITH PACKAGES
  // ==========================================================================

  describe('With packages', () => {
    it('should display top 5 packages sorted by completion percentage (highest first)', () => {
      vi.mocked(usePackageReadiness).mockReturnValue({
        data: mockPackages,
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePackageReadiness>);

      renderWidget();

      // Should show top 5 by avg_percent_complete DESC:
      // 1. Package Delta (100%)
      // 2. Package Beta (85%)
      // 3. Package Epsilon (72%)
      // 4. Package Alpha (50%)
      // 5. Package Gamma (33%)
      // Package Zeta (10%) should NOT appear

      expect(screen.getByText('Package Delta')).toBeInTheDocument();
      expect(screen.getByText('Package Beta')).toBeInTheDocument();
      expect(screen.getByText('Package Epsilon')).toBeInTheDocument();
      expect(screen.getByText('Package Alpha')).toBeInTheDocument();
      expect(screen.getByText('Package Gamma')).toBeInTheDocument();

      // Package Zeta should NOT be displayed (6th package)
      expect(screen.queryByText('Package Zeta')).not.toBeInTheDocument();
    });

    it('should display percentage for each package', () => {
      vi.mocked(usePackageReadiness).mockReturnValue({
        data: mockPackages,
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePackageReadiness>);

      renderWidget();

      // Check percentages are displayed
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('72%')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('33%')).toBeInTheDocument();
    });

    it('should show progress bars', () => {
      vi.mocked(usePackageReadiness).mockReturnValue({
        data: mockPackages.slice(0, 2),
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePackageReadiness>);

      renderWidget();

      // Check that progress bar containers exist (div-based progress)
      const progressBars = document.querySelectorAll('.bg-gray-200');
      expect(progressBars.length).toBe(2);
    });
  });

  // ==========================================================================
  // FEWER THAN 5 PACKAGES
  // ==========================================================================

  describe('Fewer than 5 packages', () => {
    it('should show all packages when fewer than 5 exist', () => {
      const twoPackages = mockPackages.slice(0, 2);

      vi.mocked(usePackageReadiness).mockReturnValue({
        data: twoPackages,
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePackageReadiness>);

      renderWidget();

      // Should show both packages (sorted by completion)
      expect(screen.getByText('Package Beta')).toBeInTheDocument(); // 85%
      expect(screen.getByText('Package Alpha')).toBeInTheDocument(); // 50%
    });
  });

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  describe('Navigation', () => {
    it('should have clickable package rows linking to package detail', () => {
      vi.mocked(usePackageReadiness).mockReturnValue({
        data: mockPackages.slice(0, 1),
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePackageReadiness>);

      renderWidget();

      // Find the link for Package Alpha
      const packageLink = screen.getByRole('link', { name: /Package Alpha/i });
      expect(packageLink).toHaveAttribute('href', '/packages/pkg-1/components');
    });

    it('should have View All link to packages page', () => {
      vi.mocked(usePackageReadiness).mockReturnValue({
        data: mockPackages,
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePackageReadiness>);

      renderWidget();

      const viewAllLink = screen.getByRole('link', { name: /View All/i });
      expect(viewAllLink).toHaveAttribute('href', '/packages');
    });
  });

  // ==========================================================================
  // NULL PERCENT HANDLING
  // ==========================================================================

  describe('Null percent handling', () => {
    it('should treat null avg_percent_complete as 0%', () => {
      const packageWithNull = [
        {
          ...mockPackages[0],
          avg_percent_complete: null,
        },
      ];

      vi.mocked(usePackageReadiness).mockReturnValue({
        data: packageWithNull,
        isLoading: false,
        error: null,
      } as ReturnType<typeof usePackageReadiness>);

      renderWidget();

      expect(screen.getByText('Package Alpha')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });
});
