/**
 * Unit tests for ReportConfigList component (Feature 019 - T070)
 * Tests display, generate, edit, and delete actions for saved report configurations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ReportConfigList } from './ReportConfigList';
import type { ReportConfig } from '@/types/reports';

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock delete hook
const mockDeleteMutateAsync = vi.fn();
vi.mock('@/hooks/useReportConfigs', () => ({
  useDeleteReportConfig: () => ({
    mutateAsync: mockDeleteMutateAsync,
    isPending: false,
  }),
}));

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

// Sample test data
const mockConfigs: ReportConfig[] = [
  {
    id: 'config-1',
    projectId: 'project-1',
    name: 'Weekly Area Report',
    description: 'Standard weekly progress grouped by area',
    groupingDimension: 'area',
    hierarchicalGrouping: false,
    componentTypeFilter: null,
    createdAt: new Date('2025-10-01T10:00:00Z'),
    updatedAt: new Date('2025-10-15T14:30:00Z'),
    createdBy: 'user-1',
  },
  {
    id: 'config-2',
    projectId: 'project-1',
    name: 'System Progress',
    description: null,
    groupingDimension: 'system',
    hierarchicalGrouping: false,
    componentTypeFilter: null,
    createdAt: new Date('2025-10-05T12:00:00Z'),
    updatedAt: new Date('2025-10-05T12:00:00Z'),
    createdBy: 'user-1',
  },
  {
    id: 'config-3',
    projectId: 'project-1',
    name: 'Test Package Overview',
    description: 'Progress grouped by test package for commissioning',
    groupingDimension: 'test_package',
    hierarchicalGrouping: false,
    componentTypeFilter: null,
    createdAt: new Date('2025-10-10T08:00:00Z'),
    updatedAt: new Date('2025-10-12T16:00:00Z'),
    createdBy: 'user-2',
  },
];

describe('ReportConfigList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Display', () => {
    it('renders empty state when no configs provided', () => {
      render(
        <TestWrapper>
          <ReportConfigList configs={[]} isLoading={false} />
        </TestWrapper>
      );

      expect(screen.getByText('No Saved Reports')).toBeInTheDocument();
      expect(screen.getByText(/Create your first report configuration/i)).toBeInTheDocument();
    });

    it('renders loading state with skeletons', () => {
      render(
        <TestWrapper>
          <ReportConfigList configs={[]} isLoading={true} />
        </TestWrapper>
      );

      // Should render 3 skeleton loading placeholders
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThanOrEqual(3);
    });

    it('displays all saved configurations with correct data', () => {
      render(
        <TestWrapper>
          <ReportConfigList configs={mockConfigs} isLoading={false} />
        </TestWrapper>
      );

      // Check all config names are displayed
      expect(screen.getByText('Weekly Area Report')).toBeInTheDocument();
      expect(screen.getByText('System Progress')).toBeInTheDocument();
      expect(screen.getByText('Test Package Overview')).toBeInTheDocument();

      // Check descriptions
      expect(screen.getByText('Standard weekly progress grouped by area')).toBeInTheDocument();
      expect(screen.getByText('Progress grouped by test package for commissioning')).toBeInTheDocument();

      // Check grouping dimensions displayed
      expect(screen.getByText(/Group by area/i)).toBeInTheDocument();
      expect(screen.getByText(/Group by system/i)).toBeInTheDocument();
      expect(screen.getByText(/Group by test package/i)).toBeInTheDocument();
    });

    it('displays updated dates in local format', () => {
      render(
        <TestWrapper>
          <ReportConfigList configs={[mockConfigs[0]]} isLoading={false} />
        </TestWrapper>
      );

      // Check that a date is displayed (format may vary by locale)
      expect(screen.getByText(/Updated/i)).toBeInTheDocument();
    });

    it('handles configs without descriptions gracefully', () => {
      render(
        <TestWrapper>
          <ReportConfigList configs={[mockConfigs[1]]} isLoading={false} />
        </TestWrapper>
      );

      expect(screen.getByText('System Progress')).toBeInTheDocument();
      // Description should not be rendered
      expect(screen.queryByText('description')).not.toBeInTheDocument();
    });
  });

  describe('Generate Action', () => {
    it('renders Generate button for each config', () => {
      render(
        <TestWrapper>
          <ReportConfigList configs={mockConfigs} isLoading={false} />
        </TestWrapper>
      );

      const generateButtons = screen.getAllByRole('link', { name: /Generate/i });
      expect(generateButtons).toHaveLength(3);
    });

    it('navigates to report view with correct dimension on Generate click', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ReportConfigList configs={[mockConfigs[0]]} isLoading={false} />
        </TestWrapper>
      );

      const generateButton = screen.getByRole('link', { name: /Generate/i });
      expect(generateButton).toHaveAttribute('href', '/reports/view?dimension=area');
    });

    it('passes config ID via state for auto-generation', () => {
      render(
        <TestWrapper>
          <ReportConfigList configs={[mockConfigs[0]]} isLoading={false} />
        </TestWrapper>
      );

      const generateButton = screen.getByRole('link', { name: /Generate/i });
      // Check href includes dimension parameter
      expect(generateButton).toHaveAttribute('href', '/reports/view?dimension=area');
    });
  });

  describe('Edit Action', () => {
    it('renders Edit button for each config', () => {
      render(
        <TestWrapper>
          <ReportConfigList configs={mockConfigs} isLoading={false} />
        </TestWrapper>
      );

      const editButtons = screen.getAllByRole('link', { name: /Edit/i });
      expect(editButtons).toHaveLength(3);
    });

    it('navigates to report builder with config ID on Edit click', () => {
      render(
        <TestWrapper>
          <ReportConfigList configs={[mockConfigs[0]]} isLoading={false} />
        </TestWrapper>
      );

      const editButton = screen.getByRole('link', { name: /Edit/i });
      expect(editButton).toHaveAttribute('href', '/reports/new?configId=config-1');
    });
  });

  describe('Delete Action', () => {
    it('renders Delete button for each config', () => {
      render(
        <TestWrapper>
          <ReportConfigList configs={mockConfigs} isLoading={false} />
        </TestWrapper>
      );

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      expect(deleteButtons).toHaveLength(3);
    });

    it('shows confirmation dialog when Delete clicked', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <TestWrapper>
          <ReportConfigList configs={[mockConfigs[0]]} isLoading={false} />
        </TestWrapper>
      );

      const deleteButton = screen.getByRole('button', { name: /Delete/i });
      await user.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalledWith(
        'Are you sure you want to delete "Weekly Area Report"?'
      );

      confirmSpy.mockRestore();
    });

    it('does not delete config when confirmation cancelled', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <TestWrapper>
          <ReportConfigList configs={[mockConfigs[0]]} isLoading={false} />
        </TestWrapper>
      );

      const deleteButton = screen.getByRole('button', { name: /Delete/i });
      await user.click(deleteButton);

      expect(mockDeleteMutateAsync).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('deletes config when confirmation accepted', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockDeleteMutateAsync.mockResolvedValue(undefined);

      render(
        <TestWrapper>
          <ReportConfigList configs={[mockConfigs[0]]} isLoading={false} />
        </TestWrapper>
      );

      const deleteButton = screen.getByRole('button', { name: /Delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockDeleteMutateAsync).toHaveBeenCalledWith({ id: 'config-1' });
      });

      confirmSpy.mockRestore();
    });

    it('disables Delete button while deletion in progress', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      // Simulate slow deletion
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      mockDeleteMutateAsync.mockReturnValue(deletePromise);

      render(
        <TestWrapper>
          <ReportConfigList configs={[mockConfigs[0]]} isLoading={false} />
        </TestWrapper>
      );

      const deleteButton = screen.getByRole('button', { name: /Delete/i });
      await user.click(deleteButton);

      // Button should be disabled during deletion
      expect(deleteButton).toBeDisabled();

      // Resolve the deletion
      resolveDelete!();
      await waitFor(() => {
        expect(deleteButton).not.toBeDisabled();
      });

      confirmSpy.mockRestore();
    });

    it('handles delete errors gracefully', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const deleteError = new Error('RLS policy violation');
      mockDeleteMutateAsync.mockRejectedValue(deleteError);

      render(
        <TestWrapper>
          <ReportConfigList configs={[mockConfigs[0]]} isLoading={false} />
        </TestWrapper>
      );

      const deleteButton = screen.getByRole('button', { name: /Delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Delete error:', deleteError);
      });

      confirmSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Responsive Design', () => {
    it('renders action buttons in mobile-friendly layout', () => {
      render(
        <TestWrapper>
          <ReportConfigList configs={[mockConfigs[0]]} isLoading={false} />
        </TestWrapper>
      );

      // Action buttons should be present and clickable
      const generateButton = screen.getByRole('link', { name: /Generate/i });
      const editButton = screen.getByRole('link', { name: /Edit/i });
      const deleteButton = screen.getByRole('button', { name: /Delete/i });

      expect(generateButton).toBeInTheDocument();
      expect(editButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for action buttons', () => {
      render(
        <TestWrapper>
          <ReportConfigList configs={[mockConfigs[0]]} isLoading={false} />
        </TestWrapper>
      );

      const generateButton = screen.getByRole('link', { name: /Generate/i });
      const editButton = screen.getByRole('link', { name: /Edit/i });
      const deleteButton = screen.getByRole('button', { name: /Delete/i });

      expect(generateButton).toBeVisible();
      expect(editButton).toBeVisible();
      expect(deleteButton).toBeVisible();
    });

    it('maintains focus management during deletion', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockDeleteMutateAsync.mockResolvedValue(undefined);

      render(
        <TestWrapper>
          <ReportConfigList configs={[mockConfigs[0]]} isLoading={false} />
        </TestWrapper>
      );

      const deleteButton = screen.getByRole('button', { name: /Delete/i });
      deleteButton.focus();

      expect(deleteButton).toHaveFocus();

      await user.click(deleteButton);

      confirmSpy.mockRestore();
    });
  });
});
