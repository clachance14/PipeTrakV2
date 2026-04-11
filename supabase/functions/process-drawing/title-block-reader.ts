/**
 * Title block extraction via Gemini Vision
 * Deno-compatible: uses callGemini() (fetch-based), no Node.js imports
 */

import { callGemini, GEMINI_FLASH } from './gemini-client.ts';
import type { TitleBlockData } from './types.ts';
import { normalizeTitleBlock } from './title-block-normalizer.ts';

// ── Prompt ─────────────────────────────────────────────────────────────

const TITLE_BLOCK_PROMPT = `You are reading the title block and scanning the overall layout of a piping drawing.

PART 1 — TITLE BLOCK (bottom-right area of the drawing)
Focus on the title block area. Extract the following fields. Return null for any field not found.

Rules:
- Normalize material to: CS, SS-304, SS-316, INCONEL, TI, DUPLEX, CHROME, ALLOY (null if none match)
- spec: Extract ONLY the piping class prefix. If the spec contains an underscore or contract reference, take only the part BEFORE the underscore (e.g., "PU-02_CC.0083947" → "PU-02", "PU-32 CC0085888" → "PU-32"). Commodity codes like G4G-xxxx are NOT specs — return null.
- sheet_number: the DRAWING-SPECIFIC sheet designation (e.g., "1" from "SHEET 1 OF 2"). If single sheet, return null.

PART 2 — DRAWING TYPE (read from the title block description)
Determine the drawing type from the title/description text in the title block:
- "PIPING ISOMETRIC" or "ISO" → "iso"
- "PIPING TRIM" or "TRIM DRAWING" → "trim"
- Anything else → "other"

PART 3 — SPOOL PRESENCE (scan the pipe routing diagram)
Look at the pipe routing diagram (the main drawing body, NOT the BOM table). Are there boxed or circled spool labels like "SPOOL-1", "SP-2", "SPOOL-3" visible on the pipe runs? Return true if you see ANY spool labels, false if none.

<examples>
Example 1 — Standard ISO with spools:
{"drawing_number": "BFW-48D19", "sheet_number": "1", "line_number": "6-CS-2003", "material": "CS", "schedule": "40", "spec": "PU-02", "nde_class": null, "pwht": false, "revision": "0", "hydro": null, "insulation": "H", "drawing_type": "iso", "has_spools": true}

Example 2 — Trim drawing with spool:
{"drawing_number": "C-7501-N5.Trim", "sheet_number": null, "line_number": null, "material": "SS-316", "schedule": null, "spec": "PU-02", "nde_class": null, "pwht": false, "revision": "0", "hydro": null, "insulation": null, "drawing_type": "trim", "has_spools": true}

Example 3 — ISO without spools:
{"drawing_number": "ISO-4500", "sheet_number": null, "line_number": "2-SS-1015", "material": "SS-316", "schedule": "10S", "spec": "HC-05", "nde_class": "Full RT", "pwht": true, "revision": "2", "hydro": null, "insulation": null, "drawing_type": "iso", "has_spools": false}
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
    drawing_type: { type: 'STRING', format: 'enum', enum: ['iso', 'trim', 'other'] },
    has_spools: { type: 'BOOLEAN' },
  },
  required: [
    'drawing_number', 'sheet_number', 'line_number',
    'material', 'schedule', 'spec', 'nde_class', 'pwht',
    'revision', 'hydro', 'insulation',
    'drawing_type', 'has_spools',
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
  drawing_type: 'other' as const,
  has_spools: false,
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
  const result = await callGemini(base64Pdf, TITLE_BLOCK_PROMPT, TITLE_BLOCK_SCHEMA, GEMINI_FLASH);

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
    drawing_type: (raw.drawing_type === 'iso' || raw.drawing_type === 'trim') ? raw.drawing_type : 'other',
    has_spools: raw.has_spools === true,
  };

  // Normalize: strip no-data values + first-token spec extraction
  const data = normalizeTitleBlock(coerced);

  return {
    data,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  };
}
