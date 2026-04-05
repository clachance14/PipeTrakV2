/**
 * BOM (Bill of Materials) extraction via Gemini Vision
 * Deno-compatible: uses callGemini() (fetch-based), no Node.js imports
 */

import { callGemini } from './gemini-client.ts';
import type { BomItem } from './types.ts';
import { normalizeSpec } from '../_shared/normalize-spec.ts';

// ── Prompt ─────────────────────────────────────────────────────────────

const BOM_PROMPT = `You are extracting the Bill of Materials (BOM) from a piping isometric (ISO) drawing.
ISO drawings typically have two BOM sections: SHOP MATERIALS and OTHER THAN SHOP MATERIALS (Field Materials).
Extract EVERY row. Return null for fields not present. Do not infer values not shown in the BOM.

CRITICAL: The "description" field must contain the EXACT text from the BOM row. Do NOT rewrite, summarize, interpret, or expand the description. Copy it character-for-character as shown in the BOM table.

<where_to_look>
The BOM table is typically located on the RIGHT side or BOTTOM of the drawing page. It appears as a structured grid with column headers (ITEM, DESCRIPTION, SIZE, QTY, UOM, etc.) and one row per material or support item. Focus ONLY on this table. Do NOT extract information from the isometric drawing body, notes, or revision blocks.
</where_to_look>

Extract EVERY row from the BOM table(s) on this ISO drawing.

<classification_rules>
- item_type: "material" for pipe, fittings, flanges, gaskets, bolts, valves, instruments, nuts, washers. "support" for pipe supports ONLY (shoes, guides, anchors, hangers, clamps, trunnions, dummy legs).
  *** CRITICAL — BOLTS/NUTS/WASHERS ARE ALWAYS "material", NEVER "support":
  - Stud bolts, hex bolts, cap screws, nuts, washers = "material" with classification "bolt set"
  - This applies even when bolts appear inside a SUPPORTS section
  - If the description mentions BOLT, NUT, WASHER, STUD, HEX, or UNC thread spec → item_type = "material"
- section: Determine section from the TABLE HEADER above each item (e.g. "SHOP MATERIALS" or "OTHER THAN SHOP MATERIALS"), NOT from the item's position on the drawing. If you cannot determine the section from table headers, set needs_review=true with review_reason="section_unclear".
- classification: ALL LOWERCASE, be specific:
  Pipe: "pipe"
  Flanges: "flange wn", "flange sw", "flange lj", "flange so", "blind flange" — always specify type
  Elbows: "elbow 90 lr", "elbow 45 lr", "elbow 90 sr" — always include lr/sr
  Tees: "tee", "reducing tee"
  Reducers: "reducer conc", "reducer ecc"
  Olets: "weldolet", "threadolet", "sockolet"
  Valves: "gate valve", "ball valve", "check valve", "globe valve", "butterfly valve", "plug valve", "control valve", "pressure safety valve" — always specify type
  *** For ALL valves, ALWAYS populate end_connection. Determine from the BOM description:
    - "RF", "RFWN", "FLANGED", raised face → "RFWN"
    - "BW", "BUTT WELD" → "BW"
    - "SW", "SOCKET WELD" → "SW"
    - "THD", "THREADED", "SCREWED" → "THD"
    If the description does not explicitly state connection type, infer: shop valves are typically BW or SW; field valves are typically RFWN.
  Instruments: "thermowell", "pressure transmitter", "temperature gauge", "orifice plate" — always specify type
  Supports: "pipe shoe", "guide", "anchor", "spring hanger", "u-bolt", "dummy leg", "trunnion", "pipe clamp" — always specify type
  Bends: "bend" — pipe bend (a smooth curve formed from pipe, NOT a fitting elbow)
  Couplings: "coupling" — threaded or socket weld coupling
  Other: "gasket", "bolt set", "nipple", "cap", "plug", "rupture disc", "spacer", "strainer"
</classification_rules>

<valve_abbreviation_dictionary>
Common valve abbreviations found in BOM descriptions — use these to determine the correct classification:
- ABV = Automatic Block Valve → classification: "ball valve"
- DBB = Double Block & Bleed → classification: "ball valve"
- PSV = Pressure Safety Valve → classification: "pressure safety valve"
- PRV = Pressure Relief Valve → classification: "pressure safety valve"
- CV = Control Valve → classification: "control valve"
- BDV = Blowdown Valve → classification: "gate valve"
- MOV = Motor Operated Valve → classification: "gate valve"
- SOV = Solenoid Operated Valve → classification: "globe valve"
- RV = Relief Valve → classification: "pressure safety valve"
- SDV = Shutdown Valve → classification: "ball valve"
- XV = Control Valve on/off → classification: "ball valve"
- HV = Hand Valve → classification: "gate valve"
Do NOT classify these as "thermowell" or other instrument types — they are valves.
</valve_abbreviation_dictionary>

<threaded_pipe_rules>
IMPORTANT: Threaded piping systems use threaded connections (FTE, NPT, NPTF, THD) instead of welded connections.
Key indicators of a threaded pipe drawing:
- Pipe: A53 Type F, ERW, galvanized pipe with threaded ends
- Fittings: B16.11 class 3000/6000, FTE (Forged Threaded End), screwed fittings
- Valves: NPTF, NPT, or threaded end connections

When you see these indicators:
1. Classify pipe as "threaded pipe" (not "pipe")
2. ALL materials on a threaded pipe drawing are field-installed (section="field"), NOT shop
   - There is no shop fabrication for threaded piping — everything is assembled on-site
   - The only exception: if the drawing explicitly labels a separate "SHOP MATERIALS" section
3. Supports (u-bolts, guides, shoes) remain section="field" as usual
</threaded_pipe_rules>

<size_rules>
- size/size_2: NPS as decimal. Sub-1": "0.5" (1/2"), "0.75" (3/4"), "0.375" (3/8"). Whole: "2", "16", "1.5" (1-1/2").
- Reducing items: "16" x 10" TEE, RED" → size="16", size_2="10". "24" x 20" REDUCER" → size="24", size_2="20".
- schedule_2: For "SCH STD x SCH 80" → schedule="STD", schedule_2="80".
</size_rules>

<bolt_size_rules>
For STUD BOLTS and BOLT SETS:
- size = stud DIAMETER as decimal (e.g. "5/8X3 1/2" -> size="0.625")
- size_2 = stud LENGTH as decimal (e.g. "5/8X3 1/2" -> size_2="3.5")
- Always split into diameter (size) and length (size_2) — never put both in one field
</bolt_size_rules>

<examples>
{"item_number": 1, "item_type": "material", "classification": "pipe", "section": "shop", "description": "2\\" PIPE, SCH 40, ASTM A106, GR B, SMLS", "size": "2", "size_2": null, "quantity": 20, "uom": "LF", "spec": null, "material_grade": "CS", "schedule": "40", "schedule_2": null, "rating": null, "commodity_code": null, "end_connection": null, "needs_review": false, "review_reason": null}

{"item_number": 2, "item_type": "material", "classification": "reducing tee", "section": "shop", "description": "16\\" x 10\\" TEE, RED, BW, SCH STD x SCH STD, ASTM A-234-GR WPB, SMLS", "size": "16", "size_2": "10", "quantity": 1, "uom": "EA", "spec": null, "material_grade": "CS", "schedule": "STD", "schedule_2": "STD", "rating": null, "commodity_code": null, "end_connection": "BW", "needs_review": false, "review_reason": null}

{"item_number": 3, "item_type": "material", "classification": "flange wn", "section": "shop", "description": "16\\" FLANGE, RFWN, CL 150, SCH STD, ASTM A-105", "size": "16", "size_2": null, "quantity": 3, "uom": "EA", "spec": "A-105", "material_grade": "CS", "schedule": "STD", "schedule_2": null, "rating": "150", "commodity_code": null, "end_connection": "RFWN", "needs_review": false, "review_reason": null}

{"item_number": 4, "item_type": "support", "classification": "pipe shoe", "section": "field", "description": "PIPE SHOE 4\\" STD", "size": "4", "size_2": null, "quantity": 2, "uom": "EA", "spec": "PS-101", "material_grade": null, "schedule": null, "schedule_2": null, "rating": null, "commodity_code": "G4G-1412-05AA-001-2-2", "end_connection": null, "needs_review": false, "review_reason": null}

{"item_number": 5, "item_type": "material", "classification": "gasket", "section": "field", "description": "2\\" SWG GASKET, 150# RF, ASME B16.20", "size": "2", "size_2": null, "quantity": 4, "uom": "EA", "spec": null, "material_grade": null, "schedule": null, "schedule_2": null, "rating": "150", "commodity_code": null, "end_connection": null, "needs_review": false, "review_reason": null}

{"item_number": 6, "item_type": "material", "classification": "ball valve", "section": "field", "description": "2\\" ABV, 600#, RFWN, FULL PORT", "size": "2", "size_2": null, "quantity": 1, "uom": "EA", "spec": null, "material_grade": null, "schedule": null, "schedule_2": null, "rating": "600", "commodity_code": null, "end_connection": "RFWN", "needs_review": false, "review_reason": null}
</examples>

If no BOM items are found, return { "items": [] }.`;

// ── JSON Schema for structured output ──────────────────────────────────

const BOM_ITEM_SCHEMA = {
  type: 'OBJECT',
  properties: {
    item_number: {
      type: 'INTEGER',
      description: 'Row/item number from the BOM table (first column). null if no item number column.',
      nullable: true,
    },
    item_type: {
      type: 'STRING',
      description: '"material" for pipe/fittings/flanges/gaskets/bolts. "support" for pipe supports (shoes, guides, anchors, hangers, clamps, trunnions).',
      format: 'enum',
      enum: ['material', 'support'],
    },
    classification: {
      type: 'STRING',
      description: 'Descriptive short label, ALL LOWERCASE. Be specific: "pipe", "flange wn", "elbow 90 lr", "reducing tee", "gate valve", "pipe shoe", etc.',
    },
    section: {
      type: 'STRING',
      description: 'Which BOM section this item came from: "shop" for shop materials, "field" for other-than-shop/field materials. MUST be set for every item.',
      format: 'enum',
      enum: ['shop', 'field'],
    },
    description: {
      type: 'STRING',
      description: 'Full description text from the BOM row',
      nullable: true,
    },
    size: {
      type: 'STRING',
      description: 'Primary NPS size as decimal. Sub-1": "0.5" for 1/2", "0.75" for 3/4". Whole: "2", "16". For bolt sets: stud DIAMETER as decimal (e.g. "0.625" for 5/8").',
      nullable: true,
    },
    size_2: {
      type: 'STRING',
      description: 'Secondary NPS for reducing items (branch/outlet). For bolt sets: stud LENGTH as decimal (e.g. "3.5" for 3-1/2").',
      nullable: true,
    },
    quantity: {
      type: 'NUMBER',
      description: 'Quantity from BOM. If not explicitly shown, provide your best estimate but set needs_review to true.',
    },
    uom: {
      type: 'STRING',
      description: 'Unit of measure: "LF" for pipe, "EA" for fittings, "SET" for bolt sets, "SQ FT" for plates.',
      format: 'enum',
      enum: ['LF', 'EA', 'SET', 'SQ FT'],
      nullable: true,
    },
    spec: {
      type: 'STRING',
      description: 'Tag/mark number for supports (e.g. "PS-101"), or pipe spec code for materials if present. null if not applicable.',
      nullable: true,
    },
    material_grade: {
      type: 'STRING',
      description: 'Material CATEGORY (not full ASTM spec). Determine the family from the description.',
      format: 'enum',
      enum: ['CS', 'SS-304', 'SS-316', 'INCONEL', 'TI', 'DUPLEX', 'CHROME', 'ALLOY'],
      nullable: true,
    },
    schedule: {
      type: 'STRING',
      description: 'Primary pipe schedule (e.g. "40", "80", "STD", "XS"). Keep as shown — do NOT convert between STD/XS and numeric.',
      nullable: true,
    },
    schedule_2: {
      type: 'STRING',
      description: 'Secondary schedule for reducing items (e.g. "SCH STD x SCH 80" → schedule_2="80").',
      nullable: true,
    },
    rating: {
      type: 'STRING',
      description: 'Pressure class for flanges, valves, olets, couplings. Just the number: "150", "300", "600", etc.',
      nullable: true,
    },
    commodity_code: {
      type: 'STRING',
      description: 'Commodity code from BOM (e.g. "G4G-1412-05AA-001-2-2"). null if no commodity code column.',
      nullable: true,
    },
    end_connection: {
      type: 'STRING',
      description: 'End connection type normalized to standard abbreviation.',
      format: 'enum',
      enum: ['BW', 'SW', 'THD', 'RFWN', 'RFSW', 'RFSO', 'RFLJ', 'RFBL'],
      nullable: true,
    },
    needs_review: {
      type: 'BOOLEAN',
      description: 'true if quantity was not explicitly listed in the BOM and had to be estimated, or if any field is ambiguous.',
    },
    review_reason: {
      type: 'STRING',
      description: 'Explanation of why needs_review is true (e.g. "quantity_not_in_bom", "ambiguous_size"). null if needs_review is false.',
      nullable: true,
    },
  },
  required: [
    'item_number', 'item_type', 'classification', 'section', 'description',
    'size', 'size_2', 'quantity', 'uom', 'spec', 'material_grade',
    'schedule', 'schedule_2', 'rating', 'commodity_code', 'end_connection',
    'needs_review', 'review_reason',
  ],
};

const BOM_SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      description: 'All BOM line items extracted from the drawing',
      items: BOM_ITEM_SCHEMA,
    },
  },
  required: ['items'],
};

// ── Size normalization ─────────────────────────────────────────────────

/**
 * Normalize a raw size string from Gemini into decimal NPS format.
 * Handles fractions ("3/4" → "0.75"), mixed numbers ("1-1/2" → "1.5"),
 * and already-decimal values.
 */
function normalizeSize(raw: string | null): string | null {
  if (raw == null) return null;
  const v = raw.trim();
  if (!v) return null;

  // Mixed number: "1-1/2", "2-1/2", etc.
  const mixedMatch = v.match(/^(\d+)\s*[-–]\s*(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const num = parseInt(mixedMatch[2], 10);
    const den = parseInt(mixedMatch[3], 10);
    if (den !== 0) return String(whole + num / den);
  }

  // Simple fraction: "3/4", "1/2", etc.
  const fracMatch = v.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1], 10);
    const den = parseInt(fracMatch[2], 10);
    if (den !== 0) return String(num / den);
  }

  // Already a number (integer or decimal) — pass through
  return v;
}

// ── Material grade normalization ───────────────────────────────────────

/**
 * Normalize a raw material value into the standard material category.
 * Gemini may return ASTM spec codes instead of category names.
 */
function normalizeMaterialGrade(raw: string | null): string | null {
  if (raw == null) return null;
  const v = raw.trim().toUpperCase();
  if (!v) return null;

  const VALID = ['CS', 'SS-304', 'SS-316', 'INCONEL', 'TI', 'DUPLEX', 'CHROME', 'ALLOY'];
  if (VALID.includes(v)) return v;

  // SS-316 family
  if (/(?:TP|WP|WP-W\s*)316|F\s*316|(?:^|\b)316(?:L|\/316L)?(?:\b|$)|SS[\s-]*316/i.test(v)) return 'SS-316';

  // SS-304 family
  if (/(?:TP|WP|WP-W\s*)304|F\s*304|(?:^|\b)304(?:L|\/304L)?(?:\b|$)|SS[\s-]*304/i.test(v)) return 'SS-304';

  // Carbon steel specs
  if (/\bA106\b|\bA105\b|\bA53\b|\bA333\b|\bA350\b|\bA516\b/i.test(v)) return 'CS';
  if (/\bA234\b.*\bWPB\b|\bWPB\b/i.test(v)) return 'CS';

  // Chrome-moly
  if (/\b(?:P|WP|F)(?:11|22|91|5|9)\b/i.test(v) && /\bA335\b|\bA234\b|\bA182\b/i.test(v)) return 'CHROME';

  // Duplex
  if (/S3(?:1803|2205|2750|2760)|F5[13]|\bDUPLEX\b|\bA790\b/i.test(v)) return 'DUPLEX';

  // Inconel / nickel alloys
  if (/\bB(?:444|564|366|443|423|622)\b|\bN0[6-9]\d{3}\b|\bINCONEL\b|\bMONEL\b|\bHASTELLOY\b/i.test(v)) return 'INCONEL';

  // Titanium
  if (/\bB(?:861|363|381)\b|\bTITANIUM\b/i.test(v)) return 'TI';

  // Generic stainless
  if (/\bSS\b/i.test(v) && !/\bCS\b/.test(v)) return 'SS-316';

  return null; // Unknown material — don't pollute with raw ASTM codes
}

// ── Main export ────────────────────────────────────────────────────────

/**
 * Extract BOM items from a base64-encoded PDF using Gemini Vision.
 * Returns typed BomItem array and token counts for usage tracking.
 */
export async function extractBom(base64Pdf: string): Promise<{
  data: BomItem[];
  inputTokens: number;
  outputTokens: number;
}> {
  const result = await callGemini(base64Pdf, BOM_PROMPT, BOM_SCHEMA);

  const rawParsed = result.data as { items?: Record<string, unknown>[] } | Record<string, unknown>[];
  let items: Record<string, unknown>[] = [];

  // Gemini sometimes returns a bare array instead of { items: [...] }
  if (Array.isArray(rawParsed)) {
    items = rawParsed.filter(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === 'object' && !Array.isArray(item),
    );
  } else if (rawParsed && typeof rawParsed === 'object' && 'items' in rawParsed) {
    items = Array.isArray(rawParsed.items) ? rawParsed.items : [];
  }

  if (items.length === 0) {
    console.warn(`[bom-extractor] Gemini returned 0 items after retries.`);
  }

  const data: BomItem[] = items.map((item: Record<string, unknown>) => {
    const needsReview = item.needs_review === true;
    return {
      item_type: item.item_type === 'support' ? 'support' : 'material',
      classification: String(item.classification ?? 'unknown'),
      classification_confidence: null, // Set by classification pass later
      section: item.section === 'field' ? 'field' : 'shop',
      description: item.description != null ? String(item.description) : null,
      size: normalizeSize(item.size != null ? String(item.size) : null),
      size_2: normalizeSize(item.size_2 != null ? String(item.size_2) : null),
      quantity: (() => {
        const q = Number(item.quantity);
        return Number.isFinite(q) && q > 0 ? q : 1;
      })(),
      uom: item.uom != null ? String(item.uom).toUpperCase() : null,
      spec: normalizeSpec(item.spec != null ? String(item.spec) : null),
      material_grade: normalizeMaterialGrade(item.material_grade != null ? String(item.material_grade) : null),
      schedule: item.schedule != null ? String(item.schedule) : null,
      schedule_2: item.schedule_2 != null ? String(item.schedule_2) : null,
      rating: item.rating != null ? String(item.rating) : null,
      commodity_code: item.commodity_code != null ? String(item.commodity_code) : null,
      end_connection: item.end_connection != null ? String(item.end_connection).toUpperCase() : null,
      item_number: item.item_number != null ? Number(item.item_number) || null : null,
      needs_review: needsReview,
      review_reason: item.review_reason != null ? String(item.review_reason) : null,
    } satisfies BomItem;
  });

  return {
    data,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  };
}
