/**
 * Calculate weight for manhour distribution
 *
 * Weight calculation formulas:
 * - Standard components: diameter^1.5
 * - Reducers (e.g., "2X4"): ((d1 + d2) / 2)^1.5 using average diameter
 * - Pipe/threaded pipe with linear feet: diameter^1.5 × linear_feet × 0.1
 * - Aggregate pipe/threaded_pipe: reads size and total_linear_feet from attributes
 * - No parseable size: 0.5 (fixed fallback)
 */

import { parseSize } from './parse-size';

export interface WeightResult {
  weight: number;
  basis: 'dimension' | 'fixed' | 'linear_feet';
  metadata: Record<string, unknown>;
}

/**
 * Normalize size field - handles various input formats
 */
function normalizeSizeField(size: unknown): string | null | undefined | 'invalid_type' {
  if (size === null) return null;
  if (size === undefined) return undefined;
  if (typeof size === 'string') return size;
  if (typeof size === 'number') return size.toString();
  // Invalid type (object, array, etc.)
  return 'invalid_type';
}

/**
 * Parse linear_feet field from identity key
 */
function parseLinearFeet(linearFeet: unknown): number | null {
  if (linearFeet === null || linearFeet === undefined) {
    return null;
  }

  if (typeof linearFeet === 'number') {
    return linearFeet;
  }

  if (typeof linearFeet === 'string') {
    const parsed = parseFloat(linearFeet);
    return isNaN(parsed) ? null : parsed;
  }

  return null;
}

/**
 * Preprocess size string to handle edge cases not supported by parseSize
 * - Remove inch symbols (")
 * - Handle spaces in fractions ("1 / 2" → "1/2")
 * - Handle mixed numbers ("1 1/2" → "1.5")
 * - Remove spaces around X in reducers ("2 X 4" → "2X4")
 * - Detect malformed reducers ("2X", "X4") and mark as invalid
 */
function preprocessSize(size: string): string | null {
  let processed = size.trim();

  // Remove inch symbols
  processed = processed.replace(/"/g, '');

  // Handle spaces in fractions: "1 / 2" → "1/2"
  processed = processed.replace(/\s*\/\s*/g, '/');

  // Handle mixed numbers: "1 1/2" → "1.5"
  const mixedNumberMatch = processed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedNumberMatch && mixedNumberMatch[1] && mixedNumberMatch[2] && mixedNumberMatch[3]) {
    const whole = parseInt(mixedNumberMatch[1], 10);
    const numerator = parseInt(mixedNumberMatch[2], 10);
    const denominator = parseInt(mixedNumberMatch[3], 10);
    if (denominator !== 0) {
      const decimal = whole + (numerator / denominator);
      processed = decimal.toString();
    }
  }

  // Handle spaces around X in reducers: "2 X 4" → "2X4"
  // This is already handled by parseSize, but let's normalize it
  processed = processed.replace(/\s*X\s*/gi, 'X');

  // Detect malformed reducers (e.g., "2X", "X4")
  // Valid reducer must have content on both sides of X
  if (/X/i.test(processed)) {
    const parts = processed.split(/X/i);
    if (parts.length !== 2 || !parts[0]?.trim() || !parts[1]?.trim()) {
      // Malformed reducer
      return null;
    }
  }

  return processed;
}

/**
 * Build effective identity key for weight calculation.
 * Aggregate components (with pipe_id in identity_key) store size and footage
 * in attributes, not identity_key. This merges them so the rest of the logic works.
 */
function buildEffectiveIdentityKey(
  identityKey: Record<string, unknown>,
  attributes?: Record<string, unknown>
): Record<string, unknown> {
  const isAggregate = 'pipe_id' in identityKey;

  if (!isAggregate || !attributes) {
    return identityKey;
  }

  // For aggregates, build key from attributes
  const effective: Record<string, unknown> = { ...identityKey };

  if ('size' in attributes) {
    effective.size = attributes.size;
  }

  // Map total_linear_feet → linear_feet
  if ('total_linear_feet' in attributes) {
    effective.linear_feet = attributes.total_linear_feet;
  }

  return effective;
}

/**
 * Check if component type uses linear feet for weight calculation
 */
function usesLinearFeet(componentType: string): boolean {
  const upper = componentType.toUpperCase();
  return upper.includes('THREADED') || upper === 'PIPE';
}

/**
 * Get fallback weight based on component type
 * Threaded pipe gets 1.0, all others get 0.5
 */
function getFallbackWeight(componentType: string): number {
  const isThreadedPipe = componentType.toUpperCase().includes('THREADED');
  return isThreadedPipe ? 1.0 : 0.5;
}

/**
 * Calculate weight for a component based on size and component type.
 * For aggregate components (identity_key has pipe_id), pass attributes
 * to read size and total_linear_feet from the component's attributes column.
 */
export function calculateWeight(
  identityKey: Record<string, unknown>,
  componentType: string,
  attributes?: Record<string, unknown>
): WeightResult {
  // Build effective key: merges attributes for aggregate components
  const effectiveKey = buildEffectiveIdentityKey(identityKey, attributes);

  // Extract size field (case-insensitive check for "size" or "SIZE")
  // Use 'in' operator to distinguish between null and undefined
  const sizeRaw = 'size' in effectiveKey ? effectiveKey.size : effectiveKey.SIZE;
  const normalizedSize = normalizeSizeField(sizeRaw);
  const fallbackWeight = getFallbackWeight(componentType);

  // Handle missing size field
  if (!(('size' in effectiveKey) || ('SIZE' in effectiveKey))) {
    return {
      weight: fallbackWeight,
      basis: 'fixed',
      metadata: { reason: 'no_size_field' }
    };
  }

  // Handle null size
  if (normalizedSize === null) {
    return {
      weight: fallbackWeight,
      basis: 'fixed',
      metadata: { reason: 'null_size' }
    };
  }

  // Handle undefined size
  if (normalizedSize === undefined) {
    return {
      weight: fallbackWeight,
      basis: 'fixed',
      metadata: { reason: 'undefined_size' }
    };
  }

  // Handle invalid type
  if (normalizedSize === 'invalid_type') {
    return {
      weight: fallbackWeight,
      basis: 'fixed',
      metadata: { reason: 'invalid_size_type', size: sizeRaw }
    };
  }

  // Handle empty size
  if (normalizedSize.trim() === '') {
    return {
      weight: fallbackWeight,
      basis: 'fixed',
      metadata: { reason: 'empty_size' }
    };
  }

  // Preprocess size to handle edge cases
  const preprocessed = preprocessSize(normalizedSize);

  // If preprocessing failed (e.g., malformed reducer), return fixed weight
  if (preprocessed === null) {
    return {
      weight: fallbackWeight,
      basis: 'fixed',
      metadata: { reason: 'unparseable_size', size: normalizedSize }
    };
  }

  // Parse the size field
  const parsed = parseSize(preprocessed);

  // Handle unparseable size or invalid diameter (null, zero, negative)
  if (
    parsed.diameter === null ||
    parsed.diameter <= 0
  ) {
    return {
      weight: fallbackWeight,
      basis: 'fixed',
      metadata: { reason: 'unparseable_size', size: normalizedSize }
    };
  }

  const diameter = parsed.diameter;

  // Check if this is pipe or threaded pipe with linear_feet
  const hasLinearFeetFormula = usesLinearFeet(componentType);
  const linearFeetRaw = effectiveKey.linear_feet ?? effectiveKey.LINEAR_FEET;
  const linearFeet = parseLinearFeet(linearFeetRaw);

  // Validate linear_feet if present for pipe/threaded pipe
  if (hasLinearFeetFormula && linearFeetRaw !== undefined && linearFeetRaw !== null) {
    // Invalid linear_feet value (null from parsing or negative) - use diameter-based weight since diameter is valid
    if (linearFeet === null || linearFeet < 0) {
      return {
        weight: Math.pow(diameter, 1.5),
        basis: 'dimension',
        metadata: { reason: 'invalid_linear_feet', linearFeet: linearFeetRaw, diameter }
      };
    }

    // Calculate weight with linear_feet: diameter^1.5 × linear_feet × 0.1
    const weight = Math.pow(diameter, 1.5) * linearFeet * 0.1;

    return {
      weight,
      basis: 'linear_feet',
      metadata: {
        diameter,
        linearFeet
      }
    };
  }

  // Standard calculation: diameter^1.5
  const weight = Math.pow(diameter, 1.5);

  // Build metadata based on whether this is a reducer
  let metadata: Record<string, unknown>;

  if (parsed.isReducer && parsed.secondDiameter !== undefined) {
    // Reducer: include both diameters and average
    const d1 = (diameter * 2) - parsed.secondDiameter; // Reverse the average: d1 = avg*2 - d2
    const d2 = parsed.secondDiameter;
    metadata = {
      diameter1: d1,
      diameter2: d2,
      averageDiameter: diameter
    };
  } else {
    // Standard component
    metadata = {
      diameter
    };
  }

  return {
    weight,
    basis: 'dimension',
    metadata
  };
}
