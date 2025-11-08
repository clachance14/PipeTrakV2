/**
 * Integration Test: Type Filtering (T043)
 *
 * Verifies that unsupported component types (Gasket, Bolt, Nut) are:
 * - Categorized as "skipped" (not "error")
 * - Show warnings (not errors)
 * - Valid rows still import successfully
 *
 * User Story 5: Skip Unsupported Component Types with Warnings
 */

import { describe, it, expect } from 'vitest';
import { mapColumns } from '@/lib/csv/column-mapper';
import {
  validateRows,
  createValidationSummary,
  getValidRows,
  getSkipDetails
} from '@/lib/csv/csv-validator';
import { DEFAULT_VALIDATION_RULES } from '@/lib/csv/types';

describe('Type Filtering', () => {
  describe('Unsupported types are skipped with warnings', () => {
    const csvRowsWithUnsupportedTypes = [
      {
        'DRAWING': 'P-001',
        'TYPE': 'Spool',
        'QTY': '1',
        'CMDTY CODE': 'SPOOL-001'
      },
      {
        'DRAWING': 'P-002',
        'TYPE': 'Gasket',
        'QTY': '10',
        'CMDTY CODE': 'GASKET-001'
      },
      {
        'DRAWING': 'P-003',
        'TYPE': 'Valve',
        'QTY': '1',
        'CMDTY CODE': 'VALVE-001'
      },
      {
        'DRAWING': 'P-004',
        'TYPE': 'Bolt',
        'QTY': '50',
        'CMDTY CODE': 'BOLT-001'
      }
    ];

    it('should categorize unsupported types as "skipped" not "error"', () => {
      const mappingResult = mapColumns(['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE']);
      const columnLookupMap = new Map(
        mappingResult.mappings.map(m => [m.csvColumn, m.expectedField])
      );

      const validationResults = validateRows(csvRowsWithUnsupportedTypes, columnLookupMap);

      // Check Gasket row (index 1)
      expect(validationResults[1].status).toBe('skipped');
      expect(validationResults[1].status).not.toBe('error');

      // Check Bolt row (index 3)
      expect(validationResults[3].status).toBe('skipped');
      expect(validationResults[3].status).not.toBe('error');
    });

    it('should have category "unsupported_type" for unsupported types', () => {
      const mappingResult = mapColumns(['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE']);
      const columnLookupMap = new Map(
        mappingResult.mappings.map(m => [m.csvColumn, m.expectedField])
      );

      const validationResults = validateRows(csvRowsWithUnsupportedTypes, columnLookupMap);

      expect(validationResults[1].category).toBe('unsupported_type');
      expect(validationResults[3].category).toBe('unsupported_type');
    });

    it('should include type name in skip reason', () => {
      const mappingResult = mapColumns(['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE']);
      const columnLookupMap = new Map(
        mappingResult.mappings.map(m => [m.csvColumn, m.expectedField])
      );

      const validationResults = validateRows(csvRowsWithUnsupportedTypes, columnLookupMap);

      expect(validationResults[1].reason).toBe('Unsupported component type: Gasket');
      expect(validationResults[3].reason).toBe('Unsupported component type: Bolt');
    });

    it('should show correct counts in validation summary', () => {
      const mappingResult = mapColumns(['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE']);
      const columnLookupMap = new Map(
        mappingResult.mappings.map(m => [m.csvColumn, m.expectedField])
      );

      const validationResults = validateRows(csvRowsWithUnsupportedTypes, columnLookupMap);
      const summary = createValidationSummary(validationResults);

      expect(summary.validCount).toBe(2); // Spool and Valve
      expect(summary.skippedCount).toBe(2); // Gasket and Bolt
      expect(summary.errorCount).toBe(0); // No errors
    });

    it('should allow import when only skipped rows present (canImport=true)', () => {
      const mappingResult = mapColumns(['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE']);
      const columnLookupMap = new Map(
        mappingResult.mappings.map(m => [m.csvColumn, m.expectedField])
      );

      const validationResults = validateRows(csvRowsWithUnsupportedTypes, columnLookupMap);
      const summary = createValidationSummary(validationResults);

      // Should be able to import because no errors (only warnings/skipped)
      expect(summary.canImport).toBe(true);
      expect(summary.errorCount).toBe(0);
    });

    it('should filter out skipped rows when getting valid rows for import', () => {
      const mappingResult = mapColumns(['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE']);
      const columnLookupMap = new Map(
        mappingResult.mappings.map(m => [m.csvColumn, m.expectedField])
      );

      const validationResults = validateRows(csvRowsWithUnsupportedTypes, columnLookupMap);
      const validRows = getValidRows(validationResults);

      // Only Spool and Valve rows
      expect(validRows).toHaveLength(2);
      expect(validRows[0].type).toBe('Spool');
      expect(validRows[1].type).toBe('Valve');
    });
  });

  describe('Supported vs unsupported types', () => {
    it('should have defined list of valid component types', () => {
      expect(DEFAULT_VALIDATION_RULES.validTypes).toBeDefined();
      expect(Array.isArray(DEFAULT_VALIDATION_RULES.validTypes)).toBe(true);
      expect(DEFAULT_VALIDATION_RULES.validTypes.length).toBeGreaterThan(0);
    });

    it('should include common supported types', () => {
      const validTypes = DEFAULT_VALIDATION_RULES.validTypes;

      expect(validTypes).toContain('Spool');
      expect(validTypes).toContain('Valve');
      expect(validTypes).toContain('Flange');
      expect(validTypes).toContain('Instrument');
    });

    it('should NOT include unsupported types', () => {
      const validTypes = DEFAULT_VALIDATION_RULES.validTypes;

      expect(validTypes).not.toContain('Gasket');
      expect(validTypes).not.toContain('Bolt');
      expect(validTypes).not.toContain('Nut');
    });

    it('should validate all supported types correctly', () => {
      const validTypes = DEFAULT_VALIDATION_RULES.validTypes;

      validTypes.forEach((type, index) => {
        const csvRows = [{
          'DRAWING': `P-${index + 1}`,
          'TYPE': type,
          'QTY': '1',
          'CMDTY CODE': `CODE-${index + 1}`
        }];

        const mappingResult = mapColumns(['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE']);
        const columnLookupMap = new Map(
          mappingResult.mappings.map(m => [m.csvColumn, m.expectedField])
        );

        const validationResults = validateRows(csvRows, columnLookupMap);

        expect(validationResults[0].status).toBe('valid');
        expect(validationResults[0].data?.type).toBe(type);
      });
    });
  });

  describe('Case-insensitive type matching', () => {
    it('should accept lowercase type names (preserves user input case)', () => {
      const csvRows = [{
        'DRAWING': 'P-001',
        'TYPE': 'valve',
        'QTY': '1',
        'CMDTY CODE': 'VALVE-001'
      }];

      const mappingResult = mapColumns(['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE']);
      const columnLookupMap = new Map(
        mappingResult.mappings.map(m => [m.csvColumn, m.expectedField])
      );

      const validationResults = validateRows(csvRows, columnLookupMap);

      expect(validationResults[0].status).toBe('valid');
      // Validator preserves user's input case
      expect(validationResults[0].data?.type).toBe('valve');
    });

    it('should accept uppercase type names (preserves user input case)', () => {
      const csvRows = [{
        'DRAWING': 'P-001',
        'TYPE': 'SPOOL',
        'QTY': '1',
        'CMDTY CODE': 'SPOOL-001'
      }];

      const mappingResult = mapColumns(['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE']);
      const columnLookupMap = new Map(
        mappingResult.mappings.map(m => [m.csvColumn, m.expectedField])
      );

      const validationResults = validateRows(csvRows, columnLookupMap);

      expect(validationResults[0].status).toBe('valid');
      // Validator preserves user's input case
      expect(validationResults[0].data?.type).toBe('SPOOL');
    });

    it('should accept mixed case type names (preserves user input case)', () => {
      const csvRows = [{
        'DRAWING': 'P-001',
        'TYPE': 'FlAnGe',
        'QTY': '1',
        'CMDTY CODE': 'FLANGE-001'
      }];

      const mappingResult = mapColumns(['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE']);
      const columnLookupMap = new Map(
        mappingResult.mappings.map(m => [m.csvColumn, m.expectedField])
      );

      const validationResults = validateRows(csvRows, columnLookupMap);

      expect(validationResults[0].status).toBe('valid');
      // Validator preserves user's input case
      expect(validationResults[0].data?.type).toBe('FlAnGe');
    });
  });

  describe('Skip details extraction', () => {
    it('should extract skip details with row numbers and reasons', () => {
      const csvRows = [
        {
          'DRAWING': 'P-001',
          'TYPE': 'Spool',
          'QTY': '1',
          'CMDTY CODE': 'SPOOL-001'
        },
        {
          'DRAWING': 'P-002',
          'TYPE': 'Gasket',
          'QTY': '10',
          'CMDTY CODE': 'GASKET-001'
        },
        {
          'DRAWING': 'P-003',
          'TYPE': 'Nut',
          'QTY': '100',
          'CMDTY CODE': 'NUT-001'
        }
      ];

      const mappingResult = mapColumns(['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE']);
      const columnLookupMap = new Map(
        mappingResult.mappings.map(m => [m.csvColumn, m.expectedField])
      );

      const validationResults = validateRows(csvRows, columnLookupMap);
      const skipDetails = getSkipDetails(validationResults);

      expect(skipDetails).toHaveLength(2);
      expect(skipDetails[0].rowNumber).toBe(2);
      expect(skipDetails[0].reason).toContain('Gasket');
      expect(skipDetails[0].category).toBe('unsupported_type');

      expect(skipDetails[1].rowNumber).toBe(3);
      expect(skipDetails[1].reason).toContain('Nut');
      expect(skipDetails[1].category).toBe('unsupported_type');
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle CSV with mostly unsupported types', () => {
      const csvRows = [
        { 'DRAWING': 'P-001', 'TYPE': 'Gasket', 'QTY': '10', 'CMDTY CODE': 'GASKET-001' },
        { 'DRAWING': 'P-002', 'TYPE': 'Bolt', 'QTY': '50', 'CMDTY CODE': 'BOLT-001' },
        { 'DRAWING': 'P-003', 'TYPE': 'Nut', 'QTY': '50', 'CMDTY CODE': 'NUT-001' },
        { 'DRAWING': 'P-004', 'TYPE': 'Valve', 'QTY': '1', 'CMDTY CODE': 'VALVE-001' },
        { 'DRAWING': 'P-005', 'TYPE': 'Gasket', 'QTY': '20', 'CMDTY CODE': 'GASKET-002' }
      ];

      const mappingResult = mapColumns(['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE']);
      const columnLookupMap = new Map(
        mappingResult.mappings.map(m => [m.csvColumn, m.expectedField])
      );

      const validationResults = validateRows(csvRows, columnLookupMap);
      const summary = createValidationSummary(validationResults);

      expect(summary.validCount).toBe(1); // Only Valve
      expect(summary.skippedCount).toBe(4); // 2 Gaskets, 1 Bolt, 1 Nut
      expect(summary.canImport).toBe(true); // Should still allow import
    });

    it('should handle CSV with all unsupported types', () => {
      const csvRows = [
        { 'DRAWING': 'P-001', 'TYPE': 'Gasket', 'QTY': '10', 'CMDTY CODE': 'GASKET-001' },
        { 'DRAWING': 'P-002', 'TYPE': 'Bolt', 'QTY': '50', 'CMDTY CODE': 'BOLT-001' }
      ];

      const mappingResult = mapColumns(['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE']);
      const columnLookupMap = new Map(
        mappingResult.mappings.map(m => [m.csvColumn, m.expectedField])
      );

      const validationResults = validateRows(csvRows, columnLookupMap);
      const summary = createValidationSummary(validationResults);
      const validRows = getValidRows(validationResults);

      expect(summary.validCount).toBe(0);
      expect(summary.skippedCount).toBe(2);
      expect(summary.canImport).toBe(true); // No errors, just skipped
      expect(validRows).toHaveLength(0); // Nothing to import
    });

    it('should combine unsupported types with other skip reasons', () => {
      const csvRows = [
        { 'DRAWING': 'P-001', 'TYPE': 'Valve', 'QTY': '1', 'CMDTY CODE': 'VALVE-001' },
        { 'DRAWING': 'P-002', 'TYPE': 'Gasket', 'QTY': '10', 'CMDTY CODE': 'GASKET-001' },
        { 'DRAWING': 'P-003', 'TYPE': 'Spool', 'QTY': '0', 'CMDTY CODE': 'SPOOL-001' }
      ];

      const mappingResult = mapColumns(['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE']);
      const columnLookupMap = new Map(
        mappingResult.mappings.map(m => [m.csvColumn, m.expectedField])
      );

      const validationResults = validateRows(csvRows, columnLookupMap);
      const summary = createValidationSummary(validationResults);

      expect(summary.validCount).toBe(1); // Valve
      expect(summary.skippedCount).toBe(2); // Gasket + zero quantity

      // Check categories
      expect(validationResults[1].category).toBe('unsupported_type');
      expect(validationResults[2].category).toBe('zero_quantity');
    });
  });

  describe('Validation summary grouping by category', () => {
    it('should group skipped rows by category', () => {
      const csvRows = [
        { 'DRAWING': 'P-001', 'TYPE': 'Valve', 'QTY': '1', 'CMDTY CODE': 'VALVE-001' },
        { 'DRAWING': 'P-002', 'TYPE': 'Gasket', 'QTY': '10', 'CMDTY CODE': 'GASKET-001' },
        { 'DRAWING': 'P-003', 'TYPE': 'Bolt', 'QTY': '50', 'CMDTY CODE': 'BOLT-001' },
        { 'DRAWING': 'P-004', 'TYPE': 'Spool', 'QTY': '0', 'CMDTY CODE': 'SPOOL-001' }
      ];

      const mappingResult = mapColumns(['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE']);
      const columnLookupMap = new Map(
        mappingResult.mappings.map(m => [m.csvColumn, m.expectedField])
      );

      const validationResults = validateRows(csvRows, columnLookupMap);
      const summary = createValidationSummary(validationResults);

      expect(summary.resultsByCategory.unsupported_type).toHaveLength(2);
      expect(summary.resultsByCategory.zero_quantity).toHaveLength(1);
    });
  });
});
