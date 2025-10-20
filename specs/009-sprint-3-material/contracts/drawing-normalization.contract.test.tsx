/**
 * Contract Test: Drawing Normalization
 * Tests the drawing number normalization algorithm
 *
 * IMPORTANT: These tests MUST FAIL initially (TDD Red phase)
 */

import { describe, it, expect } from 'vitest';

// Mock function (will be implemented later)
function normalizeDrawing(raw: string): string {
  throw new Error('NOT IMPLEMENTED - This test should fail');
}

describe('Drawing Normalization Contract', () => {
  it('normalizes "P-001" to "P001"', () => {
    expect(normalizeDrawing('P-001')).toBe('P001');
  });

  it('normalizes " DRAIN-1 " to "DRAIN1" (trims spaces)', () => {
    expect(normalizeDrawing(' DRAIN-1 ')).toBe('DRAIN1');
  });

  it('normalizes "p--0-0-1" to "P1" (uppercase, remove separators, strip leading zeros)', () => {
    expect(normalizeDrawing('p--0-0-1')).toBe('P1');
  });

  it('normalizes "PW-55401" to "PW55401"', () => {
    expect(normalizeDrawing('PW-55401')).toBe('PW55401');
  });

  it('normalizes "DRAIN_1" to "DRAIN1" (underscores)', () => {
    expect(normalizeDrawing('DRAIN_1')).toBe('DRAIN1');
  });

  it('normalizes "P 001" to "P001" (spaces)', () => {
    expect(normalizeDrawing('P 001')).toBe('P001');
  });

  it('strips leading zeros: "0001" → "1"', () => {
    expect(normalizeDrawing('0001')).toBe('1');
  });

  it('keeps all zeros if only zeros: "000" → "000"', () => {
    expect(normalizeDrawing('000')).toBe('000');
  });

  it('keeps non-leading zeros: "P-001" → "P001"', () => {
    expect(normalizeDrawing('P-001')).toBe('P001');
  });

  it('handles complex case: "  p--_0-0-1  " → "P1"', () => {
    expect(normalizeDrawing('  p--_0-0-1  ')).toBe('P1');
  });

  it('preserves alphanumeric characters', () => {
    expect(normalizeDrawing('ABC-123-DEF-456')).toBe('ABC123DEF456');
  });
});
