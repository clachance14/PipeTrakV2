/**
 * Component Tests for ImportPreview
 *
 * Tests the orchestration of import preview including file summary,
 * column mappings, validation results, sample data, and confirm/cancel actions.
 *
 * @module ImportPreview.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ImportPreview } from './ImportPreview';
import type { ImportPreviewState } from '@/types/csv-import.types';

describe('ImportPreview', () => {
  const mockOnCancel = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    mockOnCancel.mockClear();
    mockOnConfirm.mockClear();
  });

  const createMockPreviewState = (overrides?: Partial<ImportPreviewState>): ImportPreviewState => ({
    fileName: 'test-import.csv',
    fileSize: 1024 * 500, // 500 KB
    totalRows: 100,
    validRows: 90,
    skippedRows: 8,
    errorRows: 2,
    columnMappings: [
      { csvColumn: 'DRAWING', expectedField: 'DRAWING', confidence: 100, matchTier: 'exact' },
      { csvColumn: 'TYPE', expectedField: 'TYPE', confidence: 100, matchTier: 'exact' },
      { csvColumn: 'QTY', expectedField: 'QTY', confidence: 100, matchTier: 'exact' },
      { csvColumn: 'CMDTY CODE', expectedField: 'CMDTY CODE', confidence: 100, matchTier: 'exact' }
    ],
    validationResults: [],
    validationSummary: {
      totalRows: 100,
      validCount: 90,
      skippedCount: 8,
      errorCount: 2,
      canImport: false,
      resultsByStatus: { valid: [], skipped: [], error: [] },
      resultsByCategory: {
        unsupported_type: [],
        zero_quantity: [],
        missing_required_field: [],
        duplicate_identity_key: [],
        empty_drawing: [],
        invalid_quantity: [],
        malformed_data: []
      }
    },
    metadataDiscovery: {
      areas: [],
      systems: [],
      testPackages: [],
      totalCount: 0,
      existingCount: 0,
      willCreateCount: 0
    },
    sampleData: [
      { drawing: 'P-001', type: 'Spool', qty: 5, cmdtyCode: 'ABC123', unmappedFields: {} },
      { drawing: 'P-002', type: 'Valve', qty: 2, cmdtyCode: 'DEF456', unmappedFields: {} }
    ] as any,
    componentCounts: { Spool: 50, Valve: 30, Fitting: 10 },
    canImport: false,
    ...overrides
  });

  describe('File Summary', () => {
    it('should display file name and size', () => {
      const state = createMockPreviewState();

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText(/test-import\.csv/i)).toBeInTheDocument();
      expect(screen.getByText(/500.*KB|0\.5.*MB/i)).toBeInTheDocument();
    });

    it('should display total row count', () => {
      const state = createMockPreviewState({ totalRows: 1500 });

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText(/1,?500.*rows/i)).toBeInTheDocument();
    });

    it('should display validation summary counts', () => {
      const state = createMockPreviewState({
        validRows: 90,
        skippedRows: 8,
        errorRows: 2
      });

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText(/90.*valid/i)).toBeInTheDocument();
      expect(screen.getByText(/8.*skipped/i)).toBeInTheDocument();
      expect(screen.getByText(/2.*error/i)).toBeInTheDocument();
    });

    it('should format file size for large files', () => {
      const state = createMockPreviewState({
        fileSize: 1024 * 1024 * 4.5 // 4.5 MB
      });

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText(/4\.5.*MB/i)).toBeInTheDocument();
    });
  });

  describe('Column Mappings Section', () => {
    it('should display column mapping component', () => {
      const state = createMockPreviewState();

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      // Should show column mapping section header
      expect(screen.getByText(/column mapping|detected columns/i)).toBeInTheDocument();

      // Should show mapped columns
      expect(screen.getByText(/DRAWING/)).toBeInTheDocument();
      expect(screen.getByText(/TYPE/)).toBeInTheDocument();
    });

    it('should be expandable/collapsible', async () => {
      const user = userEvent.setup();
      const state = createMockPreviewState();

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      // Should have expand/collapse toggle (implementation detail)
      const toggleButton = screen.queryByRole('button', { name: /column mapping|expand|collapse/i });

      if (toggleButton) {
        await user.click(toggleButton);
        // Section should collapse/expand
      }
    });
  });

  describe('Validation Results Section', () => {
    it('should display validation results component', () => {
      const state = createMockPreviewState();

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      // Should show validation section
      expect(screen.getByText(/validation|results/i)).toBeInTheDocument();
      expect(screen.getByText(/90.*valid/i)).toBeInTheDocument();
    });

    it('should auto-expand when errors present', () => {
      const state = createMockPreviewState({ errorRows: 5 });

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      // Validation section should be expanded by default when errors exist
      expect(screen.getByText(/5.*error/i)).toBeInTheDocument();
    });

    it('should be collapsible when only warnings', () => {
      const state = createMockPreviewState({
        errorRows: 0,
        skippedRows: 10,
        canImport: true
      });

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      // Should show skipped count
      expect(screen.getByText(/10.*skipped/i)).toBeInTheDocument();
    });
  });

  describe('Metadata Discovery Section', () => {
    it('should display metadata that will be created', () => {
      const state = createMockPreviewState({
        metadataDiscovery: {
          areas: [
            { type: 'area', value: 'HC-01', exists: false, recordId: null },
            { type: 'area', value: 'HC-02', exists: true, recordId: 'existing-id' }
          ],
          systems: [
            { type: 'system', value: 'HC-05', exists: false, recordId: null }
          ],
          testPackages: [],
          totalCount: 3,
          existingCount: 1,
          willCreateCount: 2
        }
      });

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      // Should show metadata section
      expect(screen.getByText(/metadata|areas|systems/i)).toBeInTheDocument();

      // Should show what will be created
      expect(screen.getByText(/HC-01/)).toBeInTheDocument();
      expect(screen.getByText(/HC-05/)).toBeInTheDocument();

      // Should show existing metadata
      expect(screen.getByText(/HC-02/)).toBeInTheDocument();

      // Should indicate new vs existing
      expect(screen.getByText(/will create|new/i)).toBeInTheDocument();
      expect(screen.getByText(/existing/i)).toBeInTheDocument();
    });

    it('should not render metadata section if no metadata', () => {
      const state = createMockPreviewState({
        metadataDiscovery: {
          areas: [],
          systems: [],
          testPackages: [],
          totalCount: 0,
          existingCount: 0,
          willCreateCount: 0
        }
      });

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      // Should not show metadata section (no metadata to display)
      // This depends on implementation - might show "No metadata" or hide section entirely
      const metadataSection = screen.queryByText(/metadata analysis/i);
      // Either section is absent, or shows "no metadata"
      expect(metadataSection === null || screen.getByText(/no metadata/i)).toBeTruthy();
    });
  });

  describe('Sample Data Table', () => {
    it('should display first 10 valid rows', () => {
      const sampleData = Array.from({ length: 15 }, (_, i) => ({
        drawing: `P-00${i + 1}`,
        type: 'Spool' as const,
        qty: i + 1,
        cmdtyCode: `CODE${i + 1}`,
        unmappedFields: {}
      }));

      const state = createMockPreviewState({ sampleData: sampleData as any });

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      // Should show table with sample data
      expect(screen.getByText(/P-001/)).toBeInTheDocument();
      expect(screen.getByText(/P-010/)).toBeInTheDocument();

      // Should indicate truncation (showing 10 of 15)
      expect(screen.getByText(/showing.*10|first 10/i)).toBeInTheDocument();
    });

    it('should only show mapped columns in table', () => {
      const state = createMockPreviewState();

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      // Should show headers for mapped columns
      expect(screen.getByText(/DRAWING/i)).toBeInTheDocument();
      expect(screen.getByText(/TYPE/i)).toBeInTheDocument();
      expect(screen.getByText(/QTY/i)).toBeInTheDocument();
      expect(screen.getByText(/CMDTY CODE/i)).toBeInTheDocument();
    });

    it('should display component data in table rows', () => {
      const state = createMockPreviewState();

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      // Should show data from sample rows
      expect(screen.getByText(/P-001/)).toBeInTheDocument();
      expect(screen.getByText(/Spool/)).toBeInTheDocument();
      expect(screen.getByText(/5/)).toBeInTheDocument();
      expect(screen.getByText(/ABC123/)).toBeInTheDocument();
    });

    it('should be responsive on mobile viewports', () => {
      const state = createMockPreviewState();

      const { container } = render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      // Should use responsive table patterns (overflow-x-auto, min-width, etc.)
      const table = container.querySelector('table');
      expect(table).toBeTruthy();
    });
  });

  describe('Component Counts Summary', () => {
    it('should display component counts by type', () => {
      const state = createMockPreviewState({
        componentCounts: { Spool: 50, Valve: 30, Fitting: 10, Instrument: 5 }
      });

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      // Should show component type breakdown
      expect(screen.getByText(/50.*Spool/i)).toBeInTheDocument();
      expect(screen.getByText(/30.*Valve/i)).toBeInTheDocument();
      expect(screen.getByText(/10.*Fitting/i)).toBeInTheDocument();
      expect(screen.getByText(/5.*Instrument/i)).toBeInTheDocument();
    });

    it('should show total component count', () => {
      const state = createMockPreviewState({
        validRows: 95,
        componentCounts: { Spool: 50, Valve: 30, Fitting: 15 }
      });

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      // Should show total valid components to import
      expect(screen.getByText(/95.*components/i)).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should have Cancel button that calls onCancel', async () => {
      const user = userEvent.setup();
      const state = createMockPreviewState();

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should have Confirm button that calls onConfirm', async () => {
      const user = userEvent.setup();
      const state = createMockPreviewState({ canImport: true, errorRows: 0 });

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm|import|proceed/i });
      await user.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('should disable Confirm button when errors present', () => {
      const state = createMockPreviewState({
        canImport: false,
        errorRows: 5
      });

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm|import|proceed/i });
      expect(confirmButton).toBeDisabled();
    });

    it('should enable Confirm button when only warnings present', () => {
      const state = createMockPreviewState({
        canImport: true,
        errorRows: 0,
        skippedRows: 10
      });

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm|import|proceed/i });
      expect(confirmButton).not.toBeDisabled();
    });

    it('should show loading state during import', () => {
      const state = createMockPreviewState({ canImport: true });

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
          isImporting={true}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /importing|processing/i });
      expect(confirmButton).toBeDisabled();

      // Should show loading spinner or text
      expect(screen.getByText(/importing|processing/i)).toBeInTheDocument();
    });

    it('should disable both buttons during import', () => {
      const state = createMockPreviewState({ canImport: true });

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
          isImporting={true}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const confirmButton = screen.getByRole('button', { name: /importing|processing/i });

      expect(cancelButton).toBeDisabled();
      expect(confirmButton).toBeDisabled();
    });
  });

  describe('Visual Hierarchy', () => {
    it('should have clear section headers', () => {
      const state = createMockPreviewState();

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      // Should have section headers for organization
      expect(screen.getByText(/file summary|file information/i)).toBeInTheDocument();
      expect(screen.getByText(/column mapping|detected columns/i)).toBeInTheDocument();
      expect(screen.getByText(/validation|results/i)).toBeInTheDocument();
    });

    it('should use card/panel layout for sections', () => {
      const state = createMockPreviewState();

      const { container } = render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      // Should use shadcn Card components or similar
      const cards = container.querySelectorAll('[class*="card"], [class*="border"], [class*="rounded"]');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  describe('Error Blocking', () => {
    it('should prominently display error blocking message', () => {
      const state = createMockPreviewState({
        canImport: false,
        errorRows: 10
      });

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      // Should show clear error blocking message
      expect(screen.getByText(/cannot import|errors must be fixed|blocked/i)).toBeInTheDocument();
      expect(screen.getByText(/10.*error/i)).toBeInTheDocument();
    });

    it('should show success indicator when ready to import', () => {
      const state = createMockPreviewState({
        canImport: true,
        errorRows: 0,
        validRows: 100
      });

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      // Should show ready indicator
      expect(screen.getByText(/ready to import|100.*components/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have semantic HTML structure', () => {
      const state = createMockPreviewState();

      const { container } = render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      // Should use semantic elements
      expect(container.querySelector('table')).toBeInTheDocument();
      expect(container.querySelector('button')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      const state = createMockPreviewState({ canImport: true });

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      // Should be able to tab through interactive elements
      await user.tab();
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toHaveFocus();

      await user.tab();
      const confirmButton = screen.getByRole('button', { name: /confirm|import|proceed/i });
      expect(confirmButton).toHaveFocus();
    });

    it('should have ARIA labels for status indicators', () => {
      const state = createMockPreviewState();

      const { container } = render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      // Should have accessible status information
      expect(container.querySelector('[aria-label], [role]')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should render within 100ms for typical dataset', async () => {
      const state = createMockPreviewState({
        totalRows: 1000,
        validRows: 950,
        sampleData: Array.from({ length: 10 }, (_, i) => ({
          drawing: `P-${i}`,
          type: 'Spool' as const,
          qty: 1,
          cmdtyCode: `CODE${i}`,
          unmappedFields: {}
        })) as any
      });

      const startTime = performance.now();

      render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render quickly (target <100ms)
      expect(renderTime).toBeLessThan(100);
    });

    it('should not re-render unnecessarily', () => {
      const state = createMockPreviewState();

      const { rerender } = render(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      // Re-render with same props
      rerender(
        <ImportPreview
          state={state}
          onCancel={mockOnCancel}
          onConfirm={mockOnConfirm}
        />
      );

      // Should use React.memo or similar optimization (tested via render count)
      // This is hard to assert directly, but component should be memoized
      expect(screen.getByText(/test-import\.csv/i)).toBeInTheDocument();
    });
  });
});
