import { describe, it, expect } from 'vitest';
import { naturalCompare } from './natural-sort';

describe('naturalCompare', () => {
  it('sorts numbers correctly within strings', () => {
    const sorted = ['file10.txt', 'file2.txt', 'file1.txt'].sort(naturalCompare);
    expect(sorted).toEqual(['file1.txt', 'file2.txt', 'file10.txt']);
  });

  it('sorts drawing numbers correctly', () => {
    const drawings = [
      'P-94011_3 10OF28',
      'P-94011_3 2OF28',
      'P-94011_3 1OF28',
      'P-94011_3 20OF28',
      'P-94011_3 11OF28'
    ].sort(naturalCompare);

    expect(drawings).toEqual([
      'P-94011_3 1OF28',
      'P-94011_3 2OF28',
      'P-94011_3 10OF28',
      'P-94011_3 11OF28',
      'P-94011_3 20OF28'
    ]);
  });

  it('handles mixed alphanumeric strings', () => {
    const sorted = ['P-26B07', 'P-91010_1 1OF2', 'P-93013', 'P-94011_2 1OF3'].sort(naturalCompare);
    expect(sorted).toEqual(['P-26B07', 'P-91010_1 1OF2', 'P-93013', 'P-94011_2 1OF3']);
  });

  it('handles equal strings', () => {
    expect(naturalCompare('abc', 'abc')).toBe(0);
  });

  it('handles empty strings', () => {
    const sorted = ['', 'a', ''].sort(naturalCompare);
    expect(sorted).toEqual(['', '', 'a']);
  });
});
