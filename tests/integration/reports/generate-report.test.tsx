/**
 * Integration test for full report generation workflow (Feature 019 - T021)
 * Tests User Story 1: Generate basic progress report grouped by Area
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ReportBuilderPage } from '@/pages/ReportBuilderPage';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
    },
  },
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    session: { access_token: 'mock-token' },
  }),
}));

// Mock ProjectContext
vi.mock('@/contexts/ProjectContext', () => ({
  useProject: () => ({
    selectedProjectId: 'project-1',
    setSelectedProjectId: vi.fn(),
  }),
}));

// Mock useProjects hook
vi.mock('@/hooks/useProjects', () => ({
  useProjects: () => ({
    data: [
      {
        id: 'project-1',
        name: 'Test Project',
        organization_id: 'org-1',
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

// Mock useProgressReport hook
vi.mock('@/hooks/useProgressReport', () => ({
  useProgressReport: vi.fn((projectId: string, dimension: string) => ({
    data: {
      dimension: dimension,
      projectId: projectId,
      generatedAt: new Date('2025-10-28T10:00:00Z'),
      rows: [
        {
          id: 'area-1',
          name: 'B-64 OSBL',
          projectId: projectId,
          budget: 150,
          pctReceived: 85,
          pctInstalled: 60,
          pctPunch: 30,
          pctTested: 20,
          pctRestored: 10,
          pctTotal: 45,
        },
        {
          id: 'area-2',
          name: 'A-12 Process',
          projectId: projectId,
          budget: 200,
          pctReceived: 95,
          pctInstalled: 75,
          pctPunch: 50,
          pctTested: 40,
          pctRestored: 25,
          pctTotal: 60,
        },
      ],
      grandTotal: {
        name: 'Grand Total',
        budget: 350,
        pctReceived: 91,
        pctInstalled: 69,
        pctPunch: 42,
        pctTested: 32,
        pctRestored: 19,
        pctTotal: 54,
      },
    },
    isLoading: false,
    error: null,
    refetch: vi.fn().mockResolvedValue({ data: null }),
  })),
}));

describe('Report Generation Workflow (Integration)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderReportBuilder = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ReportBuilderPage />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('completes full workflow: select dimension → generate report → view data', async () => {
    const user = userEvent.setup();
    renderReportBuilder();

    // Step 1: Verify dimension selector is visible
    expect(screen.getByLabelText('Area')).toBeInTheDocument();
    expect(screen.getByLabelText('System')).toBeInTheDocument();
    expect(screen.getByLabelText('Test Package')).toBeInTheDocument();

    // Step 2: Select "Group by Area" (should be default)
    const areaRadio = screen.getByLabelText('Area');
    expect(areaRadio).toHaveAttribute('aria-checked', 'true');

    // Step 3: Click "Generate Report" button
    const generateButton = screen.getByRole('button', { name: /generate report/i });
    await user.click(generateButton);

    // Step 4: Wait for report table to appear
    await waitFor(() => {
      expect(screen.getByText('B-64 OSBL')).toBeInTheDocument();
    });

    // Step 5: Verify all 7 column headers are displayed
    expect(screen.getByText('Area')).toBeInTheDocument();
    expect(screen.getByText('Budget')).toBeInTheDocument();
    expect(screen.getByText('Received')).toBeInTheDocument();
    expect(screen.getByText('Installed')).toBeInTheDocument();
    expect(screen.getByText('Punch')).toBeInTheDocument();
    expect(screen.getByText('Tested')).toBeInTheDocument();
    expect(screen.getByText('Restored')).toBeInTheDocument();

    // Step 6: Verify data rows are displayed
    expect(screen.getByText('B-64 OSBL')).toBeInTheDocument();
    expect(screen.getByText('A-12 Process')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument(); // Budget for first row
    expect(screen.getByText('200')).toBeInTheDocument(); // Budget for second row

    // Step 7: Verify milestone percentages are displayed
    expect(screen.getByText('85%')).toBeInTheDocument(); // pctReceived for first row
    expect(screen.getByText('60%')).toBeInTheDocument(); // pctInstalled for first row

    // Step 8: Verify Grand Total row is displayed
    expect(screen.getByText('Grand Total')).toBeInTheDocument();
    expect(screen.getByText('350')).toBeInTheDocument(); // Grand Total Budget
    expect(screen.getByText('91%')).toBeInTheDocument(); // Grand Total pctReceived
  });

  it('switches dimension from Area to System and regenerates report', async () => {
    const user = userEvent.setup();
    renderReportBuilder();

    // Initial state: Area selected
    const areaRadio = screen.getByLabelText('Area');
    expect(areaRadio).toHaveAttribute('aria-checked', 'true');

    // Generate initial report
    const generateButton = screen.getByRole('button', { name: /generate report/i });
    await user.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Area')).toBeInTheDocument();
    });

    // Switch to System dimension
    const systemRadio = screen.getByLabelText('System');
    await user.click(systemRadio);

    // Regenerate report
    await user.click(generateButton);

    // Verify column header changes to "System"
    await waitFor(() => {
      expect(screen.getByText('System')).toBeInTheDocument();
    });
  });

  it('handles empty project with no components', async () => {
    const user = userEvent.setup();

    // Mock empty response
    vi.mocked(await import('@/hooks/useProgressReport')).useProgressReport.mockReturnValue({
      data: {
        dimension: 'area',
        projectId: 'project-1',
        generatedAt: new Date(),
        rows: [],
        grandTotal: {
          name: 'Grand Total',
          budget: 0,
          pctReceived: 0,
          pctInstalled: 0,
          pctPunch: 0,
          pctTested: 0,
          pctRestored: 0,
          pctTotal: 0,
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);

    renderReportBuilder();

    const generateButton = screen.getByRole('button', { name: /generate report/i });
    await user.click(generateButton);

    // Verify empty state message appears
    await waitFor(() => {
      expect(screen.getByText(/no components found/i)).toBeInTheDocument();
    });
  });

  it('shows loading state while generating report', async () => {
    const user = userEvent.setup();

    // Mock loading state
    vi.mocked(await import('@/hooks/useProgressReport')).useProgressReport.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);

    renderReportBuilder();

    const generateButton = screen.getByRole('button', { name: /generate report/i });
    await user.click(generateButton);

    // Verify loading indicator appears
    expect(screen.getByText(/generating report/i)).toBeInTheDocument();
  });

  it('displays error message when report generation fails', async () => {
    const user = userEvent.setup();

    // Mock error state
    vi.mocked(await import('@/hooks/useProgressReport')).useProgressReport.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch progress data'),
      refetch: vi.fn().mockResolvedValue({ data: null }),
    } as any);

    renderReportBuilder();

    const generateButton = screen.getByRole('button', { name: /generate report/i });
    await user.click(generateButton);

    // Verify error message appears
    await waitFor(() => {
      expect(screen.getByText(/failed to fetch progress data/i)).toBeInTheDocument();
    });
  });

  it('maintains sticky headers when scrolling table', async () => {
    const user = userEvent.setup();
    renderReportBuilder();

    const generateButton = screen.getByRole('button', { name: /generate report/i });
    await user.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Area')).toBeInTheDocument();
    });

    const headerRow = screen.getByText('Area').closest('div[role="row"]');
    expect(headerRow).toHaveClass('sticky');
    expect(headerRow).toHaveStyle({ top: '0' });
  });
});
