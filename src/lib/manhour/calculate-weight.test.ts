import { describe, it, expect } from 'vitest';
import { calculateWeight, type WeightResult } from './calculate-weight';

describe('calculateWeight', () => {
  describe('standard components with simple diameter', () => {
    it('calculates weight for 2 inch pipe using diameter^1.5', () => {
      const identityKey = { size: '2' };
      const result = calculateWeight(identityKey, 'PIPE');

      expect(result.weight).toBeCloseTo(2.83, 2);
      expect(result.basis).toBe('dimension');
      expect(result.metadata).toEqual({ diameter: 2 });
    });

    it('calculates weight for 4 inch pipe using diameter^1.5', () => {
      const identityKey = { size: '4' };
      const result = calculateWeight(identityKey, 'PIPE');

      expect(result.weight).toBeCloseTo(8.00, 2);
      expect(result.basis).toBe('dimension');
      expect(result.metadata).toEqual({ diameter: 4 });
    });

    it('calculates weight for 1/2 inch pipe using diameter^1.5', () => {
      const identityKey = { size: '1/2' };
      const result = calculateWeight(identityKey, 'PIPE');

      expect(result.weight).toBeCloseTo(0.35, 2);
      expect(result.basis).toBe('dimension');
      expect(result.metadata).toEqual({ diameter: 0.5 });
    });

    it('calculates weight for 3/4 inch pipe', () => {
      const identityKey = { size: '3/4' };
      const result = calculateWeight(identityKey, 'PIPE');

      expect(result.weight).toBeCloseTo(0.65, 2);
      expect(result.basis).toBe('dimension');
      expect(result.metadata).toEqual({ diameter: 0.75 });
    });

    it('calculates weight for 1 inch pipe', () => {
      const identityKey = { size: '1' };
      const result = calculateWeight(identityKey, 'PIPE');

      expect(result.weight).toBeCloseTo(1.00, 2);
      expect(result.basis).toBe('dimension');
      expect(result.metadata).toEqual({ diameter: 1 });
    });

    it('calculates weight for 6 inch pipe', () => {
      const identityKey = { size: '6' };
      const result = calculateWeight(identityKey, 'PIPE');

      expect(result.weight).toBeCloseTo(14.70, 2);
      expect(result.basis).toBe('dimension');
      expect(result.metadata).toEqual({ diameter: 6 });
    });

    it('calculates weight for 8 inch pipe', () => {
      const identityKey = { size: '8' };
      const result = calculateWeight(identityKey, 'PIPE');

      expect(result.weight).toBeCloseTo(22.63, 2);
      expect(result.basis).toBe('dimension');
      expect(result.metadata).toEqual({ diameter: 8 });
    });

    it('calculates weight for 12 inch pipe', () => {
      const identityKey = { size: '12' };
      const result = calculateWeight(identityKey, 'PIPE');

      expect(result.weight).toBeCloseTo(41.57, 2);
      expect(result.basis).toBe('dimension');
      expect(result.metadata).toEqual({ diameter: 12 });
    });
  });

  describe('reducers with size ranges (e.g., 2X4)', () => {
    it('calculates weight for 2X4 reducer using average diameter', () => {
      const identityKey = { size: '2X4' };
      const result = calculateWeight(identityKey, 'REDUCER');

      // Average of 2 and 4 is 3, so 3^1.5 = 5.20
      expect(result.weight).toBeCloseTo(5.20, 2);
      expect(result.basis).toBe('dimension');
      expect(result.metadata).toEqual({ diameter1: 2, diameter2: 4, averageDiameter: 3 });
    });

    it('calculates weight for 1X2 reducer using average diameter', () => {
      const identityKey = { size: '1X2' };
      const result = calculateWeight(identityKey, 'REDUCER');

      // Average of 1 and 2 is 1.5, so 1.5^1.5 = 1.84
      expect(result.weight).toBeCloseTo(1.84, 2);
      expect(result.basis).toBe('dimension');
      expect(result.metadata).toEqual({ diameter1: 1, diameter2: 2, averageDiameter: 1.5 });
    });

    it('calculates weight for 4X6 reducer using average diameter', () => {
      const identityKey = { size: '4X6' };
      const result = calculateWeight(identityKey, 'REDUCER');

      // Average of 4 and 6 is 5, so 5^1.5 = 11.18
      expect(result.weight).toBeCloseTo(11.18, 2);
      expect(result.basis).toBe('dimension');
      expect(result.metadata).toEqual({ diameter1: 4, diameter2: 6, averageDiameter: 5 });
    });

    it('calculates weight for 1/2X3/4 reducer using average diameter', () => {
      const identityKey = { size: '1/2X3/4' };
      const result = calculateWeight(identityKey, 'REDUCER');

      // Average of 0.5 and 0.75 is 0.625, so 0.625^1.5 = 0.49
      expect(result.weight).toBeCloseTo(0.49, 2);
      expect(result.basis).toBe('dimension');
      expect(result.metadata).toEqual({ diameter1: 0.5, diameter2: 0.75, averageDiameter: 0.625 });
    });

    it('calculates weight for 3/4X1 reducer using average diameter', () => {
      const identityKey = { size: '3/4X1' };
      const result = calculateWeight(identityKey, 'REDUCER');

      // Average of 0.75 and 1 is 0.875, so 0.875^1.5 = 0.82
      expect(result.weight).toBeCloseTo(0.82, 2);
      expect(result.basis).toBe('dimension');
      expect(result.metadata).toEqual({ diameter1: 0.75, diameter2: 1, averageDiameter: 0.875 });
    });
  });

  describe('threaded pipe with linear feet', () => {
    it('calculates weight for 2 inch threaded pipe with 10 linear feet', () => {
      const identityKey = { size: '2', linear_feet: '10' };
      const result = calculateWeight(identityKey, 'THREADED PIPE');

      // 2^1.5 * 10 * 0.1 = 2.83 * 10 * 0.1 = 2.83
      expect(result.weight).toBeCloseTo(2.83, 2);
      expect(result.basis).toBe('linear_feet');
      expect(result.metadata).toEqual({ diameter: 2, linearFeet: 10 });
    });

    it('calculates weight for 4 inch threaded pipe with 5 linear feet', () => {
      const identityKey = { size: '4', linear_feet: '5' };
      const result = calculateWeight(identityKey, 'THREADED PIPE');

      // 4^1.5 * 5 * 0.1 = 8.00 * 5 * 0.1 = 4.00
      expect(result.weight).toBeCloseTo(4.00, 2);
      expect(result.basis).toBe('linear_feet');
      expect(result.metadata).toEqual({ diameter: 4, linearFeet: 5 });
    });

    it('calculates weight for 1 inch threaded pipe with 20 linear feet', () => {
      const identityKey = { size: '1', linear_feet: '20' };
      const result = calculateWeight(identityKey, 'THREADED PIPE');

      // 1^1.5 * 20 * 0.1 = 1.00 * 20 * 0.1 = 2.00
      expect(result.weight).toBeCloseTo(2.00, 2);
      expect(result.basis).toBe('linear_feet');
      expect(result.metadata).toEqual({ diameter: 1, linearFeet: 20 });
    });

    it('calculates weight for 1/2 inch threaded pipe with 15 linear feet', () => {
      const identityKey = { size: '1/2', linear_feet: '15' };
      const result = calculateWeight(identityKey, 'THREADED PIPE');

      // 0.5^1.5 * 15 * 0.1 = 0.35 * 15 * 0.1 = 0.53
      expect(result.weight).toBeCloseTo(0.53, 2);
      expect(result.basis).toBe('linear_feet');
      expect(result.metadata).toEqual({ diameter: 0.5, linearFeet: 15 });
    });

    it('calculates weight for threaded pipe with 0 linear feet', () => {
      const identityKey = { size: '2', linear_feet: '0' };
      const result = calculateWeight(identityKey, 'THREADED PIPE');

      expect(result.weight).toBe(0);
      expect(result.basis).toBe('linear_feet');
      expect(result.metadata).toEqual({ diameter: 2, linearFeet: 0 });
    });

    it('calculates weight for threaded pipe with decimal linear feet', () => {
      const identityKey = { size: '2', linear_feet: '7.5' };
      const result = calculateWeight(identityKey, 'THREADED PIPE');

      // 2^1.5 * 7.5 * 0.1 = 2.83 * 7.5 * 0.1 = 2.12
      expect(result.weight).toBeCloseTo(2.12, 2);
      expect(result.basis).toBe('linear_feet');
      expect(result.metadata).toEqual({ diameter: 2, linearFeet: 7.5 });
    });
  });

  describe('unparseable size fallback', () => {
    it('returns fixed weight of 0.5 for missing size field', () => {
      const identityKey = {};
      const result = calculateWeight(identityKey, 'PIPE');

      expect(result.weight).toBe(0.5);
      expect(result.basis).toBe('fixed');
      expect(result.metadata).toEqual({ reason: 'no_size_field' });
    });

    it('returns fixed weight of 0.5 for null size', () => {
      const identityKey = { size: null };
      const result = calculateWeight(identityKey, 'PIPE');

      expect(result.weight).toBe(0.5);
      expect(result.basis).toBe('fixed');
      expect(result.metadata).toEqual({ reason: 'null_size' });
    });

    it('returns fixed weight of 0.5 for undefined size', () => {
      const identityKey = { size: undefined };
      const result = calculateWeight(identityKey, 'PIPE');

      expect(result.weight).toBe(0.5);
      expect(result.basis).toBe('fixed');
      expect(result.metadata).toEqual({ reason: 'undefined_size' });
    });

    it('returns fixed weight of 0.5 for empty string size', () => {
      const identityKey = { size: '' };
      const result = calculateWeight(identityKey, 'PIPE');

      expect(result.weight).toBe(0.5);
      expect(result.basis).toBe('fixed');
      expect(result.metadata).toEqual({ reason: 'empty_size' });
    });

    it('returns fixed weight of 0.5 for unparseable size like "NOSIZE"', () => {
      const identityKey = { size: 'NOSIZE' };
      const result = calculateWeight(identityKey, 'PIPE');

      expect(result.weight).toBe(0.5);
      expect(result.basis).toBe('fixed');
      expect(result.metadata).toEqual({ reason: 'unparseable_size', size: 'NOSIZE' });
    });

    it('returns fixed weight of 0.5 for invalid size like "ABC"', () => {
      const identityKey = { size: 'ABC' };
      const result = calculateWeight(identityKey, 'PIPE');

      expect(result.weight).toBe(0.5);
      expect(result.basis).toBe('fixed');
      expect(result.metadata).toEqual({ reason: 'unparseable_size', size: 'ABC' });
    });

    it('returns fixed weight of 0.5 for malformed reducer size like "2X"', () => {
      const identityKey = { size: '2X' };
      const result = calculateWeight(identityKey, 'REDUCER');

      expect(result.weight).toBe(0.5);
      expect(result.basis).toBe('fixed');
      expect(result.metadata).toEqual({ reason: 'unparseable_size', size: '2X' });
    });

    it('returns fixed weight of 0.5 for malformed reducer size like "XYZ"', () => {
      const identityKey = { size: 'XYZ' };
      const result = calculateWeight(identityKey, 'REDUCER');

      expect(result.weight).toBe(0.5);
      expect(result.basis).toBe('fixed');
      expect(result.metadata).toEqual({ reason: 'unparseable_size', size: 'XYZ' });
    });

    it('returns fixed weight of 1.0 for threaded_pipe with no size field', () => {
      const identityKey = { pipe_id: 'some-id' };
      const result = calculateWeight(identityKey, 'threaded_pipe');

      // Threaded pipe gets fallback weight of 1.0, not 0.5
      expect(result.weight).toBe(1.0);
      expect(result.basis).toBe('fixed');
      expect(result.metadata).toEqual({ reason: 'no_size_field' });
    });

    it('returns fixed weight of 1.0 for THREADED PIPE with unparseable size', () => {
      const identityKey = { size: 'NOSIZE' };
      const result = calculateWeight(identityKey, 'THREADED PIPE');

      // Threaded pipe gets fallback weight of 1.0, not 0.5
      expect(result.weight).toBe(1.0);
      expect(result.basis).toBe('fixed');
      expect(result.metadata).toEqual({ reason: 'unparseable_size', size: 'NOSIZE' });
    });
  });

  describe('edge cases and format variations', () => {
    it('handles size with whitespace', () => {
      const identityKey = { size: ' 2 ' };
      const result = calculateWeight(identityKey, 'PIPE');

      expect(result.weight).toBeCloseTo(2.83, 2);
      expect(result.basis).toBe('dimension');
      expect(result.metadata).toEqual({ diameter: 2 });
    });

    it('handles reducer size with whitespace', () => {
      const identityKey = { size: ' 2 X 4 ' };
      const result = calculateWeight(identityKey, 'REDUCER');

      expect(result.weight).toBeCloseTo(5.20, 2);
      expect(result.basis).toBe('dimension');
      expect(result.metadata).toEqual({ diameter1: 2, diameter2: 4, averageDiameter: 3 });
    });

    it('handles size with lowercase x in reducer', () => {
      const identityKey = { size: '2x4' };
      const result = calculateWeight(identityKey, 'REDUCER');

      expect(result.weight).toBeCloseTo(5.20, 2);
      expect(result.basis).toBe('dimension');
      expect(result.metadata).toEqual({ diameter1: 2, diameter2: 4, averageDiameter: 3 });
    });

    it('handles size with inch symbol', () => {
      const identityKey = { size: '2"' };
      const result = calculateWeight(identityKey, 'PIPE');

      expect(result.weight).toBeCloseTo(2.83, 2);
      expect(result.basis).toBe('dimension');
      expect(result.metadata).toEqual({ diameter: 2 });
    });

    it('handles fractional size with spaces like "1 / 2"', () => {
      const identityKey = { size: '1 / 2' };
      const result = calculateWeight(identityKey, 'PIPE');

      expect(result.weight).toBeCloseTo(0.35, 2);
      expect(result.basis).toBe('dimension');
      expect(result.metadata).toEqual({ diameter: 0.5 });
    });

    it('treats mixed number like "1 1/2" as unparseable (use "3/2" instead)', () => {
      const identityKey = { size: '1 1/2' };
      const result = calculateWeight(identityKey, 'PIPE');

      // Mixed numbers are not supported - use fraction format like "3/2"
      expect(result.weight).toBe(0.5);
      expect(result.basis).toBe('fixed');
      expect(result.metadata).toHaveProperty('reason');
    });

    it('treats decimal size like "2.5" as unparseable (use "5/2" instead)', () => {
      const identityKey = { size: '2.5' };
      const result = calculateWeight(identityKey, 'PIPE');

      // Decimals are not supported - use fraction format like "5/2"
      expect(result.weight).toBe(0.5);
      expect(result.basis).toBe('fixed');
      expect(result.metadata).toHaveProperty('reason');
    });

    it('handles linear_feet as number instead of string', () => {
      const identityKey = { size: '2', linear_feet: 10 };
      const result = calculateWeight(identityKey, 'THREADED PIPE');

      expect(result.weight).toBeCloseTo(2.83, 2);
      expect(result.basis).toBe('linear_feet');
      expect(result.metadata).toEqual({ diameter: 2, linearFeet: 10 });
    });

    it('handles linear_feet with invalid value by using diameter-based weight', () => {
      const identityKey = { size: '2', linear_feet: 'invalid' };
      const result = calculateWeight(identityKey, 'THREADED PIPE');

      // When linear_feet is invalid but diameter is valid, use diameter-based weight
      expect(result.weight).toBeCloseTo(2.83, 2); // 2^1.5
      expect(result.basis).toBe('dimension');
      expect(result.metadata).toEqual({ reason: 'invalid_linear_feet', linearFeet: 'invalid', diameter: 2 });
    });

    it('returns diameter-based weight for negative linear feet', () => {
      const identityKey = { size: '2', linear_feet: '-5' };
      const result = calculateWeight(identityKey, 'THREADED PIPE');

      // When linear_feet is negative but diameter is valid, use diameter-based weight
      expect(result.weight).toBeCloseTo(2.83, 2); // 2^1.5
      expect(result.basis).toBe('dimension');
      expect(result.metadata).toEqual({ reason: 'invalid_linear_feet', linearFeet: '-5', diameter: 2 });
    });

    it('returns diameter-based weight for negative linear feet as number', () => {
      const identityKey = { size: '2', linear_feet: -10 };
      const result = calculateWeight(identityKey, 'THREADED PIPE');

      // When linear_feet is negative but diameter is valid, use diameter-based weight
      expect(result.weight).toBeCloseTo(2.83, 2); // 2^1.5
      expect(result.basis).toBe('dimension');
      expect(result.metadata).toEqual({ reason: 'invalid_linear_feet', linearFeet: -10, diameter: 2 });
    });

    it('treats negative diameter as unparseable', () => {
      const identityKey = { size: '-2' };
      const result = calculateWeight(identityKey, 'PIPE');

      expect(result.weight).toBe(0.5);
      expect(result.basis).toBe('fixed');
      expect(result.metadata).toEqual({ reason: 'unparseable_size', size: '-2' });
    });

    it('treats zero diameter as unparseable', () => {
      const identityKey = { size: '0' };
      const result = calculateWeight(identityKey, 'PIPE');

      expect(result.weight).toBe(0.5);
      expect(result.basis).toBe('fixed');
      expect(result.metadata).toEqual({ reason: 'unparseable_size', size: '0' });
    });

    it('handles non-string, non-number size field', () => {
      const identityKey = { size: { invalid: true } };
      const result = calculateWeight(identityKey, 'PIPE');

      expect(result.weight).toBe(0.5);
      expect(result.basis).toBe('fixed');
      expect(result.metadata).toEqual({ reason: 'invalid_size_type', size: { invalid: true } });
    });
  });

  describe('aggregate pipe components (with attributes)', () => {
    it('calculates weight for 2 inch aggregate pipe with 10 linear feet from attributes', () => {
      const identityKey = { pipe_id: 'some-uuid' };
      const attributes = { size: '2', total_linear_feet: '10' };
      const result = calculateWeight(identityKey, 'pipe', attributes);

      // 2^1.5 * 10 * 0.1 = 2.83 * 10 * 0.1 = 2.83
      expect(result.weight).toBeCloseTo(2.83, 2);
      expect(result.basis).toBe('linear_feet');
      expect(result.metadata).toEqual({ diameter: 2, linearFeet: 10 });
    });

    it('calculates weight for 4 inch aggregate pipe with 5 linear feet from attributes', () => {
      const identityKey = { pipe_id: 'some-uuid' };
      const attributes = { size: '4', total_linear_feet: '5' };
      const result = calculateWeight(identityKey, 'pipe', attributes);

      // 4^1.5 * 5 * 0.1 = 8.00 * 5 * 0.1 = 4.00
      expect(result.weight).toBeCloseTo(4.00, 2);
      expect(result.basis).toBe('linear_feet');
      expect(result.metadata).toEqual({ diameter: 4, linearFeet: 5 });
    });

    it('calculates weight for aggregate pipe with size but no linear feet (diameter-only)', () => {
      const identityKey = { pipe_id: 'some-uuid' };
      const attributes = { size: '2' };
      const result = calculateWeight(identityKey, 'pipe', attributes);

      // No linear feet - should use diameter^1.5
      expect(result.weight).toBeCloseTo(2.83, 2);
      expect(result.basis).toBe('dimension');
      expect(result.metadata).toEqual({ diameter: 2 });
    });

    it('returns fallback weight for aggregate pipe with no attributes', () => {
      const identityKey = { pipe_id: 'some-uuid' };
      const result = calculateWeight(identityKey, 'pipe');

      expect(result.weight).toBe(0.5);
      expect(result.basis).toBe('fixed');
      expect(result.metadata).toEqual({ reason: 'no_size_field' });
    });

    it('returns fallback weight for aggregate pipe with empty attributes', () => {
      const identityKey = { pipe_id: 'some-uuid' };
      const attributes = {};
      const result = calculateWeight(identityKey, 'pipe', attributes);

      expect(result.weight).toBe(0.5);
      expect(result.basis).toBe('fixed');
      expect(result.metadata).toEqual({ reason: 'no_size_field' });
    });

    it('calculates weight for aggregate threaded_pipe with attributes', () => {
      const identityKey = { pipe_id: 'some-uuid' };
      const attributes = { size: '2', total_linear_feet: '10' };
      const result = calculateWeight(identityKey, 'threaded_pipe', attributes);

      // 2^1.5 * 10 * 0.1 = 2.83
      expect(result.weight).toBeCloseTo(2.83, 2);
      expect(result.basis).toBe('linear_feet');
      expect(result.metadata).toEqual({ diameter: 2, linearFeet: 10 });
    });

    it('pipe and threaded_pipe produce identical weights for same diameter + footage', () => {
      const identityKey = { pipe_id: 'some-uuid' };
      const attributes = { size: '4', total_linear_feet: '20' };

      const pipeResult = calculateWeight(identityKey, 'pipe', attributes);
      const threadedResult = calculateWeight(identityKey, 'threaded_pipe', attributes);

      expect(pipeResult.weight).toBeCloseTo(threadedResult.weight, 4);
      expect(pipeResult.basis).toBe('linear_feet');
      expect(threadedResult.basis).toBe('linear_feet');
    });

    it('non-aggregate pipe with direct linear_feet in identity_key uses footage formula', () => {
      const identityKey = { size: '2', linear_feet: '10' };
      const result = calculateWeight(identityKey, 'pipe');

      // Pipe should also use linear_feet formula (same as threaded_pipe)
      expect(result.weight).toBeCloseTo(2.83, 2);
      expect(result.basis).toBe('linear_feet');
      expect(result.metadata).toEqual({ diameter: 2, linearFeet: 10 });
    });

    it('aggregate pipe maps total_linear_feet to linear_feet', () => {
      const identityKey = { pipe_id: 'some-uuid' };
      const attributes = { size: '1', total_linear_feet: '20' };
      const result = calculateWeight(identityKey, 'pipe', attributes);

      // 1^1.5 * 20 * 0.1 = 1.00 * 20 * 0.1 = 2.00
      expect(result.weight).toBeCloseTo(2.00, 2);
      expect(result.basis).toBe('linear_feet');
      expect(result.metadata).toEqual({ diameter: 1, linearFeet: 20 });
    });
  });

  describe('component type variations', () => {
    it('calculates weight regardless of component type case', () => {
      const identityKey = { size: '2' };
      const result1 = calculateWeight(identityKey, 'PIPE');
      const result2 = calculateWeight(identityKey, 'pipe');
      const result3 = calculateWeight(identityKey, 'Pipe');

      expect(result1.weight).toBeCloseTo(2.83, 2);
      expect(result2.weight).toBeCloseTo(2.83, 2);
      expect(result3.weight).toBeCloseTo(2.83, 2);
    });

    it('handles empty component type', () => {
      const identityKey = { size: '2' };
      const result = calculateWeight(identityKey, '');

      expect(result.weight).toBeCloseTo(2.83, 2);
      expect(result.basis).toBe('dimension');
    });

    it('handles various component types with standard size', () => {
      const identityKey = { size: '4' };
      const types = ['ELBOW', 'TEE', 'VALVE', 'FLANGE', 'CAP'];

      types.forEach(type => {
        const result = calculateWeight(identityKey, type);
        expect(result.weight).toBeCloseTo(8.00, 2);
        expect(result.basis).toBe('dimension');
      });
    });
  });
});
