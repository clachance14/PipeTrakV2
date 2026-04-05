/**
 * BOM Classification Pass — text-only Gemini call
 *
 * Reclassifies BOM items extracted by the primary pass WITHOUT sending the
 * drawing image. This prevents visual cross-referencing (e.g. Gemini seeing
 * an ABV valve symbol on the drawing and misclassifying it as "thermowell"
 * because of proximity to an instrument bubble).
 *
 * Title block context (spec, material, schedule) is injected so the model
 * can make better decisions even without the image.
 *
 * Deno-compatible: no Node.js imports.
 */

import { callGeminiTextOnly } from './gemini-client.ts';
import type { BomItem, TitleBlockData } from './types.ts';

// ── Public types ────────────────────────────────────────────────────────

export interface ClassifiedItem {
  index: number;
  classification: string;
  section: 'shop' | 'field';
  item_type: 'material' | 'support';
  confidence: 'high' | 'medium' | 'low';
}

// ── JSON Schema for structured output ──────────────────────────────────

const CLASSIFICATION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          index: { type: 'INTEGER' },
          classification: { type: 'STRING' },
          section: { type: 'STRING', format: 'enum', enum: ['shop', 'field'] },
          item_type: { type: 'STRING', format: 'enum', enum: ['material', 'support'] },
          confidence: { type: 'STRING', format: 'enum', enum: ['high', 'medium', 'low'] },
        },
        required: ['index', 'classification', 'section', 'item_type', 'confidence'],
      },
    },
  },
  required: ['items'],
};

// ── Prompt builder ──────────────────────────────────────────────────────

/**
 * Build the text-only classification prompt.
 * Includes title block context, valve abbreviation dictionary, full
 * classification rules, and all BOM items with their current state.
 */
export function buildClassificationPrompt(
  items: BomItem[],
  titleBlock: TitleBlockData | null,
): string {
  const lines: string[] = [];

  lines.push(
    'You are reviewing a Bill of Materials (BOM) extracted from a piping isometric (ISO) drawing.',
    'Your task is to verify and correct the classification, section, item_type, and confidence for each item.',
    'You do NOT have access to the drawing image — classify based on the description, size, commodity code, and title block context only.',
    '',
  );

  // Title block context
  if (titleBlock) {
    const tbFields: string[] = [];
    if (titleBlock.spec) tbFields.push(`Spec: ${titleBlock.spec}`);
    if (titleBlock.material) tbFields.push(`Material: ${titleBlock.material}`);
    if (titleBlock.schedule) tbFields.push(`Schedule: ${titleBlock.schedule}`);
    if (titleBlock.line_number) tbFields.push(`Line Number: ${titleBlock.line_number}`);
    if (tbFields.length > 0) {
      lines.push('<title_block_context>');
      lines.push(...tbFields);
      lines.push('</title_block_context>');
      lines.push('');
    }
  }

  // Valve abbreviation dictionary
  lines.push('<valve_abbreviation_dictionary>');
  lines.push('Common valve abbreviations — use these to determine the correct classification:');
  lines.push('- ABV = Automatic Block Valve → classification: "ball valve"');
  lines.push('- DBB = Double Block & Bleed → classification: "ball valve"');
  lines.push('- PSV = Pressure Safety Valve → classification: "pressure safety valve"');
  lines.push('- PRV = Pressure Relief Valve → classification: "pressure safety valve"');
  lines.push('- CV = Control Valve → classification: "control valve"');
  lines.push('- BDV = Blowdown Valve → classification: "gate valve"');
  lines.push('- MOV = Motor Operated Valve → classification: "gate valve"');
  lines.push('- SOV = Solenoid Operated Valve → classification: "globe valve"');
  lines.push('- RV = Relief Valve → classification: "pressure safety valve"');
  lines.push('- SDV = Shutdown Valve → classification: "ball valve"');
  lines.push('- XV = Control Valve on/off → classification: "ball valve"');
  lines.push('- HV = Hand Valve → classification: "gate valve"');
  lines.push('Do NOT classify these as "thermowell" or other instrument types — they are valves.');
  lines.push('</valve_abbreviation_dictionary>');
  lines.push('');

  // Classification rules
  lines.push('<classification_rules>');
  lines.push('- item_type: "material" for pipe, fittings, flanges, gaskets, bolts, valves, instruments, nuts, washers.');
  lines.push('  "support" for pipe supports ONLY (shoes, guides, anchors, hangers, clamps, trunnions, dummy legs).');
  lines.push('  *** BOLTS/NUTS/WASHERS ARE ALWAYS "material", NEVER "support".');
  lines.push('- section: "shop" for shop fabrication materials, "field" for field-installed materials.');
  lines.push('  If section is ambiguous based on description alone, preserve the existing section value.');
  lines.push('- classification: ALL LOWERCASE, be specific:');
  lines.push('  Pipe: "pipe" or "threaded pipe" (threaded pipe uses FTE/NPT/NPTF connections)');
  lines.push('  Flanges: "flange wn", "flange sw", "flange lj", "flange so", "blind flange"');
  lines.push('  Elbows: "elbow 90 lr", "elbow 45 lr", "elbow 90 sr"');
  lines.push('  Tees: "tee", "reducing tee"');
  lines.push('  Reducers: "reducer conc", "reducer ecc"');
  lines.push('  Olets: "weldolet", "threadolet", "sockolet"');
  lines.push('  Valves: "gate valve", "ball valve", "check valve", "globe valve", "butterfly valve",');
  lines.push('          "plug valve", "control valve", "pressure safety valve"');
  lines.push('  Instruments: "thermowell", "pressure transmitter", "temperature gauge", "orifice plate"');
  lines.push('  Supports: "pipe shoe", "guide", "anchor", "spring hanger", "u-bolt", "dummy leg",');
  lines.push('            "trunnion", "pipe clamp"');
  lines.push('  Other: "gasket", "bolt set", "nipple", "cap", "plug", "rupture disc", "spacer", "strainer"');
  lines.push('- confidence: "high" if description unambiguously identifies the item,');
  lines.push('  "medium" if classification requires inference, "low" if description is unclear.');
  lines.push('</classification_rules>');
  lines.push('');

  // BOM items to classify
  lines.push('<bom_items>');
  lines.push('Review each item. Return corrected values for ALL items, even if no change is needed.');
  lines.push('');
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const parts: string[] = [`[${i}]`];
    if (item.description) parts.push(`Description: ${item.description}`);
    if (item.size) {
      const sizeStr = item.size_2 ? `${item.size} x ${item.size_2}` : item.size;
      parts.push(`Size: ${sizeStr}`);
    }
    if (item.quantity) parts.push(`Qty: ${item.quantity} ${item.uom ?? ''}`);
    if (item.commodity_code) parts.push(`CommodityCode: ${item.commodity_code}`);
    parts.push(`CurrentClass: ${item.classification}`);
    parts.push(`CurrentSection: ${item.section}`);
    parts.push(`CurrentType: ${item.item_type}`);
    lines.push(parts.join(' | '));
  }
  lines.push('</bom_items>');
  lines.push('');

  lines.push(
    'Return a JSON object with an "items" array containing one entry per BOM item, in the same order.',
    'Each entry must have: index (0-based), classification (lowercase), section ("shop"|"field"),',
    'item_type ("material"|"support"), confidence ("high"|"medium"|"low").',
  );

  return lines.join('\n');
}

// ── Main export ────────────────────────────────────────────────────────

/**
 * Send BOM items to Gemini (text only, no image) for reclassification.
 * Returns corrected ClassifiedItem entries and token counts.
 */
export async function classifyBomItems(
  items: BomItem[],
  titleBlock: TitleBlockData | null,
): Promise<{ data: ClassifiedItem[]; inputTokens: number; outputTokens: number }> {
  if (items.length === 0) {
    return { data: [], inputTokens: 0, outputTokens: 0 };
  }

  const prompt = buildClassificationPrompt(items, titleBlock);
  const result = await callGeminiTextOnly(prompt, CLASSIFICATION_SCHEMA);

  // Parse response defensively — handle bare array or { items: [...] }
  const rawParsed = result.data as
    | { items?: Record<string, unknown>[] }
    | Record<string, unknown>[];

  let rawItems: Record<string, unknown>[] = [];

  if (Array.isArray(rawParsed)) {
    rawItems = rawParsed.filter(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === 'object' && !Array.isArray(item),
    );
  } else if (rawParsed && typeof rawParsed === 'object' && 'items' in rawParsed) {
    rawItems = Array.isArray(rawParsed.items) ? rawParsed.items : [];
  }

  // Map and validate each entry
  const data: ClassifiedItem[] = [];
  for (const raw of rawItems) {
    const index = typeof raw.index === 'number' ? Math.floor(raw.index) : -1;

    // Filter out items with invalid indices
    if (index < 0 || index >= items.length) {
      console.warn(`[bom-classifier] Skipping item with invalid index: ${String(raw.index)}`);
      continue;
    }

    const section = raw.section === 'shop' ? 'shop' : 'field';
    const item_type = raw.item_type === 'support' ? 'support' : 'material';
    const confidenceRaw = raw.confidence;
    const confidence: 'high' | 'medium' | 'low' =
      confidenceRaw === 'high' || confidenceRaw === 'medium' || confidenceRaw === 'low'
        ? confidenceRaw
        : 'low';

    data.push({
      index,
      classification: String(raw.classification ?? 'unknown').toLowerCase(),
      section,
      item_type,
      confidence,
    });
  }

  return {
    data,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  };
}
