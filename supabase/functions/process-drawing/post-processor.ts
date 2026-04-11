/**
 * Post-processing domain rules applied AFTER Gemini extraction.
 * These are hardcoded domain truths, not AI judgment calls.
 * Deno-compatible: no Node.js imports.
 */

import type { BomItem } from './types.ts';

// ── Instrument tag pattern ────────────────────────────────────────────
// Matches instrument tags like LT-7501A, TV-7539, FE-7544, PI-001, XV-7539
const INSTRUMENT_TAG_PATTERN = /^[A-Z]{2,3}-\d{3,}/i;

// ── Threaded pipe indicators (checked against PIPE items only) ────────
const THREADED_PIPE_PATTERNS = [
  /\bgalvanized\b/i,
  /\bgalv\b/i,
  /\bA53\b.*\bType\s*F\b/i,
];

// ── Threaded pipe indicators from title block material ────────────────
const THREADED_MATERIAL_PATTERNS = [
  /\bgalv/i,
  /\bgalvanized/i,
];

/**
 * Force all items in the instruments subsection to section='field'.
 * Domain truth: instruments are ALWAYS field-installed.
 */
export function applyInstrumentFieldOverride(items: BomItem[]): BomItem[] {
  return items.map((item) => {
    if (item.subsection === 'instruments') {
      return { ...item, section: 'field' as const, item_type: 'material' as const };
    }
    return item;
  });
}

/**
 * Resolve spec conflicts between per-item spec and title block spec.
 * Title block is authoritative. Instrument-tag-like specs are discarded.
 */
export function resolveSpecConflict(
  itemSpec: string | null,
  titleBlockSpec: string | null,
): string | null {
  if (!itemSpec) return titleBlockSpec;
  if (INSTRUMENT_TAG_PATTERN.test(itemSpec)) return titleBlockSpec;
  return itemSpec;
}

/**
 * Validate whether a drawing is truly threaded pipe.
 * Checks ONLY the pipe line item descriptions and title block material.
 * Valve/fitting descriptions with NPTF/THD are NOT threaded pipe signals.
 */
export function validateThreadedPipe(
  items: BomItem[],
  titleBlockMaterial: string | null,
): boolean {
  const pipeItems = items.filter(
    (item) => item.classification === 'pipe' || item.classification === 'threaded pipe',
  );

  for (const pipe of pipeItems) {
    const desc = pipe.description ?? '';
    if (THREADED_PIPE_PATTERNS.some((p) => p.test(desc))) return true;
  }

  if (titleBlockMaterial) {
    if (THREADED_MATERIAL_PATTERNS.some((p) => p.test(titleBlockMaterial))) return true;
  }

  return false;
}
