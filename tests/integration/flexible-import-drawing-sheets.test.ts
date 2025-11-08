/**
 * Integration Test: Drawing Sheet Handling (T039)
 *
 * Verifies that drawing sheets (e.g., "P-91010_1 01of02", "P-91010_1 02of02")
 * are treated as separate entities and NOT stripped during normalization.
 *
 * User Story 4: Handle Drawing Sheets as Separate Entities
 */

import { describe, it, expect } from 'vitest';
import { mapColumns } from '@/lib/csv/column-mapper';
import { validateRows } from '@/lib/csv/csv-validator';
import { normalizeDrawing } from '@/lib/csv/normalize-drawing';

describe('Drawing Sheet Handling', () => {
  describe('normalize-drawing.ts preserves sheet indicators', () => {
    it('should preserve sheet indicator format "01of02"', () => {
      const input = 'P-91010_1 01of02';
      const normalized = normalizeDrawing(input);

      expect(normalized).toBe('P-91010_1 01OF02');
      expect(normalized).toContain('01OF02');
    });

    it('should preserve sheet indicator format "02of02"', () => {
      const input = 'P-91010_1 02of02';
      const normalized = normalizeDrawing(input);

      expect(normalized).toBe('P-91010_1 02OF02');
      expect(normalized).toContain('02OF02');
    });

    it('should uppercase and preserve sheet indicator', () => {
      const input = 'p-91010_1 01of01';
      const normalized = normalizeDrawing(input);

      expect(normalized).toBe('P-91010_1 01OF01');
    });

    it('should collapse multiple spaces but preserve sheet indicator', () => {
      const input = 'P-91010_1   01of02';
      const normalized = normalizeDrawing(input);

      expect(normalized).toBe('P-91010_1 01OF02');
      expect(normalized).toContain('01OF02');
    });

    it('should trim whitespace and preserve sheet indicator', () => {
      const input = '  P-91010_1 01of02  ';
      const normalized = normalizeDrawing(input);

      expect(normalized).toBe('P-91010_1 01OF02');
      expect(normalized).not.toContain('  ');
    });

    it('should handle various sheet formats', () => {
      const testCases = [
        { input: 'P-001 01of03', expected: 'P-001 01OF03' },
        { input: 'DRAIN-1 1of2', expected: 'DRAIN-1 1OF2' },
        { input: 'PW-55401 Sheet 1 of 2', expected: 'PW-55401 SHEET 1 OF 2' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(normalizeDrawing(input)).toBe(expected);
      });
    });
  });

  describe('CSV validation treats sheets as distinct drawings', () => {
    const csvRowsWithSheets = [
      {
        'DRAWING': 'P-91010_1 01of02',
        'TYPE': 'Spool',
        'QTY': '1',
        'CMDTY CODE': 'SPOOL-001'
      },
      {
        'DRAWING': 'P-91010_1 02of02',
        'TYPE': 'Spool',
        'QTY': '1',
        'CMDTY CODE': 'SPOOL-002'
      }
    ];

    it('should map columns correctly for sheet-bearing drawing numbers', () => {
      const csvColumns = ['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE'];
      const mappingResult = mapColumns(csvColumns);

      expect(mappingResult.hasAllRequiredFields).toBe(true);
      expect(mappingResult.mappings).toHaveLength(4);
      expect(mappingResult.missingRequiredFields).toHaveLength(0);
    });

    it('should validate both sheets as distinct valid rows', () => {
      const mappingResult = mapColumns(['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE']);
      const columnLookupMap = new Map(
        mappingResult.mappings.map(m => [m.csvColumn, m.expectedField])
      );

      const validationResults = validateRows(csvRowsWithSheets, columnLookupMap);

      expect(validationResults).toHaveLength(2);
      expect(validationResults[0].status).toBe('valid');
      expect(validationResults[1].status).toBe('valid');
    });

    it('should normalize sheets differently for identity key generation', () => {
      const mappingResult = mapColumns(['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE']);
      const columnLookupMap = new Map(
        mappingResult.mappings.map(m => [m.csvColumn, m.expectedField])
      );

      const validationResults = validateRows(csvRowsWithSheets, columnLookupMap);

      const drawing1 = validationResults[0].data?.drawing;
      const drawing2 = validationResults[1].data?.drawing;

      // Both drawings should be normalized but distinct
      expect(drawing1).toBe('P-91010_1 01OF02');
      expect(drawing2).toBe('P-91010_1 02OF02');
      expect(drawing1).not.toBe(drawing2);
    });

    it('should NOT treat sheets as duplicates', () => {
      const mappingResult = mapColumns(['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE']);
      const columnLookupMap = new Map(
        mappingResult.mappings.map(m => [m.csvColumn, m.expectedField])
      );

      const validationResults = validateRows(csvRowsWithSheets, columnLookupMap);

      // Neither should be marked as duplicate
      expect(validationResults[0].status).toBe('valid');
      expect(validationResults[1].status).toBe('valid');
      expect(validationResults[0].category).not.toBe('duplicate_identity_key');
      expect(validationResults[1].category).not.toBe('duplicate_identity_key');
    });
  });

  describe('Real-world sheet scenarios', () => {
    it('should handle mixed sheets and non-sheets in same CSV', () => {
      const csvRows = [
        {
          'DRAWING': 'P-001',
          'TYPE': 'Valve',
          'QTY': '2',
          'CMDTY CODE': 'VALVE-001'
        },
        {
          'DRAWING': 'P-002 01of02',
          'TYPE': 'Flange',
          'QTY': '4',
          'CMDTY CODE': 'FLANGE-001'
        },
        {
          'DRAWING': 'P-002 02of02',
          'TYPE': 'Spool',
          'QTY': '1',
          'CMDTY CODE': 'SPOOL-001'
        },
        {
          'DRAWING': 'P-003',
          'TYPE': 'Instrument',
          'QTY': '1',
          'CMDTY CODE': 'INST-001'
        }
      ];

      const mappingResult = mapColumns(['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE']);
      const columnLookupMap = new Map(
        mappingResult.mappings.map(m => [m.csvColumn, m.expectedField])
      );

      const validationResults = validateRows(csvRows, columnLookupMap);

      expect(validationResults).toHaveLength(4);
      expect(validationResults.every(r => r.status === 'valid')).toBe(true);

      // Verify distinct drawing numbers
      const drawings = validationResults.map(r => r.data?.drawing);
      expect(drawings).toEqual([
        'P-001',
        'P-002 01OF02',
        'P-002 02OF02',
        'P-003'
      ]);
    });

    it('should handle components on same sheet with different cmdty codes', () => {
      const csvRows = [
        {
          'DRAWING': 'P-002 01of02',
          'TYPE': 'Flange',
          'QTY': '4',
          'CMDTY CODE': 'FLANGE-001'
        },
        {
          'DRAWING': 'P-002 01of02',
          'TYPE': 'Valve',
          'QTY': '2',
          'CMDTY CODE': 'VALVE-001'
        }
      ];

      const mappingResult = mapColumns(['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE']);
      const columnLookupMap = new Map(
        mappingResult.mappings.map(m => [m.csvColumn, m.expectedField])
      );

      const validationResults = validateRows(csvRows, columnLookupMap);

      expect(validationResults).toHaveLength(2);
      expect(validationResults.every(r => r.status === 'valid')).toBe(true);

      // Both should have same normalized drawing
      expect(validationResults[0].data?.drawing).toBe('P-002 01OF02');
      expect(validationResults[1].data?.drawing).toBe('P-002 01OF02');
    });
  });

  describe('Edge cases', () => {
    it('should handle lowercase sheet indicators', () => {
      const input = 'p-001 01of02';
      const normalized = normalizeDrawing(input);

      expect(normalized).toBe('P-001 01OF02');
    });

    it('should handle sheet indicators with extra spaces', () => {
      const input = 'P-001  01of02';
      const normalized = normalizeDrawing(input);

      expect(normalized).toBe('P-001 01OF02');
    });

    it('should NOT strip patterns that look like sheets', () => {
      const testCases = [
        'P-001 01of02',
        'P-001 1of2',
        'P-001 Sheet 1 of 2'
      ];

      testCases.forEach(input => {
        const normalized = normalizeDrawing(input);
        expect(normalized).not.toBe('P-001'); // Should not strip sheet info
        expect(normalized.length).toBeGreaterThan('P-001'.length);
      });
    });
  });
});
