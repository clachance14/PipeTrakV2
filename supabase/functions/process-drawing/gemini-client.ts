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

const GEMINI_MODEL = 'gemini-3-flash-preview';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_RETRIES = 2;
const FETCH_TIMEOUT_MS = 50_000; // 50s to fit within edge function wall time

/** Gemini 3.0 Flash Preview pricing per 1M tokens (USD) */
const GEMINI_FLASH_PRICING = {
  input_per_million: 0.50,
  output_per_million: 3.00,
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
      maxOutputTokens: 8192, // Prevent truncation on large BOMs
    };
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const isLastAttempt = attempt === MAX_RETRIES - 1;

    try {
      console.log(`[gemini] START attempt ${attempt + 1}/${MAX_RETRIES}`);
      const t0 = Date.now();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

      if (!response.ok) {
        const status = response.status;

        if (isRateLimitError(status, responseText)) {
          console.error(`[gemini] RATE LIMIT (429/RESOURCE_EXHAUSTED) on attempt ${attempt + 1}`);
        }

        if (isTransientHttpError(status, responseText) && !isLastAttempt) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
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

      // Concatenate all text parts — Gemini may split long responses across multiple parts
      const parts = geminiResponse.candidates?.[0]?.content?.parts;
      if (!parts || parts.length === 0) {
        throw new Error('Gemini returned empty response: no candidates or parts');
      }
      const rawText = parts.map((p) => p.text).join('');
      if (!rawText) {
        throw new Error('Gemini returned empty text in all parts');
      }

      // Check if response was truncated (finishReason !== 'STOP')
      const finishReason = (geminiResponse.candidates?.[0] as Record<string, unknown>)?.finishReason;
      if (finishReason && finishReason !== 'STOP') {
        console.warn(`[gemini] Response may be truncated: finishReason=${finishReason}`);
      }

      // Parse the structured JSON payload from the model's text output
      let parsedData: unknown;
      try {
        parsedData = JSON.parse(rawText);
      } catch {
        throw new Error(`Gemini returned non-JSON text (${rawText.length} chars, finishReason=${finishReason ?? 'unknown'}): ${rawText.substring(0, 200)}`);
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
 * Cost calculation (Gemini 3.0 Flash Preview):
 *   Input:  $0.50 / 1M tokens
 *   Output: $3.00 / 1M tokens
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
