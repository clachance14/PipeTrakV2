/**
 * Spec Normalization Utility
 * Extracts the core piping spec code by taking the first
 * whitespace-delimited token, trimmed and uppercased.
 *
 * MUST match the edge function copy at:
 * supabase/functions/_shared/normalize-spec.ts
 *
 * Examples:
 * - "PU-32 CC0085888" → "PU-32"
 * - "PU-32 CC"        → "PU-32"
 * - "PU-32"           → "PU-32"
 * - "  pu-22  "       → "PU-22"
 * - ""                → null
 * - null              → null
 */
export function normalizeSpec(raw: string | null): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const firstToken = trimmed.split(/\s+/)[0];
  return firstToken ? firstToken.toUpperCase() : null;
}
