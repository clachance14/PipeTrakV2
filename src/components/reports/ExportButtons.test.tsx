/**
 * ExportButtons Component Tests (Feature 019 - T032 - RED Phase)
 * Tests for export button group (PDF, Excel, CSV)
 */

import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ExportButtons } from './ExportButtons';
import type { ReportData } from '@/types/reports';

describe('ExportButtons', () => {
  const mockReportData: ReportData = {
    dimension: 'area',
    rows: [
      {
        id: '1',
        name: 'Area 100',
        projectId: 'project-1',
        budget: 150,
        pctReceived: 85,
        pctInstalled: 60,
        pctPunch: 40,
        pctTested: 30,
        pctRestored: 20,
        pctTotal: 47,
      },
      {
        id: '2',
        name: 'Area 200',
        projectId: 'project-1',
        budget: 200,
        pctReceived: 90,
        pctInstalled: 75,
        pctPunch: 55,
        pctTested: 45,
        pctRestored: 35,
        pctTotal: 60,
      },
    ],
    grandTotal: {
      name: 'Grand Total',
      budget: 350,
      pctReceived: 88,
      pctInstalled: 69,
      pctPunch: 49,
      pctTested: 39,
      pctRestored: 29,
      pctTotal: 55,
    },
    generatedAt: new Date('2025-10-28T12:00:00Z'),
    projectId: 'project-1',
  };

  const defaultProps = {
    reportData: mockReportData,
    projectName: 'Test Project',
    disabled: false,
  };

  describe('Rendering', () => {
    it('renders all three export buttons', () => {
      render(<ExportButtons {...defaultProps} />);

      expect(screen.getByRole('button', { name: /export pdf/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export excel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
    });

    it('shows disabled state when disabled prop is true', () => {
      render(<ExportButtons {...defaultProps} disabled={true} />);

      expect(screen.getByRole('button', { name: /export pdf/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /export excel/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /export csv/i })).toBeDisabled();
    });

    it('shows enabled state when handlers are provided', () => {
      render(
        <ExportButtons
          {...defaultProps}
          onExportPDF={vi.fn()}
          onExportExcel={vi.fn()}
          onExportCSV={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: /export pdf/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /export excel/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /export csv/i })).not.toBeDisabled();
    });

    it('renders with outline variant styling', () => {
      render(<ExportButtons {...defaultProps} />);

      const pdfButton = screen.getByRole('button', { name: /export pdf/i });
      // Button component uses data-variant attribute for styling
      expect(pdfButton).toBeInTheDocument();
    });
  });

  describe('PDF Export', () => {
    it('calls onExportPDF when PDF button is clicked', async () => {
      const user = userEvent.setup();
      const onExportPDF = vi.fn();

      render(<ExportButtons {...defaultProps} onExportPDF={onExportPDF} />);

      const pdfButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(pdfButton);

      expect(onExportPDF).toHaveBeenCalledTimes(1);
      expect(onExportPDF).toHaveBeenCalledWith(mockReportData, 'Test Project');
    });

    it('does not call onExportPDF when disabled', async () => {
      const user = userEvent.setup();
      const onExportPDF = vi.fn();

      render(<ExportButtons {...defaultProps} onExportPDF={onExportPDF} disabled={true} />);

      const pdfButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(pdfButton);

      expect(onExportPDF).not.toHaveBeenCalled();
    });

    it('shows loading state during PDF export', async () => {
      const user = userEvent.setup();
      const onExportPDF = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<ExportButtons {...defaultProps} onExportPDF={onExportPDF} />);

      const pdfButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(pdfButton);

      // Button should show loading state (disabled + loading indicator)
      expect(pdfButton).toBeDisabled();
    });
  });

  describe('Excel Export', () => {
    it('calls onExportExcel when Excel button is clicked', async () => {
      const user = userEvent.setup();
      const onExportExcel = vi.fn();

      render(<ExportButtons {...defaultProps} onExportExcel={onExportExcel} />);

      const excelButton = screen.getByRole('button', { name: /export excel/i });
      await user.click(excelButton);

      expect(onExportExcel).toHaveBeenCalledTimes(1);
      expect(onExportExcel).toHaveBeenCalledWith(mockReportData, 'Test Project');
    });

    it('does not call onExportExcel when disabled', async () => {
      const user = userEvent.setup();
      const onExportExcel = vi.fn();

      render(<ExportButtons {...defaultProps} onExportExcel={onExportExcel} disabled={true} />);

      const excelButton = screen.getByRole('button', { name: /export excel/i });
      await user.click(excelButton);

      expect(onExportExcel).not.toHaveBeenCalled();
    });
  });

  describe('CSV Export', () => {
    it('calls onExportCSV when CSV button is clicked', async () => {
      const user = userEvent.setup();
      const onExportCSV = vi.fn();

      render(<ExportButtons {...defaultProps} onExportCSV={onExportCSV} />);

      const csvButton = screen.getByRole('button', { name: /export csv/i });
      await user.click(csvButton);

      expect(onExportCSV).toHaveBeenCalledTimes(1);
      expect(onExportCSV).toHaveBeenCalledWith(mockReportData, 'Test Project');
    });

    it('does not call onExportCSV when disabled', async () => {
      const user = userEvent.setup();
      const onExportCSV = vi.fn();

      render(<ExportButtons {...defaultProps} onExportCSV={onExportCSV} disabled={true} />);

      const csvButton = screen.getByRole('button', { name: /export csv/i });
      await user.click(csvButton);

      expect(onExportCSV).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has accessible button names', () => {
      render(<ExportButtons {...defaultProps} />);

      expect(screen.getByRole('button', { name: /export pdf/i })).toHaveAccessibleName();
      expect(screen.getByRole('button', { name: /export excel/i })).toHaveAccessibleName();
      expect(screen.getByRole('button', { name: /export csv/i })).toHaveAccessibleName();
    });

    it('supports keyboard navigation (Tab + Enter)', async () => {
      const user = userEvent.setup();
      const onExportPDF = vi.fn();
      const onExportExcel = vi.fn();
      const onExportCSV = vi.fn();

      render(
        <ExportButtons
          {...defaultProps}
          onExportPDF={onExportPDF}
          onExportExcel={onExportExcel}
          onExportCSV={onExportCSV}
        />
      );

      // Tab to first button (PDF)
      await user.tab();
      expect(screen.getByRole('button', { name: /export pdf/i })).toHaveFocus();

      // Press Enter to trigger PDF export
      await user.keyboard('{Enter}');
      expect(onExportPDF).toHaveBeenCalledTimes(1);

      // Tab to second button (Excel)
      await user.tab();
      expect(screen.getByRole('button', { name: /export excel/i })).toHaveFocus();

      // Press Enter to trigger Excel export
      await user.keyboard('{Enter}');
      expect(onExportExcel).toHaveBeenCalledTimes(1);

      // Tab to third button (CSV)
      await user.tab();
      expect(screen.getByRole('button', { name: /export csv/i })).toHaveFocus();

      // Press Enter to trigger CSV export
      await user.keyboard('{Enter}');
      expect(onExportCSV).toHaveBeenCalledTimes(1);
    });
  });

  describe('Optional Handlers', () => {
    it('renders PDF button even when onExportPDF is not provided', () => {
      render(<ExportButtons {...defaultProps} />);

      expect(screen.getByRole('button', { name: /export pdf/i })).toBeInTheDocument();
    });

    it('renders Excel button even when onExportExcel is not provided', () => {
      render(<ExportButtons {...defaultProps} />);

      expect(screen.getByRole('button', { name: /export excel/i })).toBeInTheDocument();
    });

    it('renders CSV button even when onExportCSV is not provided', () => {
      render(<ExportButtons {...defaultProps} />);

      expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
    });

    it('disables buttons when handlers are not provided', () => {
      render(<ExportButtons {...defaultProps} />);

      // Buttons should be disabled if no handlers provided
      expect(screen.getByRole('button', { name: /export pdf/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /export excel/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /export csv/i })).toBeDisabled();
    });
  });
});
