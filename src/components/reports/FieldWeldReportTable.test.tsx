/**
 * Unit tests for FieldWeldReportTable component
 * Tests virtualized table rendering, column visibility, and export functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldWeldReportTable } from './FieldWeldReportTable';
import type { FieldWeldReportData } from '@/types/reports';

describe('FieldWeldReportTable', () => {
  const mockReportData: FieldWeldReportData = {
    dimension: 'area',
    projectId: 'project-1',
    generatedAt: new Date('2025-10-28T10:00:00Z'),
    rows: [
      {
        id: 'area-1',
        name: 'B-64 OSBL',
        projectId: 'project-1',
        totalWelds: 100,
        activeCount: 80,
        acceptedCount: 70,
        rejectedCount: 5,
        pctFitup: 90,
        pctWeldComplete: 85,
        pctAccepted: 70,
        ndeRequiredCount: 60,
        ndePassCount: 55,
        ndeFailCount: 5,
        ndePendingCount: 0,
        ndePassRate: 91.7,
        repairCount: 8,
        repairRate: 8.0,
        avgDaysToNDE: 3.5,
        avgDaysToAcceptance: 5.2,
        pctTotal: 75,
        fitupCount: 90,
        weldCompleteCount: 85,
      },
      {
        id: 'area-2',
        name: 'A-12 Process',
        projectId: 'project-1',
        totalWelds: 50,
        activeCount: 40,
        acceptedCount: 35,
        rejectedCount: 2,
        pctFitup: 80,
        pctWeldComplete: 75,
        pctAccepted: 70,
        ndeRequiredCount: 30,
        ndePassCount: 28,
        ndeFailCount: 2,
        ndePendingCount: 0,
        ndePassRate: 93.3,
        repairCount: 4,
        repairRate: 8.0,
        avgDaysToNDE: 2.5,
        avgDaysToAcceptance: 4.0,
        pctTotal: 70,
        fitupCount: 40,
        weldCompleteCount: 37,
      },
    ],
    grandTotal: {
      name: 'Grand Total',
      totalWelds: 150,
      activeCount: 120,
      acceptedCount: 105,
      rejectedCount: 7,
      pctFitup: 87,
      pctWeldComplete: 82,
      pctAccepted: 70,
      ndeRequiredCount: 90,
      ndePassCount: 83,
      ndeFailCount: 7,
      ndePendingCount: 0,
      ndePassRate: 92,
      repairCount: 12,
      repairRate: 8,
      avgDaysToNDE: 3.17,
      avgDaysToAcceptance: 4.8,
      fitupCount: 130,
      weldCompleteCount: 122,
      pctTotal: 73,
    },
  };

  const mockProjectName = 'Test Project';
  const mockOnExport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with valid data', () => {
      render(
        <FieldWeldReportTable
          reportData={mockReportData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      // Each value appears twice (mobile + desktop versions)
      expect(screen.getAllByText('B-64 OSBL')).toHaveLength(2);
      expect(screen.getAllByText('A-12 Process')).toHaveLength(2);
      expect(screen.getAllByText('Grand Total')).toHaveLength(2);
    });

    it('renders empty state when no rows provided', () => {
      const emptyData: FieldWeldReportData = {
        ...mockReportData,
        rows: [],
        grandTotal: {
          name: 'Grand Total',
          totalWelds: 0,
          activeCount: 0,
          acceptedCount: 0,
          rejectedCount: 0,
          pctFitup: 0,
          pctWeldComplete: 0,
          pctAccepted: 0,
          ndeRequiredCount: 0,
          ndePassCount: 0,
          ndeFailCount: 0,
          ndePendingCount: 0,
          ndePassRate: null,
          repairCount: 0,
          repairRate: 0,
          avgDaysToNDE: null,
          avgDaysToAcceptance: null,
          pctTotal: 0,
          fitupCount: 0,
          weldCompleteCount: 0,
        },
      };

      render(
        <FieldWeldReportTable
          reportData={emptyData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByText(/no field welds found/i)).toBeInTheDocument();
    });

    it('renders grand total row with distinct styling', () => {
      render(
        <FieldWeldReportTable
          reportData={mockReportData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      const grandTotalElements = screen.getAllByText('Grand Total');
      const grandTotalRow = grandTotalElements[0].closest('div[role="row"]');
      expect(grandTotalRow).toHaveClass('font-bold');
      expect(grandTotalRow).toHaveClass('bg-slate-700');
    });

    it('renders report metadata with project name and timestamp', () => {
      render(
        <FieldWeldReportTable
          reportData={mockReportData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByText(/report generated at/i)).toBeInTheDocument();
      expect(screen.getByText(/test project/i)).toBeInTheDocument();
    });
  });

  describe('Column Visibility', () => {
    it('renders standard columns for all dimensions', () => {
      render(
        <FieldWeldReportTable
          reportData={mockReportData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      // Total Welds and % Complete appear twice (mobile + desktop)
      expect(screen.getAllByText('Total Welds')).toHaveLength(2);
      expect(screen.getAllByText('% Complete').length).toBeGreaterThan(0);

      // Other columns appear only once (desktop only)
      expect(screen.getByText('Accepted')).toBeInTheDocument();
      expect(screen.getByText('NDE Pass Rate')).toBeInTheDocument();
      expect(screen.getByText('Repair Rate')).toBeInTheDocument();
    });

    it('does not show welder-specific columns when dimension is not "welder"', () => {
      render(
        <FieldWeldReportTable
          reportData={mockReportData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      expect(screen.queryByText('First Pass Rate')).not.toBeInTheDocument();
      expect(screen.queryByText('Avg Days to Accept')).not.toBeInTheDocument();
    });

    it('shows welder-specific columns when dimension is "welder"', () => {
      const welderData: FieldWeldReportData = {
        ...mockReportData,
        dimension: 'welder',
        rows: [
          {
            ...mockReportData.rows[0],
            id: 'welder-1',
            name: 'John Smith',
            stencil: 'JS-101',
            firstPassAcceptanceCount: 70,
            firstPassAcceptanceRate: 76.1,
          },
        ],
        grandTotal: {
          ...mockReportData.grandTotal,
          firstPassAcceptanceCount: 70,
          firstPassAcceptanceRate: 76,
        },
      };

      render(
        <FieldWeldReportTable
          reportData={welderData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      // Welder-specific columns appear only once (desktop only)
      expect(screen.getByText('First Pass Rate')).toBeInTheDocument();
      expect(screen.getByText('Avg Days to Accept')).toBeInTheDocument();
    });

    it('renders dimension-specific first column header (Area)', () => {
      render(
        <FieldWeldReportTable
          reportData={mockReportData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      expect(screen.getAllByText('Area')).toHaveLength(2);
    });

    it('renders dimension-specific first column header (System)', () => {
      const systemData: FieldWeldReportData = {
        ...mockReportData,
        dimension: 'system',
        rows: [
          {
            ...mockReportData.rows[0],
            id: 'system-1',
            name: 'S-100 Piping',
          },
        ],
      };

      render(
        <FieldWeldReportTable
          reportData={systemData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      expect(screen.getAllByText('System')).toHaveLength(2);
    });

    it('renders dimension-specific first column header (Test Package)', () => {
      const testPackageData: FieldWeldReportData = {
        ...mockReportData,
        dimension: 'test_package',
        rows: [
          {
            ...mockReportData.rows[0],
            id: 'tp-1',
            name: 'TP-001 Main',
          },
        ],
      };

      render(
        <FieldWeldReportTable
          reportData={testPackageData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      expect(screen.getAllByText('Test Package')).toHaveLength(2);
    });

    it('renders dimension-specific first column header (Welder)', () => {
      const welderData: FieldWeldReportData = {
        ...mockReportData,
        dimension: 'welder',
        rows: [
          {
            ...mockReportData.rows[0],
            id: 'welder-1',
            name: 'John Smith',
            stencil: 'JS-101',
            firstPassAcceptanceCount: 70,
            firstPassAcceptanceRate: 76.1,
          },
        ],
        grandTotal: {
          ...mockReportData.grandTotal,
          firstPassAcceptanceCount: 70,
          firstPassAcceptanceRate: 76,
        },
      };

      render(
        <FieldWeldReportTable
          reportData={welderData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      expect(screen.getAllByText('Welder')).toHaveLength(2);
    });
  });

  describe('Percentage Formatting', () => {
    it('formats percentage values with 1 decimal place', () => {
      render(
        <FieldWeldReportTable
          reportData={mockReportData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      // Grand total percentages (rounded to whole numbers in hook, displayed with .0)
      expect(screen.getAllByText('91.7%').length).toBeGreaterThan(0); // ndePassRate for row 1
      expect(screen.getAllByText('93.3%').length).toBeGreaterThan(0); // ndePassRate for row 2
    });

    it('displays milestone counts as integers', () => {
      render(
        <FieldWeldReportTable
          reportData={mockReportData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      // Grand total fitupCount: 130 → displays as "130"
      expect(screen.getAllByText('130').length).toBeGreaterThan(0);
    });

    it('formats decimal values (time metrics) with 1 decimal place', () => {
      // avgDaysToNDE and avgDaysToAcceptance are not in the standard columns
      // They're only shown in welder-specific reports
      const welderData: FieldWeldReportData = {
        ...mockReportData,
        dimension: 'welder',
        rows: [
          {
            ...mockReportData.rows[0],
            id: 'welder-1',
            name: 'John Smith',
            stencil: 'JS-101',
            avgDaysToAcceptance: 4.0,
            firstPassAcceptanceCount: 70,
            firstPassAcceptanceRate: 76.1,
          },
        ],
        grandTotal: {
          ...mockReportData.grandTotal,
          avgDaysToAcceptance: 4.8,
          firstPassAcceptanceCount: 70,
          firstPassAcceptanceRate: 76,
        },
      };

      render(
        <FieldWeldReportTable
          reportData={welderData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      // avgDaysToAcceptance values are formatted with 1 decimal place
      expect(screen.getByText('4.0')).toBeInTheDocument();
      expect(screen.getByText('4.8')).toBeInTheDocument();
    });

    it('displays zero percentages correctly', () => {
      const zeroData: FieldWeldReportData = {
        ...mockReportData,
        rows: [
          {
            id: 'area-zero',
            name: 'Empty Area',
            projectId: 'project-1',
            totalWelds: 10,
            activeCount: 10,
            acceptedCount: 0,
            rejectedCount: 0,
            pctFitup: 0,
            pctWeldComplete: 0,
            pctAccepted: 0,
            ndeRequiredCount: 5,
            ndePassCount: 0,
            ndeFailCount: 0,
            ndePendingCount: 5,
            ndePassRate: null,
            repairCount: 0,
            repairRate: 0,
            avgDaysToNDE: null,
            avgDaysToAcceptance: null,
            pctTotal: 0,
          },
        ],
      };

      render(
        <FieldWeldReportTable
          reportData={zeroData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      // Multiple 0.0% cells should exist
      const zeroCells = screen.getAllByText('0.0%');
      expect(zeroCells.length).toBeGreaterThan(0);
    });

    it('displays 100% correctly', () => {
      const fullData: FieldWeldReportData = {
        ...mockReportData,
        rows: [
          {
            id: 'area-full',
            name: 'Complete Area',
            projectId: 'project-1',
            totalWelds: 50,
            activeCount: 0,
            acceptedCount: 50,
            rejectedCount: 0,
            pctFitup: 100,
            pctWeldComplete: 100,
            pctAccepted: 100,
            ndeRequiredCount: 30,
            ndePassCount: 30,
            ndeFailCount: 0,
            ndePendingCount: 0,
            ndePassRate: 100,
            repairCount: 0,
            repairRate: 0,
            avgDaysToNDE: 3.0,
            avgDaysToAcceptance: 4.5,
            pctTotal: 100,
          },
        ],
      };

      render(
        <FieldWeldReportTable
          reportData={fullData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      const percentageCells = screen.getAllByText('100.0%');
      expect(percentageCells.length).toBeGreaterThan(0);
    });
  });

  describe('Null Value Handling', () => {
    it('displays "-" for null NDE pass rate', () => {
      const nullNDEData: FieldWeldReportData = {
        ...mockReportData,
        rows: [
          {
            ...mockReportData.rows[0],
            ndePassRate: null,
          },
        ],
      };

      render(
        <FieldWeldReportTable
          reportData={nullNDEData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      // Should display "-" for null NDE pass rate
      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });

    it('displays "-" for null time metrics', () => {
      // avgDaysToAcceptance is only shown in welder dimension reports
      const nullTimeData: FieldWeldReportData = {
        ...mockReportData,
        dimension: 'welder',
        rows: [
          {
            ...mockReportData.rows[0],
            id: 'welder-1',
            name: 'John Smith',
            stencil: 'JS-101',
            avgDaysToNDE: null,
            avgDaysToAcceptance: null,
            firstPassAcceptanceCount: 0,
            firstPassAcceptanceRate: null,
          },
        ],
        grandTotal: {
          ...mockReportData.grandTotal,
          avgDaysToAcceptance: null,
          firstPassAcceptanceCount: 0,
          firstPassAcceptanceRate: null,
        },
      };

      render(
        <FieldWeldReportTable
          reportData={nullTimeData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      // Should display "-" for null time metrics (avgDaysToAcceptance is visible in welder reports)
      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });

    it('displays "-" for null welder-specific metrics', () => {
      const nullWelderData: FieldWeldReportData = {
        ...mockReportData,
        dimension: 'welder',
        rows: [
          {
            ...mockReportData.rows[0],
            id: 'welder-1',
            name: 'John Smith',
            stencil: 'JS-101',
            firstPassAcceptanceCount: 0,
            firstPassAcceptanceRate: null,
          },
        ],
        grandTotal: {
          ...mockReportData.grandTotal,
          firstPassAcceptanceCount: 0,
          firstPassAcceptanceRate: null,
        },
      };

      render(
        <FieldWeldReportTable
          reportData={nullWelderData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      // Should display "-" for null first pass rate
      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });
  });

  describe('Export Buttons', () => {
    it('renders all export buttons', () => {
      render(
        <FieldWeldReportTable
          reportData={mockReportData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByRole('button', { name: /export.*pdf/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export.*excel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export.*csv/i })).toBeInTheDocument();
    });

    it('calls onExport with "pdf" when PDF button clicked', async () => {
      const user = userEvent.setup();
      render(
        <FieldWeldReportTable
          reportData={mockReportData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      const pdfButton = screen.getByRole('button', { name: /export.*pdf/i });
      await user.click(pdfButton);

      expect(mockOnExport).toHaveBeenCalledWith('pdf');
      expect(mockOnExport).toHaveBeenCalledTimes(1);
    });

    it('calls onExport with "excel" when Excel button clicked', async () => {
      const user = userEvent.setup();
      render(
        <FieldWeldReportTable
          reportData={mockReportData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      const excelButton = screen.getByRole('button', { name: /export.*excel/i });
      await user.click(excelButton);

      expect(mockOnExport).toHaveBeenCalledWith('excel');
      expect(mockOnExport).toHaveBeenCalledTimes(1);
    });

    it('calls onExport with "csv" when CSV button clicked', async () => {
      const user = userEvent.setup();
      render(
        <FieldWeldReportTable
          reportData={mockReportData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      const csvButton = screen.getByRole('button', { name: /export.*csv/i });
      await user.click(csvButton);

      expect(mockOnExport).toHaveBeenCalledWith('csv');
      expect(mockOnExport).toHaveBeenCalledTimes(1);
    });
  });

  describe('Virtualization', () => {
    it('uses virtualizer for rendering rows', () => {
      render(
        <FieldWeldReportTable
          reportData={mockReportData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      const tableBody = screen.getByTestId('field-weld-report-table-body');
      expect(tableBody).toBeInTheDocument();
      expect(tableBody).toHaveStyle({ height: '500px' });
    });

    it('renders all rows in test environment (virtualization fallback)', () => {
      const largeData: FieldWeldReportData = {
        ...mockReportData,
        rows: Array.from({ length: 50 }, (_, i) => ({
          id: `area-${i}`,
          name: `Area ${i}`,
          projectId: 'project-1',
          totalWelds: 100 + i,
          activeCount: 80 + i,
          acceptedCount: 70 + i,
          rejectedCount: 5,
          pctFitup: 85,
          pctWeldComplete: 80,
          pctAccepted: 70,
          ndeRequiredCount: 50 + i,
          ndePassCount: 45 + i,
          ndeFailCount: 5,
          ndePendingCount: 0,
          ndePassRate: 90.0,
          repairCount: 5,
          repairRate: 5.0,
          avgDaysToNDE: 3.0 + i * 0.1,
          avgDaysToAcceptance: 4.5 + i * 0.1,
          pctTotal: 75,
        })),
      };

      render(
        <FieldWeldReportTable
          reportData={largeData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      // In test env, all rows should render (fallback behavior)
      const allRows = screen.queryAllByTestId(/^field-weld-report-row-/);
      expect(allRows.length).toBeGreaterThan(0);
      expect(allRows.length).toBe(51); // 50 rows + 1 grand total
    });
  });

  describe('Accessibility', () => {
    it('uses semantic HTML with ARIA roles', () => {
      render(
        <FieldWeldReportTable
          reportData={mockReportData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('row').length).toBeGreaterThan(0);
      expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(0);
      expect(screen.getAllByRole('cell').length).toBeGreaterThan(0);
    });

    it('provides ARIA labels for export buttons', () => {
      render(
        <FieldWeldReportTable
          reportData={mockReportData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByLabelText(/export report to pdf/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/export report to excel/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/export report to csv/i)).toBeInTheDocument();
    });

    it('provides ARIA label for table', () => {
      render(
        <FieldWeldReportTable
          reportData={mockReportData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByLabelText(/field weld progress report grouped by/i)).toBeInTheDocument();
    });

    it('provides ARIA label for Grand Total row', () => {
      render(
        <FieldWeldReportTable
          reportData={mockReportData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      const grandTotalElements = screen.getAllByText('Grand Total');
      const grandTotalRow = grandTotalElements[0].closest('div[role="row"]');
      expect(grandTotalRow).toHaveAttribute('aria-label', 'Grand Total summary row');
    });

    it('provides ARIA labels for data rows', () => {
      render(
        <FieldWeldReportTable
          reportData={mockReportData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      const firstDataElements = screen.getAllByText('B-64 OSBL');
      const firstDataRow = firstDataElements[0].closest('div[role="row"]');
      expect(firstDataRow).toHaveAttribute(
        'aria-label',
        'B-64 OSBL field weld progress data'
      );
    });
  });

  describe('Column Alignment', () => {
    it('aligns name column to the left', () => {
      render(
        <FieldWeldReportTable
          reportData={mockReportData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      const nameCells = screen.getAllByText('B-64 OSBL');
      const nameCell = nameCells[0].closest('div[role="cell"]');
      expect(nameCell).toHaveClass('text-left');
    });

    it('aligns numeric columns to the right', () => {
      render(
        <FieldWeldReportTable
          reportData={mockReportData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      // Find a numeric cell (total welds)
      const numericCells = screen
        .getAllByText('100')
        .map((el) => el.closest('div[role="cell"]'));
      expect(numericCells.some((cell) => cell?.classList.contains('text-right'))).toBe(true);
    });

    it('aligns percentage columns to the right', () => {
      render(
        <FieldWeldReportTable
          reportData={mockReportData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      const percentageCells = screen
        .getAllByText('91.7%')
        .map((el) => el.closest('div[role="cell"]'));
      expect(percentageCells.some((cell) => cell?.classList.contains('text-right'))).toBe(true);
    });
  });

  describe('Sticky Headers', () => {
    it('renders headers with sticky positioning', () => {
      render(
        <FieldWeldReportTable
          reportData={mockReportData}
          projectName={mockProjectName}
          onExport={mockOnExport}
        />
      );

      const areaHeaders = screen.getAllByText('Area');
      const headerContainer = areaHeaders[0].closest('div.sticky');
      expect(headerContainer).toBeInTheDocument();
      expect(headerContainer).toHaveClass('sticky', 'top-0');
    });
  });
});
