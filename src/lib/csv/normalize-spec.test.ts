import { describe, it, expect } from 'vitest';
import { normalizeSpec } from './normalize-spec';

describe('normalizeSpec', () => {
  it('extracts first token from spec with trailing contract code', () => {
    expect(normalizeSpec('PU-32 CC0085888')).toBe('PU-32');
  });

  it('extracts first token from spec with trailing partial code', () => {
    expect(normalizeSpec('PU-32 CC')).toBe('PU-32');
  });

  it('returns spec unchanged when no trailing tokens', () => {
    expect(normalizeSpec('PU-32')).toBe('PU-32');
  });

  it('trims whitespace and uppercases', () => {
    expect(normalizeSpec('  pu-22  ')).toBe('PU-22');
  });

  it('handles multiple spaces between tokens', () => {
    expect(normalizeSpec('PU-32   CC0085888')).toBe('PU-32');
  });

  it('returns null for empty string', () => {
    expect(normalizeSpec('')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(normalizeSpec('   ')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(normalizeSpec(null)).toBeNull();
  });

  it('preserves hyphens within spec code', () => {
    expect(normalizeSpec('HC-05')).toBe('HC-05');
  });

  it('preserves alphanumeric spec codes', () => {
    expect(normalizeSpec('A1A')).toBe('A1A');
  });

  it('uppercases lowercase spec', () => {
    expect(normalizeSpec('hc-05')).toBe('HC-05');
  });

  it('returns null for G4G commodity codes', () => {
    expect(normalizeSpec('G4G-1410-07')).toBeNull();
  });

  it('returns null for G4G commodity codes with complex suffix', () => {
    expect(normalizeSpec('G4G-1412-05AA-001-1-1')).toBeNull();
  });

  it('returns null for G4G commodity codes with trailing tokens', () => {
    expect(normalizeSpec('G4G-1410-07 some extra text')).toBeNull();
  });

  it('returns null for lowercase g4g commodity codes', () => {
    expect(normalizeSpec('g4g-1410-07')).toBeNull();
  });

  it('extracts prefix before underscore-separated contract reference', () => {
    expect(normalizeSpec('PU-02_CC.0083947')).toBe('PU-02');
  });

  it('extracts prefix before underscore with spaces', () => {
    expect(normalizeSpec('PU-02_CC 0083947')).toBe('PU-02');
  });

  it('handles spec with no underscore (unchanged behavior)', () => {
    expect(normalizeSpec('PU-02 CC0085888')).toBe('PU-02');
  });
});
