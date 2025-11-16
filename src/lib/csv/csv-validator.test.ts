/**
 * Unit Tests for CSV Validator
 *
 * Tests three-category validation: valid / skipped / error
 * - Valid: Row will be imported
 * - Skipped: Warning (unsupported type, zero quantity)
 * - Error: Blocks import (missing required field, duplicate identity key)
 */

import { describe, it, expect } from 'vitest';
import { validateRows, createValidationSummary } from './csv-validator';
import type { ValidationResult, ParsedRow, ComponentType } from './types';

describe('csv-validator', () => {
  describe('Required Field Validation', () => {
    it('should validate when all required fields are present', () => {
      const rows = [
        {
          DRAWING: 'P-001',
          TYPE: 'Spool',
          QTY: '1',
          'CMDTY CODE': 'SPOOL-001'
        }
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      expect(results).toHaveLength(1);
      expect(results[0]?.status).toBe('valid');
      expect(results[0]?.data).toBeDefined();
      expect(results[0]?.data?.drawing).toBe('P-001');
      expect(results[0]?.data?.type).toBe('Spool');
    });

    it('should error when DRAWING is empty', () => {
      const rows = [
        {
          DRAWING: '',
          TYPE: 'Spool',
          QTY: '1',
          'CMDTY CODE': 'SPOOL-001'
        }
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      expect(results).toHaveLength(1);
      expect(results[0]?.status).toBe('error');
      expect(results[0]?.category).toBe('empty_drawing');
      expect(results[0]?.reason).toContain('DRAWING');
    });

    it('should error when TYPE is empty', () => {
      const rows = [
        {
          DRAWING: 'P-001',
          TYPE: '',
          QTY: '1',
          'CMDTY CODE': 'SPOOL-001'
        }
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      expect(results).toHaveLength(1);
      expect(results[0]?.status).toBe('error');
      expect(results[0]?.category).toBe('missing_required_field');
      expect(results[0]?.reason).toContain('TYPE');
    });

    it('should error when CMDTY CODE is empty', () => {
      const rows = [
        {
          DRAWING: 'P-001',
          TYPE: 'Spool',
          QTY: '1',
          'CMDTY CODE': ''
        }
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      expect(results).toHaveLength(1);
      expect(results[0]?.status).toBe('error');
      expect(results[0]?.category).toBe('missing_required_field');
      expect(results[0]?.reason).toContain('CMDTY CODE');
    });
  });

  describe('Component Type Validation', () => {
    it('should validate supported component types', () => {
      const supportedTypes: ComponentType[] = [
        'Spool', 'Field_Weld', 'Valve', 'Instrument', 'Support',
        'Pipe', 'Fitting', 'Flange', 'Tubing', 'Hose', 'Misc_Component', 'Threaded_Pipe'
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      supportedTypes.forEach(type => {
        const rows = [{
          DRAWING: 'P-001',
          TYPE: type,
          QTY: '1',
          'CMDTY CODE': 'TEST-001'
        }];

        const results = validateRows(rows, columnLookupMap);

        expect(results[0]?.status).toBe('valid');
        expect(results[0]?.data?.type).toBe(type);
      });
    });

    it('should skip unsupported component type (Gasket)', () => {
      const rows = [
        {
          DRAWING: 'P-001',
          TYPE: 'Gasket',
          QTY: '3',
          'CMDTY CODE': 'GASKET-001'
        }
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      expect(results).toHaveLength(1);
      expect(results[0]?.status).toBe('skipped');
      expect(results[0]?.category).toBe('unsupported_type');
      expect(results[0]?.reason).toContain('Gasket');
    });

    it('should skip multiple unsupported types', () => {
      const rows = [
        { DRAWING: 'P-001', TYPE: 'Gasket', QTY: '1', 'CMDTY CODE': 'G1' },
        { DRAWING: 'P-002', TYPE: 'Bolt', QTY: '10', 'CMDTY CODE': 'B1' },
        { DRAWING: 'P-003', TYPE: 'Spool', QTY: '1', 'CMDTY CODE': 'S1' }
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      expect(results).toHaveLength(3);
      expect(results[0]?.status).toBe('skipped');
      expect(results[0]?.category).toBe('unsupported_type');
      expect(results[1]?.status).toBe('skipped');
      expect(results[1]?.category).toBe('unsupported_type');
      expect(results[2]?.status).toBe('valid');
    });

    it('should handle case-insensitive component types', () => {
      const rows = [
        { DRAWING: 'P-001', TYPE: 'spool', QTY: '1', 'CMDTY CODE': 'S1' },
        { DRAWING: 'P-002', TYPE: 'VALVE', QTY: '1', 'CMDTY CODE': 'V1' },
        { DRAWING: 'P-003', TYPE: 'Fitting', QTY: '1', 'CMDTY CODE': 'F1' }
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.status).toBe('valid');
      });
    });

    it('should normalize spaces to underscores in component types', () => {
      const rows = [
        { DRAWING: 'P-001', TYPE: 'Threaded Pipe', QTY: '10', 'CMDTY CODE': 'PIPE-001' },
        { DRAWING: 'P-002', TYPE: 'Field Weld', QTY: '5', 'CMDTY CODE': 'WELD-001' },
        { DRAWING: 'P-003', TYPE: 'Misc Component', QTY: '3', 'CMDTY CODE': 'MISC-001' }
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      expect(results).toHaveLength(3);
      expect(results[0]?.status).toBe('valid');
      expect(results[0]?.data?.type).toBe('Threaded_Pipe');
      expect(results[1]?.status).toBe('valid');
      expect(results[1]?.data?.type).toBe('Field_Weld');
      expect(results[2]?.status).toBe('valid');
      expect(results[2]?.data?.type).toBe('Misc_Component');
    });
  });

  describe('Quantity Validation', () => {
    it('should validate positive integer quantities', () => {
      const rows = [
        { DRAWING: 'P-001', TYPE: 'Spool', QTY: '1', 'CMDTY CODE': 'S1' },
        { DRAWING: 'P-002', TYPE: 'Valve', QTY: '10', 'CMDTY CODE': 'V1' },
        { DRAWING: 'P-003', TYPE: 'Fitting', QTY: '100', 'CMDTY CODE': 'F1' }
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.status).toBe('valid');
      });
    });

    it('should skip zero quantity rows', () => {
      const rows = [
        { DRAWING: 'P-001', TYPE: 'Spool', QTY: '0', 'CMDTY CODE': 'S1' }
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      expect(results).toHaveLength(1);
      expect(results[0]?.status).toBe('skipped');
      expect(results[0]?.category).toBe('zero_quantity');
      expect(results[0]?.reason).toContain('quantity is 0');
    });

    it('should error on negative quantities', () => {
      const rows = [
        { DRAWING: 'P-001', TYPE: 'Spool', QTY: '-5', 'CMDTY CODE': 'S1' }
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      expect(results).toHaveLength(1);
      expect(results[0]?.status).toBe('error');
      expect(results[0]?.category).toBe('invalid_quantity');
      expect(results[0]?.reason).toContain('must be >= 0');
    });

    it('should error on non-numeric quantities', () => {
      const rows = [
        { DRAWING: 'P-001', TYPE: 'Spool', QTY: 'abc', 'CMDTY CODE': 'S1' }
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      expect(results).toHaveLength(1);
      expect(results[0]?.status).toBe('error');
      expect(results[0]?.category).toBe('invalid_quantity');
      expect(results[0]?.reason).toContain('must be a number');
    });

    it('should error on decimal quantities', () => {
      const rows = [
        { DRAWING: 'P-001', TYPE: 'Spool', QTY: '2.5', 'CMDTY CODE': 'S1' }
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      expect(results).toHaveLength(1);
      expect(results[0]?.status).toBe('error');
      expect(results[0]?.category).toBe('invalid_quantity');
      expect(results[0]?.reason).toContain('must be an integer');
    });

    it('should allow decimal quantities for Threaded_Pipe (linear feet)', () => {
      const rows = [
        { DRAWING: 'A-26C09', TYPE: 'Threaded_Pipe', QTY: '6.6', 'CMDTY CODE': 'PIPE-001' },
        { DRAWING: 'A-26E09', TYPE: 'Threaded Pipe', QTY: '11.7', 'CMDTY CODE': 'PIPE-002' },
        { DRAWING: 'A-26G09', TYPE: 'threaded_pipe', QTY: '10.5', 'CMDTY CODE': 'PIPE-003' }
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      expect(results).toHaveLength(3);
      expect(results[0]?.status).toBe('valid');
      expect(results[0]?.data?.qty).toBe(6.6);
      expect(results[1]?.status).toBe('valid');
      expect(results[1]?.data?.qty).toBe(11.7);
      expect(results[2]?.status).toBe('valid');
      expect(results[2]?.data?.qty).toBe(10.5);
    });
  });

  describe('Duplicate Detection', () => {
    it('should detect duplicate identity keys within CSV', () => {
      const rows = [
        { DRAWING: 'P-001', TYPE: 'Spool', SIZE: '3', QTY: '1', 'CMDTY CODE': 'SPOOL-001' },
        { DRAWING: 'P-001', TYPE: 'Spool', SIZE: '3', QTY: '1', 'CMDTY CODE': 'SPOOL-001' } // Duplicate
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['SIZE', 'SIZE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      expect(results).toHaveLength(2);
      expect(results[0]?.status).toBe('valid');
      expect(results[1]?.status).toBe('error');
      expect(results[1]?.category).toBe('duplicate_identity_key');
      expect(results[1]?.reason).toContain('Duplicate identity key');
    });

    it('should allow same CMDTY CODE with different sizes', () => {
      const rows = [
        { DRAWING: 'P-001', TYPE: 'Spool', SIZE: '2', QTY: '1', 'CMDTY CODE': 'SPOOL-001' },
        { DRAWING: 'P-001', TYPE: 'Spool', SIZE: '3', QTY: '1', 'CMDTY CODE': 'SPOOL-001' }
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['SIZE', 'SIZE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      expect(results).toHaveLength(2);
      expect(results[0]?.status).toBe('valid');
      expect(results[1]?.status).toBe('valid');
    });

    it('should allow same CMDTY CODE on different drawings', () => {
      const rows = [
        { DRAWING: 'P-001', TYPE: 'Spool', SIZE: '3', QTY: '1', 'CMDTY CODE': 'SPOOL-001' },
        { DRAWING: 'P-002', TYPE: 'Spool', SIZE: '3', QTY: '1', 'CMDTY CODE': 'SPOOL-001' }
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['SIZE', 'SIZE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      expect(results).toHaveLength(2);
      expect(results[0]?.status).toBe('valid');
      expect(results[1]?.status).toBe('valid');
    });
  });

  describe('ParsedRow Creation', () => {
    it('should normalize drawing number (uppercase, trim, collapse spaces)', () => {
      const rows = [
        { DRAWING: '  p  -  001  ', TYPE: 'Spool', QTY: '1', 'CMDTY CODE': 'S1' }
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      expect(results[0]?.status).toBe('valid');
      expect(results[0]?.data?.drawing).toBe('P - 001');
    });

    it('should normalize size (replace / with X, remove quotes)', () => {
      const rows = [
        { DRAWING: 'P-001', TYPE: 'Spool', SIZE: '1/2"', QTY: '1', 'CMDTY CODE': 'S1' }
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['SIZE', 'SIZE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      expect(results[0]?.status).toBe('valid');
      expect(results[0]?.data?.size).toBe('1X2');
    });

    it('should default empty size to "NOSIZE"', () => {
      const rows = [
        { DRAWING: 'P-001', TYPE: 'Spool', SIZE: '', QTY: '1', 'CMDTY CODE': 'S1' }
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['SIZE', 'SIZE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      expect(results[0]?.status).toBe('valid');
      expect(results[0]?.data?.size).toBe('NOSIZE');
    });

    it('should store unmapped fields in unmappedFields', () => {
      const rows = [
        {
          DRAWING: 'P-001',
          TYPE: 'Spool',
          QTY: '1',
          'CMDTY CODE': 'S1',
          'Item #': '12345',
          'Vendor Code': 'ABC'
        }
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      expect(results[0]?.status).toBe('valid');
      expect(results[0]?.data?.unmappedFields).toEqual({
        'Item #': '12345',
        'Vendor Code': 'ABC'
      });
    });

    it('should include optional metadata fields when present', () => {
      const rows = [
        {
          DRAWING: 'P-001',
          TYPE: 'Spool',
          QTY: '1',
          'CMDTY CODE': 'S1',
          AREA: 'B-68',
          SYSTEM: 'HC-05',
          'TEST PACKAGE': 'PKG-01'
        }
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE'],
        ['AREA', 'AREA'],
        ['SYSTEM', 'SYSTEM'],
        ['TEST PACKAGE', 'TEST_PACKAGE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      expect(results[0]?.status).toBe('valid');
      expect(results[0]?.data?.area).toBe('B-68');
      expect(results[0]?.data?.system).toBe('HC-05');
      expect(results[0]?.data?.testPackage).toBe('PKG-01');
    });
  });

  describe('Validation Summary', () => {
    it('should create summary with correct counts', () => {
      const results: ValidationResult[] = [
        { rowNumber: 1, status: 'valid', data: {} as ParsedRow },
        { rowNumber: 2, status: 'valid', data: {} as ParsedRow },
        { rowNumber: 3, status: 'skipped', reason: 'Unsupported type', category: 'unsupported_type' },
        { rowNumber: 4, status: 'error', reason: 'Missing field', category: 'missing_required_field' }
      ];

      const summary = createValidationSummary(results);

      expect(summary.totalRows).toBe(4);
      expect(summary.validCount).toBe(2);
      expect(summary.skippedCount).toBe(1);
      expect(summary.errorCount).toBe(1);
      expect(summary.canImport).toBe(false); // Has errors
    });

    it('should allow import when no errors exist', () => {
      const results: ValidationResult[] = [
        { rowNumber: 1, status: 'valid', data: {} as ParsedRow },
        { rowNumber: 2, status: 'skipped', reason: 'Unsupported type', category: 'unsupported_type' }
      ];

      const summary = createValidationSummary(results);

      expect(summary.canImport).toBe(true);
    });

    it('should group results by status', () => {
      const results: ValidationResult[] = [
        { rowNumber: 1, status: 'valid', data: {} as ParsedRow },
        { rowNumber: 2, status: 'valid', data: {} as ParsedRow },
        { rowNumber: 3, status: 'skipped', reason: 'Unsupported type', category: 'unsupported_type' },
        { rowNumber: 4, status: 'error', reason: 'Missing field', category: 'missing_required_field' }
      ];

      const summary = createValidationSummary(results);

      expect(summary.resultsByStatus.valid).toHaveLength(2);
      expect(summary.resultsByStatus.skipped).toHaveLength(1);
      expect(summary.resultsByStatus.error).toHaveLength(1);
    });

    it('should group results by category', () => {
      const results: ValidationResult[] = [
        { rowNumber: 1, status: 'valid', data: {} as ParsedRow },
        { rowNumber: 2, status: 'skipped', reason: 'Unsupported type', category: 'unsupported_type' },
        { rowNumber: 3, status: 'skipped', reason: 'Unsupported type', category: 'unsupported_type' },
        { rowNumber: 4, status: 'error', reason: 'Missing field', category: 'missing_required_field' },
        { rowNumber: 5, status: 'error', reason: 'Duplicate key', category: 'duplicate_identity_key' }
      ];

      const summary = createValidationSummary(results);

      expect(summary.resultsByCategory.unsupported_type).toHaveLength(2);
      expect(summary.resultsByCategory.missing_required_field).toHaveLength(1);
      expect(summary.resultsByCategory.duplicate_identity_key).toHaveLength(1);
    });
  });

  describe('Row Numbers', () => {
    it('should use 1-indexed row numbers', () => {
      const rows = [
        { DRAWING: 'P-001', TYPE: 'Spool', QTY: '1', 'CMDTY CODE': 'S1' },
        { DRAWING: 'P-002', TYPE: 'Valve', QTY: '1', 'CMDTY CODE': 'V1' },
        { DRAWING: 'P-003', TYPE: 'Fitting', QTY: '1', 'CMDTY CODE': 'F1' }
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      expect(results[0]?.rowNumber).toBe(1);
      expect(results[1]?.rowNumber).toBe(2);
      expect(results[2]?.rowNumber).toBe(3);
    });
  });

  describe('T041: Threaded_Pipe Duplicate Handling Exception (Feature 027)', () => {
    it('should ALLOW duplicate Threaded_Pipe identities (will be summed in Edge Function)', () => {
      // Feature 027: Threaded pipe duplicates are intentionally allowed
      // because the Edge Function will sum their quantities
      const rows = [
        { DRAWING: 'P-001', TYPE: 'Threaded_Pipe', SIZE: '1"', QTY: '50', 'CMDTY CODE': 'PIPE-SCH40' },
        { DRAWING: 'P-001', TYPE: 'Threaded_Pipe', SIZE: '1"', QTY: '50', 'CMDTY CODE': 'PIPE-SCH40' } // Duplicate identity
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['SIZE', 'SIZE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      // Both rows should be marked VALID (not error)
      expect(results).toHaveLength(2);
      expect(results[0]?.status).toBe('valid');
      expect(results[1]?.status).toBe('valid');
      expect(results[0]?.data?.type).toBe('Threaded_Pipe');
      expect(results[1]?.data?.type).toBe('Threaded_Pipe');
    });

    it('should REJECT duplicate Valve identities (existing behavior preserved)', () => {
      // All other component types still enforce duplicate detection
      const rows = [
        { DRAWING: 'P-001', TYPE: 'Valve', SIZE: '1"', QTY: '1', 'CMDTY CODE': 'GATE-150' },
        { DRAWING: 'P-001', TYPE: 'Valve', SIZE: '1"', QTY: '1', 'CMDTY CODE': 'GATE-150' } // Duplicate
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['SIZE', 'SIZE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      // First row valid, second row error
      expect(results).toHaveLength(2);
      expect(results[0]?.status).toBe('valid');
      expect(results[1]?.status).toBe('error');
      expect(results[1]?.category).toBe('duplicate_identity_key');
      expect(results[1]?.reason).toContain('Duplicate identity key');
    });

    it('should REJECT duplicate Spool identities (existing behavior preserved)', () => {
      const rows = [
        { DRAWING: 'P-001', TYPE: 'Spool', SIZE: '3"', QTY: '1', 'CMDTY CODE': 'SPOOL-001' },
        { DRAWING: 'P-001', TYPE: 'Spool', SIZE: '3"', QTY: '1', 'CMDTY CODE': 'SPOOL-001' } // Duplicate
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['SIZE', 'SIZE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      expect(results).toHaveLength(2);
      expect(results[0]?.status).toBe('valid');
      expect(results[1]?.status).toBe('error');
      expect(results[1]?.category).toBe('duplicate_identity_key');
    });

    it('should handle mixed duplicate Threaded_Pipe (valid) and duplicate Valve (error)', () => {
      const rows = [
        { DRAWING: 'P-001', TYPE: 'Threaded_Pipe', SIZE: '1"', QTY: '50', 'CMDTY CODE': 'PIPE-SCH40' },
        { DRAWING: 'P-001', TYPE: 'Threaded_Pipe', SIZE: '1"', QTY: '50', 'CMDTY CODE': 'PIPE-SCH40' }, // Allowed
        { DRAWING: 'P-001', TYPE: 'Valve', SIZE: '1"', QTY: '1', 'CMDTY CODE': 'GATE-150' },
        { DRAWING: 'P-001', TYPE: 'Valve', SIZE: '1"', QTY: '1', 'CMDTY CODE': 'GATE-150' } // Rejected
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['SIZE', 'SIZE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      expect(results).toHaveLength(4);
      expect(results[0]?.status).toBe('valid'); // Threaded_Pipe #1
      expect(results[1]?.status).toBe('valid'); // Threaded_Pipe #2 (duplicate allowed)
      expect(results[2]?.status).toBe('valid'); // Valve #1
      expect(results[3]?.status).toBe('error'); // Valve #2 (duplicate rejected)
      expect(results[3]?.category).toBe('duplicate_identity_key');
    });

    it('should allow multiple Threaded_Pipe rows with same identity (triple import)', () => {
      // Simulate importing same threaded pipe identity three times
      const rows = [
        { DRAWING: 'P-001', TYPE: 'Threaded_Pipe', SIZE: '2"', QTY: '30', 'CMDTY CODE': 'PIPE-SCH80' },
        { DRAWING: 'P-001', TYPE: 'Threaded_Pipe', SIZE: '2"', QTY: '40', 'CMDTY CODE': 'PIPE-SCH80' },
        { DRAWING: 'P-001', TYPE: 'Threaded_Pipe', SIZE: '2"', QTY: '30', 'CMDTY CODE': 'PIPE-SCH80' }
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['SIZE', 'SIZE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      // All three should be valid
      expect(results).toHaveLength(3);
      expect(results[0]?.status).toBe('valid');
      expect(results[1]?.status).toBe('valid');
      expect(results[2]?.status).toBe('valid');

      // Edge Function would sum these: 30 + 40 + 30 = 100 LF
    });

    it('should handle case-insensitive Threaded_Pipe duplicate exception', () => {
      // Verify case variations are handled correctly
      const rows = [
        { DRAWING: 'P-001', TYPE: 'threaded_pipe', SIZE: '1"', QTY: '50', 'CMDTY CODE': 'PIPE-SCH40' },
        { DRAWING: 'P-001', TYPE: 'THREADED_PIPE', SIZE: '1"', QTY: '50', 'CMDTY CODE': 'PIPE-SCH40' }
      ];

      const columnLookupMap = new Map([
        ['DRAWING', 'DRAWING'],
        ['TYPE', 'TYPE'],
        ['SIZE', 'SIZE'],
        ['QTY', 'QTY'],
        ['CMDTY CODE', 'CMDTY CODE']
      ]);

      const results = validateRows(rows, columnLookupMap);

      // Both should be valid (case-insensitive match)
      expect(results).toHaveLength(2);
      expect(results[0]?.status).toBe('valid');
      expect(results[1]?.status).toBe('valid');
    });
  });
});
