/**
 * Drawing number normalization — shared across edge functions.
 * MUST match the database function `normalize_drawing_number()`.
 */

/**
 * Normalize a raw drawing number to its canonical form.
 * - Trims whitespace
 * - Converts to uppercase
 * - Collapses multiple spaces to a single space
 */
export function normalizeDrawing(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}
