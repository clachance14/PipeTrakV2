/**
 * Unit Tests: ExportOptionsDialog Component
 * Feature 030: Enhanced Package Completion Report PDF
 *
 * Tests that ExportOptionsDialog correctly:
 * - Shows detail level options
 * - Displays large package warning
 * - Disables full details for extreme packages
 * - Calls export/preview callbacks
 * - Disables buttons when generating
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportOptionsDialog } from './ExportOptionsDialog';

describe('ExportOptionsDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onExport: vi.fn(),
    onPreview: vi.fn(),
    weldCount: 100,
    isGenerating: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('dialog display', () => {
    it('renders dialog when open', () => {
      render(<ExportOptionsDialog {...defaultProps} />);
      expect(screen.getByText('Export Package Report')).toBeInTheDocument();
    });

    it('does not render content when closed', () => {
      render(<ExportOptionsDialog {...defaultProps} open={false} />);
      expect(screen.queryByText('Export Package Report')).not.toBeInTheDocument();
    });

    it('shows description text', () => {
      render(<ExportOptionsDialog {...defaultProps} />);
      expect(screen.getByText('Choose the detail level for your PDF export.')).toBeInTheDocument();
    });
  });

  describe('detail level options', () => {
    it('renders Summary only option', () => {
      render(<ExportOptionsDialog {...defaultProps} />);
      expect(screen.getByText('Summary only')).toBeInTheDocument();
      expect(
        screen.getByText('NDE counts per drawing (pass/fail/pending). Smaller file size.')
      ).toBeInTheDocument();
    });

    it('renders Include weld details option', () => {
      render(<ExportOptionsDialog {...defaultProps} />);
      expect(screen.getByText('Include weld details')).toBeInTheDocument();
      expect(
        screen.getByText('Full weld log with welder, date, NDE result. Larger file size.')
      ).toBeInTheDocument();
    });

    it('defaults to summary mode', () => {
      render(<ExportOptionsDialog {...defaultProps} />);
      const summaryRadio = screen.getByRole('radio', { name: /Summary only/i });
      expect(summaryRadio).toBeChecked();
    });

    it('allows selecting full details', () => {
      render(<ExportOptionsDialog {...defaultProps} />);
      const fullRadio = screen.getByRole('radio', { name: /Include weld details/i });
      fireEvent.click(fullRadio);
      expect(fullRadio).toBeChecked();
    });
  });

  describe('weld count display', () => {
    it('shows total weld count', () => {
      render(<ExportOptionsDialog {...defaultProps} weldCount={1234} />);
      expect(screen.getByText('Total welds:')).toBeInTheDocument();
      expect(screen.getByText('1,234')).toBeInTheDocument();
    });
  });

  describe('large package warning', () => {
    it('does not show warning for small packages', () => {
      render(<ExportOptionsDialog {...defaultProps} weldCount={100} />);
      expect(screen.queryByText('Large Package Warning')).not.toBeInTheDocument();
    });

    it('shows warning when weld count exceeds threshold and full details selected', () => {
      render(<ExportOptionsDialog {...defaultProps} weldCount={600} />);
      // First select full details
      const fullRadio = screen.getByRole('radio', { name: /Include weld details/i });
      fireEvent.click(fullRadio);
      expect(screen.getByText('Large Package Warning')).toBeInTheDocument();
      expect(screen.getByText(/This package has 600 welds/)).toBeInTheDocument();
    });

    it('does not show warning when summary mode selected', () => {
      render(<ExportOptionsDialog {...defaultProps} weldCount={600} />);
      // Summary is default, should not show warning
      expect(screen.queryByText('Large Package Warning')).not.toBeInTheDocument();
    });
  });

  describe('extreme package handling', () => {
    it('disables full details for extreme packages', () => {
      render(<ExportOptionsDialog {...defaultProps} drawingCount={150} />);
      const fullRadio = screen.getByRole('radio', { name: /Include weld details/i });
      expect(fullRadio).toBeDisabled();
    });

    it('shows disabled message for extreme packages', () => {
      render(<ExportOptionsDialog {...defaultProps} drawingCount={150} />);
      expect(screen.getByText(/Disabled for packages with >100 drawings/)).toBeInTheDocument();
    });

    it('forces summary mode for extreme packages', () => {
      const onExport = vi.fn();
      render(<ExportOptionsDialog {...defaultProps} drawingCount={150} onExport={onExport} />);
      const exportButton = screen.getByRole('button', { name: /Export PDF/i });
      fireEvent.click(exportButton);
      expect(onExport).toHaveBeenCalledWith({ includeWeldDetails: false });
    });
  });

  describe('button actions', () => {
    it('calls onExport with summary options by default', () => {
      const onExport = vi.fn();
      render(<ExportOptionsDialog {...defaultProps} onExport={onExport} />);
      const exportButton = screen.getByRole('button', { name: /Export PDF/i });
      fireEvent.click(exportButton);
      expect(onExport).toHaveBeenCalledWith({ includeWeldDetails: false });
    });

    it('calls onExport with full details when selected', () => {
      const onExport = vi.fn();
      render(<ExportOptionsDialog {...defaultProps} onExport={onExport} />);
      const fullRadio = screen.getByRole('radio', { name: /Include weld details/i });
      fireEvent.click(fullRadio);
      const exportButton = screen.getByRole('button', { name: /Export PDF/i });
      fireEvent.click(exportButton);
      expect(onExport).toHaveBeenCalledWith({ includeWeldDetails: true });
    });

    it('calls onPreview with correct options', () => {
      const onPreview = vi.fn();
      render(<ExportOptionsDialog {...defaultProps} onPreview={onPreview} />);
      const previewButton = screen.getByRole('button', { name: /Preview/i });
      fireEvent.click(previewButton);
      expect(onPreview).toHaveBeenCalledWith({ includeWeldDetails: false });
    });

    it('calls onOpenChange when Cancel clicked', () => {
      const onOpenChange = vi.fn();
      render(<ExportOptionsDialog {...defaultProps} onOpenChange={onOpenChange} />);
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('generating state', () => {
    it('disables all buttons when generating', () => {
      render(<ExportOptionsDialog {...defaultProps} isGenerating={true} />);
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();
      // Both Preview and Export buttons show "Generating..."
      const generatingButtons = screen.getAllByRole('button', { name: /Generating.../i });
      expect(generatingButtons).toHaveLength(2);
      expect(generatingButtons[0]).toBeDisabled();
      expect(generatingButtons[1]).toBeDisabled();
    });

    it('shows loading spinner on Export button', () => {
      render(<ExportOptionsDialog {...defaultProps} isGenerating={true} />);
      const buttons = screen.getAllByRole('button', { name: /Generating.../i });
      expect(buttons.length).toBe(2);
    });
  });
});
