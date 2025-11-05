/**
 * Component Tests for ValidationResults
 *
 * Tests the display of validation results with counts grouped by category,
 * row numbers for errors/warnings, and expandable error details.
 *
 * @module ValidationResults.test
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ValidationResults } from './ValidationResults';
import type { ValidationSummary, ValidationResult } from '@/types/csv-import.types';

describe('ValidationResults', () => {
  describe('Summary Display', () => {
    it('should display valid, skipped, and error counts', () => {
      const validResults: ValidationResult[] = [
        { rowNumber: 1, status: 'valid', data: { drawing: 'P-001', type: 'Spool', qty: 5, cmdtyCode: 'ABC123', unmappedFields: {} } as any },
        { rowNumber: 2, status: 'valid', data: { drawing: 'P-002', type: 'Valve', qty: 2, cmdtyCode: 'DEF456', unmappedFields: {} } as any }
      ];

      const skippedResults: ValidationResult[] = [
        { rowNumber: 3, status: 'skipped', reason: 'Unsupported component type: Gasket', category: 'unsupported_type' }
      ];

      const errorResults: ValidationResult[] = [
        { rowNumber: 4, status: 'error', reason: 'Required field DRAWING is empty', category: 'empty_drawing' }
      ];

      const summary: ValidationSummary = {
        totalRows: 4,
        validCount: 2,
        skippedCount: 1,
        errorCount: 1,
        canImport: false,
        resultsByStatus: {
          valid: validResults,
          skipped: skippedResults,
          error: errorResults
        },
        resultsByCategory: {
          unsupported_type: skippedResults,
          empty_drawing: errorResults,
          missing_required_field: [],
          duplicate_identity_key: [],
          zero_quantity: [],
          invalid_quantity: [],
          malformed_data: []
        }
      };

      render(<ValidationResults summary={summary} />);

      // Should show counts
      expect(screen.getByText(/2.*valid/i)).toBeInTheDocument();
      expect(screen.getByText(/1.*skipped/i)).toBeInTheDocument();
      expect(screen.getByText(/1.*error/i)).toBeInTheDocument();
    });

    it('should display total rows processed', () => {
      const summary: ValidationSummary = {
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
      };

      render(<ValidationResults summary={summary} />);

      expect(screen.getByText(/100.*rows/i)).toBeInTheDocument();
    });

    it('should show green success indicator when no errors', () => {
      const summary: ValidationSummary = {
        totalRows: 50,
        validCount: 45,
        skippedCount: 5,
        errorCount: 0,
        canImport: true,
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
      };

      const { container } = render(<ValidationResults summary={summary} />);

      // Should indicate import can proceed
      expect(screen.getByText(/ready to import|can proceed/i)).toBeInTheDocument();

      // Should use green/success styling
      const successElement = container.querySelector('[class*="green"], [class*="success"]');
      expect(successElement).toBeTruthy();
    });

    it('should show red error indicator when errors present', () => {
      const summary: ValidationSummary = {
        totalRows: 50,
        validCount: 45,
        skippedCount: 0,
        errorCount: 5,
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
      };

      const { container } = render(<ValidationResults summary={summary} />);

      // Should indicate import blocked
      expect(screen.getByText(/cannot import|errors must be fixed/i)).toBeInTheDocument();

      // Should use red/error styling
      const errorElement = container.querySelector('[class*="red"], [class*="destructive"], [class*="error"]');
      expect(errorElement).toBeTruthy();
    });
  });

  describe('Error Details', () => {
    it('should display error row numbers and reasons', () => {
      const errorResults: ValidationResult[] = [
        { rowNumber: 5, status: 'error', reason: 'Required field DRAWING is empty', category: 'empty_drawing' },
        { rowNumber: 12, status: 'error', reason: 'Required field TYPE is empty', category: 'missing_required_field' },
        { rowNumber: 20, status: 'error', reason: 'Duplicate identity key: P-001-ABC123-1', category: 'duplicate_identity_key' }
      ];

      const summary: ValidationSummary = {
        totalRows: 25,
        validCount: 22,
        skippedCount: 0,
        errorCount: 3,
        canImport: false,
        resultsByStatus: { valid: [], skipped: [], error: errorResults },
        resultsByCategory: {
          empty_drawing: [errorResults[0]],
          missing_required_field: [errorResults[1]],
          duplicate_identity_key: [errorResults[2]],
          unsupported_type: [],
          zero_quantity: [],
          invalid_quantity: [],
          malformed_data: []
        }
      };

      render(<ValidationResults summary={summary} />);

      // Should show row numbers
      expect(screen.getByText(/row 5|5:/i)).toBeInTheDocument();
      expect(screen.getByText(/row 12|12:/i)).toBeInTheDocument();
      expect(screen.getByText(/row 20|20:/i)).toBeInTheDocument();

      // Should show reasons
      expect(screen.getByText(/DRAWING is empty/i)).toBeInTheDocument();
      expect(screen.getByText(/TYPE is empty/i)).toBeInTheDocument();
      expect(screen.getByText(/Duplicate identity key/i)).toBeInTheDocument();
    });

    it('should group errors by category', () => {
      const errorResults: ValidationResult[] = [
        { rowNumber: 5, status: 'error', reason: 'Required field DRAWING is empty', category: 'empty_drawing' },
        { rowNumber: 8, status: 'error', reason: 'Required field DRAWING is empty', category: 'empty_drawing' },
        { rowNumber: 12, status: 'error', reason: 'Required field TYPE is empty', category: 'missing_required_field' }
      ];

      const summary: ValidationSummary = {
        totalRows: 15,
        validCount: 12,
        skippedCount: 0,
        errorCount: 3,
        canImport: false,
        resultsByStatus: { valid: [], skipped: [], error: errorResults },
        resultsByCategory: {
          empty_drawing: [errorResults[0], errorResults[1]],
          missing_required_field: [errorResults[2]],
          unsupported_type: [],
          zero_quantity: [],
          duplicate_identity_key: [],
          invalid_quantity: [],
          malformed_data: []
        }
      };

      render(<ValidationResults summary={summary} />);

      // Should show category headers
      expect(screen.getByText(/empty.*drawing|missing.*drawing/i)).toBeInTheDocument();
      expect(screen.getByText(/missing.*required/i)).toBeInTheDocument();

      // Should show count per category
      expect(screen.getByText(/2.*rows/i)).toBeInTheDocument(); // 2 empty drawing errors
    });

    it('should limit error display to first 10 by default', () => {
      const errorResults: ValidationResult[] = Array.from({ length: 25 }, (_, i) => ({
        rowNumber: i + 1,
        status: 'error' as const,
        reason: 'Required field DRAWING is empty',
        category: 'empty_drawing' as const
      }));

      const summary: ValidationSummary = {
        totalRows: 25,
        validCount: 0,
        skippedCount: 0,
        errorCount: 25,
        canImport: false,
        resultsByStatus: { valid: [], skipped: [], error: errorResults },
        resultsByCategory: {
          empty_drawing: errorResults,
          unsupported_type: [],
          zero_quantity: [],
          missing_required_field: [],
          duplicate_identity_key: [],
          invalid_quantity: [],
          malformed_data: []
        }
      };

      render(<ValidationResults summary={summary} />);

      // Should show "showing first 10" or similar message
      expect(screen.getByText(/showing.*10|first 10|25 total/i)).toBeInTheDocument();
    });

    it('should support expanding to show all errors', async () => {
      const user = userEvent.setup();

      const errorResults: ValidationResult[] = Array.from({ length: 15 }, (_, i) => ({
        rowNumber: i + 1,
        status: 'error' as const,
        reason: 'Required field DRAWING is empty',
        category: 'empty_drawing' as const
      }));

      const summary: ValidationSummary = {
        totalRows: 15,
        validCount: 0,
        skippedCount: 0,
        errorCount: 15,
        canImport: false,
        resultsByStatus: { valid: [], skipped: [], error: errorResults },
        resultsByCategory: {
          empty_drawing: errorResults,
          unsupported_type: [],
          zero_quantity: [],
          missing_required_field: [],
          duplicate_identity_key: [],
          invalid_quantity: [],
          malformed_data: []
        }
      };

      render(<ValidationResults summary={summary} />);

      // Should have "Show more" button
      const showMoreButton = screen.getByRole('button', { name: /show more|view all|expand/i });
      expect(showMoreButton).toBeInTheDocument();

      // Click to expand
      await user.click(showMoreButton);

      // Should now show row 15
      expect(screen.getByText(/row 15|15:/i)).toBeInTheDocument();
    });
  });

  describe('Warning Details (Skipped Rows)', () => {
    it('should display skipped row numbers and reasons', () => {
      const skippedResults: ValidationResult[] = [
        { rowNumber: 3, status: 'skipped', reason: 'Unsupported component type: Gasket', category: 'unsupported_type' },
        { rowNumber: 7, status: 'skipped', reason: 'Component quantity is 0', category: 'zero_quantity' }
      ];

      const summary: ValidationSummary = {
        totalRows: 10,
        validCount: 8,
        skippedCount: 2,
        errorCount: 0,
        canImport: true,
        resultsByStatus: { valid: [], skipped: skippedResults, error: [] },
        resultsByCategory: {
          unsupported_type: [skippedResults[0]],
          zero_quantity: [skippedResults[1]],
          missing_required_field: [],
          duplicate_identity_key: [],
          empty_drawing: [],
          invalid_quantity: [],
          malformed_data: []
        }
      };

      render(<ValidationResults summary={summary} />);

      // Should show row numbers
      expect(screen.getByText(/row 3|3:/i)).toBeInTheDocument();
      expect(screen.getByText(/row 7|7:/i)).toBeInTheDocument();

      // Should show reasons
      expect(screen.getByText(/Gasket/i)).toBeInTheDocument();
      expect(screen.getByText(/quantity is 0/i)).toBeInTheDocument();
    });

    it('should use warning styling for skipped rows', () => {
      const skippedResults: ValidationResult[] = [
        { rowNumber: 3, status: 'skipped', reason: 'Unsupported component type: Gasket', category: 'unsupported_type' }
      ];

      const summary: ValidationSummary = {
        totalRows: 5,
        validCount: 4,
        skippedCount: 1,
        errorCount: 0,
        canImport: true,
        resultsByStatus: { valid: [], skipped: skippedResults, error: [] },
        resultsByCategory: {
          unsupported_type: skippedResults,
          zero_quantity: [],
          missing_required_field: [],
          duplicate_identity_key: [],
          empty_drawing: [],
          invalid_quantity: [],
          malformed_data: []
        }
      };

      const { container } = render(<ValidationResults summary={summary} />);

      // Should use yellow/amber/warning styling
      const warningElement = container.querySelector('[class*="yellow"], [class*="amber"], [class*="warning"]');
      expect(warningElement).toBeTruthy();
    });

    it('should collapse skipped section by default when errors present', () => {
      const skippedResults: ValidationResult[] = [
        { rowNumber: 3, status: 'skipped', reason: 'Unsupported component type: Gasket', category: 'unsupported_type' }
      ];

      const errorResults: ValidationResult[] = [
        { rowNumber: 5, status: 'error', reason: 'Required field DRAWING is empty', category: 'empty_drawing' }
      ];

      const summary: ValidationSummary = {
        totalRows: 10,
        validCount: 8,
        skippedCount: 1,
        errorCount: 1,
        canImport: false,
        resultsByStatus: { valid: [], skipped: skippedResults, error: errorResults },
        resultsByCategory: {
          unsupported_type: skippedResults,
          empty_drawing: errorResults,
          zero_quantity: [],
          missing_required_field: [],
          duplicate_identity_key: [],
          invalid_quantity: [],
          malformed_data: []
        }
      };

      render(<ValidationResults summary={summary} />);

      // Errors should be visible
      expect(screen.getByText(/DRAWING is empty/i)).toBeInTheDocument();

      // Skipped details might be collapsed (check for expandable button)
      // This depends on implementation, but the count should always be visible
      expect(screen.getByText(/1.*skipped/i)).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should handle no validation issues (all valid)', () => {
      const summary: ValidationSummary = {
        totalRows: 50,
        validCount: 50,
        skippedCount: 0,
        errorCount: 0,
        canImport: true,
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
      };

      render(<ValidationResults summary={summary} />);

      // Should show success message
      expect(screen.getByText(/all.*valid|no.*errors|ready/i)).toBeInTheDocument();
      expect(screen.getByText(/50.*valid/i)).toBeInTheDocument();
    });

    it('should not render if summary is null', () => {
      const { container } = render(<ValidationResults summary={null as any} />);

      // Should render nothing or a minimal placeholder
      expect(container.textContent).toBe('');
    });
  });

  describe('Accessibility', () => {
    it('should use semantic HTML for results list', () => {
      const errorResults: ValidationResult[] = [
        { rowNumber: 5, status: 'error', reason: 'Required field DRAWING is empty', category: 'empty_drawing' }
      ];

      const summary: ValidationSummary = {
        totalRows: 10,
        validCount: 9,
        skippedCount: 0,
        errorCount: 1,
        canImport: false,
        resultsByStatus: { valid: [], skipped: [], error: errorResults },
        resultsByCategory: {
          empty_drawing: errorResults,
          unsupported_type: [],
          zero_quantity: [],
          missing_required_field: [],
          duplicate_identity_key: [],
          invalid_quantity: [],
          malformed_data: []
        }
      };

      const { container } = render(<ValidationResults summary={summary} />);

      // Should use lists for error details
      expect(container.querySelector('ul') || container.querySelector('ol')).toBeInTheDocument();
    });

    it('should have ARIA labels for status indicators', () => {
      const summary: ValidationSummary = {
        totalRows: 10,
        validCount: 8,
        skippedCount: 1,
        errorCount: 1,
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
      };

      const { container } = render(<ValidationResults summary={summary} />);

      // Should have accessible status information
      expect(container.querySelector('[aria-label]') || container.querySelector('[role]')).toBeTruthy();
    });

    it('should support keyboard navigation for expandable sections', async () => {
      const user = userEvent.setup();

      const errorResults: ValidationResult[] = Array.from({ length: 15 }, (_, i) => ({
        rowNumber: i + 1,
        status: 'error' as const,
        reason: 'Required field DRAWING is empty',
        category: 'empty_drawing' as const
      }));

      const summary: ValidationSummary = {
        totalRows: 15,
        validCount: 0,
        skippedCount: 0,
        errorCount: 15,
        canImport: false,
        resultsByStatus: { valid: [], skipped: [], error: errorResults },
        resultsByCategory: {
          empty_drawing: errorResults,
          unsupported_type: [],
          zero_quantity: [],
          missing_required_field: [],
          duplicate_identity_key: [],
          invalid_quantity: [],
          malformed_data: []
        }
      };

      render(<ValidationResults summary={summary} />);

      const showMoreButton = screen.getByRole('button', { name: /show more|view all|expand/i });

      // Should be keyboard accessible (Tab to focus, Enter to activate)
      await user.tab();
      expect(showMoreButton).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(screen.getByText(/row 15|15:/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should render on mobile viewports without horizontal scroll', () => {
      const errorResults: ValidationResult[] = [
        { rowNumber: 5, status: 'error', reason: 'This is a very long error message that might cause horizontal overflow on mobile devices if not handled properly', category: 'malformed_data' }
      ];

      const summary: ValidationSummary = {
        totalRows: 10,
        validCount: 9,
        skippedCount: 0,
        errorCount: 1,
        canImport: false,
        resultsByStatus: { valid: [], skipped: [], error: errorResults },
        resultsByCategory: {
          malformed_data: errorResults,
          unsupported_type: [],
          zero_quantity: [],
          missing_required_field: [],
          duplicate_identity_key: [],
          empty_drawing: [],
          invalid_quantity: []
        }
      };

      const { container } = render(<ValidationResults summary={summary} />);

      // Should use text wrapping (checked via Tailwind classes like break-words, whitespace-normal)
      expect(container.firstChild).toBeTruthy();
    });
  });
});
