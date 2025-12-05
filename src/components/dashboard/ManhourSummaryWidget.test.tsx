/**
 * ManhourSummaryWidget Component Tests
 * Feature: 032-manhour-earned-value
 *
 * Test scenarios:
 * 1. Loading state - shows skeleton when loading
 * 2. No budget state - shows "Configure Budget" prompt with link
 * 3. With budget state - shows all 4 metrics (Budgeted, Earned, Remaining, % Complete)
 * 4. Permission check - hidden for unauthorized users (non-PM/Admin/Owner roles)
 * 5. Formatting - large numbers formatted with commas, percentages with 1 decimal
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ManhourSummaryWidget } from './ManhourSummaryWidget';
import type { ProjectManhourSummary } from '@/hooks/useProjectManhours';

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('@/hooks/useProjectManhours');
vi.mock('@/lib/permissions/manhour-permissions');
vi.mock('@/contexts/ProjectContext');

import { useProjectManhours } from '@/hooks/useProjectManhours';
import { useManhourPermissions } from '@/lib/permissions/manhour-permissions';
import { useProject } from '@/contexts/ProjectContext';

// ============================================================================
// TEST SETUP
// ============================================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function renderWidget(projectId?: string) {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ManhourSummaryWidget projectId={projectId} />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('ManhourSummaryWidget', () => {
  const testProjectId = 'test-project-123';

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks - can override in individual tests
    vi.mocked(useProject).mockReturnValue({
      selectedProjectId: testProjectId,
      selectProject: vi.fn(),
      clearProject: vi.fn(),
    });

    vi.mocked(useManhourPermissions).mockReturnValue({
      canViewManhours: true,
      canEditBudget: true,
    });
  });

  // ==========================================================================
  // PERMISSION CHECKS
  // ==========================================================================

  describe('Permission checks', () => {
    it('should return null when user lacks permission to view manhours', () => {
      vi.mocked(useManhourPermissions).mockReturnValue({
        canViewManhours: false,
        canEditBudget: false,
      });

      vi.mocked(useProjectManhours).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      const { container } = renderWidget();
      expect(container.firstChild).toBeNull();
    });

    it('should render when user has permission to view manhours', () => {
      vi.mocked(useManhourPermissions).mockReturnValue({
        canViewManhours: true,
        canEditBudget: false,
      });

      vi.mocked(useProjectManhours).mockReturnValue({
        data: { has_budget: false },
        isLoading: false,
        error: null,
      } as any);

      renderWidget();
      expect(screen.getByText('Manhour Summary')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // LOADING STATE
  // ==========================================================================

  describe('Loading state', () => {
    it('should show skeleton loaders when loading', () => {
      vi.mocked(useProjectManhours).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      renderWidget();

      expect(screen.getByText('Manhour Summary')).toBeInTheDocument();
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons).toHaveLength(4); // 4 skeleton boxes in 2x2 grid
    });
  });

  // ==========================================================================
  // NO BUDGET STATE
  // ==========================================================================

  describe('No budget state', () => {
    it('should show "Configure Budget" prompt when no budget exists', () => {
      const summaryData: ProjectManhourSummary = {
        has_budget: false,
      };

      vi.mocked(useProjectManhours).mockReturnValue({
        data: summaryData,
        isLoading: false,
        error: null,
      } as any);

      renderWidget();

      expect(screen.getByText('Manhour Summary')).toBeInTheDocument();
      expect(
        screen.getByText('No manhour budget configured for this project.')
      ).toBeInTheDocument();
      expect(screen.getByText('Configure Budget')).toBeInTheDocument();
    });

    it('should link to correct settings page when no budget exists', () => {
      const summaryData: ProjectManhourSummary = {
        has_budget: false,
      };

      vi.mocked(useProjectManhours).mockReturnValue({
        data: summaryData,
        isLoading: false,
        error: null,
      } as any);

      renderWidget();

      const link = screen.getByText('Configure Budget').closest('a');
      expect(link).toHaveAttribute(
        'href',
        `/projects/${testProjectId}/settings/manhours`
      );
    });

    it('should use prop projectId for settings link when provided', () => {
      const propProjectId = 'prop-project-456';
      const summaryData: ProjectManhourSummary = {
        has_budget: false,
      };

      vi.mocked(useProjectManhours).mockReturnValue({
        data: summaryData,
        isLoading: false,
        error: null,
      } as any);

      renderWidget(propProjectId);

      const link = screen.getByText('Configure Budget').closest('a');
      expect(link).toHaveAttribute(
        'href',
        `/projects/${propProjectId}/settings/manhours`
      );
    });

    it('should show prompt when has_budget is false and budget is undefined', () => {
      const summaryData: ProjectManhourSummary = {
        has_budget: false,
        budget: undefined,
      };

      vi.mocked(useProjectManhours).mockReturnValue({
        data: summaryData,
        isLoading: false,
        error: null,
      } as any);

      renderWidget();

      expect(
        screen.getByText('No manhour budget configured for this project.')
      ).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // WITH BUDGET STATE
  // ==========================================================================

  describe('With budget state', () => {
    it('should display all 4 metrics when budget exists', () => {
      const summaryData: ProjectManhourSummary = {
        has_budget: true,
        budget: {
          id: 'budget-1',
          version_number: 1,
          total_budgeted_mh: 10000,
          allocated_mh: 9500,
          earned_mh: 4000,
          remaining_mh: 6000,
          percent_complete: 40.0,
          component_count: 100,
          revision_reason: 'Initial budget',
          effective_date: '2025-01-01',
        },
      };

      vi.mocked(useProjectManhours).mockReturnValue({
        data: summaryData,
        isLoading: false,
        error: null,
      } as any);

      renderWidget();

      // Check all 4 metric labels
      expect(screen.getByText('Budgeted')).toBeInTheDocument();
      expect(screen.getByText('Earned')).toBeInTheDocument();
      expect(screen.getByText('Remaining')).toBeInTheDocument();
      expect(screen.getByText('Complete')).toBeInTheDocument();

      // Check all 4 metric values (unique values to avoid duplicates)
      expect(screen.getByText('10,000 MH')).toBeInTheDocument();
      expect(screen.getByText('4,000 MH')).toBeInTheDocument();
      expect(screen.getByText('6,000 MH')).toBeInTheDocument();
      expect(screen.getByText('40.0%')).toBeInTheDocument();
    });

    it('should format large numbers with commas', () => {
      const summaryData: ProjectManhourSummary = {
        has_budget: true,
        budget: {
          id: 'budget-1',
          version_number: 1,
          total_budgeted_mh: 1234567,
          allocated_mh: 1200000,
          earned_mh: 987654,
          remaining_mh: 246913,
          percent_complete: 80.0,
          component_count: 500,
          revision_reason: 'Large budget',
          effective_date: '2025-01-01',
        },
      };

      vi.mocked(useProjectManhours).mockReturnValue({
        data: summaryData,
        isLoading: false,
        error: null,
      } as any);

      renderWidget();

      expect(screen.getByText('1,234,567 MH')).toBeInTheDocument();
      expect(screen.getByText('987,654 MH')).toBeInTheDocument();
      expect(screen.getByText('246,913 MH')).toBeInTheDocument();
    });

    it('should format percentages with 1 decimal place', () => {
      const summaryData: ProjectManhourSummary = {
        has_budget: true,
        budget: {
          id: 'budget-1',
          version_number: 1,
          total_budgeted_mh: 10000,
          allocated_mh: 10000,
          earned_mh: 3333,
          remaining_mh: 6667,
          percent_complete: 33.333333,
          component_count: 100,
          revision_reason: 'Initial budget',
          effective_date: '2025-01-01',
        },
      };

      vi.mocked(useProjectManhours).mockReturnValue({
        data: summaryData,
        isLoading: false,
        error: null,
      } as any);

      renderWidget();

      expect(screen.getByText('33.3%')).toBeInTheDocument();
    });

    it('should handle zero values correctly', () => {
      const summaryData: ProjectManhourSummary = {
        has_budget: true,
        budget: {
          id: 'budget-1',
          version_number: 1,
          total_budgeted_mh: 5000,
          allocated_mh: 0,
          earned_mh: 0,
          remaining_mh: 5000,
          percent_complete: 0.0,
          component_count: 0,
          revision_reason: 'Initial budget',
          effective_date: '2025-01-01',
        },
      };

      vi.mocked(useProjectManhours).mockReturnValue({
        data: summaryData,
        isLoading: false,
        error: null,
      } as any);

      renderWidget();

      // Budgeted and Remaining are both 5,000, so there are 2 occurrences
      const fiveThousandElements = screen.getAllByText('5,000 MH');
      expect(fiveThousandElements).toHaveLength(2);

      expect(screen.getByText('0 MH')).toBeInTheDocument();
      expect(screen.getByText('0.0%')).toBeInTheDocument();
    });

    it('should handle 100% completion correctly', () => {
      const summaryData: ProjectManhourSummary = {
        has_budget: true,
        budget: {
          id: 'budget-1',
          version_number: 1,
          total_budgeted_mh: 8000,
          allocated_mh: 8000,
          earned_mh: 8000,
          remaining_mh: 0,
          percent_complete: 100.0,
          component_count: 100,
          revision_reason: 'Initial budget',
          effective_date: '2025-01-01',
        },
      };

      vi.mocked(useProjectManhours).mockReturnValue({
        data: summaryData,
        isLoading: false,
        error: null,
      } as any);

      renderWidget();

      // Budgeted and Earned are both 8,000, so there are 2 occurrences
      const eightThousandElements = screen.getAllByText('8,000 MH');
      expect(eightThousandElements).toHaveLength(2);

      expect(screen.getByText('0 MH')).toBeInTheDocument();
      expect(screen.getByText('100.0%')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // PROJECT CONTEXT
  // ==========================================================================

  describe('Project context', () => {
    it('should use selectedProjectId from context when no prop provided', () => {
      const contextProjectId = 'context-project-789';

      vi.mocked(useProject).mockReturnValue({
        selectedProjectId: contextProjectId,
        selectProject: vi.fn(),
        clearProject: vi.fn(),
      });

      vi.mocked(useProjectManhours).mockReturnValue({
        data: { has_budget: false },
        isLoading: false,
        error: null,
      } as any);

      renderWidget();

      // Verify hook was called with context project ID
      expect(useProjectManhours).toHaveBeenCalledWith(contextProjectId);
    });

    it('should prefer prop projectId over context projectId', () => {
      const propProjectId = 'prop-project-999';
      const contextProjectId = 'context-project-888';

      vi.mocked(useProject).mockReturnValue({
        selectedProjectId: contextProjectId,
        selectProject: vi.fn(),
        clearProject: vi.fn(),
      });

      vi.mocked(useProjectManhours).mockReturnValue({
        data: { has_budget: false },
        isLoading: false,
        error: null,
      } as any);

      renderWidget(propProjectId);

      // Verify hook was called with prop project ID, not context
      expect(useProjectManhours).toHaveBeenCalledWith(propProjectId);
    });

    it('should pass undefined to hook when no projectId available', () => {
      vi.mocked(useProject).mockReturnValue({
        selectedProjectId: null,
        selectProject: vi.fn(),
        clearProject: vi.fn(),
      });

      vi.mocked(useProjectManhours).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      renderWidget();

      // Verify hook was called with undefined
      expect(useProjectManhours).toHaveBeenCalledWith(undefined);
    });
  });
});
