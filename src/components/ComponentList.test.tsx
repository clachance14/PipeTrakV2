/**
 * ComponentList component tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentList } from './ComponentList';
import type { Database } from '@/types/database.types';

type Component = Database['public']['Tables']['components']['Row'];

// Mock the preferences store
vi.mock('@/stores/useComponentPreferencesStore', () => ({
  useComponentPreferencesStore: () => ({
    visibleColumns: [
      'selection',
      'identity_key',
      'component_type',
      'percent_complete',
      'milestones',
      'area',
      'system',
      'test_package',
      'drawing',
      'actions',
    ],
    toggleColumn: vi.fn(),
    showAllColumns: vi.fn(),
    density: 'normal',
    setDensity: vi.fn(),
    savedViews: [],
    activeViewId: null,
    createView: vi.fn(),
    updateView: vi.fn(),
    deleteView: vi.fn(),
    selectView: vi.fn(),
    clearView: vi.fn(),
  }),
}));

describe('ComponentList', () => {
  const mockComponent: Component = {
    id: '1',
    identity_key: { drawing_norm: 'A', commodity_code: '001', size: '2', seq: 1 },
    percent_complete: 50,
    component_type: 'spool',
    project_id: 'proj-1',
    created_at: '2025-01-01',
    last_updated_at: '2025-01-01',
    is_retired: false,
    current_milestones: {},
    drawing_id: null,
    last_updated_by: null,
    area_id: null,
    system_id: null,
    test_package_id: null,
  };

  const defaultProps = {
    components: [mockComponent],
    getSortInfo: vi.fn(() => null),
    onSort: vi.fn(),
    sortRules: [],
    onResetSort: vi.fn(),
    selectedIds: new Set<string>(),
    onSelectionChange: vi.fn(),
    onSelectAll: vi.fn(),
    onClearSelection: vi.fn(),
    allSelected: false,
    someSelected: false,
    onViewComponent: vi.fn(),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('shows spinner when loading', () => {
      const { container } = render(<ComponentList {...defaultProps} isLoading={true} components={[]} />);

      // Look for the spinner by class name (it's an SVG, not an img)
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(screen.getByText(/loading components/i)).toBeInTheDocument();
    });

    it('shows loading message with spinner', () => {
      render(<ComponentList {...defaultProps} isLoading={true} components={[]} />);

      expect(screen.getByText(/loading components/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows "No components match your filters" when hasActiveFilters=true', () => {
      render(
        <ComponentList
          {...defaultProps}
          components={[]}
          hasActiveFilters={true}
        />
      );

      expect(screen.getByText(/no components match your filters/i)).toBeInTheDocument();
    });

    it('shows "No components found" when hasActiveFilters=false', () => {
      render(
        <ComponentList
          {...defaultProps}
          components={[]}
          hasActiveFilters={false}
        />
      );

      expect(screen.getByText(/no components found/i)).toBeInTheDocument();
      expect(screen.queryByText(/no components match your filters/i)).not.toBeInTheDocument();
    });

    it('shows "Clear All Filters" button when hasActiveFilters=true and onClearFilters provided', () => {
      const mockOnClearFilters = vi.fn();
      render(
        <ComponentList
          {...defaultProps}
          components={[]}
          hasActiveFilters={true}
          onClearFilters={mockOnClearFilters}
        />
      );

      expect(screen.getByRole('button', { name: /clear all filters/i })).toBeInTheDocument();
    });

    it('hides button when no filters active', () => {
      const mockOnClearFilters = vi.fn();
      render(
        <ComponentList
          {...defaultProps}
          components={[]}
          hasActiveFilters={false}
          onClearFilters={mockOnClearFilters}
        />
      );

      expect(screen.queryByRole('button', { name: /clear all filters/i })).not.toBeInTheDocument();
    });

    it('hides button when filters active but no onClearFilters handler', () => {
      render(
        <ComponentList
          {...defaultProps}
          components={[]}
          hasActiveFilters={true}
        />
      );

      expect(screen.queryByRole('button', { name: /clear all filters/i })).not.toBeInTheDocument();
    });

    it('calls onClearFilters when Clear All Filters button clicked', async () => {
      const user = userEvent.setup();
      const mockOnClearFilters = vi.fn();
      render(
        <ComponentList
          {...defaultProps}
          components={[]}
          hasActiveFilters={true}
          onClearFilters={mockOnClearFilters}
        />
      );

      const clearButton = screen.getByRole('button', { name: /clear all filters/i });
      await user.click(clearButton);

      expect(mockOnClearFilters).toHaveBeenCalledOnce();
    });

    it('shows appropriate message for filtered empty state', () => {
      render(
        <ComponentList
          {...defaultProps}
          components={[]}
          hasActiveFilters={true}
        />
      );

      expect(screen.getByText(/try adjusting your filters to see more results/i)).toBeInTheDocument();
    });

    it('shows appropriate message for unfiltered empty state', () => {
      render(
        <ComponentList
          {...defaultProps}
          components={[]}
          hasActiveFilters={false}
        />
      );

      expect(screen.getByText(/no components have been imported for this project yet/i)).toBeInTheDocument();
    });
  });

  describe('Component Rendering', () => {
    it('renders component list with data', () => {
      render(<ComponentList {...defaultProps} />);

      expect(screen.getByText(/1 components/i)).toBeInTheDocument();
    });

    it('renders sortable column headers', () => {
      render(<ComponentList {...defaultProps} />);

      // Headers should be present (using text content instead of role)
      expect(screen.getByText('Identity')).toBeInTheDocument();
      expect(screen.getByText('Progress')).toBeInTheDocument();
    });
  });
});
