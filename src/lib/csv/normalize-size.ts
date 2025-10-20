/**
 * Size Normalization Utility
 * Normalizes component size values for use in identity keys
 *
 * Rules:
 * 1. Trim whitespace
 * 2. Replace '/' with 'X' for URL safety (1/2" → 1X2)
 * 3. Remove quotes and units
 * 4. Empty sizes become "NOSIZE"
 *
 * Examples:
 * - "2" → "2"
 * - "1/2" → "1X2"
 * - "3/4\"" → "3X4"
 * - " 1 1/2 " → "11X2"
 * - "" → "NOSIZE"
 */

export function normalizeSize(raw: string | undefined): string {
  if (!raw || raw.trim() === '') {
    return 'NOSIZE';
  }

  return raw
    .trim()                    // Remove leading/trailing spaces
    .replace(/["'\s]/g, '')    // Remove quotes, apostrophes, and spaces
    .replace(/\//g, 'X')       // Replace / with X for URL safety
    .toUpperCase();            // Uppercase for consistency
}
