/**
 * Title block extraction via Gemini Vision
 * Deno-compatible: uses callGemini() (fetch-based), no Node.js imports
 */

import { callGemini } from './gemini-client.ts';
import type { TitleBlockData } from './types.ts';
import { normalizeTitleBlock } from './title-block-normalizer.ts';

// ── Prompt ─────────────────────────────────────────────────────────────

const TITLE_BLOCK_PROMPT = `You are reading the title block of a piping isometric (ISO) drawing.
Focus ONLY on the title block area (typically bottom-right corner or bottom strip).
Return null for any field not found. Do not guess or infer values from the drawing body.

Extract the title block fields from this ISO drawing.

Rules:
- Normalize material to: CS, SS-304, SS-316, INCONEL, TI, DUPLEX, CHROME, ALLOY (null if none match)
- Strip trailing project numbers (6+ digits) from spec
- spec is a SHORT piping class code (e.g. "PU-32", "A1A", "HC-05"). Commodity codes like G4G-xxxx, support tag numbers, and long alphanumeric identifiers are NOT piping specs — return null for spec if only these are present
- Do NOT include trailing suffixes like "CC" or contract codes after the spec — only the core spec code (e.g. "PU-32 CC" → "PU-32")
- sheet_number: the DRAWING-SPECIFIC sheet number (e.g. "1" from "SHEET 1 OF 2"), NOT a project-wide page index. If the drawing is a single sheet or no sheet designation exists, return null. Do NOT include "of X" totals.

<examples>
Example 1 — Carbon steel ISO:
{"drawing_number": "ISO-2001", "sheet_number": "1", "line_number": "6-CS-2003", "material": "CS", "schedule": "40", "spec": "A1A", "nde_class": "Class 1", "pwht": false, "revision": "A", "hydro": "Required", "insulation": "H"}

Example 2 — Stainless steel ISO:
{"drawing_number": "DWG-4500-R2", "sheet_number": null, "line_number": "2-SS-1015", "material": "SS-316", "schedule": "10S", "spec": "HC-05", "nde_class": "Full RT", "pwht": true, "revision": "2", "hydro": null, "insulation": null}
</examples>`;

// ── JSON Schema for structured output ──────────────────────────────────

const TITLE_BLOCK_SCHEMA = {
  type: 'OBJECT',
  properties: {
    drawing_number: {
      type: 'STRING',
      description: 'The ISO drawing number / document number',
      nullable: true,
    },
    sheet_number: {
      type: 'STRING',
      description: 'Sheet number for THIS SPECIFIC DRAWING if it is a multi-sheet drawing (e.g. "1", "2"). This is the drawing-specific sheet number, NOT a project-wide page index. Look for labels like "SHEET 1 OF 2" or "SHT 1" in the title block. If the drawing has only one sheet or no sheet designation is shown, return null.',
      nullable: true,
    },
    line_number: {
      type: 'STRING',
      description: 'The pipe line number (e.g. "2-P-1001", "6-CS-2003")',
      nullable: true,
    },
    material: {
      type: 'STRING',
      description: 'Pipe material. Normalize to: CS, SS-304, SS-316, INCONEL, TI, DUPLEX, CHROME, ALLOY. Return null if none match.',
      format: 'enum',
      enum: ['CS', 'SS-304', 'SS-316', 'INCONEL', 'TI', 'DUPLEX', 'CHROME', 'ALLOY'],
      nullable: true,
    },
    schedule: {
      type: 'STRING',
      description: 'Pipe schedule (e.g. "10", "40", "80", "STD", "XS", "XXS", "160")',
      nullable: true,
    },
    spec: {
      type: 'STRING',
      description: 'Short piping specification or class code (e.g. "A1A", "B2B", "HC-05", "PU-32"). Do NOT include project numbers, trailing "CC" suffixes, or contract codes. Commodity codes (e.g. G4G-xxxx) and support tag numbers are NOT piping specs — return null.',
      nullable: true,
    },
    nde_class: {
      type: 'STRING',
      description: 'NDE/NDT class or requirement if listed (e.g. "Class 1", "RT", "Full RT")',
      nullable: true,
    },
    pwht: {
      type: 'BOOLEAN',
      description: 'true if PWHT (Post-Weld Heat Treatment) is required, false otherwise',
    },
    revision: {
      type: 'STRING',
      description: 'Drawing revision number or letter (e.g. "A", "1", "Rev 2")',
      nullable: true,
    },
    hydro: {
      type: 'STRING',
      description: 'Hydrostatic test requirement if listed (e.g. "Yes", "Required", "N/A")',
      nullable: true,
    },
    insulation: {
      type: 'STRING',
      description: 'Insulation code or type if listed (e.g. "H", "C", "P", "None")',
      nullable: true,
    },
  },
  required: [
    'drawing_number', 'sheet_number', 'line_number',
    'material', 'schedule', 'spec', 'nde_class', 'pwht',
    'revision', 'hydro', 'insulation',
  ],
};

// ── Empty fallback ─────────────────────────────────────────────────────

const EMPTY_TITLE_BLOCK: TitleBlockData = {
  drawing_number: null,
  sheet_number: null,
  line_number: null,
  material: null,
  schedule: null,
  spec: null,
  nde_class: null,
  pwht: false,
  revision: null,
  hydro: null,
  insulation: null,
};

// ── Main export ────────────────────────────────────────────────────────

/**
 * Extract title block fields from a base64-encoded PDF using Gemini Vision.
 * Returns typed TitleBlockData and token counts for usage tracking.
 */
export async function extractTitleBlock(base64Pdf: string): Promise<{
  data: TitleBlockData;
  inputTokens: number;
  outputTokens: number;
}> {
  const result = await callGemini(base64Pdf, TITLE_BLOCK_PROMPT, TITLE_BLOCK_SCHEMA);

  const raw = result.data as Record<string, unknown>;

  // Coerce to typed TitleBlockData with fallback defaults
  const coerced: TitleBlockData = {
    ...EMPTY_TITLE_BLOCK,
    drawing_number: raw.drawing_number != null ? String(raw.drawing_number) : null,
    sheet_number: raw.sheet_number != null ? String(raw.sheet_number) : null,
    line_number: raw.line_number != null ? String(raw.line_number) : null,
    material: raw.material != null ? String(raw.material) : null,
    // Coerce to string — Gemini may return numbers for schedule
    schedule: raw.schedule != null ? String(raw.schedule) : null,
    spec: raw.spec != null ? String(raw.spec) : null,
    nde_class: raw.nde_class != null ? String(raw.nde_class) : null,
    pwht: raw.pwht === true,
    revision: raw.revision != null ? String(raw.revision) : null,
    hydro: raw.hydro != null ? String(raw.hydro) : null,
    insulation: raw.insulation != null ? String(raw.insulation) : null,
  };

  // Normalize: strip no-data values + first-token spec extraction
  const data = normalizeTitleBlock(coerced);

  return {
    data,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  };
}
