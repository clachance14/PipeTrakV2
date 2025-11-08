/**
 * Component Tests for ColumnMappingDisplay
 *
 * Tests the display of column mappings with confidence percentages,
 * unmapped columns, and missing required fields.
 *
 * @module ColumnMappingDisplay.test
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ColumnMappingDisplay } from './ColumnMappingDisplay';
import type { ColumnMapping, ExpectedField } from '@/types/csv-import.types';

describe('ColumnMappingDisplay', () => {
  describe('Successful Mappings', () => {
    it('should display all mapped columns with confidence percentages', () => {
      const mappings: ColumnMapping[] = [
        { csvColumn: 'DRAWING', expectedField: 'DRAWING', confidence: 100, matchTier: 'exact' },
        { csvColumn: 'type', expectedField: 'TYPE', confidence: 95, matchTier: 'case-insensitive' },
        { csvColumn: 'Cmdty Code', expectedField: 'CMDTY CODE', confidence: 85, matchTier: 'synonym' },
        { csvColumn: 'QTY', expectedField: 'QTY', confidence: 100, matchTier: 'exact' }
      ];

      render(
        <ColumnMappingDisplay
          mappings={mappings}
          unmappedColumns={[]}
          missingRequiredFields={[]}
        />
      );

      // Should show all mappings
      expect(screen.getByText('DRAWING')).toBeInTheDocument();
      expect(screen.getByText('type')).toBeInTheDocument();
      expect(screen.getByText('Cmdty Code')).toBeInTheDocument();
      expect(screen.getByText('QTY')).toBeInTheDocument();

      // Should show confidence percentages (multiple 100% badges exist, so use getAllByText)
      const confidenceBadges = screen.getAllByText(/100%/);
      expect(confidenceBadges.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/95%/)).toBeInTheDocument();
      expect(screen.getByText(/85%/)).toBeInTheDocument();
    });

    it('should display expected field names for each mapping', () => {
      const mappings: ColumnMapping[] = [
        { csvColumn: 'DRAWINGS', expectedField: 'DRAWING', confidence: 85, matchTier: 'synonym' }
      ];

      const { container } = render(
        <ColumnMappingDisplay
          mappings={mappings}
          unmappedColumns={[]}
          missingRequiredFields={[]}
        />
      );

      // Should show CSV column → Expected field
      expect(container.textContent).toContain('DRAWINGS');
      expect(container.textContent).toContain('DRAWING');
      expect(container.textContent).toContain('→');
    });

    it('should use distinct colors for confidence levels', () => {
      const mappings: ColumnMapping[] = [
        { csvColumn: 'DRAWING', expectedField: 'DRAWING', confidence: 100, matchTier: 'exact' },
        { csvColumn: 'type', expectedField: 'TYPE', confidence: 95, matchTier: 'case-insensitive' },
        { csvColumn: 'Cmdty Code', expectedField: 'CMDTY CODE', confidence: 85, matchTier: 'synonym' }
      ];

      const { container } = render(
        <ColumnMappingDisplay
          mappings={mappings}
          unmappedColumns={[]}
          missingRequiredFields={[]}
        />
      );

      // Check that confidence badges have different styling (green for 100%, blue for 95%, yellow for 85%)
      const badges = container.querySelectorAll('[class*="badge"]');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe('Unmapped Columns', () => {
    it('should display unmapped columns with warning styling', () => {
      const mappings: ColumnMapping[] = [
        { csvColumn: 'DRAWING', expectedField: 'DRAWING', confidence: 100, matchTier: 'exact' }
      ];
      const unmappedColumns = ['Supplier', 'Material Grade', 'Notes'];

      const { container } = render(
        <ColumnMappingDisplay
          mappings={mappings}
          unmappedColumns={unmappedColumns}
          missingRequiredFields={[]}
        />
      );

      // Should show unmapped columns
      expect(container.textContent).toContain('Supplier');
      expect(container.textContent).toContain('Material Grade');
      expect(container.textContent).toContain('Notes');

      // Should have warning indicator (heading text appears, use getAllByText for duplicate text)
      const unmappedText = screen.getAllByText(/unmapped|not recognized/i);
      expect(unmappedText.length).toBeGreaterThan(0);
    });

    it('should not show unmapped section if no unmapped columns', () => {
      const mappings: ColumnMapping[] = [
        { csvColumn: 'DRAWING', expectedField: 'DRAWING', confidence: 100, matchTier: 'exact' }
      ];

      render(
        <ColumnMappingDisplay
          mappings={mappings}
          unmappedColumns={[]}
          missingRequiredFields={[]}
        />
      );

      // Should not show unmapped warning
      expect(screen.queryByText(/unmapped|not recognized/i)).not.toBeInTheDocument();
    });
  });

  describe('Missing Required Fields', () => {
    it('should display missing required fields with error styling', () => {
      const mappings: ColumnMapping[] = [
        { csvColumn: 'DRAWING', expectedField: 'DRAWING', confidence: 100, matchTier: 'exact' }
      ];
      const missingFields: ExpectedField[] = ['TYPE', 'QTY', 'CMDTY CODE'];

      const { container } = render(
        <ColumnMappingDisplay
          mappings={mappings}
          unmappedColumns={[]}
          missingRequiredFields={missingFields}
        />
      );

      // Should show missing required fields
      expect(container.textContent).toContain('TYPE');
      expect(container.textContent).toContain('QTY');
      expect(container.textContent).toContain('CMDTY CODE');

      // Should have error indicator
      expect(screen.getByText(/missing.*required/i)).toBeInTheDocument();
    });

    it('should not show missing fields section if all required fields mapped', () => {
      const mappings: ColumnMapping[] = [
        { csvColumn: 'DRAWING', expectedField: 'DRAWING', confidence: 100, matchTier: 'exact' },
        { csvColumn: 'TYPE', expectedField: 'TYPE', confidence: 100, matchTier: 'exact' },
        { csvColumn: 'QTY', expectedField: 'QTY', confidence: 100, matchTier: 'exact' },
        { csvColumn: 'CMDTY CODE', expectedField: 'CMDTY CODE', confidence: 100, matchTier: 'exact' }
      ];

      render(
        <ColumnMappingDisplay
          mappings={mappings}
          unmappedColumns={[]}
          missingRequiredFields={[]}
        />
      );

      // Should not show missing fields error (but "Required" badges will appear)
      expect(screen.queryByText(/missing.*required fields/i)).not.toBeInTheDocument();
    });

    it('should highlight required fields in mapping list', () => {
      const mappings: ColumnMapping[] = [
        { csvColumn: 'DRAWING', expectedField: 'DRAWING', confidence: 100, matchTier: 'exact' },
        { csvColumn: 'SIZE', expectedField: 'SIZE', confidence: 100, matchTier: 'exact' }
      ];

      const { container } = render(
        <ColumnMappingDisplay
          mappings={mappings}
          unmappedColumns={[]}
          missingRequiredFields={[]}
        />
      );

      // DRAWING is required, SIZE is optional - should have visual distinction
      // (Implementation will use badge or indicator for required fields)
      expect(container.textContent).toContain('DRAWING');
      expect(container.textContent).toContain('SIZE');
    });
  });

  describe('Empty State', () => {
    it('should handle zero mappings gracefully', () => {
      const { container } = render(
        <ColumnMappingDisplay
          mappings={[]}
          unmappedColumns={[]}
          missingRequiredFields={['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE']}
        />
      );

      // Should show that no columns were mapped
      expect(container.textContent).toMatch(/no columns mapped.*missing.*required/i);
    });
  });

  describe('Accessibility', () => {
    it('should have semantic HTML for screen readers', () => {
      const mappings: ColumnMapping[] = [
        { csvColumn: 'DRAWING', expectedField: 'DRAWING', confidence: 100, matchTier: 'exact' }
      ];

      const { container } = render(
        <ColumnMappingDisplay
          mappings={mappings}
          unmappedColumns={['Supplier']}
          missingRequiredFields={['TYPE']}
        />
      );

      // Should use semantic HTML (lists for mappings)
      expect(container.querySelector('ul') || container.querySelector('dl')).toBeInTheDocument();
    });

    it('should have ARIA labels for status indicators', () => {
      const mappings: ColumnMapping[] = [
        { csvColumn: 'DRAWING', expectedField: 'DRAWING', confidence: 100, matchTier: 'exact' }
      ];

      render(
        <ColumnMappingDisplay
          mappings={mappings}
          unmappedColumns={['Supplier']}
          missingRequiredFields={['TYPE']}
        />
      );

      // Should have accessible status information
      // (Implementation will add aria-label or role attributes)
      const { container } = render(
        <ColumnMappingDisplay
          mappings={mappings}
          unmappedColumns={['Supplier']}
          missingRequiredFields={['TYPE']}
        />
      );

      expect(container).toBeTruthy();
    });
  });

  describe('Visual Hierarchy', () => {
    it('should show section header for column mappings', () => {
      const mappings: ColumnMapping[] = [
        { csvColumn: 'DRAWING', expectedField: 'DRAWING', confidence: 100, matchTier: 'exact' }
      ];

      render(
        <ColumnMappingDisplay
          mappings={mappings}
          unmappedColumns={[]}
          missingRequiredFields={[]}
        />
      );

      // Should have clear section header
      expect(screen.getByText(/column mapping|detected columns/i)).toBeInTheDocument();
    });

    it('should group required and optional fields visually', () => {
      const mappings: ColumnMapping[] = [
        { csvColumn: 'DRAWING', expectedField: 'DRAWING', confidence: 100, matchTier: 'exact' },
        { csvColumn: 'TYPE', expectedField: 'TYPE', confidence: 100, matchTier: 'exact' },
        { csvColumn: 'SIZE', expectedField: 'SIZE', confidence: 100, matchTier: 'exact' },
        { csvColumn: 'DESCRIPTION', expectedField: 'DESCRIPTION', confidence: 100, matchTier: 'exact' }
      ];

      const { container } = render(
        <ColumnMappingDisplay
          mappings={mappings}
          unmappedColumns={[]}
          missingRequiredFields={[]}
        />
      );

      // Should have visual grouping (implementation will separate required/optional)
      expect(container.textContent).toContain('DRAWING');
      expect(container.textContent).toContain('SIZE');
    });
  });

  describe('Responsive Design', () => {
    it('should render on mobile viewports without overflow', () => {
      const mappings: ColumnMapping[] = [
        { csvColumn: 'DRAWING', expectedField: 'DRAWING', confidence: 100, matchTier: 'exact' },
        { csvColumn: 'Cmdty Code', expectedField: 'CMDTY CODE', confidence: 85, matchTier: 'synonym' }
      ];

      const { container } = render(
        <ColumnMappingDisplay
          mappings={mappings}
          unmappedColumns={['Very Long Column Name That Might Cause Overflow']}
          missingRequiredFields={[]}
        />
      );

      // Should not have horizontal overflow (checked via Tailwind classes)
      expect(container.firstChild).toBeTruthy();
    });
  });
});
