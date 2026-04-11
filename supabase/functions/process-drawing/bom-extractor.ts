/**
 * BOM (Bill of Materials) extraction via Gemini Vision
 * Deno-compatible: uses callGemini() (fetch-based), no Node.js imports
 */

import { callGemini, GEMINI_PRO } from './gemini-client.ts';
import type { BomItem, BomExtractionResult, TitleBlockData } from './types.ts';
import { normalizeSpec } from '../_shared/normalize-spec.ts';

// ── Prompt ─────────────────────────────────────────────────────────────

function buildBomPrompt(ctx: TitleBlockData | null): string {
  const lines: string[] = [];

  lines.push(
    'You are extracting the Bill of Materials (BOM) from a piping drawing.',
    'The BOM table is on the RIGHT side of the drawing, organized into sections with headers.',
    '',
  );

  // Inject title block context from Call 1
  if (ctx) {
    lines.push('<drawing_context>');
    lines.push(`Drawing Type: ${ctx.drawing_type ?? 'iso'}`);
    if (ctx.spec) lines.push(`Piping Spec: ${ctx.spec}`);
    if (ctx.material) lines.push(`Material: ${ctx.material}`);
    if (ctx.schedule) lines.push(`Schedule: ${ctx.schedule}`);
    if (ctx.line_number) lines.push(`Line Number: ${ctx.line_number}`);
    lines.push('Use this context to inform your extraction but extract values as shown in the BOM.');
    lines.push('</drawing_context>');
    lines.push('');
  }

  lines.push(
    '<bom_structure>',
    'CRITICAL: The BOM has NESTED sections with their own sub-headers:',
    '',
    'SHOP MATERIALS',
    '  Line items (pipe, fittings, flanges, valves)',
    '  PIPE SUPPORTS sub-header (shop-fabricated supports)',
    '',
    'OTHER THAN SHOP MATERIALS (= Field Materials)',
    '  Line items (gaskets, bolts, field valves)',
    '  INSTRUMENTS sub-header (all items here are instruments)',
    '  PIPE SUPPORTS sub-header (field-installed supports)',
    '',
    'You MUST identify which sub-header each item falls under and set the subsection field:',
    '- "line_items" — items under the main section header (not under a sub-header)',
    '- "pipe_supports" — items under a PIPE SUPPORTS sub-header',
    '- "instruments" — items under an INSTRUMENTS sub-header',
    '</bom_structure>',
    '',
  );

  lines.push(
    '<classification_rules>',
    '- item_type: "material" for pipe, fittings, flanges, gaskets, bolts, valves, instruments, nuts, washers.',
    '  "support" for pipe supports ONLY (shoes, guides, anchors, hangers, clamps, trunnions, dummy legs).',
    '  *** BOLTS/NUTS/WASHERS ARE ALWAYS "material", NEVER "support".',
    '- section: "shop" for items under SHOP MATERIALS header, "field" for items under OTHER THAN SHOP MATERIALS header.',
    '- subsection: Set based on the sub-header the item appears under (see <bom_structure> above).',
    '- classification: ALL LOWERCASE, be specific:',
    '  Pipe: "pipe"',
    '  Flanges: "flange wn", "flange sw", "flange lj", "flange so", "blind flange"',
    '  Elbows: "elbow 90 lr", "elbow 45 lr", "elbow 90 sr"',
    '  Tees: "tee", "reducing tee"',
    '  Reducers: "reducer conc", "reducer ecc"',
    '  Olets: "weldolet", "threadolet", "sockolet"',
    '  Valves: "gate valve", "ball valve", "check valve", "globe valve", "butterfly valve", "plug valve", "control valve", "pressure safety valve"',
    '  Instruments: "thermowell", "pressure transmitter", "temperature gauge", "orifice plate", "control valve", "flow element"',
    '  Supports: "pipe shoe", "guide", "anchor", "spring hanger", "u-bolt", "dummy leg", "trunnion", "pipe clamp"',
    '  Bends: "bend"',
    '  Couplings: "coupling"',
    '  Other: "gasket", "bolt set", "nipple", "cap", "plug", "rupture disc", "spacer", "strainer"',
    '</classification_rules>',
    '',
  );

  lines.push(
    '<valve_abbreviation_dictionary>',
    'ABV = Automatic Block Valve → "ball valve"',
    'DBB = Double Block & Bleed → "ball valve"',
    'PSV/PRV/RV = Pressure Safety/Relief Valve → "pressure safety valve"',
    'CV = Control Valve → "control valve"',
    'BDV = Blowdown Valve → "gate valve"',
    'MOV = Motor Operated Valve → "gate valve"',
    'SOV = Solenoid Operated Valve → "globe valve"',
    'SDV = Shutdown Valve → "ball valve"',
    'XV = Control Valve on/off → "ball valve"',
    'HV = Hand Valve → "gate valve"',
    'EBV = Emergency Block Valve → "ball valve"',
    'Do NOT classify valve abbreviations as instruments.',
    '</valve_abbreviation_dictionary>',
    '',
  );

  lines.push(
    '<instrument_rules>',
    'ALL items under an INSTRUMENTS sub-header are instruments (subsection="instruments", item_type="material").',
    'Common instrument tag patterns: TV-xxxx, FE-xxxx, TI-xxxx, PI-xxxx, FV-xxxx, LV-xxxx, XV-xxxx.',
    'When under INSTRUMENTS header, classify as the appropriate instrument type.',
    '</instrument_rules>',
    '',
  );

  lines.push(
    '<valve_end_connections>',
    'For ALL valves, populate end_connection from BOM description:',
    '"RF", "RFWN", "FLANGED" → "RFWN"',
    '"BW", "BUTT WELD" → "BW"',
    '"SW", "SOCKET WELD" → "SW"',
    '"THD", "THREADED" → "THD"',
    'If not explicit: shop valves typically BW or SW; field valves typically RFWN.',
    '</valve_end_connections>',
    '',
  );

  lines.push(
    '<size_rules>',
    'NPS as decimal. Sub-1": "0.5" (1/2"), "0.75" (3/4"). Whole: "2", "16", "1.5" (1-1/2").',
    'Reducing items: size = larger, size_2 = smaller.',
    'Stud bolts: size = diameter, size_2 = length (both as decimal).',
    '</size_rules>',
    '',
  );

  lines.push(
    '<threaded_pipe_detection>',
    'Set is_threaded_pipe to true if the PIPE item (typically item 1 in shop materials) indicates threaded piping:',
    '- Description contains: galvanized, A53 Type F, ERW with threaded fittings',
    '- ALL fittings use FTE (Forged Threaded End) or threaded connections',
    'Do NOT flag as threaded just because a valve has NPTF in its description.',
    'If threaded, classify pipe items as "threaded pipe" instead of "pipe".',
    '</threaded_pipe_detection>',
    '',
  );

  lines.push(
    'CRITICAL: The "description" field must contain the EXACT text from the BOM row.',
    'Copy it character-for-character. Do NOT rewrite, summarize, or expand.',
    '',
    'Extract EVERY row from ALL BOM sections. Return { "items": [...], "is_threaded_pipe": false }.',
    'If no BOM items found, return { "items": [], "is_threaded_pipe": false }.',
  );

  return lines.join('\n');
}

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
    subsection: {
      type: 'STRING',
      description: 'Which sub-header the item appears under: "line_items" for main section items, "pipe_supports" for items under PIPE SUPPORTS sub-header, "instruments" for items under INSTRUMENTS sub-header.',
      format: 'enum',
      enum: ['line_items', 'pipe_supports', 'instruments'],
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
    'item_number', 'item_type', 'classification', 'section', 'subsection', 'description',
    'size', 'size_2', 'quantity', 'uom', 'spec', 'material_grade',
    'schedule', 'schedule_2', 'rating', 'commodity_code', 'end_connection',
    'needs_review', 'review_reason',
  ],
};

const BOM_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: { type: 'ARRAY', items: BOM_ITEM_SCHEMA },
    is_threaded_pipe: { type: 'BOOLEAN' },
  },
  required: ['items', 'is_threaded_pipe'],
};

// ── Size normalization ─────────────────────────────────────────────────

/**
 * Normalize a raw size string from Gemini into decimal NPS format.
 * Handles fractions ("3/4" → "0.75"), mixed numbers ("1-1/2" → "1.5"),
 * and already-decimal values.
 */
function normalizeSizeField(raw: string | null): string | null {
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

// ── End connection normalization ───────────────────────────────────────

function normalizeEndConnection(raw: string | null): string | null {
  if (raw == null) return null;
  return String(raw).toUpperCase() || null;
}

// ── Item coercion ──────────────────────────────────────────────────────

function coerceBomItem(item: unknown): BomItem {
  const raw = (item !== null && typeof item === 'object' ? item : {}) as Record<string, unknown>;

  const needsReview = raw.needs_review === true;

  const subsectionRaw = String(raw.subsection ?? 'line_items').toLowerCase();
  const subsection = (['line_items', 'pipe_supports', 'instruments'] as const).includes(
    subsectionRaw as BomItem['subsection'],
  )
    ? (subsectionRaw as BomItem['subsection'])
    : 'line_items';

  return {
    item_type: raw.item_type === 'support' ? 'support' : 'material',
    classification: String(raw.classification ?? 'unknown'),
    section: raw.section === 'field' ? 'field' : 'shop',
    subsection,
    description: raw.description != null ? String(raw.description) : null,
    size: normalizeSizeField(raw.size != null ? String(raw.size) : null),
    size_2: normalizeSizeField(raw.size_2 != null ? String(raw.size_2) : null),
    quantity: (() => {
      const q = Number(raw.quantity);
      return Number.isFinite(q) && q > 0 ? q : 1;
    })(),
    uom: raw.uom != null ? String(raw.uom).toUpperCase() : null,
    spec: normalizeSpec(raw.spec != null ? String(raw.spec) : null),
    material_grade: normalizeMaterialGrade(raw.material_grade != null ? String(raw.material_grade) : null),
    schedule: raw.schedule != null ? String(raw.schedule) : null,
    schedule_2: raw.schedule_2 != null ? String(raw.schedule_2) : null,
    rating: raw.rating != null ? String(raw.rating) : null,
    commodity_code: raw.commodity_code != null ? String(raw.commodity_code) : null,
    end_connection: normalizeEndConnection(raw.end_connection != null ? String(raw.end_connection) : null),
    item_number: raw.item_number != null ? Number(raw.item_number) || null : null,
    needs_review: needsReview,
    review_reason: raw.review_reason != null ? String(raw.review_reason) : null,
  } satisfies BomItem;
}

// ── Main export ────────────────────────────────────────────────────────

/**
 * Extract BOM items from a base64-encoded PDF using Gemini Vision (Pro model).
 * Accepts title block context from Call 1 to inject drawing-level metadata.
 * Returns typed BomExtractionResult and token counts for usage tracking.
 */
export async function extractBom(
  base64Pdf: string,
  titleBlockContext: TitleBlockData | null,
): Promise<{ data: BomExtractionResult; inputTokens: number; outputTokens: number }> {
  const prompt = buildBomPrompt(titleBlockContext);
  const result = await callGemini(base64Pdf, prompt, BOM_RESPONSE_SCHEMA, GEMINI_PRO);

  const raw = result.data as { items?: unknown[]; is_threaded_pipe?: boolean } | null;
  const rawItems = Array.isArray(raw?.items) ? raw.items : [];
  const isThreadedPipe = raw?.is_threaded_pipe === true;

  if (rawItems.length === 0) {
    console.warn('[bom-extractor] Gemini returned 0 items after retries.');
  }

  const items: BomItem[] = rawItems.map((item) => coerceBomItem(item));

  return {
    data: { items, is_threaded_pipe: isThreadedPipe },
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  };
}
