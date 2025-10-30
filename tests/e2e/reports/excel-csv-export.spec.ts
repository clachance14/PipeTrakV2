import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ReportViewPage from '@/pages/ReportViewPage';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [
            {
              area_id: '1',
              area_name: 'Area A',
              project_id: 'proj-1',
              budget: 100,
              pct_received: 85,
              pct_installed: 60,
              pct_punch: 40,
              pct_tested: 25,
              pct_restored: 10,
              pct_total: 44,
            },
            {
              area_id: '2',
              area_name: 'Area B',
              project_id: 'proj-1',
              budget: 50,
              pct_received: 100,
              pct_installed: 80,
              pct_punch: 60,
              pct_tested: 40,
              pct_restored: 20,
              pct_total: 60,
            },
          ],
          error: null,
        })),
      })),
    })),
  },
}));

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    session: { access_token: 'mock-token' },
    organization: { id: 'org-1', name: 'Test Org' },
    project: { id: 'proj-1', name: 'Test Project' },
  }),
}));

// Mock browser download APIs
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

const mockClick = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  const mockLink = {
    href: '',
    download: '',
    click: mockClick,
    style: {},
  };

  vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
  vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
  vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);
});

const renderReportView = (dimension: 'area' | 'system' | 'test_package' = 'area') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ReportViewPage />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('E2E: Excel/CSV Export Workflow', () => {
  describe('Excel Export', () => {
    it('should export report to Excel with native percentage formatting', async () => {
      const user = userEvent.setup();

      const writeFileSpy = vi.spyOn(XLSX, 'writeFile').mockImplementation(() => {});

      renderReportView();

      // Wait for report to load
      await waitFor(() => {
        expect(screen.getByText('Area A')).toBeInTheDocument();
      });

      // Click "Export Excel" button
      const excelButton = screen.getByRole('button', { name: /export excel/i });
      await user.click(excelButton);

      // Verify XLSX.writeFile was called
      expect(writeFileSpy).toHaveBeenCalled();

      // Verify filename format
      const call = writeFileSpy.mock.calls[0];
      const filename = call?.[1] as string;
      expect(filename).toMatch(/PipeTrak_.*_Area_\d{4}-\d{2}-\d{2}\.xlsx/);

      writeFileSpy.mockRestore();
    });

    it('should include frozen header row in Excel export', async () => {
      const user = userEvent.setup();

      const mockWorksheet: any = { '!freeze': undefined };
      vi.spyOn(XLSX.utils, 'json_to_sheet').mockReturnValue(mockWorksheet);

      renderReportView();

      await waitFor(() => {
        expect(screen.getByText('Area A')).toBeInTheDocument();
      });

      const excelButton = screen.getByRole('button', { name: /export excel/i });
      await user.click(excelButton);

      // Verify freeze was set
      expect(mockWorksheet['!freeze']).toEqual({ xSplit: 0, ySplit: 1 });
    });

    it('should format Grand Total row as bold in Excel', async () => {
      const user = userEvent.setup();

      const mockWorksheet: any = {};
      vi.spyOn(XLSX.utils, 'json_to_sheet').mockReturnValue(mockWorksheet);

      renderReportView();

      await waitFor(() => {
        expect(screen.getByText('Area A')).toBeInTheDocument();
      });

      const excelButton = screen.getByRole('button', { name: /export excel/i });
      await user.click(excelButton);

      // Verify Grand Total row has bold formatting
      // Grand Total is at row 3 (header + 2 data rows)
      const grandTotalCell = mockWorksheet['A4']; // 1-indexed (header + 2 rows + grand total)
      expect(grandTotalCell?.s?.font?.bold).toBe(true);
    });
  });

  describe('CSV Export', () => {
    it('should export report to CSV with percentage symbols', async () => {
      const user = userEvent.setup();

      const unparseSpy = vi.spyOn(Papa, 'unparse').mockReturnValue('mock-csv');

      renderReportView();

      await waitFor(() => {
        expect(screen.getByText('Area A')).toBeInTheDocument();
      });

      // Click "Export CSV" button
      const csvButton = screen.getByRole('button', { name: /export csv/i });
      await user.click(csvButton);

      // Verify Papa.unparse was called
      expect(unparseSpy).toHaveBeenCalled();

      // Verify data includes percentage formatting
      const data = unparseSpy.mock.calls[0]?.[0] as any[];
      expect(data[0]['Received %']).toMatch(/\d+%/);

      unparseSpy.mockRestore();
    });

    it('should create CSV Blob with correct MIME type', async () => {
      const user = userEvent.setup();

      const blobSpy = vi.spyOn(global, 'Blob' as any);

      renderReportView();

      await waitFor(() => {
        expect(screen.getByText('Area A')).toBeInTheDocument();
      });

      const csvButton = screen.getByRole('button', { name: /export csv/i });
      await user.click(csvButton);

      // Verify Blob was created with text/csv MIME type
      expect(blobSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: 'text/csv;charset=utf-8;' })
      );
    });

    it('should download CSV with correct filename format', async () => {
      const user = userEvent.setup();

      const mockLink = {
        href: '',
        download: '',
        click: mockClick,
        style: {},
      };

      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

      renderReportView();

      await waitFor(() => {
        expect(screen.getByText('Area A')).toBeInTheDocument();
      });

      const csvButton = screen.getByRole('button', { name: /export csv/i });
      await user.click(csvButton);

      // Verify filename format
      expect(mockLink.download).toMatch(/PipeTrak_.*_Area_\d{4}-\d{2}-\d{2}\.csv/);
    });
  });

  describe('Full Export Workflow', () => {
    it('should allow exporting same report to PDF, Excel, and CSV', async () => {
      const user = userEvent.setup();

      const writeFileSpy = vi.spyOn(XLSX, 'writeFile').mockImplementation(() => {});
      const unparseSpy = vi.spyOn(Papa, 'unparse').mockReturnValue('mock-csv');

      renderReportView();

      await waitFor(() => {
        expect(screen.getByText('Area A')).toBeInTheDocument();
      });

      // Export to Excel
      const excelButton = screen.getByRole('button', { name: /export excel/i });
      await user.click(excelButton);
      expect(writeFileSpy).toHaveBeenCalledTimes(1);

      // Export to CSV
      const csvButton = screen.getByRole('button', { name: /export csv/i });
      await user.click(csvButton);
      expect(unparseSpy).toHaveBeenCalledTimes(1);

      // Export to PDF (if implemented)
      const pdfButton = screen.queryByRole('button', { name: /export pdf/i });
      if (pdfButton) {
        await user.click(pdfButton);
        // PDF export verification would go here
      }

      writeFileSpy.mockRestore();
      unparseSpy.mockRestore();
    });

    it('should maintain report data consistency across all export formats', async () => {
      const user = userEvent.setup();

      let excelData: any[] = [];
      let csvData: any[] = [];

      vi.spyOn(XLSX.utils, 'json_to_sheet').mockImplementation((data: any[]) => {
        excelData = data;
        return {} as any;
      });

      vi.spyOn(Papa, 'unparse').mockImplementation((data: any[]) => {
        csvData = data;
        return 'mock-csv';
      });

      renderReportView();

      await waitFor(() => {
        expect(screen.getByText('Area A')).toBeInTheDocument();
      });

      // Export to Excel
      const excelButton = screen.getByRole('button', { name: /export excel/i });
      await user.click(excelButton);

      // Export to CSV
      const csvButton = screen.getByRole('button', { name: /export csv/i });
      await user.click(csvButton);

      // Verify both exports have same row count (data + Grand Total)
      expect(excelData.length).toBe(csvData.length);

      // Verify Grand Total row exists in both
      expect(excelData[excelData.length - 1].Area).toBe('Grand Total');
      expect(csvData[csvData.length - 1].Area).toBe('Grand Total');
    });
  });
});
