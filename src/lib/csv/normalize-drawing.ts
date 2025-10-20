/**
 * Drawing Normalization Utility
 * MUST match the database function normalize_drawing_number()
 *
 * Database does: UPPER(TRIM(regexp_replace(raw, '\s+', ' ', 'g')))
 *
 * Algorithm:
 * 1. Trim whitespace
 * 2. Convert to uppercase
 * 3. Collapse multiple spaces to single space
 *
 * Does NOT remove hyphens or leading zeros (database trigger handles this differently)
 *
 * Examples:
 * - "P-001" → "P-001" (unchanged except uppercase)
 * - " DRAIN-1 " → "DRAIN-1"
 * - "p  -  0  -  1" → "P - 0 - 1" (multiple spaces collapsed)
 */

export function normalizeDrawing(raw: string): string {
  return raw
    .trim()                    // Remove leading/trailing spaces
    .toUpperCase()             // Convert to uppercase
    .replace(/\s+/g, ' ');    // Collapse multiple spaces to single space
}
