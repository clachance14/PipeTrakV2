/**
 * Spec normalization — shared across edge functions.
 * Extracts the core piping spec code by taking the first
 * whitespace-delimited token, trimmed and uppercased.
 *
 * "PU-32 CC0085888"     → "PU-32"
 * "PU-32 CC"            → "PU-32"
 * "PU-32"               → "PU-32"
 * "  pu-22  "           → "PU-22"
 * "PU-02_CC.0083947"    → "PU-02"  (underscore separates contract ref)
 * ""                    → null
 * null                  → null
 */
export function normalizeSpec(raw: string | null): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Split on underscore first to strip contract references like "PU-02_CC.0083947"
  const beforeUnderscore = trimmed.split('_')[0] ?? trimmed;
  const firstToken = beforeUnderscore.split(/\s+/)[0];
  if (!firstToken) return null;
  const upper = firstToken.toUpperCase();
  // Commodity/support codes (e.g. G4G-1410-07) are not piping specs
  if (/^G\d+G-/.test(upper)) return null;
  return upper;
}
