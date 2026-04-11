/**
 * Spool callout extraction via Gemini Vision
 * Dedicated prompt focused ONLY on identifying spool labels on the drawing body.
 * Separated from BOM extraction for reliability — Gemini was ignoring spool rules
 * when they were appended to the long BOM prompt.
 */

import { callGemini, GEMINI_FLASH } from './gemini-client.ts';

// ── Prompt ─────────────────────────────────────────────────────────────

const SPOOL_PROMPT = `You are analyzing a piping drawing to find SPOOL callout labels.

WHERE TO LOOK:
- The PIPE ROUTING DIAGRAM only (the main drawing body with pipe lines and fittings)
- Spool labels appear as text inside BOXES or RECTANGLES along pipe runs
- They typically have leader lines pointing to pipe sections
- Do NOT look in the BOM table, title block, notes, or revision blocks

WHAT TO EXTRACT:
- The raw text of every unique spool label (e.g., "SPOOL-1", "SP-2", "SPOOL-3")
- Include the full label text as shown on the drawing
- Deduplicate: if the same spool appears multiple times, include it only once
- For each spool, indicate which quadrant of the drawing it appears in (top-left, top-right, bottom-left, bottom-right, center)

IMPORTANT: Only extract labels that are clearly BOXED or CIRCLED spool identifiers.
Do NOT extract random text annotations, dimension callouts, or note references.
If no spool labels are visible, return an empty array.`;

// ── JSON Schema for structured output ──────────────────────────────────

const SPOOL_SCHEMA = {
  type: 'OBJECT',
  properties: {
    spools: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          label: { type: 'STRING' },
          quadrant: { type: 'STRING' },
        },
        required: ['label'],
      },
    },
  },
  required: ['spools'],
};

// ── Main export ────────────────────────────────────────────────────────

/**
 * Extract spool callout labels from a base64-encoded PDF page using Gemini Vision.
 * Returns deduplicated, uppercase spool labels and token counts for usage tracking.
 */
export async function extractSpools(base64Pdf: string): Promise<{
  data: string[];
  inputTokens: number;
  outputTokens: number;
}> {
  const result = await callGemini(base64Pdf, SPOOL_PROMPT, SPOOL_SCHEMA, GEMINI_FLASH);

  const parsed = result.data as { spools?: unknown } | unknown;

  const rawSpools = Array.isArray((parsed as { spools?: unknown })?.spools)
    ? (parsed as { spools: unknown[] }).spools
    : [];

  const labels: string[] = rawSpools
    .map((s: { label?: string }) => typeof s.label === 'string' ? s.label.trim() : '')
    .filter((l: string) => l.length > 0);

  const spools: string[] = labels
    .map((s) =>
      s.toUpperCase()
        // Normalize underscores to spaces so "A-89246_SPOOL8" and "A-89246 SPOOL8" dedup
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
    )
    // Deduplicate within the page (Gemini may return "Spool-1" and "SPOOL-1",
    // or "A-89246_SPOOL8" and "A-89246 SPOOL8")
    .filter((s, i, arr) => arr.indexOf(s) === i);

  if (spools.length > 0) {
    console.log(`[spool-extractor] Found ${spools.length} spool(s): ${spools.join(', ')}`);
  }

  return {
    data: spools,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  };
}
