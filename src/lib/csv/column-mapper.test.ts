/**
 * Unit Tests for Column Mapper
 *
 * Tests the three-tier column mapping algorithm:
 * - Tier 1: Exact match (100% confidence)
 * - Tier 2: Case-insensitive match (95% confidence)
 * - Tier 3: Synonym match (85% confidence)
 */

import { describe, it, expect } from 'vitest';
import { mapColumns } from './column-mapper';
import type { ColumnMappingResult, ExpectedField } from './types';

describe('column-mapper', () => {
  describe('Tier 1: Exact Matching', () => {
    it('should map exact field names with 100% confidence', () => {
      const csvColumns = ['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE', 'SIZE'];
      const result: ColumnMappingResult = mapColumns(csvColumns);

      expect(result.mappings).toHaveLength(5);
      expect(result.hasAllRequiredFields).toBe(true);
      expect(result.missingRequiredFields).toHaveLength(0);

      // Verify exact matches
      const drawingMapping = result.mappings.find(m => m.expectedField === 'DRAWING');
      expect(drawingMapping).toBeDefined();
      expect(drawingMapping?.confidence).toBe(100);
      expect(drawingMapping?.matchTier).toBe('exact');
      expect(drawingMapping?.csvColumn).toBe('DRAWING');
    });

    it('should map all required fields with exact match', () => {
      const csvColumns = ['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE'];
      const result = mapColumns(csvColumns);

      expect(result.hasAllRequiredFields).toBe(true);
      expect(result.missingRequiredFields).toHaveLength(0);

      const requiredFields: ExpectedField[] = ['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE'];
      requiredFields.forEach(field => {
        const mapping = result.mappings.find(m => m.expectedField === field);
        expect(mapping).toBeDefined();
        expect(mapping?.confidence).toBe(100);
        expect(mapping?.matchTier).toBe('exact');
      });
    });
  });

  describe('Tier 2: Case-Insensitive Matching', () => {
    it('should map lowercase columns with 95% confidence', () => {
      const csvColumns = ['drawing', 'type', 'qty', 'cmdty code'];
      const result = mapColumns(csvColumns);

      expect(result.mappings).toHaveLength(4);
      expect(result.hasAllRequiredFields).toBe(true);

      result.mappings.forEach(mapping => {
        expect(mapping.confidence).toBe(95);
        expect(mapping.matchTier).toBe('case-insensitive');
      });
    });

    it('should map mixed case columns with 95% confidence', () => {
      const csvColumns = ['Drawing', 'Type', 'Qty', 'Cmdty Code'];
      const result = mapColumns(csvColumns);

      expect(result.mappings).toHaveLength(4);
      expect(result.hasAllRequiredFields).toBe(true);

      result.mappings.forEach(mapping => {
        expect(mapping.confidence).toBe(95);
        expect(mapping.matchTier).toBe('case-insensitive');
      });
    });
  });

  describe('Tier 3: Synonym Matching', () => {
    it('should map "DRAWINGS" to "DRAWING" with 85% confidence', () => {
      const csvColumns = ['DRAWINGS', 'TYPE', 'QTY', 'CMDTY CODE'];
      const result = mapColumns(csvColumns);

      const drawingMapping = result.mappings.find(m => m.expectedField === 'DRAWING');
      expect(drawingMapping).toBeDefined();
      expect(drawingMapping?.csvColumn).toBe('DRAWINGS');
      expect(drawingMapping?.confidence).toBe(85);
      expect(drawingMapping?.matchTier).toBe('synonym');
      expect(result.hasAllRequiredFields).toBe(true);
    });

    it('should map "Cmdty Code" to "CMDTY CODE" with 95% confidence (case-insensitive)', () => {
      const csvColumns = ['DRAWING', 'TYPE', 'QTY', 'Cmdty Code'];
      const result = mapColumns(csvColumns);

      const cmdtyMapping = result.mappings.find(m => m.expectedField === 'CMDTY CODE');
      expect(cmdtyMapping).toBeDefined();
      expect(cmdtyMapping?.csvColumn).toBe('Cmdty Code');
      // "Cmdty Code" uppercased is "CMDTY CODE", so it matches case-insensitively
      expect(cmdtyMapping?.confidence).toBe(95);
      expect(cmdtyMapping?.matchTier).toBe('case-insensitive');
    });

    it('should map "CMDTY" to "CMDTY CODE" with 85% confidence (synonym)', () => {
      const csvColumns = ['DRAWING', 'TYPE', 'QTY', 'CMDTY'];
      const result = mapColumns(csvColumns);

      const cmdtyMapping = result.mappings.find(m => m.expectedField === 'CMDTY CODE');
      expect(cmdtyMapping).toBeDefined();
      expect(cmdtyMapping?.csvColumn).toBe('CMDTY');
      expect(cmdtyMapping?.confidence).toBe(85);
      expect(cmdtyMapping?.matchTier).toBe('synonym');
    });

    it('should map "COMMODITY CODE" to "CMDTY CODE" with 85% confidence', () => {
      const csvColumns = ['DRAWING', 'TYPE', 'QTY', 'COMMODITY CODE'];
      const result = mapColumns(csvColumns);

      const cmdtyMapping = result.mappings.find(m => m.expectedField === 'CMDTY CODE');
      expect(cmdtyMapping).toBeDefined();
      expect(cmdtyMapping?.csvColumn).toBe('COMMODITY CODE');
      expect(cmdtyMapping?.confidence).toBe(85);
      expect(cmdtyMapping?.matchTier).toBe('synonym');
    });

    it('should map "Test Package" to "TEST_PACKAGE" with 85% confidence', () => {
      const csvColumns = ['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE', 'Test Package'];
      const result = mapColumns(csvColumns);

      const testPkgMapping = result.mappings.find(m => m.expectedField === 'TEST_PACKAGE');
      expect(testPkgMapping).toBeDefined();
      expect(testPkgMapping?.csvColumn).toBe('Test Package');
      expect(testPkgMapping?.confidence).toBe(85);
      expect(testPkgMapping?.matchTier).toBe('synonym');
    });
  });

  describe('Unmapped Columns', () => {
    it('should identify columns that cannot be mapped', () => {
      const csvColumns = ['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE', 'Item #', 'Vendor Code'];
      const result = mapColumns(csvColumns);

      expect(result.unmappedColumns).toHaveLength(2);
      expect(result.unmappedColumns).toContain('Item #');
      expect(result.unmappedColumns).toContain('Vendor Code');
    });

    it('should not fail import when unmapped columns exist', () => {
      const csvColumns = ['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE', 'Custom Field'];
      const result = mapColumns(csvColumns);

      expect(result.hasAllRequiredFields).toBe(true);
      expect(result.unmappedColumns).toContain('Custom Field');
    });
  });

  describe('Missing Required Fields', () => {
    it('should detect missing DRAWING field', () => {
      const csvColumns = ['TYPE', 'QTY', 'CMDTY CODE'];
      const result = mapColumns(csvColumns);

      expect(result.hasAllRequiredFields).toBe(false);
      expect(result.missingRequiredFields).toContain('DRAWING');
    });

    it('should detect multiple missing required fields', () => {
      const csvColumns = ['DRAWING', 'SIZE'];
      const result = mapColumns(csvColumns);

      expect(result.hasAllRequiredFields).toBe(false);
      expect(result.missingRequiredFields).toContain('TYPE');
      expect(result.missingRequiredFields).toContain('QTY');
      expect(result.missingRequiredFields).toContain('CMDTY CODE');
      expect(result.missingRequiredFields).toHaveLength(3);
    });

    it('should detect all missing required fields when CSV is empty', () => {
      const csvColumns: string[] = [];
      const result = mapColumns(csvColumns);

      expect(result.hasAllRequiredFields).toBe(false);
      expect(result.missingRequiredFields).toHaveLength(4);
      expect(result.missingRequiredFields).toContain('DRAWING');
      expect(result.missingRequiredFields).toContain('TYPE');
      expect(result.missingRequiredFields).toContain('QTY');
      expect(result.missingRequiredFields).toContain('CMDTY CODE');
    });
  });

  describe('Optional Fields', () => {
    it('should map optional metadata fields', () => {
      const csvColumns = ['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE', 'AREA', 'SYSTEM'];
      const result = mapColumns(csvColumns);

      expect(result.hasAllRequiredFields).toBe(true);
      expect(result.mappings).toHaveLength(6);

      const areaMapping = result.mappings.find(m => m.expectedField === 'AREA');
      expect(areaMapping).toBeDefined();
      expect(areaMapping?.confidence).toBe(100);

      const systemMapping = result.mappings.find(m => m.expectedField === 'SYSTEM');
      expect(systemMapping).toBeDefined();
      expect(systemMapping?.confidence).toBe(100);
    });

    it('should not mark optional fields as missing', () => {
      const csvColumns = ['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE'];
      const result = mapColumns(csvColumns);

      expect(result.hasAllRequiredFields).toBe(true);
      expect(result.missingRequiredFields).not.toContain('AREA');
      expect(result.missingRequiredFields).not.toContain('SYSTEM');
      expect(result.missingRequiredFields).not.toContain('SIZE');
    });
  });

  describe('Tier Precedence', () => {
    it('should prefer exact match over case-insensitive', () => {
      const csvColumns = ['DRAWING', 'drawing']; // Duplicate with different cases
      const result = mapColumns(csvColumns);

      // Should only map once, preferring exact match
      const drawingMappings = result.mappings.filter(m => m.expectedField === 'DRAWING');
      expect(drawingMappings).toHaveLength(1);
      expect(drawingMappings[0]?.confidence).toBe(100);
      expect(drawingMappings[0]?.matchTier).toBe('exact');
    });

    it('should prefer case-insensitive over synonym', () => {
      const csvColumns = ['drawing', 'DRAWINGS']; // Case-insensitive vs synonym
      const result = mapColumns(csvColumns);

      // Should only map once, preferring case-insensitive
      const drawingMappings = result.mappings.filter(m => m.expectedField === 'DRAWING');
      expect(drawingMappings).toHaveLength(1);
      expect(drawingMappings[0]?.confidence).toBe(95);
      expect(drawingMappings[0]?.matchTier).toBe('case-insensitive');
    });
  });

  describe('Real-World CSV Examples', () => {
    it('should handle Dark Knight CSV column headers', () => {
      const csvColumns = [
        'DRAWINGS',  // Synonym
        'Area',      // Case-insensitive
        'SPEC',      // Exact
        'System',    // Case-insensitive
        'Test Package',  // Synonym
        'TYPE',      // Exact
        'DESCRIPTION', // Exact
        'SIZE',      // Exact
        'QTY',       // Exact
        'CMDTY CODE', // Exact
        'Comments'   // Case-insensitive
      ];

      const result = mapColumns(csvColumns);

      expect(result.hasAllRequiredFields).toBe(true);
      expect(result.missingRequiredFields).toHaveLength(0);
      expect(result.unmappedColumns).toHaveLength(0);
      expect(result.mappings).toHaveLength(11);

      // Check specific mappings
      const drawingMapping = result.mappings.find(m => m.expectedField === 'DRAWING');
      expect(drawingMapping?.csvColumn).toBe('DRAWINGS');
      expect(drawingMapping?.matchTier).toBe('synonym');
    });

    it('should handle minimal CSV with only required fields', () => {
      const csvColumns = ['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE'];
      const result = mapColumns(csvColumns);

      expect(result.hasAllRequiredFields).toBe(true);
      expect(result.mappings).toHaveLength(4);
      expect(result.unmappedColumns).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty column names', () => {
      const csvColumns = ['DRAWING', '', 'TYPE', 'QTY', 'CMDTY CODE'];
      const result = mapColumns(csvColumns);

      expect(result.hasAllRequiredFields).toBe(true);
      expect(result.unmappedColumns).toContain('');
    });

    it('should handle columns with leading/trailing whitespace', () => {
      const csvColumns = [' DRAWING ', 'TYPE', 'QTY', 'CMDTY CODE'];
      const result = mapColumns(csvColumns);

      expect(result.hasAllRequiredFields).toBe(true);
      const drawingMapping = result.mappings.find(m => m.expectedField === 'DRAWING');
      expect(drawingMapping).toBeDefined();
    });

    it('should be case-sensitive for exact tier only', () => {
      const csvColumns = ['Cmdty Code']; // Not exact, should match via case-insensitive first
      const result = mapColumns(csvColumns);

      const cmdtyMapping = result.mappings.find(m => m.expectedField === 'CMDTY CODE');
      // Since "Cmdty Code" doesn't match "CMDTY CODE" exactly or case-insensitively,
      // it should match via synonym
      expect(cmdtyMapping).toBeDefined();
    });
  });

  describe('Column Name Normalization (Marker Characters)', () => {
    it('should strip trailing asterisks from column names', () => {
      const csvColumns = ['DRAWING*', 'TYPE*', 'QTY*', 'CMDTY CODE*'];
      const result = mapColumns(csvColumns);

      expect(result.hasAllRequiredFields).toBe(true);
      expect(result.missingRequiredFields).toHaveLength(0);
      expect(result.mappings).toHaveLength(4);

      // Verify all required fields mapped with original column names preserved
      const drawingMapping = result.mappings.find(m => m.expectedField === 'DRAWING');
      expect(drawingMapping).toBeDefined();
      expect(drawingMapping?.csvColumn).toBe('DRAWING*'); // Original column name preserved
      expect(drawingMapping?.confidence).toBe(100); // Exact match after normalization
      expect(drawingMapping?.matchTier).toBe('exact');
    });

    it('should strip multiple trailing asterisks', () => {
      const csvColumns = ['DRAWING**', 'TYPE***', 'QTY*', 'CMDTY CODE'];
      const result = mapColumns(csvColumns);

      expect(result.hasAllRequiredFields).toBe(true);

      const drawingMapping = result.mappings.find(m => m.expectedField === 'DRAWING');
      expect(drawingMapping?.csvColumn).toBe('DRAWING**');
      expect(drawingMapping?.confidence).toBe(100);
    });

    it('should strip trailing plus signs', () => {
      const csvColumns = ['DRAWING+', 'TYPE+', 'QTY', 'CMDTY CODE'];
      const result = mapColumns(csvColumns);

      expect(result.hasAllRequiredFields).toBe(true);

      const drawingMapping = result.mappings.find(m => m.expectedField === 'DRAWING');
      expect(drawingMapping?.csvColumn).toBe('DRAWING+');
    });

    it('should strip trailing exclamation marks and hash symbols', () => {
      const csvColumns = ['DRAWING!', 'TYPE#', 'QTY!#', 'CMDTY CODE'];
      const result = mapColumns(csvColumns);

      expect(result.hasAllRequiredFields).toBe(true);

      const drawingMapping = result.mappings.find(m => m.expectedField === 'DRAWING');
      expect(drawingMapping?.csvColumn).toBe('DRAWING!');

      const typeMapping = result.mappings.find(m => m.expectedField === 'TYPE');
      expect(typeMapping?.csvColumn).toBe('TYPE#');
    });

    it('should handle mixed marker characters', () => {
      const csvColumns = ['DRAWING*+', 'TYPE#!', 'QTY*#!+', 'CMDTY CODE**'];
      const result = mapColumns(csvColumns);

      expect(result.hasAllRequiredFields).toBe(true);
      expect(result.mappings).toHaveLength(4);
    });

    it('should strip markers while preserving case-insensitive matching', () => {
      const csvColumns = ['drawing*', 'type*', 'qty*', 'cmdty code*'];
      const result = mapColumns(csvColumns);

      expect(result.hasAllRequiredFields).toBe(true);

      result.mappings.forEach(mapping => {
        expect(mapping.confidence).toBe(95);
        expect(mapping.matchTier).toBe('case-insensitive');
      });
    });

    it('should not strip asterisks from middle of column name', () => {
      const csvColumns = ['DRAW*ING', 'TYPE', 'QTY', 'CMDTY CODE'];
      const result = mapColumns(csvColumns);

      // DRAW*ING should not match DRAWING (asterisk is in the middle)
      expect(result.hasAllRequiredFields).toBe(false);
      expect(result.missingRequiredFields).toContain('DRAWING');
      expect(result.unmappedColumns).toContain('DRAW*ING');
    });

    it('should handle real-world material takeoff template with asterisks', () => {
      // Mimics the user's actual CSV file structure
      const csvColumns = [
        'DRAWING*',
        'TYPE*',
        'QTY*',
        'CMDTY CODE*',
        'SIZE',
        'SPEC',
        'DESCRIPTION',
        'COMMENTS',
        'AREA',
        'SYSTEM',
        'TEST_PACKAGE'
      ];

      const result = mapColumns(csvColumns);

      expect(result.hasAllRequiredFields).toBe(true);
      expect(result.missingRequiredFields).toHaveLength(0);
      expect(result.unmappedColumns).toHaveLength(0);
      expect(result.mappings).toHaveLength(11);

      // Verify required fields all mapped correctly
      const requiredFields = ['DRAWING', 'TYPE', 'QTY', 'CMDTY CODE'];
      requiredFields.forEach(field => {
        const mapping = result.mappings.find(m => m.expectedField === field);
        expect(mapping).toBeDefined();
        expect(mapping?.csvColumn).toBe(`${field}*`);
      });
    });
  });
});
