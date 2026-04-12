/**
 * Maps BOM classifications from Gemini extraction to PipeTrak component types,
 * and determines which items are tracked vs sidebar-only.
 */

import type { BomItem } from './types.ts';
import { validateThreadedPipe } from './post-processor.ts';

export type ComponentType =
  | 'valve'
  | 'flange'
  | 'support'
  | 'fitting'
  | 'pipe'
  | 'threaded_pipe'
  | 'instrument'
  | 'tubing'
  | 'hose'
  | 'misc_component';

const PATTERNS: Array<{ type: ComponentType; regex: RegExp }> = [
  // Must check THREADED_PIPE before PIPE so "threaded pipe" doesn't match bare /^pipe$/i first
  { type: 'threaded_pipe', regex: /\bthreaded\s*pipe\b/i },
  { type: 'pipe',         regex: /^pipe$/i },
  { type: 'valve',        regex: /\b(gate|globe|ball|check|butterfly|plug|needle|control|pressure\s*safety)\s*valve\b|\b(rupture\s*disc|strainer)\b/i },
  { type: 'flange',       regex: /\bflange\b/i },
  { type: 'support',      regex: /\b(pipe\s*shoe|guide|anchor|hanger|spring\s*hanger|support|clamp|u-bolt|dummy\s*leg|trunnion|trapeze|bumper|angle\s*support|base\s*support)\b/i },
  { type: 'fitting',      regex: /\b(elbow|tee|reducer|coupling|cap|union|nipple|bushing|plug)\b|olet\b/i },
  { type: 'instrument',   regex: /\b(instrument|gauge|transmitter|indicator|thermowell|orifice|flow\s*element)\b/i },
  { type: 'tubing',       regex: /\btubing\b/i },
  { type: 'hose',         regex: /\bhose\b/i },
];

/** Instrument tag pattern: 2-3 letter prefix + dash + digits, optional letter suffix.
 *  Matches: TV-7539, FE-7544, LT-7501A, PI-001, XV-7539, TI-4200 */
const INSTRUMENT_TAG_PATTERN = /^[A-Z]{2,3}-\d{3,}/i;

/** G4G commodity code pattern — always pipe supports.
 *  Matches: G4G-1450-07, G4G-1412-05AB-001-2-2, G4G-1430-20, etc. */
const G4G_SUPPORT_PATTERN = /^G4G-/i;

/**
 * Maps a BOM classification string to a PipeTrak component type.
 * Instrument detection priority:
 *   1. subsection === 'instruments' (BOM has INSTRUMENTS sub-header)
 *   2. commodityCode matches instrument tag pattern (XX-NNNN)
 *   3. classification matches instrument regex
 * Returns 'misc_component' when no pattern matches.
 */
export function mapBomToComponentType(
  classification: string,
  subsection?: string,
  commodityCode?: string | null,
): ComponentType {
  // Items under INSTRUMENTS subsection are always instruments,
  // even if classified as "control valve" (which would otherwise match valve)
  if (subsection === 'instruments') return 'instrument';

  // Items with instrument tag commodity codes (TV-7539, FE-7544, etc.)
  // are instruments even without an INSTRUMENTS sub-header
  if (commodityCode && INSTRUMENT_TAG_PATTERN.test(commodityCode)) return 'instrument';

  // Items with G4G commodity codes are always pipe supports
  if (commodityCode && G4G_SUPPORT_PATTERN.test(commodityCode)) return 'support';

  for (const { type, regex } of PATTERNS) {
    if (regex.test(classification)) {
      return type;
    }
  }
  return 'misc_component';
}

// ── Threaded pipe detection ─────────────────────────────────────────────

/**
 * Detects whether a set of BOM items represents a threaded pipe drawing.
 * Checks if Gemini already flagged any item as threaded pipe, then delegates
 * to validateThreadedPipe which scopes detection to pipe item descriptions
 * and the title block material — NOT valve/fitting descriptions.
 */
export function isThreadedPipeDrawing(
  items: BomItem[],
  titleBlockMaterial: string | null,
): boolean {
  // Check if Gemini already flagged any item as threaded pipe
  if (items.some((item) => /\bthreaded\s*pipe\b/i.test(item.classification))) {
    return true;
  }
  return validateThreadedPipe(items, titleBlockMaterial);
}

/**
 * Post-processes BOM items for threaded pipe drawings:
 * 1. Reclassifies bare "pipe" → "threaded pipe"
 * 2. Overrides section to "field" for inline components (pipe, valves, instruments, misc)
 * 3. Keeps fittings (elbows, tees, reducers, etc.) as untracked — they're part of
 *    the pipe run footage, not separately tracked components
 */
export function applyThreadedPipeOverrides(
  items: BomItem[],
  titleBlockMaterial: string | null,
  bomFlaggedThreaded = false,
): BomItem[] {
  if (!bomFlaggedThreaded && !isThreadedPipeDrawing(items, titleBlockMaterial)) return items;

  return items.map((item) => {
    const classification = item.classification === 'pipe' ? 'threaded pipe' : item.classification;

    const componentType = mapBomToComponentType(classification);

    // On threaded pipe drawings, only inline components are tracked separately.
    // Fittings (elbows, tees, reducers, couplings) and flanges are part of the pipe
    // run and their progress is captured by the threaded_pipe aggregate footage.
    // Force fittings/flanges to 'shop' so they stay untracked regardless of Gemini's section.
    const isInlineComponent = [
      'threaded_pipe', 'pipe',   // aggregate pipe footage
      'valve',                    // ball, check, gate, etc. — tracked individually
      'instrument',               // gauges, transmitters — tracked individually
      'misc_component',           // anything else inline — tracked individually
      'support',                  // u-bolts, shoes, guides — tracked individually
    ].includes(componentType);

    const isFittingOrFlange = componentType === 'fitting' || componentType === 'flange';
    const section = isFittingOrFlange ? 'shop' : (isInlineComponent ? 'field' : item.section);

    return { ...item, classification, section };
  });
}

// ── Tracked item filter ─────────────────────────────────────────────────

// Exclude consumable hardware — but NOT u-bolts (those are pipe supports)
// GMG/SWG/CWG/RJ are common gasket abbreviations from BOM tables
const BOLT_GASKET_PATTERN = /\b(stud\s*bolt|bolt\s*set|nut|washer|gasket|gmg|swg|cwg|llr|rj\b)/i;
const U_BOLT_PATTERN = /\bu-bolt\b/i;

/**
 * Determines whether a BOM line item should be tracked in PipeTrak.
 *
 * Items are NOT tracked when:
 *  - Their erection category is 'shop' (shop-fabricated; tracked differently)
 *  - They are consumable hardware (bolts, nuts, washers, gaskets)
 *
 * Safety net: If rawDescription is provided and contains consumable keywords,
 * items are excluded even if the classification was misclassified by Gemini.
 */
export function isTrackedItem(
  description: string,
  erectionCategory: string,
  rawDescription?: string | null,
): boolean {
  if (erectionCategory === 'shop') {
    return false;
  }
  // Check classification first
  if (BOLT_GASKET_PATTERN.test(description) && !U_BOLT_PATTERN.test(description)) {
    return false;
  }
  // Safety net: check raw BOM description for consumable keywords
  if (rawDescription) {
    if (BOLT_GASKET_PATTERN.test(rawDescription) && !U_BOLT_PATTERN.test(rawDescription)) {
      return false;
    }
  }
  return true;
}
