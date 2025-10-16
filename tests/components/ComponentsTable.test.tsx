/**
 * ComponentsTable Component Tests
 *
 * Feature: 005-sprint-1-core (T026)
 * Tests basic functionality of the ComponentsTable page component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ComponentsTable } from '@/pages/ComponentsTable';

// Mock Layout component
vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

// Mock hooks
const mockUseParams = vi.fn();
const mockUseComponents = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => mockUseParams(),
  };
});

vi.mock('@/hooks/useComponents', () => ({
  useComponents: (projectId: string, filters: any) => mockUseComponents(projectId, filters),
}));

describe('ComponentsTable', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    // Default mock: valid projectId
    mockUseParams.mockReturnValue({ projectId: 'test-project-123' });

    // Default mock: successful query with sample data
    mockUseComponents.mockReturnValue({
      data: [
        {
          id: 'comp-1',
          component_type: 'spool',
          identity_key: { tag: 'SP-001', area: 'A1' },
          percent_complete: 75.5,
          last_updated_at: '2025-10-16T10:00:00Z',
        },
        {
          id: 'comp-2',
          component_type: 'valve',
          identity_key: { tag: 'VLV-001', sequence: 1 },
          percent_complete: 45.0,
          last_updated_at: '2025-10-16T09:00:00Z',
        },
        {
          id: 'comp-3',
          component_type: 'field_weld',
          identity_key: { weld_number: 42 },
          percent_complete: 90.0,
          last_updated_at: '2025-10-16T11:00:00Z',
        },
      ],
      isLoading: false,
      error: null,
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ComponentsTable />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  describe('Rendering', () => {
    it('renders component table with data', async () => {
      renderComponent();

      await waitFor(() => {
        // Check for component types in table (using getAllByText since they also appear in dropdown)
        const spoolElements = screen.getAllByText('Spool');
        expect(spoolElements.length).toBeGreaterThan(0);

        const valveElements = screen.getAllByText('Valve');
        expect(valveElements.length).toBeGreaterThan(0);

        const weldElements = screen.getAllByText('Field Weld');
        expect(weldElements.length).toBeGreaterThan(0);
      });
    });

    it('displays component count in header', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/Showing 3 of 3 components/)).toBeInTheDocument();
      });
    });

    it('displays 100 row limit warning when >100 components', async () => {
      mockUseComponents.mockReturnValue({
        data: Array.from({ length: 150 }, (_, i) => ({
          id: `comp-${i}`,
          component_type: 'spool',
          identity_key: { tag: `SP-${i}` },
          percent_complete: 50,
          last_updated_at: '2025-10-16T10:00:00Z',
        })),
        isLoading: false,
        error: null,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/limited to 100 rows/)).toBeInTheDocument();
      });
    });

    it('shows error message when projectId is missing', () => {
      mockUseParams.mockReturnValue({});

      renderComponent();

      expect(screen.getByText('Error: No project selected')).toBeInTheDocument();
    });

    it('renders identity_key as formatted JSON', async () => {
      renderComponent();

      await waitFor(() => {
        // Check for JSON-formatted identity key
        const jsonElement = screen.getByText(/"tag": "SP-001"/);
        expect(jsonElement).toBeInTheDocument();
      });
    });
  });

  describe('Loading and Error States', () => {
    it('shows loading spinner when loading', () => {
      mockUseComponents.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      renderComponent();

      expect(screen.getByText('Loading components...')).toBeInTheDocument();
    });

    it('shows error message on query error', () => {
      mockUseComponents.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch components'),
      });

      renderComponent();

      expect(screen.getByText('Error loading components')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch components')).toBeInTheDocument();
    });

    it('shows empty state when no components', async () => {
      mockUseComponents.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/No components found/)).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('filters by component type', async () => {
      renderComponent();

      const dropdown = screen.getByRole('combobox');
      fireEvent.change(dropdown, { target: { value: 'spool' } });

      await waitFor(() => {
        expect(mockUseComponents).toHaveBeenCalledWith(
          'test-project-123',
          expect.objectContaining({ component_type: 'spool' })
        );
      });
    });

    it('shows all types when "All Types" selected', async () => {
      renderComponent();

      const dropdown = screen.getByRole('combobox');
      fireEvent.change(dropdown, { target: { value: '' } });

      await waitFor(() => {
        expect(mockUseComponents).toHaveBeenCalledWith(
          'test-project-123',
          expect.objectContaining({ component_type: undefined })
        );
      });
    });

    it('toggles is_retired filter', async () => {
      renderComponent();

      const checkbox = screen.getByRole('checkbox', { name: /Show Retired/i });
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(mockUseComponents).toHaveBeenCalledWith(
          'test-project-123',
          expect.objectContaining({ is_retired: true })
        );
      });
    });
  });

  describe('Sorting', () => {
    it('sorts by percent_complete in descending order by default when clicked', async () => {
      renderComponent();

      const percentHeader = screen.getByText(/% Complete/);
      fireEvent.click(percentHeader);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        // First data row should have highest percent (90.0%)
        expect(rows[1]).toHaveTextContent('90.00%');
      });
    });

    it('toggles sort order when clicking same column', async () => {
      renderComponent();

      const percentHeader = screen.getByText(/% Complete/);

      // First click: sort descending
      fireEvent.click(percentHeader);

      await waitFor(() => {
        expect(screen.getByText('↓')).toBeInTheDocument();
      });

      // Second click: sort ascending
      fireEvent.click(percentHeader);

      await waitFor(() => {
        expect(screen.getByText('↑')).toBeInTheDocument();
      });
    });

    it('sorts by last_updated_at in descending order by default', async () => {
      renderComponent();

      // Default sort is last_updated_at desc
      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        // First data row should have most recent update (11:00)
        expect(rows[1]).toHaveTextContent('Field Weld');
      });
    });

    it('changes sort column when clicking different header', async () => {
      renderComponent();

      // Initially sorted by last_updated_at
      const lastUpdatedHeader = screen.getByText(/Last Updated/);
      expect(lastUpdatedHeader.parentElement).toHaveTextContent('↓');

      // Click percent_complete header
      const percentHeader = screen.getByText(/% Complete/);
      fireEvent.click(percentHeader);

      await waitFor(() => {
        // Should now show sort indicator on percent_complete
        expect(percentHeader.parentElement).toHaveTextContent('↓');
      });
    });
  });

  describe('100 Row Limit', () => {
    it('enforces 100 row limit when more components exist', async () => {
      mockUseComponents.mockReturnValue({
        data: Array.from({ length: 150 }, (_, i) => ({
          id: `comp-${i}`,
          component_type: 'spool',
          identity_key: { tag: `SP-${i}` },
          percent_complete: 50,
          last_updated_at: '2025-10-16T10:00:00Z',
        })),
        isLoading: false,
        error: null,
      });

      renderComponent();

      await waitFor(() => {
        // Should only render 100 rows + 1 header row = 101 total rows
        const rows = screen.getAllByRole('row');
        expect(rows.length).toBe(101); // 1 header + 100 data rows
      });
    });
  });
});
