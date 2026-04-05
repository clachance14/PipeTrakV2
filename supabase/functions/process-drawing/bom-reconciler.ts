/**
 * BOM Reconciler
 * Merges primary BOM extraction results with text-only classification results.
 * Applies a description-keyword safety net as the final classification check.
 */

import type { BomItem } from './types';

// ── ClassifiedItem (from bom-classifier) ──────────────────────────────────

// Defined here to avoid a circular import if bom-classifier imports from this
// module. The canonical definition lives in bom-classifier.ts; this must stay
// in sync with it.
export interface ClassifiedItem {
  index: number;
  classification: string;
  section: 'shop' | 'field';
  item_type: 'material' | 'support';
  confidence: 'high' | 'medium' | 'low';
}

// ── Category mapping ───────────────────────────────────────────────────────

type BroadCategory =
  | 'gasket'
  | 'bolt'
  | 'flange'
  | 'valve'
  | 'support'
  | 'instrument'
  | 'pipe'
  | 'fitting';

/**
 * Maps a specific classification to a broad category used for override
 * decisions.  Only override when the broad categories differ.
 */
function classificationCategory(classification: string): BroadCategory {
  const c = classification.toLowerCase().trim();

  if (c === 'gasket') return 'gasket';
  if (c === 'bolt set') return 'bolt';
  if (c.startsWith('flange') || c === 'blind flange') return 'flange';
  if (
    c.includes('valve') ||
    c === 'pressure safety valve' ||
    c === 'control valve' ||
    c === 'rupture disc' ||
    c === 'strainer'
  )
    return 'valve';
  if (
    c === 'pipe shoe' ||
    c === 'guide' ||
    c === 'anchor' ||
    c === 'spring hanger' ||
    c === 'u-bolt' ||
    c === 'dummy leg' ||
    c === 'trunnion' ||
    c === 'pipe clamp' ||
    c === 'trapeze support' ||
    c === 'bumper' ||
    c === 'angle support'
  )
    return 'support';
  if (
    c === 'thermowell' ||
    c === 'pressure transmitter' ||
    c === 'temperature gauge' ||
    c === 'orifice plate'
  )
    return 'instrument';
  if (c === 'pipe' || c === 'threaded pipe') return 'pipe';

  // All other fittings, elbows, tees, reducers, olets, etc.
  return 'fitting';
}

// ── Override patterns ──────────────────────────────────────────────────────

interface OverrideRule {
  pattern: RegExp;
  classification: string;
  category: BroadCategory;
}

// Order matters — more specific patterns first.
const OVERRIDE_RULES: OverrideRule[] = [
  { pattern: /GASKET/i, classification: 'gasket', category: 'gasket' },
  { pattern: /STUD\s*BOLT|BOLT\s*SET/i, classification: 'bolt set', category: 'bolt' },
  { pattern: /NUT/i, classification: 'bolt set', category: 'bolt' },
  { pattern: /WASHER/i, classification: 'bolt set', category: 'bolt' },
  { pattern: /PIPE\s*SHOE/i, classification: 'pipe shoe', category: 'support' },
  { pattern: /SPRING\s*HANGER/i, classification: 'spring hanger', category: 'support' },
  { pattern: /U-BOLT/i, classification: 'u-bolt', category: 'support' },
  { pattern: /DUMMY\s*LEG/i, classification: 'dummy leg', category: 'support' },
  { pattern: /TRUNNION/i, classification: 'trunnion', category: 'support' },
  { pattern: /THERMOWELL/i, classification: 'thermowell', category: 'instrument' },
  { pattern: /ORIFICE/i, classification: 'orifice plate', category: 'instrument' },
  { pattern: /FLANGE.*WN|RFWN.*FLANGE|FLANGE\s*WN/i, classification: 'flange wn', category: 'flange' },
  { pattern: /BLIND\s*FLANGE/i, classification: 'blind flange', category: 'flange' },
  { pattern: /FLANGE/i, classification: 'flange wn', category: 'flange' },
  { pattern: /VALVE/i, classification: 'gate valve', category: 'valve' },
];

/**
 * Checks the raw BOM description for keywords that definitively identify a
 * component type.  Returns the corrected classification, or the original if
 * no override matches or the override's category is the same as the current
 * classification's category.
 *
 * This is the last safety net — runs after Gemini classification.
 */
export function overrideClassificationFromDescription(
  classification: string,
  description: string | null,
): string {
  if (description == null) return classification;

  const currentCategory = classificationCategory(classification);

  for (const rule of OVERRIDE_RULES) {
    if (rule.pattern.test(description)) {
      // Only override when the broad category differs — don't clobber a more
      // specific classification that already belongs to the same category.
      if (rule.category !== currentCategory) {
        return rule.classification;
      }
      // Same category → stop scanning (most-specific-first ordering means the
      // first match is the best one).
      return classification;
    }
  }

  return classification;
}

// ── Support classifications ────────────────────────────────────────────────

const SUPPORT_CLASSIFICATIONS = new Set([
  'pipe shoe',
  'guide',
  'anchor',
  'spring hanger',
  'u-bolt',
  'dummy leg',
  'trunnion',
  'pipe clamp',
]);

function isSupportClassification(classification: string): boolean {
  return SUPPORT_CLASSIFICATIONS.has(classification.toLowerCase().trim());
}

// ── Reconciler ─────────────────────────────────────────────────────────────

/**
 * Merges primary BOM extraction results with text-only classification results.
 *
 * For each primary item:
 *   1. If a classified result exists for this index, apply its classification,
 *      section, item_type and confidence.
 *   2. If confidence is 'low', flag needs_review and append a reason.
 *   3. Run overrideClassificationFromDescription as a final safety net.
 *   4. If the description override changes the classification, fix item_type.
 */
export function reconcileBomItems(
  primary: BomItem[],
  classified: ClassifiedItem[],
): BomItem[] {
  // Index classified results by their input index for O(1) lookup.
  const classifiedByIndex = new Map<number, ClassifiedItem>();
  for (const item of classified) {
    classifiedByIndex.set(item.index, item);
  }

  return primary.map((item, index): BomItem => {
    let merged = { ...item };

    const classifiedResult = classifiedByIndex.get(index);
    if (classifiedResult !== undefined) {
      merged.classification = classifiedResult.classification;
      merged.section = classifiedResult.section;
      merged.item_type = classifiedResult.item_type;
      merged.classification_confidence = classifiedResult.confidence;

      if (classifiedResult.confidence === 'low') {
        merged.needs_review = true;
        const existingReason = merged.review_reason;
        merged.review_reason = existingReason
          ? `${existingReason}; low_confidence_classification`
          : 'low_confidence_classification';
      }
    }

    // Description safety-net override.
    const overridden = overrideClassificationFromDescription(
      merged.classification,
      merged.description,
    );

    if (overridden !== merged.classification) {
      merged.classification = overridden;
      // Fix item_type to match the new classification.
      merged.item_type = isSupportClassification(overridden) ? 'support' : 'material';
    }

    return merged;
  });
}
