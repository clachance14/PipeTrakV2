/**
 * Contract Test: CSV Validation
 * Tests the CSV validation logic (column validation, data type validation)
 *
 * IMPORTANT: These tests MUST FAIL initially (TDD Red phase)
 */

import { describe, it, expect } from 'vitest';
import { validateCsv, type ValidationError, type ValidationResult } from '@/lib/csv/validate-csv';

describe('CSV Validation Contract', () => {
  it('validates required columns exist', () => {
    const csv = 'DRAWING,SPEC,TYPE'; // Missing QTY, CMDTY CODE

    const result = validateCsv(csv);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        row: 0,
        column: 'QTY',
        reason: 'Missing required column: QTY'
      })
    );
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        row: 0,
        column: 'CMDTY CODE',
        reason: 'Missing required column: CMDTY CODE'
      })
    );
  });

  it('validates QTY is numeric', () => {
    const csv = `DRAWING,TYPE,QTY,CMDTY CODE
P-001,Valve,ABC,V001`;

    const result = validateCsv(csv);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        row: 2, // Data row (header = row 1)
        column: 'QTY',
        reason: expect.stringContaining('expected number')
      })
    );
  });

  it('validates TYPE is in allowed list', () => {
    const csv = `DRAWING,TYPE,QTY,CMDTY CODE
P-001,InvalidType,1,V001`;

    const result = validateCsv(csv);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        row: 2,
        column: 'TYPE',
        reason: expect.stringContaining('Invalid component type')
      })
    );
  });

  it('validates DRAWING is not empty', () => {
    const csv = `DRAWING,TYPE,QTY,CMDTY CODE
,Valve,1,V001`; // Empty DRAWING

    const result = validateCsv(csv);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        row: 2,
        column: 'DRAWING',
        reason: expect.stringContaining('Required field missing')
      })
    );
  });

  it('validates CMDTY CODE is not empty', () => {
    const csv = `DRAWING,TYPE,QTY,CMDTY CODE
P-001,Valve,1,`; // Empty CMDTY CODE

    const result = validateCsv(csv);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        row: 2,
        column: 'CMDTY CODE',
        reason: expect.stringContaining('Required field missing')
      })
    );
  });

  it('passes validation for valid CSV', () => {
    const csv = `DRAWING,TYPE,QTY,CMDTY CODE,SPEC,DESCRIPTION,SIZE,Comments
P-001,Valve,2,VBALU-001,ES-03,Test Valve,2,Test comment`;

    const result = validateCsv(csv);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('allows optional columns to be empty', () => {
    const csv = `DRAWING,TYPE,QTY,CMDTY CODE,SPEC,DESCRIPTION,SIZE,Comments
P-001,Valve,1,V001,,,,`; // Empty optional columns

    const result = validateCsv(csv);

    expect(result.valid).toBe(true);
  });

  it('validates multiple errors across multiple rows', () => {
    const csv = `DRAWING,TYPE,QTY,CMDTY CODE
,Valve,ABC,V001
P-002,InvalidType,2,`;

    const result = validateCsv(csv);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3); // Row 2: empty DRAWING, invalid QTY; Row 3: invalid TYPE, empty CMDTY CODE
  });

  it('validates QTY is non-negative', () => {
    const csv = `DRAWING,TYPE,QTY,CMDTY CODE
P-001,Valve,-5,V001`;

    const result = validateCsv(csv);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        row: 2,
        column: 'QTY',
        reason: expect.stringContaining('must be ≥0')
      })
    );
  });
});
