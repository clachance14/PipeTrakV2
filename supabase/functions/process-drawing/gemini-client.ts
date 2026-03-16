/**
 * Gemini Vision API client for process-drawing edge function
 * Deno-compatible: uses fetch(), Deno.env.get(), no node: imports
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { buildAiUsageLog } from './schema-helpers.ts';

// ── Types ──────────────────────────────────────────────────────────────

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export interface GeminiResult {
  data: unknown;
  inputTokens: number;
  outputTokens: number;
}

// ── Constants ──────────────────────────────────────────────────────────

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_RETRIES = 3;

/** Gemini 2.0 Flash pricing per 1M tokens (USD) */
const GEMINI_FLASH_PRICING = {
  input_per_million: 0.10,
  output_per_million: 0.40,
};

// ── Rate limit / transient error detection ─────────────────────────────

function isRateLimitError(status: number, body: string): boolean {
  return status === 429 || body.includes('RESOURCE_EXHAUSTED');
}

function isTransientHttpError(status: number, body: string): boolean {
  return (
    isRateLimitError(status, body) ||
    status === 503 ||
    body.includes('UNAVAILABLE') ||
    body.includes('overloaded') ||
    body.includes('high demand')
  );
}

// ── Core API call ──────────────────────────────────────────────────────

/**
 * Call Gemini Vision API with a base64-encoded PDF and a prompt.
 * Retries up to MAX_RETRIES times with exponential backoff on transient errors.
 *
 * @param base64Pdf       Base64-encoded PDF content (no data URI prefix)
 * @param prompt          Text prompt for the model
 * @param responseSchema  Optional JSON schema to enable structured output mode
 */
export async function callGemini(
  base64Pdf: string,
  prompt: string,
  responseSchema?: object,
): Promise<GeminiResult> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  // Build request body
  const requestBody: Record<string, unknown> = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: 'application/pdf',
              data: base64Pdf,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    ],
  };

  // Enable structured JSON output when a schema is provided
  if (responseSchema) {
    requestBody.generationConfig = {
      responseMimeType: 'application/json',
      responseSchema,
    };
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const isLastAttempt = attempt === MAX_RETRIES - 1;

    try {
      console.log(`[gemini] START attempt ${attempt + 1}/${MAX_RETRIES}`);
      const t0 = Date.now();

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

      if (!response.ok) {
        const status = response.status;

        if (isRateLimitError(status, responseText)) {
          console.error(`[gemini] RATE LIMIT (429/RESOURCE_EXHAUSTED) on attempt ${attempt + 1}`);
        }

        if (isTransientHttpError(status, responseText) && !isLastAttempt) {
          const delay = Math.pow(2, attempt) * 2000 + Math.random() * 1000;
          lastError = new Error(`Gemini API HTTP ${status}: ${responseText.substring(0, 200)}`);
          console.warn(
            `[gemini] RETRY attempt ${attempt + 1}/${MAX_RETRIES}, status=${status}, retrying in ${Math.round(delay)}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // Non-transient error or last attempt — fail immediately
        throw new Error(`Gemini API error: HTTP ${status} - ${responseText.substring(0, 500)}`);
      }

      console.log(`[gemini] DONE in ${elapsed}s`);

      // Parse the outer API response envelope
      const geminiResponse: GeminiResponse = JSON.parse(responseText);

      const rawText = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Gemini returned empty response: no candidates or parts');
      }

      // Parse the structured JSON payload from the model's text output
      let parsedData: unknown;
      try {
        parsedData = JSON.parse(rawText);
      } catch {
        throw new Error(`Gemini returned non-JSON text: ${rawText.substring(0, 200)}`);
      }

      const inputTokens = geminiResponse.usageMetadata?.promptTokenCount ?? 0;
      const outputTokens = geminiResponse.usageMetadata?.candidatesTokenCount ?? 0;

      return { data: parsedData, inputTokens, outputTokens };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (isLastAttempt) {
        throw lastError;
      }

      const delay = Math.pow(2, attempt) * 2000 + Math.random() * 1000;
      console.warn(
        `[gemini] RETRY attempt ${attempt + 1}/${MAX_RETRIES} after error, retrying in ${Math.round(delay)}ms: ${lastError.message.substring(0, 120)}`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Should not be reachable; TypeScript requires an explicit return/throw here
  throw lastError ?? new Error(`Gemini API call failed after ${MAX_RETRIES} attempts`);
}

// ── Usage tracking ─────────────────────────────────────────────────────

/**
 * Log AI token usage to the ai_usage_log table.
 * Non-blocking: errors are caught, logged, and never re-thrown.
 *
 * Cost calculation (Gemini 2.0 Flash):
 *   Input:  $0.10 / 1M tokens
 *   Output: $0.40 / 1M tokens
 */
export async function trackGeminiUsage(
  result: GeminiResult,
  operation: string,
  projectId: string,
  drawingId: string,
  supabaseAdmin: SupabaseClient,
): Promise<void> {
  try {
    const inputCost = (result.inputTokens / 1_000_000) * GEMINI_FLASH_PRICING.input_per_million;
    const outputCost = (result.outputTokens / 1_000_000) * GEMINI_FLASH_PRICING.output_per_million;
    const totalCost = inputCost + outputCost;

    const record = buildAiUsageLog({
      projectId,
      operation,
      model: GEMINI_MODEL,
      drawingId,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      totalCost,
    });

    const { error } = await supabaseAdmin.from('ai_usage_log').insert(record);

    if (error) {
      console.error(`[ai-usage] Failed to log ${operation}:`, error.message);
    }
  } catch (err) {
    console.error(`[ai-usage] Unexpected error logging ${operation}:`, err);
  }
}
