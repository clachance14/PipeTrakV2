/**
 * Title block normalization layer for Gemini extraction results.
 *
 * Sits between Gemini extraction and DB storage. Converts "no data"
 * values to null so downstream code never sees false positives.
 *
 * Ported from TakeOffTrak (src/lib/ai-pipeline/title-block-normalizer.ts).
 * Patterns derived empirically from multiple real projects.
 *
 * Design principles:
 *  - Conservative: only nullifies values that CLEARLY mean "no data"
 *  - Field-specific: "N" → null for insulation/hydro, but NOT for nde_class
 */

import { normalizeSpec } from '../_shared/normalize-spec.ts';
import type { TitleBlockData } from './types.ts';

// ── Generic "no value" patterns (applied to ALL nullable string fields) ──
// Matches: n/a, na, none, nil, single dash, double+ dashes, dots
// NOTE: a single "-" IS treated as no-data. Some drawings use "-" to mean
// "standard/default" for fields like schedule, but those should be null
// (the template default applies).
const GENERIC_NO_VALUE = /^(n\/?a|none|nil|--?|-{2,}|\.+)$/i;

// ── Insulation-specific "no value" patterns ──
// Bare "N" = no insulation type
// Zero thickness variants: 0, 0.0, 0.00, 0", 0.0", 0.00" etc.
const INSULATION_NO_VALUE = /^(n|no|0(\.0+)?"?)$/i;

// ── Hydro-specific "no value" patterns ──
// Bare "N" or "No" = no hydro requirement
const HYDRO_NO_VALUE = /^(n|no)$/i;

function normalizeGeneric(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (GENERIC_NO_VALUE.test(trimmed)) return null;
  return trimmed;
}

function normalizeInsulation(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (GENERIC_NO_VALUE.test(trimmed)) return null;
  if (INSULATION_NO_VALUE.test(trimmed)) return null;
  return trimmed;
}

function normalizeHydro(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (GENERIC_NO_VALUE.test(trimmed)) return null;
  if (HYDRO_NO_VALUE.test(trimmed)) return null;
  return trimmed;
}

/**
 * Normalize all nullable string fields in a TitleBlockData result.
 * Pure function — no side effects, no I/O.
 *
 * Applied after Gemini extraction, before DB storage.
 * Spec field gets both no-value cleanup AND first-token normalization.
 */
export function normalizeTitleBlock(result: TitleBlockData): TitleBlockData {
  const spec = normalizeGeneric(result.spec);
  return {
    ...result,
    drawing_number: normalizeGeneric(result.drawing_number),
    sheet_number: normalizeGeneric(result.sheet_number),
    line_number: normalizeGeneric(result.line_number),
    material: normalizeGeneric(result.material),
    schedule: normalizeGeneric(result.schedule),
    spec: normalizeSpec(spec),
    nde_class: normalizeGeneric(result.nde_class),
    revision: normalizeGeneric(result.revision),
    insulation: normalizeInsulation(result.insulation),
    hydro: normalizeHydro(result.hydro),
  };
}
