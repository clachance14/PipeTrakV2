/**
 * Contract Test: Drawing Normalization
 * Tests the drawing number normalization algorithm
 *
 * MUST match database function normalize_drawing_number():
 * - UPPER(TRIM(regexp_replace(raw, '\\s+', ' ', 'g')))
 * - Keeps hyphens, underscores, and leading zeros
 * - Only collapses multiple spaces to single space
 */

import { describe, it, expect } from 'vitest';
import { normalizeDrawing } from '@/lib/csv/normalize-drawing';

describe('Drawing Normalization Contract', () => {
  it('keeps hyphens and zeros: "P-001" → "P-001"', () => {
    expect(normalizeDrawing('P-001')).toBe('P-001');
  });

  it('trims spaces but keeps hyphens: " DRAIN-1 " → "DRAIN-1"', () => {
    expect(normalizeDrawing(' DRAIN-1 ')).toBe('DRAIN-1');
  });

  it('uppercases but keeps separators: "p--0-0-1" → "P--0-0-1"', () => {
    expect(normalizeDrawing('p--0-0-1')).toBe('P--0-0-1');
  });

  it('keeps hyphens: "PW-55401" → "PW-55401"', () => {
    expect(normalizeDrawing('PW-55401')).toBe('PW-55401');
  });

  it('keeps underscores: "DRAIN_1" → "DRAIN_1"', () => {
    expect(normalizeDrawing('DRAIN_1')).toBe('DRAIN_1');
  });

  it('collapses multiple spaces to single space: "P  001" → "P 001"', () => {
    expect(normalizeDrawing('P  001')).toBe('P 001');
  });

  it('keeps leading zeros: "0001" → "0001"', () => {
    expect(normalizeDrawing('0001')).toBe('0001');
  });

  it('keeps all zeros: "000" → "000"', () => {
    expect(normalizeDrawing('000')).toBe('000');
  });

  it('keeps non-leading zeros: "P-001" → "P-001"', () => {
    expect(normalizeDrawing('P-001')).toBe('P-001');
  });

  it('trims, uppercases, collapses spaces: "  p  -  0  -  1  " → "P - 0 - 1"', () => {
    expect(normalizeDrawing('  p  -  0  -  1  ')).toBe('P - 0 - 1');
  });

  it('keeps all separators: "ABC-123-DEF-456" → "ABC-123-DEF-456"', () => {
    expect(normalizeDrawing('ABC-123-DEF-456')).toBe('ABC-123-DEF-456');
  });
});
