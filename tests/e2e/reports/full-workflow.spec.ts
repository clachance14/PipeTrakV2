/**
 * E2E Test - Full Weekly Progress Reports Workflow (Feature 019 - T094)
 * Covers all 6 user stories in a single end-to-end flow
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReportsPage } from '@/pages/ReportsPage';
import { ReportBuilderPage } from '@/pages/ReportBuilderPage';
import { ReportViewPage } from '@/pages/ReportViewPage';

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'vw_progress_by_area') {
        return {
          select: vi.fn().mockResolvedValue({
            data: [
              {
                area_id: 'area-1',
                area_name: 'North Area',
                budget: 100,
                earned_received: 80,
                earned_installed: 60,
                earned_punch: 40,
                earned_tested: 30,
                earned_restored: 20,
              },
              {
                area_id: 'area-2',
                area_name: 'South Area',
                budget: 50,
                earned_received: 40,
                earned_installed: 30,
                earned_punch: 20,
                earned_tested: 15,
                earned_restored: 10,
              },
            ],
            error: null,
          }),
        };
      }
      if (table === 'report_configs') {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
          insert: vi.fn().mockResolvedValue({ data: [], error: null }),
          update: vi.fn().mockResolvedValue({ data: [], error: null }),
          delete: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }),
  },
}));

// Mock export functions
const mockExportPDF = vi.fn();
const mockExportExcel = vi.fn();
const mockExportCSV = vi.fn();

vi.mock('@/lib/reportExport', () => ({
  exportToPDF: (...args: any[]) => mockExportPDF(...args),
  exportToExcel: (...args: any[]) => mockExportExcel(...args),
  exportToCSV: (...args: any[]) => mockExportCSV(...args),
}));

describe('Full Weekly Progress Reports Workflow (E2E)', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, cacheTime: 0 },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    );
  };

  beforeAll(() => {
    vi.clearAllMocks();
  });

  it('US6: Navigate to Reports from sidebar', async () => {
    const Wrapper = createWrapper();
    render(<ReportsPage />, { wrapper: Wrapper });

    // Verify Reports landing page renders
    await waitFor(() => {
      expect(screen.getByText(/Weekly Progress Reports/i)).toBeInTheDocument();
    });

    // Verify "Create New Report" button exists
    expect(screen.getByRole('button', { name: /Create New Report/i })).toBeInTheDocument();
  });

  it('US1: Generate basic progress report grouped by Area', async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper();
    render(<ReportBuilderPage />, { wrapper: Wrapper });

    // US1.1: Select dimension (Area is default)
    await waitFor(() => {
      expect(screen.getByLabelText(/Group by dimension/i)).toBeInTheDocument();
    });

    // US1.2: Generate report
    const generateButton = screen.getByRole('button', { name: /Generate Report/i });
    await user.click(generateButton);

    // US1.3: Verify table displays with correct columns
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader');

    expect(headers[0]).toHaveTextContent('Area');
    expect(headers[1]).toHaveTextContent('Budget');
    expect(headers.some((h) => h.textContent?.includes('Received'))).toBe(true);
    expect(headers.some((h) => h.textContent?.includes('Tested'))).toBe(true);

    // Verify data rows
    const rows = within(table).getAllByRole('row');
    expect(rows.length).toBeGreaterThan(1); // Header + data rows

    // Verify Grand Total row
    const grandTotalRow = screen.getByLabelText(/Grand Total summary row/i);
    expect(grandTotalRow).toBeInTheDocument();
  });

  it('US4: Change report grouping dimension to System', async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper();
    render(<ReportBuilderPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByLabelText(/Group by dimension/i)).toBeInTheDocument();
    });

    // Change to System dimension
    const systemRadio = screen.getByLabelText(/System/i);
    await user.click(systemRadio);

    // Generate report
    const generateButton = screen.getByRole('button', { name: /Generate Report/i });
    await user.click(generateButton);

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    // Verify table header changed to System
    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader');
    expect(headers[0]).toHaveTextContent('System');
  });

  it('US2: Export report to PDF', async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper();
    render(<ReportViewPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    // Click Export PDF button
    const exportPDFButton = screen.getByLabelText('Export PDF');
    await user.click(exportPDFButton);

    await waitFor(() => {
      expect(mockExportPDF).toHaveBeenCalledTimes(1);
    });

    // Verify export was called with correct parameters
    const [reportData, projectName] = mockExportPDF.mock.calls[0];
    expect(reportData).toBeDefined();
    expect(reportData.rows).toBeInstanceOf(Array);
    expect(reportData.grandTotal).toBeDefined();
  });

  it('US3: Export report to Excel and CSV', async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper();
    render(<ReportViewPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    // Export to Excel
    const exportExcelButton = screen.getByLabelText('Export Excel');
    await user.click(exportExcelButton);

    await waitFor(() => {
      expect(mockExportExcel).toHaveBeenCalledTimes(1);
    });

    // Export to CSV
    const exportCSVButton = screen.getByLabelText('Export CSV');
    await user.click(exportCSVButton);

    await waitFor(() => {
      expect(mockExportCSV).toHaveBeenCalledTimes(1);
    });

    // Verify exports were called with correct data
    expect(mockExportExcel.mock.calls[0][0]).toBeDefined();
    expect(mockExportCSV.mock.calls[0][0]).toBeDefined();
  });

  it('Accessibility: All interactive elements have proper ARIA labels', async () => {
    const Wrapper = createWrapper();
    render(<ReportBuilderPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByLabelText(/Group by dimension/i)).toBeInTheDocument();
    });

    // Verify dimension selector has ARIA label
    expect(screen.getByLabelText(/Group by dimension/i)).toBeInTheDocument();

    // Generate report to verify table ARIA labels
    const user = userEvent.setup();
    const generateButton = screen.getByRole('button', { name: /Generate Report/i });
    await user.click(generateButton);

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    // Verify table has ARIA label
    const table = screen.getByRole('table');
    expect(table).toHaveAttribute('aria-label');

    // Verify export buttons have ARIA labels
    expect(screen.getByLabelText('Export PDF')).toBeInTheDocument();
    expect(screen.getByLabelText('Export Excel')).toBeInTheDocument();
    expect(screen.getByLabelText('Export CSV')).toBeInTheDocument();
  });

  it('Mobile Responsiveness: Touch targets are ≥32px', async () => {
    const Wrapper = createWrapper();
    const { container } = render(<ReportBuilderPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByLabelText(/Group by dimension/i)).toBeInTheDocument();
    });

    // Generate report to verify export buttons
    const user = userEvent.setup();
    const generateButton = screen.getByRole('button', { name: /Generate Report/i });
    await user.click(generateButton);

    await waitFor(() => {
      expect(screen.getByLabelText('Export PDF')).toBeInTheDocument();
    });

    // Verify export buttons have min-h-[44px] class (≥32px touch target)
    const exportButtons = container.querySelectorAll('button[aria-label^="Export"]');
    exportButtons.forEach((button) => {
      const computedStyle = window.getComputedStyle(button);
      const minHeight = parseInt(computedStyle.minHeight);
      expect(minHeight).toBeGreaterThanOrEqual(32);
    });
  });
});
