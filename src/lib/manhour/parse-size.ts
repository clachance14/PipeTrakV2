/**
 * Parse SIZE field from component data
 *
 * Handles formats:
 * - Integers: "2" → 2.0, "4" → 4.0
 * - Fractions: "1/2" → 0.5, "3/4" → 0.75, "1/4" → 0.25
 * - Reducers: "2X4" → average (2+4)/2 = 3.0, "1X2" → 1.5
 * - Special cases: "HALF" → 0.5, "NOSIZE" → null, "" → null
 * - Invalid inputs → null
 */

export interface ParsedSize {
  diameter: number | null;
  isReducer: boolean;
  secondDiameter?: number;
  raw: string;
}

/**
 * Parse a fraction string (e.g., "1/2", "3/4") to decimal
 * @param value - Fraction string
 * @returns Decimal number or null if invalid
 */
export function parseFraction(value: string): number | null {
  const trimmed = value.trim();

  // Check for fraction pattern (e.g., "1/2", "3/4")
  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch && fractionMatch[1] && fractionMatch[2]) {
    const numerator = parseInt(fractionMatch[1], 10);
    const denominator = parseInt(fractionMatch[2], 10);

    if (denominator === 0) {
      return null;
    }

    return numerator / denominator;
  }

  return null;
}

/**
 * Parse a size value (integer or fraction)
 * @param value - Size string
 * @returns Decimal number or null if invalid
 */
function parseSizeValue(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  // Try parsing as fraction first
  const fractionValue = parseFraction(trimmed);
  if (fractionValue !== null) {
    return fractionValue;
  }

  // Only allow positive integers (pipe sizes are typically whole numbers like "2", "4", "12")
  // For fractions, use the fraction format "1/2" instead of "0.5"
  // Reject: negatives, decimals, and non-numeric
  if (/^[0-9]+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  return null;
}

/**
 * Parse SIZE field from component data
 * @param sizeString - SIZE field value
 * @returns Parsed size object
 */
export function parseSize(sizeString: string): ParsedSize {
  const raw = sizeString;
  const trimmed = sizeString.trim().toUpperCase();

  // Handle empty string
  if (!trimmed) {
    return {
      diameter: null,
      isReducer: false,
      raw
    };
  }

  // Handle special case: NOSIZE
  if (trimmed === 'NOSIZE') {
    return {
      diameter: null,
      isReducer: false,
      raw
    };
  }

  // Handle special case: HALF
  if (trimmed === 'HALF') {
    return {
      diameter: 0.5,
      isReducer: false,
      raw
    };
  }

  // Check for reducer pattern (e.g., "2X4", "1/2X3/4")
  // Match any combination of numbers/fractions separated by X
  const reducerMatch = trimmed.match(/^(.+?)X(.+)$/);
  if (reducerMatch && reducerMatch[1] && reducerMatch[2]) {
    const size1Str = reducerMatch[1];
    const size2Str = reducerMatch[2];

    const size1 = parseSizeValue(size1Str);
    const size2 = parseSizeValue(size2Str);

    // Both sizes must be valid for a reducer
    if (size1 !== null && size2 !== null) {
      const avgDiameter = (size1 + size2) / 2;
      return {
        diameter: avgDiameter,
        isReducer: true,
        secondDiameter: size2,
        raw
      };
    }

    // If one side is invalid, treat as invalid
    return {
      diameter: null,
      isReducer: false,
      raw
    };
  }

  // Try parsing as single size value (integer, decimal, or fraction)
  const diameter = parseSizeValue(trimmed);

  return {
    diameter,
    isReducer: false,
    raw
  };
}
