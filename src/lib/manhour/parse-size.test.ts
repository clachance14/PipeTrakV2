import { describe, it, expect } from 'vitest';
import { parseSize, type ParsedSize } from './parse-size';

describe('parseSize', () => {
  describe('integers', () => {
    it('should parse single digit integers', () => {
      const result = parseSize('2');
      expect(result).toEqual({
        diameter: 2.0,
        isReducer: false,
        raw: '2'
      });
    });

    it('should parse double digit integers', () => {
      const result = parseSize('12');
      expect(result).toEqual({
        diameter: 12.0,
        isReducer: false,
        raw: '12'
      });
    });

    it('should parse "4" as 4.0', () => {
      const result = parseSize('4');
      expect(result).toEqual({
        diameter: 4.0,
        isReducer: false,
        raw: '4'
      });
    });

    it('should handle integers with whitespace', () => {
      const result = parseSize(' 6 ');
      expect(result).toEqual({
        diameter: 6.0,
        isReducer: false,
        raw: ' 6 '
      });
    });
  });

  describe('fractions', () => {
    it('should parse "1/2" as 0.5', () => {
      const result = parseSize('1/2');
      expect(result).toEqual({
        diameter: 0.5,
        isReducer: false,
        raw: '1/2'
      });
    });

    it('should parse "3/4" as 0.75', () => {
      const result = parseSize('3/4');
      expect(result).toEqual({
        diameter: 0.75,
        isReducer: false,
        raw: '3/4'
      });
    });

    it('should parse "1/4" as 0.25', () => {
      const result = parseSize('1/4');
      expect(result).toEqual({
        diameter: 0.25,
        isReducer: false,
        raw: '1/4'
      });
    });

    it('should parse "2/3" correctly', () => {
      const result = parseSize('2/3');
      expect(result).toEqual({
        diameter: 2 / 3,
        isReducer: false,
        raw: '2/3'
      });
    });

    it('should handle fractions with whitespace', () => {
      const result = parseSize(' 1/2 ');
      expect(result).toEqual({
        diameter: 0.5,
        isReducer: false,
        raw: ' 1/2 '
      });
    });

    it('should handle division by zero as invalid', () => {
      const result = parseSize('1/0');
      expect(result).toEqual({
        diameter: null,
        isReducer: false,
        raw: '1/0'
      });
    });
  });

  describe('reducers', () => {
    it('should parse "2X4" as average 3.0', () => {
      const result = parseSize('2X4');
      expect(result).toEqual({
        diameter: 3.0,
        isReducer: true,
        secondDiameter: 4,
        raw: '2X4'
      });
    });

    it('should parse "1X2" as average 1.5', () => {
      const result = parseSize('1X2');
      expect(result).toEqual({
        diameter: 1.5,
        isReducer: true,
        secondDiameter: 2,
        raw: '1X2'
      });
    });

    it('should parse "4X6" as average 5.0', () => {
      const result = parseSize('4X6');
      expect(result).toEqual({
        diameter: 5.0,
        isReducer: true,
        secondDiameter: 6,
        raw: '4X6'
      });
    });

    it('should parse "3X3" as average 3.0', () => {
      const result = parseSize('3X3');
      expect(result).toEqual({
        diameter: 3.0,
        isReducer: true,
        secondDiameter: 3,
        raw: '3X3'
      });
    });

    it('should handle lowercase "x" separator', () => {
      const result = parseSize('2x4');
      expect(result).toEqual({
        diameter: 3.0,
        isReducer: true,
        secondDiameter: 4,
        raw: '2x4'
      });
    });

    it('should handle reducers with whitespace', () => {
      const result = parseSize(' 2X4 ');
      expect(result).toEqual({
        diameter: 3.0,
        isReducer: true,
        secondDiameter: 4,
        raw: ' 2X4 '
      });
    });

    it('should handle reducers with spaces around X', () => {
      const result = parseSize('2 X 4');
      expect(result).toEqual({
        diameter: 3.0,
        isReducer: true,
        secondDiameter: 4,
        raw: '2 X 4'
      });
    });

    it('should parse fractional reducers "1/2X3/4"', () => {
      const result = parseSize('1/2X3/4');
      expect(result).toEqual({
        diameter: 0.625, // (0.5 + 0.75) / 2
        isReducer: true,
        secondDiameter: 0.75,
        raw: '1/2X3/4'
      });
    });

    it('should parse mixed reducers "2X3/4"', () => {
      const result = parseSize('2X3/4');
      expect(result).toEqual({
        diameter: 1.375, // (2 + 0.75) / 2
        isReducer: true,
        secondDiameter: 0.75,
        raw: '2X3/4'
      });
    });
  });

  describe('special cases', () => {
    it('should parse "HALF" as 0.5', () => {
      const result = parseSize('HALF');
      expect(result).toEqual({
        diameter: 0.5,
        isReducer: false,
        raw: 'HALF'
      });
    });

    it('should parse "half" (lowercase) as 0.5', () => {
      const result = parseSize('half');
      expect(result).toEqual({
        diameter: 0.5,
        isReducer: false,
        raw: 'half'
      });
    });

    it('should parse "Half" (mixed case) as 0.5', () => {
      const result = parseSize('Half');
      expect(result).toEqual({
        diameter: 0.5,
        isReducer: false,
        raw: 'Half'
      });
    });

    it('should parse "NOSIZE" as null', () => {
      const result = parseSize('NOSIZE');
      expect(result).toEqual({
        diameter: null,
        isReducer: false,
        raw: 'NOSIZE'
      });
    });

    it('should parse "nosize" (lowercase) as null', () => {
      const result = parseSize('nosize');
      expect(result).toEqual({
        diameter: null,
        isReducer: false,
        raw: 'nosize'
      });
    });

    it('should parse empty string as null', () => {
      const result = parseSize('');
      expect(result).toEqual({
        diameter: null,
        isReducer: false,
        raw: ''
      });
    });

    it('should parse whitespace-only string as null', () => {
      const result = parseSize('   ');
      expect(result).toEqual({
        diameter: null,
        isReducer: false,
        raw: '   '
      });
    });
  });

  describe('invalid inputs', () => {
    it('should return null for alphabetic strings', () => {
      const result = parseSize('ABC');
      expect(result).toEqual({
        diameter: null,
        isReducer: false,
        raw: 'ABC'
      });
    });

    it('should return null for mixed alphanumeric (not special cases)', () => {
      const result = parseSize('2A4');
      expect(result).toEqual({
        diameter: null,
        isReducer: false,
        raw: '2A4'
      });
    });

    it('should return null for invalid fraction format', () => {
      const result = parseSize('1/2/3');
      expect(result).toEqual({
        diameter: null,
        isReducer: false,
        raw: '1/2/3'
      });
    });

    it('should return null for non-numeric fraction parts', () => {
      const result = parseSize('A/B');
      expect(result).toEqual({
        diameter: null,
        isReducer: false,
        raw: 'A/B'
      });
    });

    it('should return null for invalid reducer format', () => {
      const result = parseSize('2X4X6');
      expect(result).toEqual({
        diameter: null,
        isReducer: false,
        raw: '2X4X6'
      });
    });

    it('should return null for non-numeric reducer parts', () => {
      const result = parseSize('AXB');
      expect(result).toEqual({
        diameter: null,
        isReducer: false,
        raw: 'AXB'
      });
    });

    it('should return null for symbols', () => {
      const result = parseSize('#@!');
      expect(result).toEqual({
        diameter: null,
        isReducer: false,
        raw: '#@!'
      });
    });

    it('should return null for negative numbers', () => {
      const result = parseSize('-2');
      expect(result).toEqual({
        diameter: null,
        isReducer: false,
        raw: '-2'
      });
    });

    it('should return null for decimal notation', () => {
      const result = parseSize('2.5');
      expect(result).toEqual({
        diameter: null,
        isReducer: false,
        raw: '2.5'
      });
    });
  });

  describe('edge cases', () => {
    it('should handle zero as valid integer', () => {
      const result = parseSize('0');
      expect(result).toEqual({
        diameter: 0.0,
        isReducer: false,
        raw: '0'
      });
    });

    it('should handle large numbers', () => {
      const result = parseSize('100');
      expect(result).toEqual({
        diameter: 100.0,
        isReducer: false,
        raw: '100'
      });
    });

    it('should preserve raw input exactly', () => {
      const input = ' 2X4 ';
      const result = parseSize(input);
      expect(result.raw).toBe(input);
    });

    it('should handle 0/1 fraction', () => {
      const result = parseSize('0/1');
      expect(result).toEqual({
        diameter: 0.0,
        isReducer: false,
        raw: '0/1'
      });
    });

    it('should handle improper fractions', () => {
      const result = parseSize('5/2');
      expect(result).toEqual({
        diameter: 2.5,
        isReducer: false,
        raw: '5/2'
      });
    });
  });

  describe('type safety', () => {
    it('should return ParsedSize type', () => {
      const result: ParsedSize = parseSize('2');
      expect(result).toBeDefined();
      expect(result).toHaveProperty('diameter');
      expect(result).toHaveProperty('isReducer');
      expect(result).toHaveProperty('raw');
    });

    it('should include secondDiameter only for reducers', () => {
      const integerResult = parseSize('2');
      expect(integerResult).not.toHaveProperty('secondDiameter');

      const reducerResult = parseSize('2X4');
      expect(reducerResult).toHaveProperty('secondDiameter');
      expect(reducerResult.secondDiameter).toBe(4);
    });
  });
});
